'use strict';
/**
 * Xtobe-2 — authShield.js — rate limiting + brute-force protection (zero deps).
 *
 * Layered on top of secure/antiCloneShield.js rateLimiter:
 *   1. globalLimiter  — 100 req/min per IP on ALL routes (incl. static dashboard)
 *   2. authLimiter    — 20 req/min per IP on auth endpoints + WhatsApp webhook
 *   3. brute force    - POST login: 5 fails / 15 min per IP|username -> 30 min lock
 *
 * SECURITY CONTRACT:
 *   - Never log credentials; only ip|username for lock events.
 *   - All rejections are generic; Retry-After is the only extra signal.
 *
 * Wire in index.js BEFORE routes. See SERVER_PATCH_1_THEN_2.md.
 */

/* ---------------- in-memory sliding window (fine for single Render instance) ---------------- */

const buckets = new Map(); // key -> number[] (timestamps)

function sweep(now, windowMs) {
  if (buckets.size < 5000) return;
  for (const [k, ts] of buckets) {
    const alive = ts.filter((t) => now - t < windowMs);
    if (alive.length === 0) buckets.delete(k);
    else buckets.set(k, alive);
  }
}

function hit(key, windowMs, max) {
  const now = Date.now();
  sweep(now, windowMs);
  const ts = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (ts.length >= max) return { allowed: false, retryAfter: Math.ceil((ts[0] + windowMs - now) / 1000) };
  ts.push(now);
  buckets.set(key, ts);
  return { allowed: true, retryAfter: 0 };
}

function clientIp(req) {
  // trust proxy = 1 (set in index.js): leftmost entry added by our proxy
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return (fwd || (req.socket && req.socket.remoteAddress) || 'unknown').replace(/^::ffff:/, '');
}

function reject(res, retryAfterSec) {
  res.setHeader('Retry-After', String(retryAfterSec));
  res.status(429).json({ ok: false, error: 'rate_limited' });
}

/* ---------------- 1. Global limiter: ALL routes ---------------- */

const GLOBAL_WINDOW_MS = 60 * 1000;
const GLOBAL_MAX = 100;

function globalLimiter() {
  return function (req, res, next) {
    if (req.method === 'OPTIONS') return next(); // CORS preflights pass
    const r = hit('g:' + clientIp(req), GLOBAL_WINDOW_MS, GLOBAL_MAX);
    if (!r.allowed) return reject(res, r.retryAfter);
    next();
  };
}

/* ---------------- 2. Auth limiter: stricter, on auth + webhook ---------------- */

const AUTH_WINDOW_MS = 60 * 1000;
const AUTH_MAX = 20;

function authLimiter() {
  return function (req, res, next) {
    if (req.method === 'OPTIONS') return next();
    const r = hit('a:' + clientIp(req), AUTH_WINDOW_MS, AUTH_MAX);
    if (!r.allowed) return reject(res, r.retryAfter);
    next();
  };
}

/* ---------------- 3. Brute force: POST login ---------------- */

const BF_WINDOW_MS = 15 * 60 * 1000;   // 15 min sliding window
const BF_MAX_FAILS = 5;                // 5 fails in window
const BF_LOCK_MS = 30 * 60 * 1000;     // locked for 30 min

const bfFails = new Map(); // ip|username -> { fails: number[], lockedUntil: ts }

function bfKey(req) {
  const u = String((req.body && (req.body.username || req.body.email)) || '').toLowerCase().trim();
  return clientIp(req) + '|' + (u || '?');
}

/** Mount on POST login routes BEFORE the handler. Rejects locked attempts. */
function bruteForceGuard() {
  return function (req, res, next) {
    const k = bfKey(req);
    const rec = bfFails.get(k);
    if (rec && rec.lockedUntil > Date.now()) {
      const retryAfter = Math.ceil((rec.lockedUntil - Date.now()) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(423).json({ ok: false, error: 'account_locked' });
    }
    if (rec && rec.lockedUntil && rec.lockedUntil <= Date.now()) bfFails.delete(k); // lock expired
    next();
  };
}

/**
 * Call INSIDE the login handler after password check:
 *   req._xtobeRecordLogin(ok);
 * On fail #5 → 30 min lock + server log.
 */
function recordLogin(ok) {
  return function (req, res, next) {
    const k = bfKey(req);
    if (ok) {
      bfFails.delete(k); // successful login clears history
      return next ? next() : undefined;
    }
    const now = Date.now();
    const rec = bfFails.get(k) || { fails: [], lockedUntil: 0 };
    rec.fails = rec.fails.filter((t) => now - t < BF_WINDOW_MS);
    rec.fails.push(now);
    if (rec.fails.length >= BF_MAX_FAILS) {
      rec.lockedUntil = now + BF_LOCK_MS;
      rec.fails = [];
      console.error(`[authShield] XTOBE BRUTE-FORCE LOCK: ${k} until ${new Date(rec.lockedUntil).toISOString()}`);
    }
    bfFails.set(k, rec);
    if (next) next();
  };
}

/* attach the helper to every request so handlers can call req._xtobeRecordLogin(ok) */
function attachLoginRecorder() {
  return function (req, res, next) {
    req._xtobeRecordLogin = (ok) => recordLogin(ok)(req, res, null);
    next();
  };
}

/* ---------------- Exports ---------------- */

module.exports = {
  globalLimiter,
  authLimiter,
  bruteForceGuard,
  attachLoginRecorder,
  GLOBAL_MAX,
  AUTH_MAX,
  BF_MAX_FAILS,
  BF_LOCK_MS,
  _internal: { hit, clientIp, buckets, bfFails },
};
