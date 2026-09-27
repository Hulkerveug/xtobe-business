'use strict';
/**
 * Paddle billing tests — honest proof, no mocks pretending to be Meta/Paddle.
 *
 *   1. unit  — signature verify, price map, event mapping, licence keys, ledger
 *   2. live  — boots the real server and POSTs signed/un-signed webhooks to it
 *
 * Run: node --test tests/paddle.test.js   (or: node tests/paddle.test.js)
 */
const { test } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const P = require(path.join(ROOT, 'server', 'paddle'));

const SECRET = 'whsec_test_2f8c1d4b6a9e';
const LIC_SECRET = crypto.randomBytes(32).toString('hex');

function tmp(name) {
  return path.join(os.tmpdir(), `xtobe-paddle-${process.pid}-${name}`);
}

/* ------------------------------ 1. signature ------------------------------ */

test('signature: valid header verifies', () => {
  const body = '{"event_type":"transaction.completed"}';
  const header = P.signPayload(SECRET, body, 1700000000);
  assert.deepStrictEqual(P.verifySignature(SECRET, body, header), { ok: true, ts: '1700000000' });
});

test('signature: tampered body rejected', () => {
  const header = P.signPayload(SECRET, '{"a":1}', 1700000000);
  assert.strictEqual(P.verifySignature(SECRET, '{"a":2}', header).ok, false);
  assert.strictEqual(P.verifySignature(SECRET, '{"a":2}', header).reason, 'bad_signature');
});

test('signature: wrong secret rejected', () => {
  const body = '{"a":1}';
  const header = P.signPayload('whsec_other', body, 1700000000);
  assert.strictEqual(P.verifySignature(SECRET, body, header).ok, false);
});

test('signature: missing header rejected', () => {
  assert.strictEqual(P.verifySignature(SECRET, '{}', undefined).reason, 'missing_header');
  assert.strictEqual(P.verifySignature(SECRET, '{}', 'garbage').reason, 'missing_header');
});

test('signature: stale timestamp rejected when maxAge set', () => {
  const body = '{"a":1}';
  const header = P.signPayload(SECRET, body, 1700000000);
  const now = 1700000000 * 1000 + 10 * 60 * 1000; // 10 minutes later
  assert.strictEqual(P.verifySignature(SECRET, body, header, { maxAgeSeconds: 300, now }).reason, 'stale_timestamp');
  const fresh = 1700000000 * 1000 + 60 * 1000;
  assert.strictEqual(P.verifySignature(SECRET, body, header, { maxAgeSeconds: 300, now: fresh }).ok, true);
});

test('signature: multiple h1 values accepted (rotation window)', () => {
  const body = '{"a":1}';
  const ts = 1700000000;
  const good = crypto.createHmac('sha256', SECRET).update(`${ts}:${body}`).digest('hex');
  const header = `ts=${ts};h1=${'0'.repeat(64)},${good}`;
  assert.strictEqual(P.verifySignature(SECRET, body, header).ok, true);
});

/* ------------------------------ 2. price map + events --------------------- */

test('priceMap: reads PADDLE_PRICE_<PLAN> env keys only', () => {
  const map = P.priceMap({
    PADDLE_PRICE_LIFETIME: 'pri_life_123',
    PADDLE_PRICE_GROWTH: 'pri_growth_456',
    PADDLE_API_KEY: 'should_be_ignored',
    PADDLE_PRICE_EMPTY: '',
  });
  assert.deepStrictEqual(map, { pri_life_123: 'lifetime', pri_growth_456: 'growth' });
});

const PRICES = { pri_life_123: 'lifetime' };

test('mapEvent: completed mapped transaction → issue', () => {
  const ev = {
    event_type: 'transaction.completed',
    data: {
      id: 'txn_01abc',
      customer_id: 'ctm_01xyz',
      customer: { email: 'owner@clinic.ae' },
      custom_data: { clinic_id: 'clinic-7' },
      items: [{ price: { id: 'pri_life_123' } }],
    },
  };
  const m = P.mapEvent(ev, PRICES);
  assert.strictEqual(m.action, 'issue');
  assert.strictEqual(m.plan, 'lifetime');
  assert.strictEqual(m.transactionId, 'txn_01abc');
  assert.strictEqual(m.customerId, 'ctm_01xyz');
  assert.strictEqual(m.clinicId, 'clinic-7');
  assert.strictEqual(m.email, 'owner@clinic.ae');
});

