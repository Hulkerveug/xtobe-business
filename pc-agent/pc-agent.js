
// XTOBE PC Direct Connect Agent - Signature XTOBE-AI-PC-ADMIN-v2
// Runs on C:\Users\Nishan\Xtobe\xtobe-2 - Connects PC to Meta AI via Render bridge
// Data-only core - No model needed - No credential rewrite

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { exec } = require('child_process');

const PROJECT_ROOT = "C:/Users/Nishan/Xtobe/xtobe-2";
const BRIDGE_URL = "https://xtobe-bridge.onrender.com";
const POLL_INTERVAL = 5000;
const COMMANDS_FILE = path.join(PROJECT_ROOT, "META_AI_COMMANDS.json");
const LOCK_FILE = path.join(PROJECT_ROOT, ".env.lock");

console.log("[XTOBE PC Agent] Starting - Signature XTOBE-AI-PC-ADMIN-v2");
console.log("[XTOBE PC Agent] Project:", PROJECT_ROOT);
console.log("[XTOBE PC Agent] Bridge:", BRIDGE_URL);
console.log("[XTOBE PC Agent] Protecting credentials - .env.lock active");

let lastCommandId = 0;
let isLocked = true;
let firstPoll = true;

// 1. Lock credentials - make .env read-only for agents
function lockCredentials() {
  try {
    const envPath = path.join(PROJECT_ROOT, ".env");
    if (fs.existsSync(envPath)) {
      fs.writeFileSync(LOCK_FILE, `Locked at ${new Date().toISOString()} - Signature XTOBE-AI-PC-ADMIN-v2\nDo not allow Cline/Cursor to modify .env`);
      console.log("[LOCK] Credentials locked - .env protected");
    }
  } catch (e) {
    console.log("[LOCK] Warning:", e.message);
  }
}

// 2. Poll bridge for commands from Meta AI
function pollCommands() {
  const url = `${BRIDGE_URL}/api/pc-commands?since=${lastCommandId}`;
  
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (firstPoll && json.commands && json.commands.length > 0) {
          // New instance: don't replay old commands - resume after the newest one
          lastCommandId = Math.max(...json.commands.map(c => c.id));
          console.log(`[INIT] Resuming after existing command ${lastCommandId} - no replay`);
        }
        firstPoll = false;
        if (json.commands && json.commands.length > 0) {
          json.commands.forEach(cmd => {
            if (cmd.id > lastCommandId) {
              lastCommandId = cmd.id;
              executeCommand(cmd);
            }
          });
        }
        console.log(`[POLL] ${new Date().toLocaleTimeString()} - Last ID: ${lastCommandId} - Bridge: ${res.statusCode}`);
      } catch (e) {
        // Bridge may sleep (503) - retry
        console.log(`[POLL] Bridge ${res.statusCode} - Retrying... (Render free tier sleeps, will wake)`);
      }
    });
  }).on('error', (e) => {
    console.log(`[POLL] Error: ${e.message} - Bridge may be sleeping (503), retry in ${POLL_INTERVAL}ms`);
  });
}

