'use strict';
/**
 * Xtobe-2 — Clinic server (Express + better-sqlite3).
 * One inbox for WhatsApp / Instagram / Facebook + bookings + AI content studio.
 * Ethics inherited from xtobe-1: consent-based, numbers masked in UI, no spoofing.
 */
const path = require('path');
const fs = require('fs');
const express = require('express');

const ROOT = path.join(__dirname, '..');
const { loadEnv } = require('./env');
const { connect } = require('./db');
const wa = require('./whatsapp');
const content = require('./content');
const protect = require('./protect');
const leadsMod = require('./leads');
const aigateMod = require('./aigate');
const videoMod = require('./video');

loadEnv(ROOT);

const cfg = {
  root: ROOT,
  port: Number(process.env.PORT || 3000),
  dbFile: path.resolve(ROOT, process.env.DB_FILE || 'data/xtobe2.db'),
  whatsappToken: (process.env.WHATSAPP_TOKEN || '').trim(),
  whatsappPhoneId: (process.env.WHATSAPP_PHONE_ID || '').trim(),
  whatsappVerify: (process.env.WHATSAPP_VERIFY_TOKEN || '').trim(),
  whatsappPath: (process.env.WHATSAPP_WEBHOOK_PATH || '/api/webhooks/whatsapp').trim(),
  aiKey: (process.env.AI_API_KEY || '').trim(),
  aiBaseUrl: (process.env.AI_BASE_URL || 'https://api.openai.com/v1').trim(),
  aiModel: (process.env.AI_MODEL || 'gpt-4o-mini').trim(),
  clinicName: (process.env.CLINIC_NAME || 'Xtobe Demo Clinic').trim(),
  currency: (process.env.CLINIC_CURRENCY || 'AED').trim(),
};

const db = connect(cfg.dbFile);
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(ROOT, 'public'), { extensions: ['html'] }));

/* modules */
const P = protect(db, cfg);
const Leads = leadsMod(db);
const Gate = aigateMod(db);
const Video = videoMod(db, cfg);

const nowIso = () => new Date().toISOString();
const todayIso = () => new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ *
 * data helpers
 * ------------------------------------------------------------------ */

function upsertClient(phone, name, channel) {
  const existing = db.prepare('SELECT * FROM clients WHERE phone = ?').get(phone);
  if (existing) {
    if (name && !existing.name) db.prepare('UPDATE clients SET name = ? WHERE id = ?').run(name, existing.id);
    return db.prepare('SELECT * FROM clients WHERE id = ?').get(existing.id);
  }
  const info = db.prepare(
    'INSERT INTO clients (phone, name, channel, created_at) VALUES (?, ?, ?, ?)'
  ).run(phone, name || null, channel || 'whatsapp', nowIso());
  return db.prepare('SELECT * FROM clients WHERE id = ?').get(info.lastInsertRowid);
}

function upsertConversation(clientId, channel) {
  let conv = db.prepare('SELECT * FROM conversations WHERE client_id = ? AND channel = ?').get(clientId, channel);
  if (conv) return conv;
  const info = db.prepare(
    'INSERT INTO conversations (client_id, channel, created_at) VALUES (?, ?, ?)'
  ).run(clientId, channel, nowIso());
  return db.prepare('SELECT * FROM conversations WHERE id = ?').get(info.lastInsertRowid);
}

