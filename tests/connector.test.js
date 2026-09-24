const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const { connect } = require('../server/db');
const { recordInboundMessage, getInboxRows, getConversationDetail, buildStats } = require('../server/connector');

function makeTempDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xtobe-connector-'));
  return path.join(dir, 'db.sqlite');
}

test('recordInboundMessage creates client, conversation and message', () => {
  const file = makeTempDb();
  const db = connect(file);

  recordInboundMessage(db, {
    from: '971500000001',
    text: 'Hello from WhatsApp',
    channel: 'whatsapp',
    name: 'Test Client',
    providerId: 'wamsg-123',
    phoneId: '123',
  });

  const client = db.prepare('SELECT * FROM clients WHERE phone = ?').get('971500000001');
  assert.ok(client, 'client should exist');
  const conversation = db.prepare('SELECT * FROM conversations WHERE client_id = ?').get(client.id);
  assert.ok(conversation, 'conversation should exist');
  const message = db.prepare('SELECT * FROM messages WHERE conversation_id = ?').get(conversation.id);
  assert.equal(message.body, 'Hello from WhatsApp');
  assert.equal(message.direction, 'in');

  const stats = buildStats(db);
  assert.equal(stats.unread, 1);
  assert.equal(stats.appointments_today, 0);
  db.close();
});

test('getInboxRows and conversation detail return the active thread summary', () => {
  const file = makeTempDb();
  const db = connect(file);

  recordInboundMessage(db, {
    from: '971500000002',
    text: 'I need a booking',
    channel: 'whatsapp',
    name: 'Booking Client',
    providerId: 'wamsg-456',
    phoneId: '456',
  });

  const inbox = getInboxRows(db);
  assert.equal(inbox.length, 1);
  assert.equal(inbox[0].last_message, 'I need a booking');

  const detail = getConversationDetail(db, inbox[0].id);
  assert.equal(detail.messages.length, 1);
  assert.equal(detail.client.name, 'Booking Client');
  db.close();
});
