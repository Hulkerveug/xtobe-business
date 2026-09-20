/**
 * antiCloneShield.js - Anti-clone shield for the XTOBE white-label platform.
 *
 * Provides:
 *   - license token generation/verification  (HMAC-SHA256)
 *   - verifyLicense middleware for all /api/brand routes
 *   - domain whitelist guard for serving injection.js
 *   - CORS options built from ALLOWED_DOMAINS
 *   - rate limiter (100 req/min per client)
 *   - invisible watermark builders (meta tag + HTML comment + footer)
 *
 * SECURITY CONTRACT (see .clinerules):
 *   - LICENSE_SECRET never leaves the server.
 *   - All auth failures return generic bodies; no oracle leaks.
 *
 * Requires Node.js >= 16. No external dependencies (built-in crypto only).
 */

'use strict';

const crypto = require('crypto');

/* ---------------- Configuration ---------------- */

const LICENSE_SECRET = process.env.LICENSE_SECRET;
if (!LICENSE_SECRET || LICENSE_SECRET.length < 32) {
  throw new Error(
    '[antiCloneShield] LICENSE_SECRET env var missing or too short (<32 chars). Refusing to start.'
  );
}

/** Comma-separated allowed domains, e.g. "clinic-a.com,app.clinic-b.ae" */
const ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS || '')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

if (ALLOWED_DOMAINS.length === 0) {
  console.warn('[antiCloneShield] ALLOWED_DOMAINS is empty; injection.js denied to everyone.');
}

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100;             // requests per window per client

/* ---------------- Helpers ---------------- */

/** Constant-time comparison to avoid timing oracles. */
function safeEqual(a, b) {
  const ba = Buffer.from(String(a), 'utf8');
  const bb = Buffer.from(String(b), 'utf8');
  if (ba.length !== bb.length) {
    crypto.timingSafeEqual(ba, ba); // keep timing roughly constant
    return false;
  }
  return crypto.timingSafeEqual(ba, bb);
}

/** token = HMAC_SHA256(clinic_id + "|" + domain, LICENSE_SECRET) */
function generateLicenseToken(clinicId, domain) {
  return crypto
    .createHmac('sha256', LICENSE_SECRET)
    .update(clinicId + '|' + String(domain).toLowerCase())
    .digest('hex');
}

/** hash = HMAC_SHA256(clinic_id + "|" + domain + "|" + issued_date, LICENSE_SECRET) */
function generateWatermarkHash(clinicId, domain, issuedDate) {
  return crypto
    .createHmac('sha256', LICENSE_SECRET)
    .update(clinicId + '|' + String(domain).toLowerCase() + '|' + issuedDate)
    .digest('hex');
}

/** Registrable host from a Referer/Origin header value. */
function hostFromHeader(headerValue) {
  if (!headerValue) return null;
  try {
    return new URL(headerValue).hostname.toLowerCase();
  } catch (e) {
    return null;
  }
}

/** True if host is, or is a subdomain of, an allowed domain. */
function isAllowedHost(host) {
  return matchedAllowedDomain(host) !== null;
}

/**
 * Return the ALLOWED_DOMAINS entry that `host` belongs to (or null).
 * The HMAC binds to the registered (base) domain, not the varying
 * subdomain, so a token issued for "clinic-a.com" also validates on
 * "app.clinic-a.com".
 */
function matchedAllowedDomain(host) {
  if (!host) return null;
  for (const allowed of ALLOWED_DOMAINS) {
    if (host === allowed || host.endsWith('.' + allowed)) return allowed;
  }
  return null;
}

/** Identical generic failure - never reveals what failed. */
function deny(res, status) {
  res.status(status).json({ error: 'Unauthorized' });
}

/* ---------------- Rate limiter (in-memory, per client) ---------------- */

const rateBuckets = new Map(); // key -> { count, resetAt }

function clientKey(req) {
  const clinic = req.headers['x-clinic-id'];
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    (req.socket && req.socket.remoteAddress) ||
    'unknown';
  return clinic ? 'clinic:' + clinic : 'ip:' + ip;
}

function rateLimiter(req, res, next) {
  const now = Date.now();
  const key = clientKey(req);
  let bucket = rateBuckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateBuckets.set(key, bucket);
  }

  bucket.count += 1;

  if (bucket.count > RATE_LIMIT_MAX) {
    res.set('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
    return res.status(429).json({ error: 'Too many requests' });
  }

  next();
}

