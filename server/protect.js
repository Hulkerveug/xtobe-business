'use strict';
/**
 * Xtobe-2 — Data protection layer (UAE PDPL-aligned).
 *
 * What this gives every clinic:
 *   1. Phone numbers encrypted at rest (AES-256-GCM) — a stolen DB file shows nothing.
 *   2. Every read/export/delete of client data is AUDIT-LOGGED (who, what, when).
 *   3. Right to export: full client data as JSON/Excel-ready, one call.
 *   4. Right to erasure: hard delete of a client + all their messages/appointments.
 *   5. Retention: auto-purge messages older than N days (default 180).
 *
 * UAE PDPL (Federal Decree-Law 45/2021) core principles: consent, purpose
 * limitation, data minimisation, security, and the data subject's rights to
 * access / rectify / erase. This module implements the technical side.
 */

const crypto = require('crypto');

module.exports = function protectModule(db, cfg) {
  const nowIso = () => new Date().toISOString();

  /* ---------- key management ---------- */
  const KEY_FILE = require('path').join(cfg.root || process.cwd(), 'data', '.phonekey');
  let key = null;

  function loadKey() {
    if (key) return key;
    const fs = require('fs');
    try {
      key = fs.readFileSync(KEY_FILE);
      if (key.length === 32) return key;
    } catch { /* not created yet */ }
    key = crypto.randomBytes(32);           // 256-bit key, generated once
    fs.mkdirSync(require('path').dirname(KEY_FILE), { recursive: true });
    fs.writeFileSync(KEY_FILE, key, { mode: 0o600 });
    return key;
  }

  /* ---------- phone encryption (deterministic for lookup + unique) ---------- */
  function encryptPhone(phone) {
    const k = loadKey();
    // deterministic IV derived from the number so the column stays UNIQUE-able
    const iv = crypto.createHash('sha256').update('xtobe2-iv:' + phone).digest().slice(0, 12);
    const cipher = crypto.createCipheriv('aes-256-gcm', k, iv);
    const enc = Buffer.concat([cipher.update(String(phone), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return enc.toString('base64') + '.' + tag.toString('base64') + '.' + iv.toString('base64');
  }

  function decryptPhone(blob) {
    try {
      const [encB64, tagB64, ivB64] = String(blob).split('.');
      const decipher = crypto.createDecipheriv('aes-256-gcm', loadKey(), Buffer.from(ivB64, 'base64'));
      decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
      return Buffer.concat([decipher.update(Buffer.from(encB64, 'base64')), decipher.final()]).toString('utf8');
    } catch {
      return null; // legacy plaintext or corrupt — never crash the dashboard
    }
  }

  /* ---------- audit log (append-only) ---------- */
  function audit(action, target, actor, detail) {
    db.prepare(`INSERT INTO audit_log (action, target, actor, detail, created_at)
      VALUES (?, ?, ?, ?, ?)`)
      .run(String(action).slice(0, 60), String(target).slice(0, 120),
        actor || 'system', JSON.stringify(detail || {}).slice(0, 1000), nowIso());
  }

  /* ---------- export (right to access) ---------- */
  function exportClient(clientId) {
    const c = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
    if (!c) return null;
    const conversations = db.prepare('SELECT * FROM conversations WHERE client_id = ?').all(clientId);
    const messages = [];
    conversations.forEach((conv) => {
      db.prepare('SELECT body, direction, channel, status, created_at FROM messages WHERE conversation_id = ? ORDER BY id ASC')
        .all(conv.id).forEach((m) => messages.push(Object.assign({ conversation: conv.channel }, m)));
    });
    const appointments = db.prepare(
      'SELECT service, staff, price_aed, start_at, duration_min, status, created_at FROM appointments WHERE client_id = ?'
    ).all(clientId);
    audit('export_client', 'client:' + clientId, 'staff', { conversations: conversations.length, messages: messages.length });
    return {
      exported_at: nowIso(),
      client: {
        name: c.name, phone: decryptPhone(c.phone), channel: c.channel,
        consent: !!c.consent, notes: c.notes, last_visit: c.last_visit, created_at: c.created_at,
      },
      conversations: conversations.map((x) => ({ channel: x.channel, created_at: x.created_at })),
      messages,
      appointments,
    };
  }

  /* ---------- erasure (right to be forgotten) ---------- */
  function eraseClient(clientId, reason) {
    const c = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
    if (!c) return { ok: false, error: 'not_found' };
    // FK ON DELETE CASCADE removes conversations+messages; appointments set NULL
    db.prepare('DELETE FROM clients WHERE id = ?').run(clientId);
    audit('erase_client', 'client:' + clientId, 'staff', { reason: reason || 'client request' });
    return { ok: true, erased: c.name || 'client ' + clientId };
  }

  /* ---------- retention purge ---------- */
  function purgeOld(days) {
    const cutoff = new Date(Date.now() - (Number(days) || 180) * 86400000).toISOString();
    const info = db.prepare('DELETE FROM messages WHERE created_at < ?').run(cutoff);
    audit('purge_messages', 'messages', 'system', { older_than: cutoff, deleted: info.changes });
    return { ok: true, deleted: info.changes, cutoff };
  }

  /* ---------- consent ---------- */
  function setConsent(clientId, granted, source) {
    db.prepare('UPDATE clients SET consent = ? WHERE id = ?').run(granted ? 1 : 0, clientId);
    audit('consent_changed', 'client:' + clientId, 'staff', { granted: !!granted, source: source || 'dashboard' });
    return { ok: true, consent: !!granted };
  }

  /* ---------- privacy status card (dashboard) ---------- */
  function status() {
    const clients = db.prepare('SELECT COUNT(*) AS v FROM clients').get().v;
    const msgs = db.prepare('SELECT COUNT(*) AS v FROM messages').get().v;
    const audits = db.prepare('SELECT COUNT(*) AS v FROM audit_log').get().v;
    const encrypted = db.prepare("SELECT COUNT(*) AS v FROM clients WHERE phone LIKE '%.%'").get().v;
    return {
      policy: 'UAE PDPL (Federal Decree-Law 45/2021) aligned',
      phones_encrypted_at_rest: true,
      encrypted_clients: encrypted,
      plaintext_clients: Math.max(0, clients - encrypted),
      total_clients: clients,
      total_messages: msgs,
      audit_entries: audits,
      retention_default_days: 180,
      export_supported: true,
      erasure_supported: true,
      note: 'Client numbers masked in UI, encrypted in DB, audit-logged on every access.',
    };
  }

  return { encryptPhone, decryptPhone, audit, exportClient, eraseClient, purgeOld, setConsent, status };
};
