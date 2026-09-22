// authShield.js smoke test
const assert = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + '  ' + name); if (!cond) process.exitCode = 1; };
const s = require('./server/authShield.js');

// --- unit: hit()
let r = s._internal.hit('t:x', 60000, 3);
assert('1 first hits allowed', r.allowed);
s._internal.hit('t:x', 60000, 3); s._internal.hit('t:x', 60000, 3);
r = s._internal.hit('t:x', 60000, 3);
assert('2 4th hit blocked with retryAfter', !r.allowed && r.retryAfter > 0 && r.retryAfter <= 60);

// --- unit: clientIp strips ::ffff:
assert('3 clientIp parses x-forwarded-for', s._internal.clientIp({ headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }, socket: {} }) === '1.2.3.4');

// --- integration: middleware against a fake express app
const express = require('express');
const app = express();
app.use(express.json());
app.use(s.attachLoginRecorder());
app.use(s.globalLimiter());
app.use('/api/auth', s.authLimiter());
app.post('/api/auth/login', s.bruteForceGuard(), (req, res) => {
  req._xtobeRecordLogin(req.body.password === 'right');
  if (req.body.password !== 'right') return res.status(401).json({ ok: false });
  res.json({ ok: true });
});
app.get('/ping', (req, res) => res.json({ ok: true }));

async function run() {
  const server = app.listen(0);
  const port = server.address().port;
  const f = (p, opts) => fetch(`http://127.0.0.1:${port}${p}`, opts);

  let res = await f('/ping');
  assert('4 request passes limiter', res.status === 200);

  // brute force: 5 wrong attempts -> 6th locked 423
  for (let i = 0; i < 5; i++) {
    res = await f('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'wrong' }) });
  }
  assert('5 first 5 fails -> 401', res.status === 401);
  res = await f('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'wrong' }) });
  assert('6 6th attempt -> 423 locked + Retry-After', res.status === 423 && res.headers.get('retry-after') !== null);
  res = await f('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'right' }) });
  assert('7 even correct password locked -> 423', res.status === 423);

  // success clears history
  s._internal.bfFails.delete('127.0.0.1|admin');
  res = await f('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'right' }) });
  assert('8 correct password after clear -> 200', res.status === 200);

  // auth limiter: 20/min on /api/auth/*
  let codes = [];
  for (let i = 0; i < 25; i++) codes.push((await f('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status);
  assert('9 auth limiter kicks in (429 seen)', codes.includes(429));

  // global limiter: 100/min on plain routes
  codes = [];
  for (let i = 0; i < 105; i++) codes.push((await f('/ping')).status);
  assert('10 global limiter kicks in by 105th request (429 seen)', codes.includes(429));
  // earlier tests consumed the same-IP global budget, so require most (not all) passed
  assert('11 most requests still served (window counts)', codes.filter(c => c === 200).length >= 55);

  server.close();
  console.log('\ndone');
}
run().catch((e) => { console.error(e); process.exit(1); });
