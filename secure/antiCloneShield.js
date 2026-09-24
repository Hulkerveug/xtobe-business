/**
 * XTOBE BUSINESS — ANTI-CLONE SHIELD
 * © 2026 XTOBE BUSINESS — Proprietary
 * UAE Law 38/2021 Copyright + 34/2021 Art2 — License: legal@xtobe.ae
 *
 * Purpose: License = HMAC(clinic_id|domain, LICENSE_SECRET), domain whitelist, CORS lock, watermark, rate limit
 */

const crypto = require('crypto');

// Load from env — NEVER hardcode
const LICENSE_SECRET = process.env.LICENSE_SECRET;
const ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS || 'xtobe.ae,localhost').split(',').map(d=>d.trim().toLowerCase()).filter(Boolean);

if (!LICENSE_SECRET) {
  console.warn('⚠️ XTOBE: LICENSE_SECRET missing — anti-clone disabled in dev');
}

function getHostnameFromReq(req) {
  const origin = req.headers.origin || req.headers.referer || req.headers.referrer || '';
  try {
    if (!origin) return '';
    return new URL(origin).hostname.toLowerCase();
  } catch { return ''; }
}

function generateLicenseToken(clinic_id, hostname) {
  if (!LICENSE_SECRET) throw new Error('LICENSE_SECRET not set');
  return crypto.createHmac('sha256', LICENSE_SECRET).update(`${clinic_id}|${hostname}`).digest('hex');
}

function generateWatermarkHash(clinic_id) {
  if (!LICENSE_SECRET) return 'dev-'+clinic_id;
  return crypto.createHash('sha256').update(clinic_id + '|' + LICENSE_SECRET).digest('hex').slice(0,16);
}

function isDomainAllowed(hostname) {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  if (h.includes('localhost') || h.includes('127.0.0.1')) return true; // dev
  return ALLOWED_DOMAINS.some(d => h === d || h.endsWith('.'+d) || h.includes(d));
}

// Middleware: verify x-clinic-id + x-xtobe-license OR ?token=
function verifyLicense(req, res, next) {
  try {
    const clinic_id = req.headers['x-clinic-id'] || req.query.clinic_id || req.params.clinic_id;
    const token = req.headers['x-xtobe-license'] || req.query.token;
    const hostname = getHostnameFromReq(req) || (req.hostname || '').toLowerCase();

    if (!clinic_id || !token) {
      return res.status(401).json({ error: 'XTOBE: Missing license — x-clinic-id + x-xtobe-license required' });
    }

    if (!LICENSE_SECRET) {
      // Allow in dev but warn
      console.warn('XTOBE: LICENSE_SECRET missing, bypassing verification in dev');
      return next();
    }

    // Domain whitelist
    if (hostname && !isDomainAllowed(hostname)) {
      return res.status(403).json({ error: `XTOBE: Domain not licensed: ${hostname}`, allowed: ALLOWED_DOMAINS });
    }

    // Verify HMAC: token = HMAC(clinic_id|hostname)
    // For injection.js we allow token generated for that hostname, or for any whitelisted domain
    let valid = false;
    if (hostname) {
      const expected = generateLicenseToken(clinic_id, hostname);
      if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) valid = true;
    }
    // Fallback: check against all allowed domains (for server-to-server)
    if (!valid) {
      for (const d of ALLOWED_DOMAINS) {
        const exp = generateLicenseToken(clinic_id, d);
        if (token.length === exp.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(exp))) { valid = true; break; }
      }
    }

    if (!valid) {
      return res.status(403).json({ error: 'XTOBE: Invalid license token — generate with HMAC(clinic_id|domain, LICENSE_SECRET)' });
    }

    req.xtobe_clinic_id = clinic_id;
    req.xtobe_license_hash = generateWatermarkHash(clinic_id);
    next();
  } catch (e) {
    console.error('XTOBE verifyLicense error', e);
    return res.status(500).json({ error: 'License verification error' });
  }
}

// Middleware: only serve injection if Referer is whitelisted
function secureBrandInjection(req, res, next) {
  const hostname = getHostnameFromReq(req);
  if (!hostname) {
    // Allow direct fetch with token, block browser without referer if no token
    if (!req.query.token && !req.headers['x-xtobe-license']) {
      return res.status(403).send('// XTOBE: Forbidden — missing referer + token');
    }
  } else if (!isDomainAllowed(hostname)) {
    return res.status(403).send(`// XTOBE: Domain not whitelisted: ${hostname}`);
  }
  next();
}

// Add invisible watermark to HTML
function addInvisibleWatermark(html, clinic_id) {
  const hash = generateWatermarkHash(clinic_id);
  const iso = new Date().toISOString();
  let out = html;
  if (out.includes('</head>')) {
    out = out.replace('</head>', `<meta name="xtobe-license" content="${hash}" data-clinic="${clinic_id}" data-issued="${iso}">\n</head>`);
  }
  if (out.includes('</body>')) {
    out = out.replace('</body>', `<!-- XTOBE LICENSE ${hash} | ${clinic_id} | ${iso} | © 2026 XTOBE BUSINESS -->\n</body>`);
  }
  return out;
}

// Rate limiter 100 req/min
let limiter;
try {
  const rateLimit = require('express-rate-limit');
  limiter = rateLimit({
    windowMs: 60*1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'XTOBE: Too many requests — protected (100/min)' }
  });
} catch {
  limiter = (req,res,next)=>next(); // fallback if not installed
}

// Hide secrets from JSON responses
function hideSecrets(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const clone = { ...data };
      delete clone.WHATSAPP_TOKEN;
      delete clone.PHONE_ID;
      delete clone.LICENSE_SECRET;
      delete clone.JWT_SECRET;
      delete clone.META_APP_SECRET;
      delete clone.WHATSAPP_TOKEN_1;
      return originalJson(clone);
    }
    return originalJson(data);
  };
  next();
}

// Compat aliases for older server builds (bcdc1c1 lockdown) — maps to current shield API
function hostFromHeader(h) {
  if (!h) return '';
  try { return new URL(h).hostname.toLowerCase(); } catch { return ''; }
}
function matchedAllowedDomain(rawHost) {
  const h = String(rawHost || '').toLowerCase();
  if (!h) return '';
  const found = ALLOWED_DOMAINS.find(d => h === d || h.endsWith('.' + d) || h.includes(d));
  if (found) return found;
  if (h.includes('localhost') || h.includes('127.0.0.1')) return 'localhost';
  return '';
}
function isAllowedHost(h) { return !!matchedAllowedDomain(h); }

module.exports = {
  verifyLicense,
  secureBrandInjection,
  addInvisibleWatermark,
  limiter,
  rateLimiter: limiter,
  hideSecrets,
  generateLicenseToken,
  generateWatermarkHash,
  isDomainAllowed,
  ALLOWED_DOMAINS,
  _internal: { hostFromHeader, matchedAllowedDomain, isAllowedHost }
};
