'use strict';

const crypto = require('node:crypto');

function nowIso() {
  return new Date().toISOString();
}

function generateId(prefix) {
  return `${prefix}-${crypto.randomBytes(6).toString('hex')}`;
}

function maskPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return 'masked';
  if (digits.length <= 4) return `***${digits.slice(-2)}`;
  return `+${digits.slice(0, 2)}***${digits.slice(-4)}`;
}

function ensureClient(db, phone, name, channel) {
  const existing = db.prepare('SELECT * FROM clients WHERE phone = ?').get(String(phone));
  if (existing) {
    if (name && !existing.name) {
      db.prepare('UPDATE clients SET name = ?, channel = ?, updated_at = ? WHERE id = ?').run(name, channel || existing.channel, nowIso(), existing.id);
    }
    return existing;
  }

  const clientId = db.prepare(`
    INSERT INTO clients (phone, name, channel, handle, last_visit, notes, consent, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `).run(String(phone), name || 'New client', channel || 'whatsapp', null, nowIso(), '', nowIso()).lastInsertRowid;

  return db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
}

function recordInboundMessage(db, payload) {
  const { from, text, channel = 'whatsapp', name, providerId, phoneId } = payload || {};
  const phone = String(from || '').replace(/\D/g, '');
  if (!phone || !text) return null;

  const client = ensureClient(db, phone, name || 'New client', channel);
  let conversation = db.prepare('SELECT * FROM conversations WHERE client_id = ? AND channel = ?').get(client.id, channel);
  if (!conversation) {
    const result = db.prepare(`
      INSERT INTO conversations (client_id, channel, unread, last_message, last_message_at, created_at)
      VALUES (?, ?, 1, ?, ?, ?)
    `).run(client.id, channel, String(text).slice(0, 500), nowIso(), nowIso());
    conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(result.lastInsertRowid);
  } else {
    db.prepare('UPDATE conversations SET unread = unread + 1, last_message = ?, last_message_at = ? WHERE id = ?')
      .run(String(text).slice(0, 500), nowIso(), conversation.id);
    conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversation.id);
  }

  db.prepare(`
    INSERT INTO messages (conversation_id, direction, channel, body, label, status, provider_id, meta, created_at)
    VALUES (?, 'in', ?, ?, 'via xtobe-2', 'received', ?, ?, ?)
  `).run(conversation.id, channel, String(text).slice(0, 4000), providerId || null, JSON.stringify({ phoneId: phoneId || null }), nowIso());

  return { client, conversation };
}

function getInboxRows(db) {
  return db.prepare(`
    SELECT c.id, c.client_id, c.channel, c.last_message, c.last_message_at, c.unread,
           cl.name, cl.phone, cl.consent
    FROM conversations c
    JOIN clients cl ON cl.id = c.client_id
    ORDER BY c.last_message_at DESC
  `).all().map((row) => ({
    id: row.id,
    client_id: row.client_id,
    channel: row.channel,
    last_message: row.last_message,
    last_message_at: row.last_message_at,
    unread: row.unread,
    name: row.name || 'Unknown client',
    phone_masked: maskPhone(row.phone),
    consent: !!row.consent,
  }));
}

function createContact(db, payload) {
  const phone = String(payload && payload.phone || '').replace(/\D/g, '');
  const name = String(payload && payload.name || '').trim();
  if (!phone || phone.length < 7) return { ok: false, error: 'A valid phone number is required' };

  const client = ensureClient(db, phone, name || 'New client', 'whatsapp');
  let conversation = db.prepare('SELECT * FROM conversations WHERE client_id = ? AND channel = ?').get(client.id, 'whatsapp');
  if (!conversation) {
    const result = db.prepare(`
      INSERT INTO conversations (client_id, channel, unread, last_message, last_message_at, created_at)
      VALUES (?, 'whatsapp', 0, '', ?, ?)
    `).run(client.id, nowIso(), nowIso());
    conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(result.lastInsertRowid);
  }
  return { ok: true, client, conversation };
}

function getConversationDetail(db, conversationId) {
  const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
  if (!conversation) return { ok: false };
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(conversation.client_id);
  const messages = db.prepare(`
    SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC
  `).all(conversationId).map((m) => ({
    id: m.id,
    direction: m.direction,
    body: m.body,
    channel: m.channel,
    status: m.status,
    provider_id: m.provider_id,
    created_at: m.created_at,
  }));

  return {
    ok: true,
    conversation,
    client: {
      id: client.id,
      name: client.name,
      phone_masked: maskPhone(client.phone),
      consent: !!client.consent,
      notes: client.notes,
      last_visit: client.last_visit,
    },
    messages,
  };
}

function buildStats(db) {
  const unread = db.prepare('SELECT SUM(unread) AS total FROM conversations').get()?.total || 0;
  const appointments_today = db.prepare(`SELECT COUNT(*) AS n FROM appointments WHERE date(start_at) = date('now')`).get()?.n || 0;
  const revenue_today = db.prepare(`SELECT COALESCE(SUM(price_aed), 0) AS total FROM appointments WHERE date(start_at) = date('now') AND status <> 'cancelled'`).get()?.total || 0;
  return {
    ok: true,
    unread,
    appointments_today: Number(appointments_today),
    revenue_today: Number(revenue_today),
    currency: 'AED',
    clinic: 'Xtobe Demo Clinic',
    channels: { whatsapp: true, instagram: false, facebook: false },
  };
}

module.exports = {
  nowIso,
  generateId,
  maskPhone,
  ensureClient,
  recordInboundMessage,
  createContact,
  getInboxRows,
  getConversationDetail,
  buildStats,
};
