'use strict';
/**
 * Xtobe-2 — Lead generation engine (xtobe-business).
 * Sources: website widget, WhatsApp click-to-chat, Instagram bio link,
 * Google/Facebook ads (UTM), walk-in QR. Every lead lands in ONE pipeline.
 * NOTHING automated sends without staff approval (approval-gated by design).
 */
const crypto = require('crypto');

module.exports = function leadsModule(db) {
  const nowIso = () => new Date().toISOString();

  function createLead({ name, phone, source, service, notes, channel }) {
    const id = 'lead-' + crypto.randomBytes(6).toString('hex');
    db.prepare(`INSERT INTO leads (id, name, phone_masked, phone_hash, source, service, notes, channel, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`)
      .run(id, name || 'Unknown', maskPhone(phone), hashPhone(phone),
        source || 'website', service || '', notes || '', channel || 'whatsapp', nowIso());
    return getLead(id);
  }

  function maskPhone(phone) {
    const p = String(phone || '').replace(/\D/g, '');
    if (p.length < 7) return '***';
    return p.slice(0, 4) + ' *** ' + p.slice(-3);
  }
  function hashPhone(phone) {
    return crypto.createHash('sha256').update(String(phone || '')).digest('hex').slice(0, 32);
  }

  function getLead(id) {
    return db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  }

  function listLeads({ status, source, limit } = {}) {
    let sql = 'SELECT * FROM leads';
    const where = []; const params = [];
    if (status) { where.push('status = ?'); params.push(status); }
    if (source) { where.push('source = ?'); params.push(source); }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(Number(limit) || 100);
    return db.prepare(sql).all(...params);
  }

  /** Staff moves a lead through: new → contacted → booked → won / lost */
  function updateStatus(id, status) {
    const allowed = ['new', 'contacted', 'booked', 'won', 'lost', 'archived'];
    if (!allowed.includes(status)) throw new Error('invalid status: ' + status);
    db.prepare('UPDATE leads SET status = ?, updated_at = ? WHERE id = ?').run(status, nowIso(), id);
    return getLead(id);
  }

  function addNote(id, note) {
    db.prepare('INSERT INTO lead_notes (id, lead_id, note, created_at) VALUES (?, ?, ?, ?)')
      .run('n-' + crypto.randomBytes(5).toString('hex'), id, String(note).slice(0, 2000), nowIso());
    return db.prepare('SELECT * FROM lead_notes WHERE lead_id = ? ORDER BY created_at DESC').all(id);
  }

  function stats() {
    const byStatus = {};
    db.prepare('SELECT status, COUNT(*) as n FROM leads GROUP BY status').all()
      .forEach(r => byStatus[r.status] = r.n);
    const bySource = {};
    db.prepare('SELECT source, COUNT(*) as n FROM leads GROUP BY source').all()
      .forEach(r => bySource[r.source] = r.n);
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = db.prepare(`SELECT COUNT(*) as n FROM leads WHERE created_at LIKE ?`).get(today + '%').n;
    return { byStatus, bySource, today: todayCount, total: Object.values(byStatus).reduce((a, b) => a + b, 0) };
  }

  return { createLead, getLead, listLeads, updateStatus, addNote, stats, maskPhone };
};
