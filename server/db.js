'use strict';
/**
 * Xtobe-2 — SQLite layer.
 * Preferred driver: better-sqlite3 (spec). Fallback: Node's built-in node:sqlite
 * so the platform still runs on machines where native build scripts are blocked
 * (e.g. CI images / npm with install-scripts disabled). Same query API either way.
 *
 * Tables: clients, conversations, messages, appointments, content_queue, settings.
 */
const fs = require('fs');
const path = require('path');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL UNIQUE,
  name TEXT,
  channel TEXT DEFAULT 'whatsapp',
  handle TEXT,
  last_visit TEXT,
  notes TEXT,
  consent INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  unread INTEGER DEFAULT 0,
  last_message TEXT,
  last_message_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (client_id, channel)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  body TEXT NOT NULL,
  label TEXT DEFAULT 'via xtobe-2',
  status TEXT DEFAULT 'sent',
  provider_id TEXT,
  meta TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  service TEXT NOT NULL,
  staff TEXT,
  price_aed REAL,
  start_at TEXT NOT NULL,
  duration_min INTEGER DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'booked',
  source TEXT DEFAULT 'whatsapp',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL DEFAULT 'reel',
  caption TEXT,
  hashtags TEXT,
  body TEXT,
  scheduled_at TEXT,
  status TEXT DEFAULT 'draft',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  target TEXT,
  actor TEXT DEFAULT 'system',
  detail TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clinics (
  id TEXT PRIMARY KEY,
  name TEXT,
  plan TEXT DEFAULT 'growth',
  ai_creator_enabled INTEGER DEFAULT 0,
  ai_videos_used INTEGER DEFAULT 0,
  ai_videos_limit INTEGER DEFAULT 0,
  ai_extra_count INTEGER DEFAULT 0,
  usage_month TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone_masked TEXT,
  phone_hash TEXT,
  source TEXT DEFAULT 'website',
  service TEXT,
  notes TEXT,
  channel TEXT DEFAULT 'whatsapp',
  status TEXT DEFAULT 'new',
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS lead_notes (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS video_projects (
  id TEXT PRIMARY KEY,
  clinic_id TEXT DEFAULT 'default',
  name TEXT,
  status TEXT DEFAULT 'uploaded',
  source_file TEXT,
  offer_text TEXT,
  style TEXT DEFAULT 'luxury',
  language TEXT DEFAULT 'en',
  voice TEXT DEFAULT 'female',
  script TEXT,
  caption_en TEXT,
  caption_ar TEXT,
  hashtags TEXT,
  output_file TEXT,
  thumb_file TEXT,
  approved_by TEXT,
  approved_at TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_appt_start ON appointments(start_at);
`;

/** Wrap node:sqlite so it looks like better-sqlite3 for our call sites. */
function wrapNodeSqlite(DatabaseSync) {
  return function open(file) {
    const db = new DatabaseSync(file);
    const norm = (r) => {
      if (!r || typeof r !== 'object') return r;
      if (typeof r.lastInsertRowid === 'bigint') r.lastInsertRowid = Number(r.lastInsertRowid);
      return r;
    };
    return {
      _driver: 'node:sqlite',
      exec: (sql) => db.exec(sql),
      pragma: (s) => { try { db.exec(`PRAGMA ${s}`); } catch { /* ignore */ } },
      prepare: (sql) => {
        const st = db.prepare(sql);
        const bind = (args) => args.map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v === undefined ? null : v));
        return {
          get: (...a) => st.get(...bind(a)),
          all: (...a) => st.all(...bind(a)),
          run: (...a) => norm(st.run(...bind(a))),
        };
      },
      close: () => db.close(),
    };
  };
}

function resolveDriver() {
  try {
    const BS = require('better-sqlite3');
    /* verify the native binding actually loads, not just the JS wrapper */
    const probe = new BS(':memory:');
    probe.exec('CREATE TABLE IF NOT EXISTS probe (a INTEGER)');
    probe.close();
    return { open: (f) => { const d = new BS(f); d._driver = 'better-sqlite3'; return d; }, name: 'better-sqlite3' };
  } catch (err) {
    try {
      const { DatabaseSync } = require('node:sqlite');
      const open = wrapNodeSqlite(DatabaseSync);
      const probe = open(':memory:');
      probe.exec('CREATE TABLE IF NOT EXISTS probe (a INTEGER)');
      probe.close();
      return { open, name: 'node:sqlite', reason: err.message.split('\n')[0] };
    } catch (err2) {
      throw new Error(
        'No SQLite driver available. Install better-sqlite3 (npm i better-sqlite3) ' +
        'or use Node >= 22.5 for the built-in node:sqlite. Detail: ' + err2.message
      );
    }
  }
}

const DRIVER = resolveDriver();

function connect(dbFile) {
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  const db = DRIVER.open(dbFile);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

module.exports = { connect, DRIVER, SCHEMA };
