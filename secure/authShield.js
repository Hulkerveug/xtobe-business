/**
 * XTOBE BUSINESS — AUTH SHIELD + RATE LIMITER + BRUTE-FORCE PROTECTION
 * © 2026 XTOBE BUSINESS — Proprietary
 */

const crypto = require('crypto');
const loginAttempts = new Map();
const ipRate = new Map();

const CONFIG = {
  GLOBAL_WINDOW_MS: 60 * 1000,
  GLOBAL_MAX: 100,
  AUTH_WINDOW_MS: 60 * 1000,
  AUTH_MAX: 20,
  LOGIN_WINDOW_MS: 15 * 60 * 1000,
  LOGIN_MAX_ATTEMPTS: 5,
  LOGIN_LOCK_MS: 30 * 60 * 1000,
};

setInterval(()=>{
  const now = Date.now();
  for (const [k,v] of loginAttempts.entries()) {
    if (v.lockedUntil && now > v.lockedUntil + 60*60*1000) loginAttempts.delete(k);
  }
  for (const [k,v] of ipRate.entries()) {
    if (now - v.windowStart > CONFIG.GLOBAL_WINDOW_MS*2) ipRate.delete(k);
  }
}, 5*60*1000).unref();

function getIP(req) {
  return (req.headers['x-forwarded-for']?.split(',')[0]?.trim()) || req.ip || req.socket.remoteAddress || 'unknown';
}

function globalLimiter(req, res, next) {
  const ip = getIP(req);
  const now = Date.now();
  const rec = ipRate.get(ip) || { count:0, windowStart: now };
  if (now - rec.windowStart > CONFIG.GLOBAL_WINDOW_MS) {
    rec.count = 0;
    rec.windowStart = now;
  }
  rec.count++;
  ipRate.set(ip, rec);
  if (rec.count > CONFIG.GLOBAL_MAX) {
    res.setHeader('Retry-After', Math.ceil((rec.windowStart + CONFIG.GLOBAL_WINDOW_MS - now)/1000));
    return res.status(429).json({ error: 'XTOBE: Too many requests — global limit 100/min per IP' });
  }
  next();
}

function authLimiter(req, res, next) {
  const isAuthRoute = /^\/(auth|session-auth|api\/(auth|session-auth)|whatsapp\/webhook)/.test(req.path);
  if (!isAuthRoute) return next();
  const ip = getIP(req);
  const key = `auth:${ip}`;
  const now = Date.now();
  const rec = ipRate.get(key) || { count:0, windowStart: now };
  if (now - rec.windowStart > CONFIG.AUTH_WINDOW_MS) {
    rec.count = 0;
    rec.windowStart = now;
  }
  rec.count++;
  ipRate.set(key, rec);
  if (rec.count > CONFIG.AUTH_MAX) {
    res.setHeader('Retry-After', Math.ceil((rec.windowStart + CONFIG.AUTH_WINDOW_MS - now)/1000));
    return res.status(429).json({ error: 'XTOBE: Too many auth attempts — 20/min per IP' });
  }
  next();
}

function bruteForceGuard(req, res, next) {
  const isLogin = req.method === 'POST' && /\/login(\/|$|\?)/.test(req.path);
  if (!isLogin) return next();
  const ip = getIP(req);
  const username = (req.body?.email || req.body?.username || req.body?.clinic_id || 'unknown').toLowerCase();
  const key = `${ip}|${username}`;
  const now = Date.now();
  const rec = loginAttempts.get(key) || { count:0, firstAttempt: now, lockedUntil: 0 };
  if (rec.lockedUntil && now < rec.lockedUntil) {
    const retrySec = Math.ceil((rec.lockedUntil - now)/1000);
    res.setHeader('Retry-After', retrySec);
    return res.status(423).json({ error: `XTOBE: Account locked for brute-force — retry in ${Math.ceil(retrySec/60)} min`, retry_after: retrySec });
  }
  req._xtobeRecordLogin = (success) => {
    if (success) {
      loginAttempts.delete(key);
    } else {
      const cur = loginAttempts.get(key) || { count:0, firstAttempt: now, lockedUntil: 0 };
      if (now - cur.firstAttempt > CONFIG.LOGIN_WINDOW_MS) {
        cur.count = 0;
        cur.firstAttempt = now;
      }
      cur.count++;
      if (cur.count >= CONFIG.LOGIN_MAX_ATTEMPTS) {
        cur.lockedUntil = now + CONFIG.LOGIN_LOCK_MS;
        console.warn(`XTOBE BRUTE-FORCE LOCK: ${key} — ${cur.count} fails`);
      }
      loginAttempts.set(key, cur);
    }
  };
  next();
}

module.exports = { globalLimiter, authLimiter, bruteForceGuard, CONFIG };
