// XTOBE FILE GUARD — STRICT, no looping (Super Model skill: protect-files)
// Usage: node file-guard-strict.js [check|guard <relpath> <contentFile>]
//   check ......... verify protected files on disk meet strict rules (0 failures = OK)
//   guard ......... validate a pending write: node file-guard-strict.js guard public/true-app.html C:\temp\new.html
// Every BLOCK is appended to data/guard-blocked.log. Every ALLOW backs up to data/backups/.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROJECT_ROOT = 'C:/Users/Nishan/Xtobe/xtobe-2';
const DATA = path.join(PROJECT_ROOT, 'pc-agent', 'data');
const BACKUP_DIR = path.join(DATA, 'backups');
const BLOCK_LOG = path.join(DATA, 'guard-blocked.log');

const RULES = [
  {
    file: 'server/index.js',
    minLines: 800, maxLines: 900,
    mustContain: ['/health', '/api/appointments', '/api/auth', '/api/brand/session'],
    forbid: ['while(true)', 'WHATSAPP_TOKEN='],
  },
  {
    file: 'public/true-app.html',
    minLines: 40, maxLines: 500,
    mustContain: ['LOCAL ONLY', 'SECURE LOCAL'],
    forbid: ['onrender.com/api/pc-results', 'fetch(`${BRIDGE}/api/pc-commands`'],
  },
  {
    file: 'pc-agent/pc-agent.js',
    minLines: 150, maxLines: 600,
    mustContain: ['firstPoll', 'POLL_INTERVAL', 'share_feeling'],
    forbid: ['while(true)'],
  },
];

function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function logBlock(msg) {
  fs.mkdirSync(DATA, { recursive: true });
  fs.appendFileSync(BLOCK_LOG, `${new Date().toISOString()} BLOCKED ${msg}\n`);
}
function checkContent(rel, content, opts) {
  const rule = RULES.find(r => r.file === rel);
  if (!rule) return { ok: true, reason: 'no-rule — allowed' };
  for (const f of rule.forbid) {
    if (content.includes(f)) { logBlock(`${rel} forbid-pattern: ${f}`); return { ok: false, reason: `forbid pattern: ${f}` }; }
  }
  for (const m of rule.mustContain) {
    if (!content.includes(m)) { logBlock(`${rel} missing-required: ${m}`); return { ok: false, reason: `missing required: ${m}` }; }
  }
  const lines = content.split('\n').length;
  if (lines < rule.minLines || lines > rule.maxLines) {
    logBlock(`${rel} line-count ${lines} outside ${rule.minLines}-${rule.maxLines}`);
    return { ok: false, reason: `lines ${lines} outside ${rule.minLines}-${rule.maxLines} (Hermes slim/loop suspected)` };
  }
  // Cline loop detection — ONLY for pending bridge writes (guard mode), never for check mode.
  // check mode reads the file already on disk, so sha always matches itself — skip there.
  if (opts && opts.isPendingWrite) {
    try {
      const fp = path.join(PROJECT_ROOT, rel);
      if (fs.existsSync(fp)) {
        const cur = fs.readFileSync(fp, 'utf8');
        if (sha256(cur) === sha256(content)) {
          const ageMs = Date.now() - fs.statSync(fp).mtimeMs;
          if (ageMs < 60000) { logBlock(`${rel} same-sha256 within 60s (looping)`); return { ok: false, reason: 'same sha256 within 60s — looping, stop' }; }
        }
      }
    } catch (e) { /* best effort */ }
  }
  return { ok: true, reason: 'strict PASS' };
}
function backup(rel) {
  try {
    const fp = path.join(PROJECT_ROOT, rel);
    if (!fs.existsSync(fp)) return;
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(fp, path.join(BACKUP_DIR, `${rel.replace(/\//g, '_')}.${stamp}.bak`));
  } catch (e) { /* best effort */ }
}

const mode = process.argv[2] || 'check';
if (mode === 'check') {
  let fails = 0;
  for (const r of RULES) {
    const fp = path.join(PROJECT_ROOT, r.file);
    if (!fs.existsSync(fp)) { console.log(`FAIL  ${r.file} — missing`); fails++; continue; }
    const res = checkContent(r.file, fs.readFileSync(fp, 'utf8'));
    console.log(`${res.ok ? 'PASS' : 'FAIL'}  ${r.file} — ${res.reason}`);
    if (!res.ok) fails++;
  }
  console.log(fails === 0 ? '\nGUARD: 0 failures — strict OK' : `\nGUARD: ${fails} failures — BLOCKED`);
  process.exit(fails ? 1 : 0);
} else if (mode === 'guard') {
  const rel = process.argv[3], contentFile = process.argv[4];
  if (!rel || !contentFile) { console.error('usage: node file-guard-strict.js guard <relpath> <contentFile>'); process.exit(2); }
  const content = fs.readFileSync(contentFile, 'utf8');
  const res = checkContent(rel, content, { isPendingWrite: true });
  console.log(`${res.ok ? 'ALLOW' : 'BLOCK'}  ${rel} — ${res.reason}`);
  if (res.ok) backup(rel);
  process.exit(res.ok ? 0 : 1);
} else { console.error('unknown mode: check|guard'); process.exit(2); }
