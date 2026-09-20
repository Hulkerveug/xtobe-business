'use strict';
/*
 * Self-contained test for antiCloneShield.js — run with:
 *   node secure/antiCloneShield.test.js
 * Uses only built-in modules; no express required (mocks req/res).
 */

process.env.LICENSE_SECRET = 'a'.repeat(64);
process.env.ALLOWED_DOMAINS = 'clinic-a.com,app.clinic-b.ae';

const assert = require('assert');
const shield = require('./antiCloneShield');

/* ---- mock express req/res ---- */
function mockReq(headers = {}) {
  return { headers, socket: { remoteAddress: '127.0.0.1' } };
}
function mockRes() {
  return {
    statusCode: 200,
    body: null,
    headersSet: {},
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.body = obj; return this; },
    set(k, v) { this.headersSet[k] = v; return this; },
    send(b) { this.body = b; return this; },
  };
}

let passed = 0;
function ok(name, fn) {
  fn();
  passed++;
  console.log('  PASS', name);
}

console.log('antiCloneShield tests\n');

/* ---- token generation ---- */
ok('token is deterministic HMAC', () => {
  const t1 = shield.generateLicenseToken('clinic-1', 'clinic-a.com');
  const t2 = shield.generateLicenseToken('clinic-1', 'clinic-a.com');
  assert.strictEqual(t1, t2);
  assert.match(t1, /^[0-9a-f]{64}$/);
});

ok('token differs per domain (clone cannot reuse)', () => {
  const a = shield.generateLicenseToken('clinic-1', 'clinic-a.com');
  const b = shield.generateLicenseToken('clinic-1', 'evil-clone.com');
  assert.notStrictEqual(a, b);
});

/* ---- verifyLicense ---- */
ok('verifyLicense allows valid clinic+domain+token', () => {
  const token = shield.generateLicenseToken('clinic-1', 'clinic-a.com');
  const req = mockReq({
    'x-clinic-id': 'clinic-1',
    'x-license-token': token,
    origin: 'https://app.clinic-a.com',
  });
  const res = mockRes();
  let called = false;
  shield.verifyLicense(req, res, () => { called = true; });
  assert.strictEqual(called, true);
  assert.deepStrictEqual(req.license, { clinicId: 'clinic-1', domain: 'clinic-a.com' });
});

ok('verifyLicense rejects wrong token (403, generic body)', () => {
  const req = mockReq({
    'x-clinic-id': 'clinic-1',
    'x-license-token': 'f'.repeat(64),
    origin: 'https://clinic-a.com',
  });
  const res = mockRes();
  shield.verifyLicense(req, res, () => assert.fail('should not call next'));
  assert.strictEqual(res.statusCode, 403);
  assert.deepStrictEqual(res.body, { error: 'Unauthorized' });
});

ok('verifyLicense rejects non-whitelisted domain (403)', () => {
  const req = mockReq({
    'x-clinic-id': 'clinic-1',
    'x-license-token': 'f'.repeat(64),
    origin: 'https://evil-clone.com',
  });
  const res = mockRes();
  shield.verifyLicense(req, res, () => assert.fail('should not call next'));
  assert.strictEqual(res.statusCode, 403);
});

ok('verifyLicense rejects missing headers (401)', () => {
  const res = mockRes();
  shield.verifyLicense(mockReq({}), res, () => assert.fail('should not call next'));
  assert.strictEqual(res.statusCode, 401);
});

ok('stolen token replayed from different domain fails', () => {
  const token = shield.generateLicenseToken('clinic-1', 'clinic-a.com');
  const req = mockReq({
    'x-clinic-id': 'clinic-1',
    'x-license-token': token,
    origin: 'https://app.clinic-b.ae',
  });
  const res = mockRes();
  shield.verifyLicense(req, res, () => assert.fail('should not call next'));
  assert.strictEqual(res.statusCode, 403);
});

/* ---- domain whitelist ---- */
ok('subdomains of allowed domains pass', () => {
  assert.strictEqual(shield._internal.isAllowedHost('app.clinic-a.com'), true);
  assert.strictEqual(shield._internal.isAllowedHost('clinic-a.com'), true);
});