test('mapEvent: unmapped price → ignore (never issue a key for unknown money)', () => {
  const m = P.mapEvent({
    event_type: 'transaction.completed',
    data: { id: 'txn_x', items: [{ price: { id: 'pri_unknown' } }] },
  }, PRICES);
  assert.strictEqual(m.action, 'ignore');
  assert.strictEqual(m.reason, 'unmapped_price');
});

test('mapEvent: unhandled event type → ignore', () => {
  const m = P.mapEvent({ event_type: 'customer.updated', data: { id: 'ctm_1' } }, PRICES);
  assert.strictEqual(m.action, 'ignore');
});

test('mapEvent: refund → revoke', () => {
  const m = P.mapEvent({
    event_type: 'adjustment.created',
    data: { id: 'txn_01abc', action: 'refund', status: 'approved' },
  }, PRICES);
  assert.strictEqual(m.action, 'revoke');
  assert.strictEqual(m.reason, 'refund');
});

test('mapEvent: subscription.canceled → revoke', () => {
  const m = P.mapEvent({ event_type: 'subscription.canceled', data: { id: 'sub_1', customer_id: 'ctm_1' } }, PRICES);
  assert.strictEqual(m.action, 'revoke');
});

/* ------------------------------ 3. licence keys --------------------------- */

test('license key: deterministic, formatted, verifiable', () => {
  const parts = { transactionId: 'txn_01abc', customerId: 'ctm_01xyz', plan: 'lifetime' };
  const key = P.deriveLicenseKey(LIC_SECRET, parts);
  assert.match(key, /^XTB-[0-9A-F]{5}-[0-9A-F]{5}-[0-9A-F]{5}-[0-9A-F]{5}$/);
  assert.strictEqual(P.deriveLicenseKey(LIC_SECRET, parts), key, 'must be deterministic');
  assert.strictEqual(P.verifyLicenseKey(LIC_SECRET, key, parts), true);
  assert.strictEqual(P.verifyLicenseKey(LIC_SECRET, key, { ...parts, transactionId: 'txn_other' }), false);
  assert.strictEqual(P.verifyLicenseKey('different-secret', key, parts), false);
});

test('license key: refuses to derive without LICENSE_SECRET', () => {
  assert.throws(() => P.deriveLicenseKey('', { transactionId: 't', customerId: 'c', plan: 'lifetime' }), /LICENSE_SECRET/);
  assert.strictEqual(P.verifyLicenseKey('', 'XTB-AAAAA-AAAAA-AAAAA-AAAA', { transactionId: 't', customerId: 'c', plan: 'lifetime' }), false);
});

/* ------------------------------ 4. ledger --------------------------------- */

test('ledger: save is idempotent by transaction id, revoke marks the row', () => {
  const file = tmp('licenses.json');
  try { fs.unlinkSync(file); } catch { /* fresh */ }

  const rec = { license_key: 'XTB-11111-22222-33333-4444', plan: 'lifetime', transaction_id: 'txn_1', status: 'active' };
  const first = P.saveLicense(file, rec);
  const second = P.saveLicense(file, rec);
  assert.strictEqual(first.created, true);
  assert.strictEqual(second.created, false);
  assert.strictEqual(P.readLicenses(file).length, 1);

  const rev = P.revokeLicense(file, 'txn_1', 'refund');
  assert.strictEqual(rev.ok, true);
  assert.strictEqual(P.readLicenses(file)[0].status, 'revoked');
  assert.strictEqual(P.revokeLicense(file, 'txn_missing', 'refund').ok, false);
  fs.unlinkSync(file);
});

test('ledger: missing or corrupt file reads as empty (never throws)', () => {
  const file = tmp('corrupt.json');
  fs.writeFileSync(file, '{not json');
  assert.deepStrictEqual(P.readLicenses(file), []);
  fs.unlinkSync(file);
  assert.deepStrictEqual(P.readLicenses(tmp('does-not-exist.json')), []);
});

/* ------------------------------ 5. checkout guard ------------------------- */

test('checkout: without API key → not_configured (no fake success)', async () => {
  await assert.rejects(
    () => P.createCheckout({ paddleApiBase: 'https://sandbox-api.paddle.com', paddleApiKey: '' }, { priceId: 'pri_life_123' }),
    (err) => err.code === 'not_configured'
  );
});