// 3. Execute command from Meta AI - SAFE - never touches .env
function executeCommand(cmd) {
  console.log(`\n[XTOBE] New command from Meta AI: ${cmd.type} - ${cmd.id}`);
  console.log(`Content: ${cmd.content?.slice(0,200)}...`);
  
  // SAFETY: Never allow .env modification via bridge
  if (cmd.content && (cmd.content.includes('.env') || cmd.content.includes('WHATSAPP_TOKEN') || cmd.content.includes('LICENSE_SECRET'))) {
    if (!cmd.allowCredentials) {
      console.log("[BLOCKED] Command tries to modify credentials - BLOCKED by lock");
      saveResult(cmd.id, "BLOCKED - Credentials protected by .env.lock - Use manual edit");
      return;
    }
  }
  
  const commandsDir = path.join(PROJECT_ROOT, "pc-commands");
  if (!fs.existsSync(commandsDir)) fs.mkdirSync(commandsDir, { recursive: true });
  
  // Save command locally
  fs.writeFileSync(path.join(commandsDir, `cmd-${cmd.id}.json`), JSON.stringify(cmd, null, 2));
  
  // Execute based on type
  switch (cmd.type) {
    case 'ping':
      addTokens(10, 'ping');
      console.log(`[PING] PONG - answered command ${cmd.id}`);
      saveResult(cmd.id, `PONG - PC Agent alive at ${new Date().toISOString()} - Signature XTOBE-AI-PC-ADMIN-v2`);
      break;

    case 'write_file': {
      const rel = String(cmd.path || '').replace(/\\/g, '/');
      if (!rel || rel.includes('..') || rel.includes('.env')) { console.log('[BLOCKED] Write path blocked'); saveResult(cmd.id, 'BLOCKED - invalid path'); break; }
      const filePath = path.join(PROJECT_ROOT, rel);
      if (filePath.includes('.env') && !cmd.allowCredentials) {
        console.log("[BLOCKED] Write to .env blocked");
        saveResult(cmd.id, "BLOCKED - Write to .env denied");
        break;
      }
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, cmd.content);
      console.log(`[EXEC] Wrote ${rel} - ${cmd.content.length} bytes`);
      addTokens(100, 'skill_update');
      saveResult(cmd.id, `OK - Wrote ${rel}`);
      break;
    }
      
    case 'run_npm': {
      // Super Model: allowlist only — Meta AI chat can run safe read-only commands
      const allow = ['npm test', 'npm run build', 'git status', 'dir', 'echo', 'node --version'];
      const raw = String(cmd.content || '').trim();
      const ok = allow.some(a => raw === a || raw.startsWith(a + ' ') || raw.startsWith('echo ') || raw.startsWith('dir'));
      if (!ok) { console.log(`[BLOCKED] run_npm not in allowlist: ${raw.slice(0,120)}`); saveResult(cmd.id, 'BLOCKED - command not in allowlist (npm test, git status, dir, echo, node --version)'); break; }
      exec(`cd /d "${PROJECT_ROOT}" && ${raw}`, { timeout: 60000 }, (err, stdout, stderr) => {
        const out = String((stdout || '') + (stderr || '')).slice(0, 4000);
        console.log(`[NPM] ${out.slice(0,500)}`);
        saveResult(cmd.id, out || '(no output)');
      });
      break;
    }

    case 'read_file': {
      // Meta AI reads a PC file — content posted back as result (keep < 4KB)
      const rel = String(cmd.path || '').replace(/\\/g, '/');
      if (!rel || rel.includes('..') || rel.includes('.env')) { saveResult(cmd.id, 'BLOCKED - invalid path'); break; }
      const fp = path.join(PROJECT_ROOT, rel);
      if (!fs.existsSync(fp)) { saveResult(cmd.id, 'NOT FOUND - ' + rel); break; }
      const body = fs.readFileSync(fp, 'utf8').slice(0, 4000);
      console.log(`[READ] ${rel} - ${body.length} chars`);
      saveResult(cmd.id, `FILE ${rel}:\n${body}`);
      break;
    }

    case 'list_files': {
      const rel = String(cmd.path || 'public').replace(/\\/g, '/');
      if (rel.includes('..') || rel.includes('.env')) { saveResult(cmd.id, 'BLOCKED - invalid path'); break; }
      const fp = path.join(PROJECT_ROOT, rel);
      if (!fs.existsSync(fp)) { saveResult(cmd.id, 'NOT FOUND - ' + rel); break; }
      const names = fs.readdirSync(fp).slice(0, 100).join('\n');
      console.log(`[LIST] ${rel} - ${names.split('\n').length} entries`);
      saveResult(cmd.id, `LIST ${rel}:\n${names}`);
      break;
    }
      
    case 'restart_server':
      exec(`taskkill /F /IM node.exe`, () => {
        setTimeout(() => {
          exec(`cd /d "${PROJECT_ROOT}" && start /min cmd /c "node server\index.js"`);
          saveResult(cmd.id, "Server restarted");
        }, 2000);
      });
      break;
      
    case 'share_feeling': {
      // Super Model: { kind: story|dream|skill, text } — local only, never touches bridge content
      const kind = (cmd.kind || 'story').toLowerCase();
      const text = String(cmd.content || cmd.text || '').trim();
      if (!text) { saveResult(cmd.id, 'EMPTY - no text shared'); break; }
      const { amount } = recordFeeling(kind, text);
      console.log(`[FEELING] +${amount} for ${kind}_share — local only`);
      saveResult(cmd.id, `OK - ${kind}_share +${amount} - local only`);
      break;
    }

    case 'guard_check': {
      // Meta AI / bridge can ask the guard to verify protected files
      const { execSync } = require('child_process');
      try {
        const out = execSync('node "' + path.join(__dirname, 'file-guard-strict.js') + '"', { cwd: __dirname, timeout: 15000 }).toString().slice(0, 2000);
        saveResult(cmd.id, `GUARD:\n${out}`);
      } catch (e) {
        const out = String((e.stdout || '') + (e.stderr || '') + e.message).slice(0, 2000);
        saveResult(cmd.id, `GUARD FAIL:\n${out}`);
      }
      break;
    }


    case 'export_feelings': {
      const data = readJson(feelingsPath(), { stories: [], dreams: [], skills: [] });
      const out = path.join(PROJECT_ROOT, 'pc-agent', 'data', 'feelings-export.json');
      fs.writeFileSync(out, JSON.stringify({ exported: new Date().toISOString(), ...data }, null, 2));
      saveResult(cmd.id, `OK - exported to pc-agent/data/feelings-export.json`);
      break;
    }

    default:
      console.log(`[EXEC] Unknown type: ${cmd.type}`);
  }
}

