# SERVER_PATCH_1_THEN_2.md — XTOBE xtobe-2

## ✅ STEP 1 — DONE (this commit)

| Change | File | Status |
|---|---|---|
| Global limiter 100 req/min per IP on **all** routes (static + api) | `server/authShield.js` → wired `server/index.js` | ✅ |
| Auth limiter 20 req/min per IP on webhook + `/auth/*`, `/session-auth/*`, `/api/auth/*`, `/api/session-auth/*` | same | ✅ |
| Brute force: 5 fails / 15 min per `ip\|username` → 30 min lock (423 + `Retry-After`) | `authShield.bruteForceGuard()` / `req._xtobeRecordLogin(ok)` | ✅ ready — mounts when login route exists (Step 2) |
| Webhook signature verification `X-Hub-Signature-256` | already existed: `security.verifyWhatsAppSignature` wired at webhook route | ✅ (no new `webhookVerify.js` needed — skip duplicate) |
| Login handler pattern for Step 2 | see below | 📋 |

### Login handler pattern (use in Step 2)
```js
app.post('/api/auth/login', authShield.bruteForceGuard(), async (req, res) => {
  const user = findUser(req.body.username);
  const ok = user && await bcrypt.compare(req.body.password || '', user.hash);
  req._xtobeRecordLogin(ok);                       // 5 fails/15min => 30min lock
  if (!ok) return res.status(401).json({ ok: false, error: 'invalid_credentials' });
  // ... issue session/JWT, never return secrets
});
```

### Render env (add before/with deploy)
```
WHATSAPP_APP_SECRET=<Meta App > Settings > Basic > App Secret>
```
If unset, webhook verification logs a warning and allows — deploy won't break. Once set, invalid signatures → 401.

### Verify after deploy
```bash
# 1. health
curl -s https://<render-url>/api/health            # -> ok:true
# 2. webhook without signature (with WHATSAPP_APP_SECRET set) -> 401
curl -s -X POST https://<render-url>/api/webhooks/whatsapp -H 'content-type: application/json' -d '{}'
# 3. hammer webhook 25x -> 429 (auth limiter 20/min)
for i in $(seq 1 25); do curl -s -o /dev/null -w '%{http_code} ' -X POST https://<render-url>/api/webhooks/whatsapp -d '{}'; done
# 4. 101 quick requests to dashboard -> eventually 429 (global limiter)
```

## ✅ STEP 2 — DONE (this commit)

| Change | File | Status |
|---|---|---|
| `POST /api/auth/login` — scrypt password check + bruteForceGuard + audit log | `server/auth.js` | ✅ |
| `POST /api/auth/logout`, `GET /api/auth/me` | `server/auth.js` | ✅ |
| `requireSession` on ALL `/api/*` — exempt: webhook, health, brand/session, auth, vitalis | `server/index.js` | ✅ |
| Admin credentials: `ADMIN_USERNAME` + `ADMIN_PASSWORD` env seed `settings.admin_hash` on first boot | `server/auth.js` | ✅ |
| Session tokens: 256-bit random; server stores only sha256; HttpOnly SameSite=Strict cookie + Bearer support; 12h TTL | `server/auth.js` | ✅ |
| Dashboard login gate (overlay + fetch token patch) on index/appointments/content/studio/dashboard | `public/auth.js` + `<head>` tags | ✅ |
| Legal: `legal/DPA.md`, `legal/ToS.md`, `legal/Privacy.md`, `.well-known/security.txt` (served at `/legal/*`, `/.well-known/security.txt`) | new | ✅ |
| Zero new dependencies — `crypto.scrypt` instead of bcrypt | — | ✅ |
| Graceful: if no admin configured, lockdown is OFF with boot warning (no lockout) | — | ✅ |

### Env to add in Render
```
ADMIN_PASSWORD=<strong password>       # seeds admin login on first boot
WHATSAPP_APP_SECRET=<Meta App Secret>  # activates webhook signature checks
LICENSE_SECRET=<openssl rand -hex 32>  # anti-clone shield
```

### Verified — 12/12 integration + 11/11 shield tests
login/logout/me, 401 without session, 200 with session, brute-force lock, exemption paths, dashboard gate tag, security.txt, ToS served.

## ⏭ DEPLOY ORDER
1. `git push` → Render deploy
2. Render env: add `ADMIN_PASSWORD`, `WHATSAPP_APP_SECRET` (confirm `LICENSE_SECRET`)
3. Redeploy → open dashboard → login overlay appears → sign in
4. Test: `curl https://<render-url>/api/appointments` → 401; with Bearer token → 200