// Purge expired buckets so the map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now >= bucket.resetAt) rateBuckets.delete(key);
  }
}, RATE_LIMIT_WINDOW_MS).unref();
/* ---------------- Middleware: verifyLicense ---------------- */

/**
 * Protects all /api/brand routes.
 *
 * Expected headers:
 *   x-clinic-id    : clinic public identifier
 *   x-license-token: HMAC token issued for (clinic_id, domain)
 *
 * Domain comes from Origin/Referer, so a stolen token cannot be replayed
 * from a cloned site on a different domain.
 */
function verifyLicense(req, res, next) {
  const clinicId = req.headers['x-clinic-id'];
  const token = req.headers['x-license-token'];
  const rawHost = hostFromHeader(req.headers.origin || req.headers.referer);

  if (!clinicId || !token || !rawHost) {
    return deny(res, 401);
  }

  // Bind the token to the registered base domain, not the varying subdomain,
  // so app./www. prefixes don't invalidate an otherwise legitimate license.
  const domain = matchedAllowedDomain(rawHost);
  if (!domain) {
    return deny(res, 403);
  }

  const expected = generateLicenseToken(clinicId, domain);
  if (!safeEqual(token, expected)) {
    return deny(res, 403);
  }

  req.license = { clinicId, domain };
  next();
}

/* ---------------- Guard: injection.js only to whitelisted referers ---------------- */

/**
 * Express-style handler factory:
 *   app.get("/injection.js", serveInjectionScript(scriptSource));
 *
 * Serves the secure frontend ONLY when Referer/Origin is whitelisted.
 * Delivered with no-store caching so clones can't pin an old copy.
 */
function serveInjectionScript(scriptSource) {
  return function handler(req, res) {
    const host = hostFromHeader(req.headers.referer || req.headers.origin);

    if (!isAllowedHost(host)) {
      return deny(res, 403);
    }

    res
      .set('Content-Type', 'application/javascript; charset=utf-8')
      .set('Cache-Control', 'no-store')
      .set('X-Content-Type-Options', 'nosniff')
      .send(scriptSource);
  };
}

/* ---------------- CORS options (whitelist-only) ---------------- */

const corsOptions = {
  origin(origin, callback) {
    // No Origin = server-to-server call; still must pass verifyLicense.
    if (!origin) return callback(null, true);
    const host = hostFromHeader(origin);
    if (isAllowedHost(host)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'x-clinic-id', 'x-license-token'],
  maxAge: 600,
};

/* ---------------- Watermark builders ---------------- */

const FOOTER_HTML =
  '<div style="font-size:10px;opacity:0.35;text-align:center;pointer-events:none;' +
  'font-family:sans-serif;letter-spacing:0.5px;" data-lic-footer="1">' +
  'POWERED BY XTOBE</div>';

/** All three pieces (metaTag, htmlComment, footer) are REQUIRED per .clinerules. */
function buildWatermark(clinicId, domain, issuedDate) {
  const hash = generateWatermarkHash(clinicId, domain, issuedDate);
  return {
    metaTag: '<meta name="x-license" content="' + hash + '">',
    htmlComment: '<!-- lic:' + hash + ' -->',
    footer: FOOTER_HTML,
    hash,
  };
}

/**
 * Inject watermark into an HTML string:
 *   meta before </head>, comment after <body>, footer before </body>.
 * Falls back to prepend/append when those tags are absent.
 */
function injectWatermark(html, clinicId, domain, issuedDate) {
  const wm = buildWatermark(clinicId, domain, issuedDate);
  let out = String(html);

  if (/<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, wm.metaTag + '\n</head>');
  } else {
    out = wm.metaTag + '\n' + out;
  }

  if (/<body[^>]*>/i.test(out)) {
    out = out.replace(/<body[^>]*>/i, (m) => m + '\n' + wm.htmlComment);
  } else {
    out = wm.htmlComment + '\n' + out;
  }

  if (/<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, wm.footer + '\n</body>');
  } else {
    out = out + '\n' + wm.footer;
  }

  return out;
}

/* ---------------- Exports ---------------- */

module.exports = {
  ALLOWED_DOMAINS,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  generateLicenseToken,
  generateWatermarkHash,
  verifyLicense,
  rateLimiter,
  serveInjectionScript,
  corsOptions,
  buildWatermark,
  injectWatermark,
  FOOTER_HTML,
  _internal: { safeEqual, hostFromHeader, isAllowedHost, matchedAllowedDomain, clientKey },
};