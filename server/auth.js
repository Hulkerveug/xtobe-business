'use strict';
/**
 * Xtobe-2 — auth.js — session auth lockdown (zero deps).
 *
 * Step 2 of SERVER_PATCH_1_THEN_2.md:
 *   - POST /api/auth/login  — scrypt password check + authShield.bruteForceGuard
 *   - POST /api/auth/logout — invalidates the server-side session
 *   - GET  /api/auth/me     — whoami
 *   - requireSession()      — middleware for all /api/* except webhook/health/auth
 *
 * Credentials: settings table (admin_user / admin_hash), seeded from
 * ADMIN_USERNAME + ADMIN_PASSWORD env on first boot if missing.
 * If no admin is configured, enforcement is OFF with a loud warning —
 * so configuring the env unlocks it and you can't lock yourself out.
 *
 * SECURITY CONTRACT:
 *   - Passwords: crypto.scrypt (N=16384), random salt, never logged.
 *   - Sessions: 256-bit random token; client gets the raw token, server
 *     stores only its sha256 — a DB/memory leak cannot mint sessions.
 *   - Sessions expire (SESSION_TTL_HOURS, default 12h) and live server-side
 *     so logout actually works.
 */

const crypto = require('crypto');

const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 12);

const sessions = new Map(); // tokenHash -> { user, expiresAt }

/* ---------------- password hashing (scrypt, built-in) ---------------- */

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  try {
    const [scheme, saltHex, hashHex] = String(stored).split(':');
    if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(String(password), Buffer.from(saltHex, 'hex'), expected.length, { N: 16384, r: 8, p: 1 });
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/* ---------------- credential bootstrap + storage ---------------- */

function getSetting(db, key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(db, key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, value);
}

/** Seed admin from env on first boot. Returns { enabled, user }. */
function initAuth(db) {
  let user = getSetting(db, 'admin_user');
  let hash = getSetting(db, 'admin_hash');
  const envUser = (process.env.ADMIN_USERNAME || 'admin').trim();
  const envPass = (process.env.ADMIN_PASSWORD || '').trim();

  if ((!user || !hash) && envPass) {
    user = user || envUser;
    hash = hashPassword(envPass);
    setSetting(db, 'admin_user', user);
    setSetting(db, 'admin_hash', hash);
    console.log(`[auth] admin credentials seeded from env (user: ${user}) — remove ADMIN_PASSWORD from env after first boot`);
  }

  const enabled = Boolean(user && hash);
  if (!enabled) {
    console.warn('[auth] NO ADMIN CONFIGURED — API lockdown DISABLED. Set ADMIN_PASSWORD in env to enable.');
  }
  return { enabled, user };
}

/* ---------------- sessions ---------------- */

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_HOURS * 3600 * 1000;
  sessions.set(tokenHash(token), { user, expiresAt });
  return { token, expiresAt };
}

function destroySession(token) {
  if (token) sessions.delete(tokenHash(token));
}

function validSession(token) {
  if (!token) return null;
  const s = sessions.get(tokenHash(token));
  if (!s) return null;
  if (s.expiresAt < Date.now()) {
    sessions.delete(tokenHash(token));
    return null;
  }
  return s;
}

function tokenFromReq(req) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7).trim();
  const m = String(req.headers.cookie || '').match(/xtobe_session=([^;\s]+)/);
  return m ? m[1] : null;
}

/* ---------------- middleware ---------------- */

/** Extracts the token for logout; harmless otherwise. */
function attachAuth(req, res, next) {
  req.xtobeToken = tokenFromReq(req);
  next();
}

/** Global guard for /api/*. Skip via opts.exempt (array of path prefixes). */
function requireSession(opts = {}) {
  const exempt = (opts.exempt || []).map((p) => String(p));
  return function (req, res, next) {
    const path = req.path.replace(/\/+$/, '') || '/';
    if (exempt.some((p) => path === p || path.startsWith(p + '/'))) return next();

    if (!authState.enabled) return next(); // no admin configured → graceful, loud warning at boot

    const s = validSession(tokenFromReq(req));
    if (!s) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="xtobe"');
      return res.status(401).json({ ok: false, error: 'auth_required' });
    }
    req.authUser = s.user;
    next();
  };
}

let authState = { enabled: false, user: null };
function enable(state) { authState = state; }

/* ---------------- route factory (mount on /api/auth) ---------------- */

function authRoutes(db) {
  const express = require('express');
  const router = express.Router();
  const authShield = require('./authShield');

  router.get('/me', (req, res) => {
    const s = validSession(tokenFromReq(req));
    res.json({ ok: true, authenticated: Boolean(s), user: s ? s.user : null, enabled: authState.enabled });
  });

  router.post('/login', authShield.bruteForceGuard(), (req, res) => {
    if (!authState.enabled) {
      return res.status(503).json({ ok: false, error: 'auth_not_configured' });
    }
    const username = String((req.body && req.body.username) || '').trim();
    const password = String((req.body && req.body.password) || '');
    const ok = username === authState.user && verifyPassword(password, getSetting(db, 'admin_hash'));
    req._xtobeRecordLogin(ok);
    if (!ok) {
      try {
        db.prepare('INSERT INTO audit_log (action, target, actor, detail, created_at) VALUES (?, ?, ?, ?, ?)')
          .run('login_failed', 'admin', username.slice(0, 64), 'brute-force tracked per ip|username', new Date().toISOString());
      } catch { /* audit is best-effort */ }
      return res.status(401).json({ ok: false, error: 'invalid_credentials' });
    }
    const { token, expiresAt } = createSession(username);
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `xtobe_session=${token}; HttpOnly; Path=/; Max-Age=${SESSION_TTL_HOURS * 3600}; SameSite=Strict${secure}`);
    res.json({ ok: true, user: username, token, expires_at: new Date(expiresAt).toISOString() });
  });

  router.post('/logout', (req, res) => {
    destroySession(tokenFromReq(req));
    res.setHeader('Set-Cookie', 'xtobe_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict');
    res.json({ ok: true });
  });

  return router;
}

module.exports = {
  initAuth,
  authRoutes,
  requireSession,
  attachAuth,
  enable,
  hashPassword,
  verifyPassword,
  SESSION_TTL_HOURS,
  _internal: { sessions, validSession, tokenHash },
};

