'use strict';
/* DB smoke probe (writes results to a log file — easier to read from shells). */
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'data', 'probe-report.txt');
const lines = [];
const log = (...a) => { lines.push(a.join(' ')); };

try {
  const { DRIVER, connect } = require('../server/db');
  const file = path.join(__dirname, '..', 'data', 'probe.db');
  const db = connect(file);
  log('driver: ' + DRIVER.name);
  log('tables: ' + db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map((r) => r.name).join(','));
  db.prepare('INSERT OR IGNORE INTO clients (phone,name,channel,created_at) VALUES (?,?,?,?)')
    .run('971501234567', 'Probe Client', 'whatsapp', new Date().toISOString());
  log('clients: ' + db.prepare('SELECT COUNT(*) AS c FROM clients').get().c);
  if (!db.prepare('SELECT id FROM conversations WHERE client_id=1').get()) {
    db.prepare("INSERT INTO conversations (client_id, channel, created_at) VALUES (1,'whatsapp',?)").run(new Date().toISOString());
  }
  const m = db.prepare("INSERT INTO messages (conversation_id,direction,channel,body,created_at) VALUES (1,'in','whatsapp','probe message',?)").run(new Date().toISOString());
  log('inserted_message_id: ' + m.lastInsertRowid);
  log('messages: ' + db.prepare('SELECT COUNT(*) AS c FROM messages').get().c);
  db.close();
  log('DB PROBE OK');
} catch (err) {
  log('DB PROBE FAILED: ' + err.message);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, lines.join('\n') + '\n');
console.log(lines.join('\n'));
