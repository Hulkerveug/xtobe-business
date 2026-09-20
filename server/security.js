'use strict';
/**
 * Xtobe-2 — HTTP security hardening layer (zero deps).
 *
 * Adds defense-in-depth against common attacks:
 *   1. Security headers (XSS, clickjacking, MIME-sniffing, downgrade, referrer)
 *   2. Removes X-Powered-By (don't advertise the stack)
 *   3. Meta WhatsApp webhook signature verification (X-Hub-Signature-256 HMAC)
 *   4. Request body size cap helper
 *   5. Production-safe error handler (never leaks stack traces / internals)
 *
 * Wire in index.js BEFORE routes. See README section in ENV_SECURE.md.
 */

const crypto = require('crypto');

/* ------------------------------------------------------------------ *
 * 1. Security headers + hide the stack
 * ------------------------------------------------------------------ */
function securityHeaders() {
  return function (req, res, next) {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');                 // clickjacking
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    // HSTS only meaningful over HTTPS (Render terminates TLS) — safe to always send.
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    // Allow same-origin + our own JS; block inline/eval to blunt XSS. Adjust if you add CDNs.
    if (!res.getHeader('Content-Security-Policy')) {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; " +
        "script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'"
      );
    }
    next();
  };
}

/* ------------------------------------------------------------------ *
 * 2. Meta WhatsApp webhook signature verification
 *    Meta signs the raw body with your App Secret using HMAC-SHA256 and
 *    sends it as:  X-Hub-Signature-256: sha256=<hex>
 *    Set WHATSAPP_APP_SECRET in env. If unset, verification is skipped
 *    (with a warning) so you don't lock yourself out before configuring.
 * ------------------------------------------------------------------ */
function verifyWhatsAppSignature(appSecret) {
  return function (req, res, next) {
    if (!appSecret) {
      console.warn('[security] WHATSAPP_APP_SECRET not set — webhook signature NOT verified');
      return next();
    }
    const header = req.headers['x-hub-signature-256'];
    if (!header || !header.startsWith('sha256=')) {
      return res.status(401).json({ ok: false, error: 'bad_signature' });
    }
    const received = header.slice('sha256='.length);
    // req.rawBody must be captured by the JSON parser (see verifyRawBody below).
    const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const expected = crypto.createHmac('sha256', appSecret).update(raw).digest('hex');
    const a = Buffer.from(received, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ ok: false, error: 'bad_signature' });
    }
    next();
  };
}

/* Capture the raw request body during JSON parsing (needed for HMAC). */
function captureRawBody(req, res, buf) {
  if (buf && buf.length) req.rawBody = buf;
}

/* ------------------------------------------------------------------ *
 * 3. Production-safe error handler (LAST middleware in index.js)
 * ------------------------------------------------------------------ */
function errorHandler() {
  // eslint-disable-next-line no-unused-vars
  return function (err, req, res, next) {
    const status = err.status || err.statusCode || 500;
    const safe = status >= 400 && status < 500 ? status : 500;
    // Log full detail server-side, return a scrubbed message to the client.
    console.error('[error]', status, err.message);
    res.status(safe).json({
      ok: false,
      error: safe === 500 ? 'internal_error' : (err.expose ? err.message : 'request_failed'),
    });
  };
}

/* 404 for unknown API routes (keeps API surface quiet). */
function notFound() {
  return function (req, res) {
    res.status(404).json({ ok: false, error: 'not_found' });
  };
}

module.exports = {
  securityHeaders,
  verifyWhatsAppSignature,
  captureRawBody,
  errorHandler,
  notFound,
};