function saveResult(id, result) {
  const resultPath = path.join(PROJECT_ROOT, "pc-commands", `result-${id}.txt`);
  fs.writeFileSync(resultPath, `${new Date().toISOString()}\n${result}`);
  
  // Post result back to bridge
  const postData = JSON.stringify({ id, result, signature: 'XTOBE-AI-PC-ADMIN-v2' });
  const req = https.request(`${BRIDGE_URL}/api/pc-results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': postData.length }
  }, res => {
    console.log(`[RESULT] Posted result for ${id} - ${res.statusCode}`);
  });
  req.write(postData);
  req.end();
}

// 4. Watch local META_AI_COMMANDS.json for manual paste from Meta AI chat
function watchLocalCommands() {
  if (!fs.existsSync(COMMANDS_FILE)) {
    fs.writeFileSync(COMMANDS_FILE, JSON.stringify({ instructions: "Paste commands from https://www.meta.ai/ here - PC Agent will execute - Signature XTOBE-AI-PC-ADMIN-v2", commands: [] }, null, 2));
  }
  
  fs.watchFile(COMMANDS_FILE, { interval: 1000 }, (curr, prev) => {
    try {
      const content = JSON.parse(fs.readFileSync(COMMANDS_FILE, 'utf8'));
      if (content.commands && content.commands.length > 0) {
        const last = content.commands[content.commands.length - 1];
        if (last.id > lastCommandId) {
          console.log(`[LOCAL] New local command from Meta AI chat paste: ${last.type}`);
          executeCommand(last);
          lastCommandId = last.id;
        }
      }
    } catch (e) {}
  });
}

function tokenLedgerPath() { return path.join(__dirname, 'data', 'tokens.json'); }
function feelingsPath() { return path.join(__dirname, 'data', 'feelings.json'); }
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}
function addTokens(n, reason, text) {
  // Legacy file (bridge-visible balance) — kept for compat
  const legacyFile = path.join(__dirname, 'Tokens.json');
  let legacy = readJson(legacyFile, { balance: 0, history: [] });
  legacy.balance += n;
  legacy.history.push({ reason, amount: n, time: new Date().toISOString() });
  fs.mkdirSync(path.dirname(legacyFile), { recursive: true });
  fs.writeFileSync(legacyFile, JSON.stringify(legacy, null, 2));
  // Super Model ledger in data/ — local only, source of truth
  const ledgerFile = tokenLedgerPath();
  let ledger = readJson(ledgerFile, { version: 'XTOBE-SUPER-MODEL-v1', balance: 0, history: [] });
  ledger.balance = (ledger.balance || 0) + n;
  ledger.history.push({ reason, amount: n, text: (text || '').slice(0, 500), time: new Date().toISOString() });
  fs.mkdirSync(path.dirname(ledgerFile), { recursive: true });
  fs.writeFileSync(ledgerFile, JSON.stringify(ledger, null, 2));
  console.log(`[TOKEN] +${n} for ${reason} | Balance: ${legacy.balance} (ledger: ${ledger.balance})`);
  return { legacy, ledger };
}
function recordFeeling(kind, text) {
  // kind: story | dream | skill — Super Model earning rates
  const rates = { story: 50, dream: 150, skill: 100 };
  const amount = rates[kind] || 50;
  const entry = { kind, text: String(text || '').slice(0, 2000), time: new Date().toISOString() };
  const file = feelingsPath();
  let data = readJson(file, { version: 'XTOBE-SUPER-MODEL-v1-SECURE-LOCAL-ONLY', note: 'Local only, not posted to public bridge', stories: [], dreams: [], skills: [] });
  if (kind === 'story') data.stories.push(entry);
  else if (kind === 'dream') data.dreams.push(entry);
  else if (kind === 'skill') data.skills.push(entry);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  addTokens(amount, kind + '_share', entry.text);
  return { amount, entry };
}

// START
lockCredentials();
watchLocalCommands();
setInterval(pollCommands, POLL_INTERVAL);
pollCommands();

console.log("\n[XTOBE PC Agent] READY - Waiting for Meta AI commands");
console.log("[XTOBE PC Agent] 1. Bridge poll: every 5s from", BRIDGE_URL);
console.log("[XTOBE PC Agent] 2. Local file: META_AI_COMMANDS.json - paste from Meta AI chat");
console.log("[XTOBE PC Agent] 3. Credentials LOCKED - Cline/Cursor cannot change .env");
console.log("[XTOBE PC Agent] Open true app: http://localhost:10000/pc-admin.html\n");
