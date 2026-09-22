# ENV_SECURE.md — XTOBE BUSINESS (xtobe-2) — Environment Runbook
**All secrets live ONLY in Render Dashboard → Environment (or local `.env`, which is gitignored). Never in code, never in Git.**

## Required environment variables

| Variable | What / Where from | Effect when missing |
|---|---|---|
| `ADMIN_USERNAME` | your choice (default `admin`) | defaults to `admin` |
| `ADMIN_PASSWORD` | strong password | **API lockdown + dashboard login OFF** (boot warning) — set it to enable |
| `SESSION_TTL_HOURS` | session lifetime (default `12`) | 12h sessions |
| `LICENSE_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` (≥32 chars) | anti-clone shield **disabled** (boot warning) |
| `ALLOWED_DOMAINS` | e.g. `xtobe.ae,api.xtobe.ae,client-clinic.ae,localhost` | only `localhost` allowed (dev) |
| `WHATSAPP_TOKEN` | Meta Developers → WhatsApp → API Setup | WhatsApp send disabled |
| `WHATSAPP_PHONE_ID` | same place | WhatsApp send disabled |
| `WHATSAPP_VERIFY_TOKEN` | your chosen webhook verify string | webhook GET handshake fails |
| `WHATSAPP_APP_SECRET` | Meta App → Settings → Basic → App Secret | webhook signatures **not verified** (warning) — set it to activate HMAC 401s |
| `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL` | OpenAI-compatible provider | content studio falls back to offline templates |
| `CLINIC_NAME` / `CLINIC_CURRENCY` | branding defaults | Xtobe Demo Clinic / AED |

## Session + license flows (how tokens work)
- **Dashboard login:** `POST /api/auth/login` → 256-bit session token; browser gets it via HttpOnly `SameSite=Strict` cookie AND JSON body; all `/api/*` calls need `Authorization: Bearer <token>` (patched automatically by `/auth.js`). Server stores only the SHA-256 of tokens.
- **White-label license:** clinic page loads `/injection.js` (Referer must be in `ALLOWED_DOMAINS`) → script calls `POST /api/brand/session` → gets `token = HMAC-SHA256(clinic_id|base_domain, LICENSE_SECRET)` → calls `/api/brand` with `x-clinic-id` + `x-license-token`. The browser **never** sees `LICENSE_SECRET`.

## Per-clinic token (server-to-server / manual)
```js
const crypto = require('crypto');
const token = crypto.createHmac('sha256', process.env.LICENSE_SECRET)
  .update('lumiere|lumiere-aesthetics.ae').digest('hex');
```

## Verify after deploy
```bash
curl https://<render-url>/api/health                 # 200 {"status":"ok"}
curl https://<render-url>/api/appointments           # 401 (lockdown)
curl -X POST https://<render-url>/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"admin","password":"..."}'          # 200 + token
curl https://<render-url>/.well-known/security.txt   # safe harbor
curl https://<render-url>/legal/ToS.md               # legal shield live
curl -H 'Referer: https://evil.com' https://<render-url>/injection.js   # 403
```

## Security checklist
- [ ] `.env` in `.gitignore` (already), repo PRIVATE (already)
- [ ] Render env: `ADMIN_PASSWORD`, `LICENSE_SECRET`, `WHATSAPP_APP_SECRET` set
- [ ] `ALLOWED_DOMAINS` lists every clinic domain
- [ ] `/api/appointments` returns 401 without a session
- [ ] Dashboard shows login overlay and works after sign-in
- [ ] `POWERED BY XTOBE` footer + `<meta name="x-license">` present in served HTML
