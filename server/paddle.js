'use strict';
/**
 * Xtobe-2 — Paddle Billing integration (zero deps).
 *
 * Why this file exists: selling a $29 lifetime tier requires a real payment
 * provider. This module is the honest bridge — it verifies Paddle's signed
 * webhooks (Paddle-Signature: ts=...;h1=...) and issues a deterministic,
 * offline-verifiable license key bound to the transaction.
 *
 * Nothing here talks to Paddle unless PADDLE_API_KEY is set; the webhook
 * route returns 503 (not_configured) until PADDLE_WEBHOOK_SECRET exists.
 *
 * Signature algorithm (Paddle docs):
 *   signed_payload = `${ts}:${raw_body}`
 *   h1             = HMAC-SHA256(PADDLE_WEBHOOK_SECRET, signed_payload) hex
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/* ------------------------------------------------------------------ *
 * 1. Signature verification
 * ------------------------------------------------------------------ */

/** Parse `Paddle-Signature: ts=1671552777;h1=abc,def` → { ts, h1: [..] } */
function parseSignature(header) {
  const out = { ts: null, h1: [] };
  if (!header || typeof header !== 'string') return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k === 'ts') out.ts = v;
    else if (k === 'h1' && v) out.h1.push(...v.split(',').map((s) => s.trim()).filter(Boolean));
  }
  return out;
}

/**
 * Verify a Paddle webhook signature.
 * @returns {{ok: boolean, reason?: string, ts?: string}}
 */