function addMessage(convId, direction, body, opts = {}) {
  const info = db.prepare(
    `INSERT INTO messages (conversation_id, direction, channel, body, label, status, provider_id, meta, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    convId, direction, opts.channel || 'whatsapp', body,
    opts.label || 'via xtobe-2', opts.status || 'sent',
    opts.providerId || null, opts.meta ? JSON.stringify(opts.meta) : null, nowIso()
  );
  db.prepare('UPDATE conversations SET last_message = ?, last_message_at = ? WHERE id = ?')
    .run(String(body).slice(0, 200), nowIso(), convId);
  if (direction === 'in') {
    db.prepare('UPDATE conversations SET unread = unread + 1 WHERE id = ?').run(convId);
  } else {
    db.prepare('UPDATE conversations SET unread = 0 WHERE id = ?').run(convId);
  }
  return db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);
}

function clientView(c) {
  if (!c) return null;
  return {
    id: c.id, name: c.name || 'Unknown',
    phone_masked: wa.maskPhone(c.phone),
    channel: c.channel, handle: c.handle,
    last_visit: c.last_visit, notes: c.notes,
    consent: !!c.consent,
  };
}

/* Inbound webhook → DB. Keeps the same consent spirit as xtobe-1: nothing is
 * auto-replied; clinic staff answer personally from the dashboard. */
function ingestInbound(item) {
  const client = upsertClient(item.from, item.name, item.channel);
  const conv = upsertConversation(client.id, item.channel);
  const msg = addMessage(conv.id, 'in', item.text, {
    channel: item.channel, providerId: item.providerId, status: 'delivered',
    meta: { field: item.field || null, phoneId: item.phoneId || null },
  });
  return { client: clientView(client), conversationId: conv.id, messageId: msg.id };
}

/* ------------------------------------------------------------------ *
 * routes — health + whatsapp webhook
 * ------------------------------------------------------------------ */

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'xtobe-2',
    clinic: cfg.clinicName,
    whatsapp_configured: Boolean(cfg.whatsappToken && cfg.whatsappPhoneId),
    verify_token_set: Boolean(cfg.whatsappVerify),
    ai_configured: Boolean(cfg.aiKey),
    db: path.basename(cfg.dbFile),
    time: nowIso(),
  });
});

/* Meta handshake (GET hub.challenge) */
app.get(cfg.whatsappPath, (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && cfg.whatsappVerify && token === cfg.whatsappVerify) {
    return res.status(200).type('text/plain').send(String(challenge || ''));
  }
  return res.status(403).json({ ok: false, error: 'verify_failed' });
});

/* Meta inbound */
app.post(cfg.whatsappPath, (req, res) => {
  res.status(200).json({ ok: true });           // answer Meta immediately
  try {
    const items = wa.parseWebhook(req.body || {});
    for (const item of items) ingestInbound(item);
    if (items.length) console.log(`[webhook] ${items.length} inbound message(s)`);
  } catch (err) {
    console.error('[webhook] failed:', err.message);
  }
});


/* ------------------------------------------------------------------ *
 * routes — inbox + send
 * ------------------------------------------------------------------ */

app.get('/api/inbox', (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, cl.name AS client_name, cl.phone AS client_phone,
           cl.last_visit AS client_last_visit, cl.notes AS client_notes, cl.consent AS client_consent
    FROM conversations c
    JOIN clients cl ON cl.id = c.client_id
    ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
  `).all();
  res.json({
    ok: true,
    count: rows.length,
    conversations: rows.map((r) => ({
      id: r.id,
      client_id: r.client_id,
      name: r.client_name || 'Unknown',
      phone_masked: wa.maskPhone(r.client_phone),
      channel: r.channel,
      consent: !!r.client_consent,
      unread: r.unread,
      last_message: r.last_message,
      last_message_at: r.last_message_at,
      last_visit: r.client_last_visit,
      notes: r.client_notes,
    })),
  });
});

app.get('/api/conversations/:id', (req, res) => {
  const id = Number(req.params.id);
  const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
  if (!conv) return res.status(404).json({ ok: false, error: 'not_found' });
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(conv.client_id);
  const messages = db.prepare(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC LIMIT 300'
  ).all(id);
  const upcoming = db.prepare(
    `SELECT * FROM appointments WHERE client_id = ? AND status = 'booked' AND start_at >= ?
     ORDER BY start_at ASC LIMIT 5`
  ).all(conv.client_id, nowIso());
  db.prepare('UPDATE conversations SET unread = 0 WHERE id = ?').run(id);
  res.json({ ok: true, conversation: conv, client: clientView(client), messages, upcoming });
});

app.post('/api/send', async (req, res) => {
  const body = req.body || {};
  const text = body.text;
  const convId = body.conversation_id;
  if (!text || (!body.to && !convId)) {
    return res.status(400).json({ ok: false, error: 'need conversation_id or to, plus text' });
  }
  let conv = null;
  if (convId) conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(Number(convId));
  if (!conv && body.to) {
    const client = upsertClient(String(body.to).replace(/\D/g, ''), null, body.channel || 'whatsapp');
    conv = upsertConversation(client.id, body.channel || 'whatsapp');
  }
  if (!conv) return res.status(404).json({ ok: false, error: 'conversation_not_found' });

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(conv.client_id);
  let status = 'queued';
  let providerId = null;
  let warning = null;

  if (conv.channel === 'whatsapp') {
    try {
      const out = await wa.sendWhatsApp(cfg, client.phone, text);
      status = 'sent';
      providerId = out.providerId;
    } catch (err) {
      status = 'failed';
      warning = err.code === 'not_configured'
        ? 'WhatsApp not configured yet — message saved locally only.'
        : err.message;
    }
  } else {
    warning = conv.channel + ' sending needs Meta App Review — message saved locally only.';
  }

  const msg = addMessage(conv.id, 'out', text, {
    channel: conv.channel, status, providerId, meta: warning ? { warning } : null,
  });
  res.json({ ok: true, status, providerId, warning, message: msg, conversation_id: conv.id });
});

