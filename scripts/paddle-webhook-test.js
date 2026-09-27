#!/usr/bin/env node
'use strict';
/**
 * Send a correctly-signed Paddle webhook to Xtobe — for testing before/after
 * you configure the real endpoint in the Paddle dashboard.
 *
 * Usage:
 *   node scripts/paddle-webhook-test.js [url] [event]
 *
 *   url    defaults to http://127.0.0.1:$PORT/api/webhooks/paddle
 *          (use your ngrok/HTTPS URL to prove the public path works)
 *   event  transaction.completed (default) | refund | unmapped
 *
 * Secret + price come from .env:
 *   PADDLE_WEBHOOK_SECRET — must match the endpoint secret in Paddle
 *   PADDLE_PRICE_LIFETIME — used to build a realistic payload
 */
const path = require('path');
const ROOT = path.join(__dirname, '..');
require(path.join(ROOT, 'server', 'env')).loadEnv(ROOT);
const paddle = require(path.join(ROOT, 'server', 'paddle'));

const secret = (process.env.PADDLE_WEBHOOK_SECRET || '').trim();
const port = (process.env.PORT || '3000').trim();
const url = process.argv[2] || `http://127.0.0.1:${port}/api/webhooks/paddle`;
const kind = process.argv[3] || 'transaction.completed';
const priceId = (process.env.PADDLE_PRICE_LIFETIME || 'pri_life_test').trim();

if (!secret || secret.includes('paste-')) {
  console.error('PADDLE_WEBHOOK_SECRET is not set in .env — nothing to sign with.');
  console.error('Paste the endpoint secret from Paddle → Developer Tools → Notifications.');
  process.exit(3);
}

const txId = `txn_test_${Date.now()}`;
const events = {
  'transaction.completed': {
    event_type: 'transaction.completed',
    data: {
      id: txId,
      customer_id: 'ctm_test_1',
      customer: { email: 'test-buyer@example.com' },
      custom_data: { clinic_id: 'clinic-test' },
      items: [{ price: { id: priceId } }],
    },
  },
  refund: {
    event_type: 'adjustment.created',
    data: { id: txId, action: 'refund', status: 'approved' },
  },
  unmapped: {
    event_type: 'transaction.completed',
    data: { id: txId, items: [{ price: { id: 'pri_unknown_price' } }] },
  },
};
const payload = events[kind];
if (!payload) {
  console.error(`Unknown event "${kind}". Use: ${Object.keys(events).join(' | ')}`);
  process.exit(2);
}

const body = JSON.stringify(payload);
const signature = paddle.signPayload(secret, body);

(async () => {
  console.log(`POST ${url}`);
  console.log(`event: ${payload.event_type}  (${kind})`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'paddle-signature': signature },
      body,
    });
    const text = await res.text();
    console.log(`HTTP ${res.status}`);
    console.log(text);
    process.exit(res.ok ? 0 : 1);
  } catch (err) {
    console.error('REQUEST FAILED:', err.message);
    process.exit(1);
  }
})();