function verifySignature(secret, rawBody, header, opts) {
  const o = opts || {};
  if (!secret) return { ok: false, reason: 'no_secret' };
  const { ts, h1 } = parseSignature(header);
  if (!ts || !h1.length) return { ok: false, reason: 'missing_header' };

  // replay protection (Paddle recommends < 5 min). 0 disables the check.
  const maxAge = Number(o.maxAgeSeconds == null ? 0 : o.maxAgeSeconds);
  if (maxAge > 0 && o.now) {
    const age = Math.abs(Math.floor(o.now / 1000) - Number(ts));
    if (!Number.isFinite(age) || age > maxAge) return { ok: false, reason: 'stale_timestamp', ts };
  }

  const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody == null ? '' : rawBody);
  if (!body) return { ok: false, reason: 'no_raw_body' };

  const expected = crypto.createHmac('sha256', secret).update(`${ts}:${body}`).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const hit = h1.some((sig) => {
    const b = Buffer.from(sig, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
  return hit ? { ok: true, ts } : { ok: false, reason: 'bad_signature', ts };
}

/** Compute the header value Paddle would send (used by tests + manual curl). */
function signPayload(secret, rawBody, ts) {
  const stamp = ts == null ? Math.floor(Date.now() / 1000) : ts;
  const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
  const h1 = crypto.createHmac('sha256', secret).update(`${stamp}:${body}`).digest('hex');
  return `ts=${stamp};h1=${h1}`;
}

/* ------------------------------------------------------------------ *
 * 2. Price → plan mapping (from env keys PADDLE_PRICE_<PLAN>=pri_...)
 * ------------------------------------------------------------------ */

function priceMap(env) {
  const map = {};
  for (const [k, v] of Object.entries(env || {})) {
    const m = /^PADDLE_PRICE_([A-Z0-9_]+)$/.exec(k);
    if (!m || !v) continue;
    map[String(v).trim()] = m[1].toLowerCase();
  }
  return map;
}


/* ------------------------------------------------------------------ *
 * 3. Webhook event → licence action
 * ------------------------------------------------------------------ */

/**
 * Map a Paddle event to an action.
 *   transaction.completed  → issue (only if the price maps to a known plan)
 *   subscription.created   → issue
 *   subscription.canceled  → revoke
 *   adjustment.created     → revoke (refund / chargeback)
 *   anything else          → ignore
 */
function mapEvent(event, prices) {
  const type = String((event && event.event_type) || '');
  const data = (event && event.data) || {};
  const priceIds = (data.items || [])
    .map((it) => (it && it.price && (it.price.id || it.price_id)) || null)
    .filter(Boolean);
  const plan = priceIds.map((p) => (prices || {})[p]).find(Boolean) || null;

  const customerId = String(data.customer_id || (data.customer && data.customer.id) || '');
  const transactionId = String(data.id || '');
  const customData = data.custom_data || {};
  const clinicId = String(customData.clinic_id || customData.clinicId || 'default');
  const email = String((data.customer && data.customer.email) || customData.email || '');

  if (type === 'transaction.completed' || type === 'subscription.activated' || type === 'subscription.created') {
    if (!plan) return { action: 'ignore', reason: 'unmapped_price', priceIds };
    return { action: 'issue', plan, transactionId, customerId, clinicId, email, priceIds };
  }
  if (type === 'subscription.canceled' || type === 'subscription.past_due') {
    return { action: 'revoke', reason: type, plan, transactionId, customerId, clinicId };
  }
  if (type === 'adjustment.created') {
    const status = String(data.status || '');
    if (data.action === 'refund' || status === 'approved') {
      return { action: 'revoke', reason: 'refund', plan, transactionId, customerId, clinicId };
    }
  }
  return { action: 'ignore', reason: 'unhandled_event', eventType: type };
}

/* ------------------------------------------------------------------ *
 * 4. Licence keys — deterministic, offline-verifiable
 *    key = XTB-XXXXX-XXXXX-XXXXX-XXXXX derived from
 *    HMAC-SHA256(LICENSE_SECRET, tx|buyer|plan)
 * ------------------------------------------------------------------ */

function deriveLicenseKey(secret, parts) {
  if (!secret) throw new Error('LICENSE_SECRET not set');
  const material = [parts.transactionId, parts.customerId, parts.plan].join('|');
  const hex = crypto.createHmac('sha256', secret).update(material).digest('hex');
  const body = hex.slice(0, 20).toUpperCase().replace(/(.{5})(?=.)/g, '$1-');
  return `XTB-${body}`;
}

function verifyLicenseKey(secret, key, parts) {
  try {
    const expected = deriveLicenseKey(secret, parts);
    const a = Buffer.from(String(key || '').toUpperCase(), 'utf8');
    const b = Buffer.from(expected, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * 5. Local ledger — data/licenses.json (never committed)
 * ------------------------------------------------------------------ */

function readLicenses(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Append a record (idempotent by transaction id). Returns {record, created}. */
function saveLicense(file, record) {
  const all = readLicenses(file);
  const existing = all.find((r) => r.transaction_id && r.transaction_id === record.transaction_id);
  if (existing) return { record: existing, created: false };
  const row = { ...record, issued_at: record.issued_at || new Date().toISOString() };
  all.push(row);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(all, null, 2));
  return { record: row, created: true };
}

/** Mark a licence revoked by transaction id. */
function revokeLicense(file, transactionId, reason) {
  const all = readLicenses(file);
  const row = all.find((r) => r.transaction_id === transactionId);
  if (!row) return { ok: false, reason: 'not_found' };
  row.status = 'revoked';
  row.revoked_at = new Date().toISOString();
  row.revoke_reason = reason || 'refund';
  fs.writeFileSync(file, JSON.stringify(all, null, 2));
  return { ok: true, record: row };
}

/* ------------------------------------------------------------------ *
 * 6. Checkout — server-created Paddle transaction → hosted checkout URL
 * ------------------------------------------------------------------ */

/**
 * Create a Paddle transaction and return its hosted checkout URL.
 * Requires PADDLE_API_KEY. Throws {code:'not_configured'} when keys/price missing.
 */
async function createCheckout(cfg, input) {
  const priceId = String((input && input.priceId) || '').trim();
  if (!cfg.paddleApiKey || !priceId) {
    const err = new Error('PADDLE_API_KEY / price_id not configured');
    err.code = 'not_configured';
    throw err;
  }
  const body = {
    items: [{ price_id: priceId, quantity: 1 }],
    custom_data: { clinic_id: String((input && input.clinicId) || 'default') },
  };
  if (input && input.email) body.customer = { email: String(input.email) };

  const res = await fetch(`${cfg.paddleApiBase}/transactions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.paddleApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = json && json.error ? json.error.detail || json.error.code : `http_${res.status}`;
    const err = new Error(`paddle ${res.status}: ${detail}`);
    err.code = 'paddle_error';
    throw err;
  }
  const data = (json && json.data) || {};
  return {
    ok: true,
    transactionId: data.id || null,
    status: data.status || null,
    checkoutUrl: (data.checkout && data.checkout.url) || null,
  };
}

module.exports = {
  parseSignature,
  verifySignature,
  signPayload,
  priceMap,
  mapEvent,
  deriveLicenseKey,
  verifyLicenseKey,
  readLicenses,
  saveLicense,
  revokeLicense,
  createCheckout,
};
