'use strict';
/**
 * Xtobe-2 — tiny env loader (zero deps).
 * Reads .env next to the project root, never overwrites real env vars.
 */
const fs = require('fs');
const path = require('path');

function applyEnvFile(env, file) {
  try {
    if (!fs.existsSync(file)) return false;
    const raw = fs.readFileSync(file, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const s = line.trim();
      if (!s || s.startsWith('#')) continue;
      const eq = s.indexOf('=');
      if (eq < 1) continue;
      const key = s.slice(0, eq).trim();
      let value = s.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (env[key] === undefined || env[key] === '') env[key] = value;
    }
    return true;
  } catch { return false; }
}

function loadEnv(root) {
  const file = path.join(root, '.env');
  applyEnvFile(process.env, file);
  return file;
}

module.exports = { loadEnv, applyEnvFile };