/* ------------------------------ 6. live server ---------------------------- */

const PORT = 3139;
const LIC_FILE = tmp('licenses-live.json');
const DB_FILE = tmp('live.db');

async function waitForHealth(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/api/health`);
      if (r.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((res) => setTimeout(res, 300));
  }
  return false;
}

test('live: signed webhook issues + revokes a license; unsigned rejected; ledger protected', async (t) => {
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      DB_FILE,
      LICENSE_FILE: LIC_FILE,
      PADDLE_WEBHOOK_SECRET: SECRET,
      PADDLE_API_KEY: 'paddle_test_dummy_key',
      PADDLE_API_BASE: 'http://127.0.0.1:9',
      PADDLE_PRICE_LIFETIME: 'pri_life_123',
      LICENSE_SECRET: LIC_SECRET,
      NODE_ENV: 'test',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logs = [];
  child.stdout.on('data', (d) => logs.push(String(d)));
  child.stderr.on('data', (d) => logs.push(String(d)));
  t.after(() => {
    try { child.kill(); } catch { /* already gone */ }
    for (const f of [LIC_FILE, DB_FILE]) { try { fs.unlinkSync(f); } catch { /* ignore */ } }
  });

  assert.strictEqual(await waitForHealth(), true, `server did not boot: ${logs.join('').slice(0, 500)}`);

  const url = `http://127.0.0.1:${PORT}/api/webhooks/paddle`;
  const payload = JSON.stringify({
    event_type: 'transaction.completed',
    data: {
      id: 'txn_live_1',
      customer_id: 'ctm_live_1',
      customer: { email: 'buyer@clinic.ae' },
      custom_data: { clinic_id: 'clinic-live' },
      items: [{ price: { id: 'pri_life_123' } }],
    },
  });
  const signed = (body) => ({
    method: 'POST',
    headers: { 'content-type': 'application/json', 'paddle-signature': P.signPayload(SECRET, body) },
    body,
  });

  // (a) unsigned / unverifiable → 401
  let r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload });
  assert.strictEqual(r.status, 401);
  assert.strictEqual((await r.json()).error, 'bad_signature');

  // (b) correctly signed → license issued
  r = await fetch(url, signed(payload));
  assert.strictEqual(r.status, 200);
  const issued = await r.json();
  assert.strictEqual(issued.action, 'issue');
  assert.strictEqual(issued.created, true);
  assert.strictEqual(issued.plan, 'lifetime');
  assert.match(issued.license_key, /^XTB-/);
  // the key must be independently verifiable offline
  assert.strictEqual(
    P.verifyLicenseKey(LIC_SECRET, issued.license_key, { transactionId: 'txn_live_1', customerId: 'ctm_live_1', plan: 'lifetime' }),
    true
  );

  // (c) replay → idempotent, same key, no duplicate row
  r = await fetch(url, signed(payload));
  const replayed = await r.json();
  assert.strictEqual(replayed.created, false);
  assert.strictEqual(replayed.license_key, issued.license_key);

  // (d) refund → revoke
  const refund = JSON.stringify({ event_type: 'adjustment.created', data: { id: 'txn_live_1', action: 'refund', status: 'approved' } });
  r = await fetch(url, signed(refund));
  assert.deepStrictEqual(await r.json(), { ok: true, action: 'revoke', revoked: true });

  // (e) ledger file on disk reflects both steps
  const rows = P.readLicenses(LIC_FILE);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].status, 'revoked');
  assert.strictEqual(rows[0].revoke_reason, 'refund');

  // (f) ledger is admin-only
  r = await fetch(`http://127.0.0.1:${PORT}/api/licenses`);
  assert.strictEqual(r.status, 401);

  // (g) checkout: unknown price → 400; known price but unreachable Paddle API → honest 502
  r = await fetch(`http://127.0.0.1:${PORT}/api/checkout`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plan: 'nope' }),
  });
  assert.strictEqual(r.status, 400);
  assert.strictEqual((await r.json()).error, 'unknown_price');

  r = await fetch(`http://127.0.0.1:${PORT}/api/checkout`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plan: 'lifetime' }),
  });
  assert.strictEqual(r.status, 502);
  assert.strictEqual((await r.json()).error, 'checkout_failed');
});
