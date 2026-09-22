// Step 2 lockdown integration test — boots the REAL server on a scratch DB
process.env.ADMIN_PASSWORD = 'test-pass-123';
process.env.ADMIN_USERNAME = 'testadmin';
process.env.PORT = '3123';
process.env.DB_FILE = 'data/lockdown-test.db';
const { spawn } = require('child_process');
const srv = spawn(process.execPath, ['server/index.js'], { stdio: ['ignore', 'inherit', 'inherit'], cwd: __dirname });

let pass = 0, fail = 0;
const check = (n, c) => { c ? pass++ : fail++; console.log((c ? 'PASS' : 'FAIL') + '  ' + n); if (!c) process.exitCode = 1; };

async function run() {
  // wait for boot
  let up = false;
  for (let i = 0; i < 40 && !up; i++) {
    await new Promise(r => setTimeout(r, 500));
    try { await fetch('http://127.0.0.1:3123/api/health'); up = true; } catch {}
  }
  if (!up) { console.error('server never came up'); srv.kill(); process.exit(1); }
  const B = 'http://127.0.0.1:3123';

  let r = await fetch(B + '/api/health');
  check('1 health exempt', r.status === 200);

  r = await fetch(B + '/api/appointments');
  check('2 protected API without session -> 401', r.status === 401);

  r = await fetch(B + '/api/auth/me');
  const me = await r.json();
  check('3 /me says enabled:true, unauthenticated', r.status === 200 && me.enabled === true && me.authenticated === false);

  r = await fetch(B + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'testadmin', password: 'wrong' }) });
  check('4 wrong password -> 401', r.status === 401);

  r = await fetch(B + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'testadmin', password: 'test-pass-123' }) });
  const login = await r.json();
  check('5 correct login -> 200 + token', r.status === 200 && login.ok && typeof login.token === 'string');

  r = await fetch(B + '/api/appointments', { headers: { Authorization: 'Bearer ' + login.token } });
  check('6 protected API with session -> 200', r.status === 200);

  r = await fetch(B + '/api/brand/session', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://xtobe.ae' }, body: JSON.stringify({ clinic_id: 'default' }) });
  check('7 brand/session exempt (license issuer reachable)', r.status !== 401);

  r = await fetch(B + '/api/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + login.token } });
  check('8 logout ok', r.status === 200);
  r = await fetch(B + '/api/appointments', { headers: { Authorization: 'Bearer ' + login.token } });
  check('9 token dead after logout -> 401', r.status === 401);

  // dashboard pages serve + carry auth.js tag
  r = await fetch(B + '/dashboard');
  const html = await r.text();
  check('10 dashboard serves with auth gate', r.status === 200 && html.includes('/auth.js'));

  r = await fetch(B + '/.well-known/security.txt');
  check('11 security.txt served', r.status === 200 && (await r.text()).includes('Safe harbor'));

  r = await fetch(B + '/legal/ToS.md');
  check('12 ToS served', r.status === 200 && (await r.text()).includes('AED 50,000'));

  srv.kill();
  console.log(`\n${pass} passed, ${fail} failed`);
  const fs = require('fs');
  try { fs.unlinkSync(require('path').join(__dirname, 'data/lockdown-test.db')); } catch {}
  process.exit(fail ? 1 : 0);
}
run().catch(e => { console.error(e); srv.kill(); process.exit(1); });