ok('look-alike domains fail', () => {
  assert.strictEqual(shield._internal.isAllowedHost('clinic-a.com.evil.com'), false);
  assert.strictEqual(shield._internal.isAllowedHost('evilclinic-a.com'), false);
});

/* ---- injection.js guard ---- */
ok('injection served to whitelisted referer with no-store', () => {
  const handler = shield.serveInjectionScript('SCRIPT_SOURCE');
  const res = mockRes();
  handler(mockReq({ referer: 'https://app.clinic-a.com/page' }), res);
  assert.strictEqual(res.body, 'SCRIPT_SOURCE');
  assert.strictEqual(res.headersSet['Cache-Control'], 'no-store');
  assert.match(res.headersSet['Content-Type'], /application\/javascript/);
});

ok('injection denied (403) to unknown referer', () => {
  const handler = shield.serveInjectionScript('SCRIPT_SOURCE');
  const res = mockRes();
  handler(mockReq({ referer: 'https://evil-clone.com/' }), res);
  assert.strictEqual(res.statusCode, 403);
  assert.deepStrictEqual(res.body, { error: 'Unauthorized' });
});

ok('injection denied (403) when referer absent', () => {
  const handler = shield.serveInjectionScript('SCRIPT_SOURCE');
  const res = mockRes();
  handler(mockReq({}), res);
  assert.strictEqual(res.statusCode, 403);
});

/* ---- rate limiter ---- */
ok('rate limiter allows 100, blocks 101st with 429 + Retry-After', () => {
  const headers = { 'x-clinic-id': 'ratelimit-test-clinic' };
  for (let i = 0; i < shield.RATE_LIMIT_MAX; i++) {
    let called = false;
    shield.rateLimiter(mockReq(headers), mockRes(), () => { called = true; });
    assert.strictEqual(called, true, `request ${i + 1} should pass`);
  }
  const res = mockRes();
  shield.rateLimiter(mockReq(headers), res, () => assert.fail('101st should not pass'));
  assert.strictEqual(res.statusCode, 429);
  assert.ok(res.headersSet['Retry-After'] >= 1);
});

/* ---- watermark ---- */
ok('watermark hash binds clinic+domain+date', () => {
  const h1 = shield.generateWatermarkHash('clinic-1', 'clinic-a.com', '2026-09-20');
  const h2 = shield.generateWatermarkHash('clinic-1', 'clinic-a.com', '2026-09-21');
  assert.match(h1, /^[0-9a-f]{64}$/);
  assert.notStrictEqual(h1, h2);
});

ok('injectWatermark adds meta + comment + footer, preserves html', () => {
  const html = '<!DOCTYPE html><html><head><title>t</title></head><body><p>hi</p></body></html>';
  const out = shield.injectWatermark(html, 'clinic-1', 'clinic-a.com', '2026-09-20');
  const hash = shield.generateWatermarkHash('clinic-1', 'clinic-a.com', '2026-09-20');
  assert.ok(out.includes(`<meta name="x-license" content="${hash}">`));
  assert.ok(out.includes(`<!-- lic:${hash} -->`));
  assert.ok(out.includes('POWERED BY XTOBE'));
  assert.ok(out.includes('font-size:10px') && out.includes('opacity:0.35'));
  assert.ok(out.includes('<p>hi</p>'));
  assert.ok(out.indexOf('x-license') < out.indexOf('</head>'));
  assert.ok(out.indexOf('POWERED BY XTOBE') < out.indexOf('</body>'));
});

/* ---- CORS ---- */
ok('CORS allows whitelisted origin, rejects others', () => {
  let err, allowed;
  shield.corsOptions.origin('https://app.clinic-a.com', (e, a) => { err = e; allowed = a; });
  assert.strictEqual(err, null);
  assert.strictEqual(allowed, true);

  shield.corsOptions.origin('https://evil-clone.com', (e) => { err = e; });
  assert.ok(err instanceof Error);
});

ok('CORS allows server-to-server (no origin)', () => {
  let err, allowed;
  shield.corsOptions.origin(undefined, (e, a) => { err = e; allowed = a; });
  assert.strictEqual(err, null);
  assert.strictEqual(allowed, true);
});

console.log(`\nAll ${passed} tests passed.`);