/* ------------------------------------------------------------------ *
 * routes — appointments
 * ------------------------------------------------------------------ */

app.get('/api/appointments', (req, res) => {
  const date = req.query.date || todayIso();
  const rows = db.prepare(`
    SELECT a.*, cl.name AS client_name, cl.phone AS client_phone
    FROM appointments a LEFT JOIN clients cl ON cl.id = a.client_id
    WHERE substr(a.start_at, 1, 10) = ?
    ORDER BY a.start_at ASC
  `).all(date);
  res.json({
    ok: true, date, count: rows.length,
    appointments: rows.map((r) => Object.assign({}, r, {
      client_name: r.client_name || 'Walk-in',
      phone_masked: r.client_phone ? wa.maskPhone(r.client_phone) : null,
    })),
  });
});

app.post('/api/appointments', async (req, res) => {
  const b = req.body || {};
  if (!b.service || !b.start_at) {
    return res.status(400).json({ ok: false, error: 'service_and_start_at_required' });
  }
  let clientId = b.client_id ? Number(b.client_id) : null;
  if (!clientId && b.phone) {
    const c = upsertClient(String(b.phone).replace(/\D/g, ''), b.name || null, 'whatsapp');
    clientId = c.id;
  }
  const info = db.prepare(
    `INSERT INTO appointments (client_id, service, staff, price_aed, start_at, duration_min, status, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'booked', 'dashboard', ?)`
  ).run(clientId, b.service, b.staff || null, b.price_aed || null, b.start_at,
        Number(b.duration_min || 60), nowIso());
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(info.lastInsertRowid);

  let confirmation = null;
  let warning = null;
  if (b.notify !== false && clientId) {
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
    if (client && client.phone) {
      const when = new Date(b.start_at).toLocaleString('en-GB', {
        weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      });
      const text = `Hi ${client.name || 'there'} - your ${b.service} at ${cfg.clinicName} ` +
        `is booked for ${when}. Reply CANCEL if you need to change it.`;
      const conv = upsertConversation(client.id, 'whatsapp');
      let status = 'queued';
      try {
        if (cfg.whatsappToken && cfg.whatsappPhoneId) {
          const out = await wa.sendWhatsApp(cfg, client.phone, text);
          status = 'sent';
          confirmation = out.providerId;
        } else {
          warning = 'WhatsApp not configured - confirmation saved but not sent.';
        }
      } catch (err) { status = 'failed'; warning = err.message; }
      addMessage(conv.id, 'out', text, {
        channel: 'whatsapp', status, providerId: confirmation, meta: warning ? { warning } : null,
      });
    }
  }
  res.json({ ok: true, appointment: appt, sent: !!confirmation, warning });
});

app.post('/api/appointments/:id/cancel', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
  db.prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ?").run(id);
  res.json({ ok: true, id, status: 'cancelled' });
});

/* ------------------------------------------------------------------ *
 * routes — clients (notes / consent)
 * ------------------------------------------------------------------ */

app.get('/api/clients', (req, res) => {
  const rows = db.prepare('SELECT * FROM clients ORDER BY id DESC LIMIT 200').all();
  res.json({ ok: true, clients: rows.map(clientView) });
});

app.patch('/api/clients/:id', (req, res) => {
  const id = Number(req.params.id);
  const cur = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  if (!cur) return res.status(404).json({ ok: false, error: 'not_found' });
  const b = req.body || {};
  db.prepare('UPDATE clients SET name = ?, notes = ?, consent = ?, last_visit = ? WHERE id = ?').run(
    b.name !== undefined ? b.name : cur.name,
    b.notes !== undefined ? b.notes : cur.notes,
    b.consent !== undefined ? (b.consent ? 1 : 0) : cur.consent,
    b.last_visit !== undefined ? b.last_visit : cur.last_visit,
    id
  );
  res.json({ ok: true, client: clientView(db.prepare('SELECT * FROM clients WHERE id = ?').get(id)) });
});

/* ------------------------------------------------------------------ *
 * routes — AI content studio
 * ------------------------------------------------------------------ */

