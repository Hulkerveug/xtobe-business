// Full E2E: shield ON (LICENSE_SECRET set) + lockdown + watermark + injection.js + license flow
process.env.ADMIN_PASSWORD = 'e2e-pass';
process.env.ADMIN_USERNAME = 'e2eadmin';
process.env.LICENSE_SECRET = 'e2e-'.repeat(8) + 'x'; // >= 32 chars
process.env.ALLOWED_DOMAINS = 'xtobe.ae,clinic-test.ae';
process.env.PORT = '3124';
process.env.DB_FILE = 'data/e2e-test.db';
const { spawn } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const srv = spawn(process.execPath, ['server/index.js'], { stdio: ['ignore', 'inherit', 'inherit'], cwd: __dirname });

let pass = 0, fail = 0;
const check = (n, c) => { c ? pass++ : fail++; console.log((c ? 'PASS' : 'FAIL') + '  ' + n); if (!c) process.exitCode = 1; };

async function run() {
  let up = false;
  for (let i = 0; i < 40 && !up; i++) {
    await new Promise(r => setTimeout(r, 500));
    try { await fetch('http://127.0.0.1:3124/api/health'); up = true; } catch {}
  }
  if (!up) { console.error('server never came up'); srv.kill(); process.exit(1); }
  const B = 'http://127.0.0.1:3124';

  // 1. watermark on served HTML (shield on)
  let r = await fetch(B + '/');
  let html = await r.text();
  check('1 landing 200 with x-license meta', r.status === 200 && html.includes('name="x-license"'));
  check('2 license HTML comment present', html.includes('lic:'));
  check('3 POWERED BY XTOBE footer injected', html.includes('POWERED BY XTOBE'));
  check('4 auth gate tag present in HTML', html.includes('/auth.js'));

  // 2. injection.js referer guard
  r = await fetch(B + '/injection.js', { headers: { Referer: 'https://notxtobe.ae.evil.com/x' } });
  check('5 injection.js evil referer -> 403', r.status === 403);
  r = await fetch(B + '/injection.js', { headers: { Referer: 'https://www.clinic-test.ae/page' } });
  const inj = await r.text();
  check('6 injection.js whitelisted referer -> 200 js', r.status === 200 && inj.includes('brand/session'));
  check('7 injection.js no-store', r.headers.get('cache-control') === 'no-store');

  // 3. license token flow (session issuer -> protected /api/brand)
  r = await fetch(B + '/api/brand/session', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://clinic-test.ae' }, body: JSON.stringify({ clinic_id: 'lumiere' }) });
  const sess = await r.json();
  check('8 brand/session issues token', r.status === 200 && typeof sess.token === 'string');

  r = await fetch(B + '/api/brand?clinic_id=lumiere', { headers: { origin: 'https://clinic-test.ae', 'x-clinic-id': 'lumiere', 'x-license-token': sess.token } });
  const brand = await r.json();
  check('9 valid license -> brand JSON', r.status === 200 && (brand.brand || brand).name);

  r = await fetch(B + '/api/brand?clinic_id=lumiere', { headers: { origin: 'https://clinic-test.ae', 'x-clinic-id': 'lumiere', 'x-license-token': 'deadbeef'.repeat(8) } });
  check('10 wrong token -> 403', r.status === 403);

  const badToken = crypto.createHmac('sha256', process.env.LICENSE_SECRET).update('lumiere|notxtobe.ae').digest('hex');
  r = await fetch(B + '/api/brand?clinic_id=lumiere', { headers: { origin: 'https://notxtobe.ae.evil.com', 'x-clinic-id': 'lumiere', 'x-license-token': badToken } });
  check('11 non-whitelisted domain -> 403', r.status === 403);

  // 4. lockdown still active alongside shield
  r = await fetch(B + '/api/appointments');
  check('12 /api/appointments still 401 without session', r.status === 401);
  r = await fetch(B + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'e2eadmin', password: 'e2e-pass' }) });
  const login = await r.json();
  check('13 login works with shield on', r.status === 200 && login.token);
  r = await fetch(B + '/api/appointments', { headers: { Authorization: 'Bearer ' + login.token } });
  check('14 session grants API access', r.status === 200);

  // 5. legal + security.txt still live
  r = await fetch(B + '/.well-known/security.txt');
  check('15 security.txt 200', r.status === 200);

  srv.kill();
  console.log(`\n${pass} passed, ${fail} failed`);
  const fs = require('fs');
  for (const f of ['data/e2e-test.db', 'data/e2e-test.db-shm', 'data/e2e-test.db-wal']) {
    try { fs.unlinkSync(path.join(__dirname, f)); } catch {}
  }
  process.exit(fail ? 1 : 0);
}
run().catch(e => { console.error(e); srv.kill(); process.exit(1); });