app.post('/api/content/generate', async (req, res) => {
  const b = req.body || {};
  const kind = ['reel', 'post', 'story', 'calendar'].includes(b.kind) ? b.kind : 'reel';
  const topic = String(b.topic || 'signature facial treatment').slice(0, 300);
  const out = await content.generate(cfg, kind, topic);
  res.json({ ok: true, kind, topic, ai_configured: Boolean(cfg.aiKey), result: out });
});

app.get('/api/content/queue', (req, res) => {
  const rows = db.prepare('SELECT * FROM content_queue ORDER BY COALESCE(scheduled_at, created_at) ASC LIMIT 100').all();
  res.json({ ok: true, queue: rows });
});

app.post('/api/content/queue', (req, res) => {
  const b = req.body || {};
  const info = db.prepare(
    `INSERT INTO content_queue (kind, caption, hashtags, body, scheduled_at, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    b.kind || 'reel', b.caption || null,
    Array.isArray(b.hashtags) ? b.hashtags.join(' ') : (b.hashtags || null),
    b.body || null, b.scheduled_at || null, b.scheduled_at ? 'scheduled' : 'draft', nowIso()
  );
  res.json({ ok: true, item: db.prepare('SELECT * FROM content_queue WHERE id = ?').get(info.lastInsertRowid) });
});

app.delete('/api/content/queue/:id', (req, res) => {
  db.prepare('DELETE FROM content_queue WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ *
 * routes — stats (top bar)
 * ------------------------------------------------------------------ */

app.get('/api/stats', (req, res) => {
  const today = todayIso();
  const one = (sql, ...args) => {
    const row = db.prepare(sql).get(...args);
    return row ? Object.values(row)[0] : 0;
  };
  res.json({
    ok: true,
    clinic: cfg.clinicName,
    currency: cfg.currency,
    conversations: one('SELECT COUNT(*) AS v FROM conversations'),
    unread: one('SELECT COALESCE(SUM(unread),0) AS v FROM conversations'),
    messages_in: one("SELECT COUNT(*) AS v FROM messages WHERE direction='in'"),
    messages_out: one("SELECT COUNT(*) AS v FROM messages WHERE direction='out'"),
    appointments_today: one(
      "SELECT COUNT(*) AS v FROM appointments WHERE substr(start_at,1,10)=? AND status='booked'", today
    ),
    revenue_today: one(
      "SELECT COALESCE(SUM(price_aed),0) AS v FROM appointments WHERE substr(start_at,1,10)=? AND status='booked'", today
    ),
    clients: one('SELECT COUNT(*) AS v FROM clients'),
    queue: one('SELECT COUNT(*) AS v FROM content_queue'),
    channels: {
      whatsapp: true,
      instagram: Boolean((process.env.INSTAGRAM_TOKEN || '').trim()),
      facebook: Boolean((process.env.FACEBOOK_PAGE_TOKEN || '').trim()),
    },
  });
});

/* ------------------------------------------------------------------ *
 * routes — data protection (PDPL): export / erase / consent / audit
 * ------------------------------------------------------------------ */

app.get('/api/privacy/status', (req, res) => res.json({ ok: true, ...P.status() }));

app.get('/api/privacy/export/:clientId', (req, res) => {
  const data = P.exportClient(Number(req.params.clientId));
  if (!data) return res.status(404).json({ ok: false, error: 'not_found' });
  res.setHeader('Content-Disposition', `attachment; filename="client-${req.params.clientId}-data.json"`);
  res.json(data);
});

app.delete('/api/privacy/erase/:clientId', (req, res) => {
  res.json(P.eraseClient(Number(req.params.clientId), (req.body || {}).reason));
});

app.post('/api/privacy/consent/:clientId', (req, res) => {
  const b = req.body || {};
  res.json(P.setConsent(Number(req.params.clientId), !!b.granted, b.source));
});

app.post('/api/privacy/purge', (req, res) => {
  res.json(P.purgeOld((req.body || {}).days));
});

app.get('/api/privacy/audit', (req, res) => {
  const rows = db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 100').all();
  res.json({ ok: true, count: rows.length, entries: rows });
});

/* ------------------------------------------------------------------ *
 * routes — leads pipeline
 * ------------------------------------------------------------------ */

app.get('/api/leads', (req, res) => {
  res.json({ ok: true, leads: Leads.listLeads(req.query) });
});

app.post('/api/leads', (req, res) => {
  try { res.json({ ok: true, lead: Leads.createLead(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

app.patch('/api/leads/:id', (req, res) => {
  const b = req.body || {};
  try {
    if (b.status) return res.json({ ok: true, lead: Leads.updateStatus(req.params.id, b.status) });
    if (b.note) return res.json({ ok: true, notes: Leads.addNote(req.params.id, b.note) });
    res.status(400).json({ ok: false, error: 'need status or note' });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

app.get('/api/leads/stats', (req, res) => res.json({ ok: true, ...Leads.stats() }));

/* ------------------------------------------------------------------ *
 * routes — AI Creator gate + billing (LOCKED pricing, see .roorules)
 * ------------------------------------------------------------------ */

app.get('/api/ai/check-access', (req, res) => {
  res.json({ ok: true, ...Gate.checkAccess(req.query.clinic_id || 'default') });
});

app.post('/api/ai/confirm-extra', (req, res) => {
  res.json({ ok: true, ...Gate.confirmExtra((req.body || {}).clinic_id || 'default') });
});

app.post('/api/ai/activate-addon', (req, res) => {
  res.json({ ok: true, ...Gate.activateAddon((req.body || {}).clinic_id || 'default') });
});

app.post('/api/ai/set-plan', (req, res) => {
  try { res.json({ ok: true, ...Gate.setPlan((req.body || {}).clinic_id || 'default', (req.body || {}).plan) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

/* ------------------------------------------------------------------ *
 * routes — AI Video Creator (approval-gated)
 * ------------------------------------------------------------------ */

app.post('/api/videos/upload', (req, res) => {
  // metadata-only registration; actual file lands via static upload handler below
  const b = req.body || {};
  if (!b.source_file) return res.status(400).json({ ok: false, error: 'source_file required' });
  let gate;
  try { gate = Gate.beforeGenerate(b.clinic_id || 'default'); }
  catch (e) {
    return res.status(403).json({ ok: false, code: e.code || 'UPGRADE_REQUIRED', error: e.message, access: e.access });
  }
  if (gate.needs_payment) {
    return res.status(402).json({ ok: false, code: 'PAYMENT_REQUIRED', amount_aed: 49, access: gate.access });
  }
  const proj = Video.createProject(b);
  res.json({ ok: true, project: proj, gate });
});

app.post('/api/videos/:id/generate', async (req, res) => {
  const proj = Video.getProject(req.params.id);
  if (!proj) return res.status(404).json({ ok: false, error: 'not_found' });
  let gate;
  try { gate = Gate.beforeGenerate(proj.clinic_id || 'default'); }
  catch (e) {
    return res.status(403).json({ ok: false, code: e.code || 'UPGRADE_REQUIRED', error: e.message, access: e.access });
  }
  if (gate.needs_payment) {
    return res.status(402).json({ ok: false, code: 'PAYMENT_REQUIRED', amount_aed: 49, access: gate.access });
  }
  const result = await Video.runPipeline(req.params.id);
  if (result.ok) Gate.recordUsage(proj.clinic_id || 'default');
  res.json(result);
});

app.post('/api/videos/:id/approve', (req, res) => {
  res.json({ ok: true, project: Video.approve(req.params.id, (req.body || {}).staff) });
});

app.post('/api/videos/:id/reject', (req, res) => {
  res.json({ ok: true, project: Video.reject(req.params.id, (req.body || {}).reason) });
});

app.get('/api/videos', (req, res) => {
  res.json({ ok: true, projects: Video.listProjects(req.query) });
});

app.use('/api/videos/files', express.static(Video.VIDEOS_DIR));

/* ------------------------------------------------------------------ *
 * boot
 * ------------------------------------------------------------------ */

if (require.main === module) {
  const server = app.listen(cfg.port, () => {
    const w = cfg.whatsappToken && cfg.whatsappPhoneId;
    console.log('');
    console.log('  XTOBE-2 - CLINIC OPERATIONS');
    console.log(`  ${cfg.clinicName}`);
    console.log('');
    console.log(`  dashboard      http://localhost:${cfg.port}/`);
    console.log(`  appointments   http://localhost:${cfg.port}/appointments`);
    console.log(`  content studio http://localhost:${cfg.port}/content`);
    console.log(`  health         http://localhost:${cfg.port}/api/health`);
    console.log(`  whatsapp hook  http://localhost:${cfg.port}${cfg.whatsappPath}`);
    console.log(`  whatsapp       ${w ? 'configured' : 'NOT configured (set WHATSAPP_TOKEN + WHATSAPP_PHONE_ID)'}`);
    console.log(`  ai studio      ${cfg.aiKey ? 'live key' : 'offline templates (set AI_API_KEY)'}`);
    console.log(`  database       ${path.relative(ROOT, cfg.dbFile)}`);
    console.log('');
  });
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = { app, db, cfg, ingestInbound };
