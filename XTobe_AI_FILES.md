# Xtobe AI — Complete File Manifest (xtobe-2)
**Everything below lives in `C:\Users\Nishan\Xtobe\xtobe-2` (GitHub: Hulkerveug/xtobe-business → Render).**

## 🧠 AI engines (`server/`)
| File | What it does |
|---|---|
| `aigate.js` | AI Creator access gate + usage billing — Elite 20 videos/mo, addon AED 399 = 8/mo, extra AED 49/video |
| `video.js` | Promo Reborn — old promo video → new offer, same face; tier-gated, **staff-approval before anything sends** |
| `content.js` | AI content studio — server-side prompts, any OpenAI-compatible endpoint, API key never touches the browser |
| `leads.js` | Lead engine — website widget, click-to-chat, IG bio, UTM ads, walk-in QR → one pipeline, approval-gated |
| `vitalis-engine.js` | Vitalis Research Engine — breath/pressure/carrier/longevity/credential engines |
| `ldt.js` | Loop-Dead-Teleporter loop detection telemetry (stub; full version in MindMirror) |
| `whatsapp.js` | WhatsApp Cloud API client + webhook parsing (WhatsApp/IG/FB), phone masking |

## 🛡 Security (`server/` + `secure/`)
| File | What it does |
|---|---|
| `security.js` | Security headers, CSP, `X-Powered-By` off, raw-body capture, **webhook HMAC verification (`X-Hub-Signature-256`)**, scrubbed 404/500 |
| `authShield.js` | Global 100 req/min per IP (ALL routes), 20 req/min auth/webhook, brute-force: 5 fails/15 min → 30 min lock (423 + Retry-After) |
| `auth.js` | `/api/auth/login|logout|me`, scrypt hashing, 256-bit sessions (server stores SHA-256 only), `requireSession` on ALL `/api/*` |
| `antiCloneShield.js` (secure/) | License = HMAC-SHA256(clinic_id\|base_domain, LICENSE_SECRET), domain whitelist, /api rate limit, watermark builders |
| `injection.secure.js` (secure/) | White-label loader served ONLY to whitelisted referers via `/injection.js`; applies brand + required footer |

## 🗄 Data (`server/`)
| File | What it does |
|---|---|
| `db.js` | SQLite (better-sqlite3, falls back to node:sqlite), WAL, migrations, schema: clients/conversations/messages/appointments/content_queue/settings/audit_log/clinics/leads/video_projects/vitalis_* |
| `protect.js` | PDPL layer — AES-256-GCM phone encryption at rest, audit-logged read/export/delete |
| `brand.js` | White-label engine — per-clinic name/logo/colors in `clinics.branding`, apply script, POWERED BY XTOBE footer |
| `index.js` | Express app wiring EVERYTHING: headers → limiters → auth → webhook (HMAC) → routes → watermark → legal → catch-alls |

## 🌐 Frontend (`public/`)
`auth.js` (login gate + Bearer patch), `index.html` (dashboard), `appointments`, `content`, `studio`, `dashboard/index.html` (195KB full dashboard), `landing.html`, `pricing.html`, `research.html`, `connector/app.html` (mobile PWA), `local/*` (offline runtime).

## ⚖️ Legal
`legal/DPA.md` (PDPL 45/2021 Processor, 72h breach, /unlink) · `legal/ToS.md` (locked pricing, 24h/72h SLA, anti-clone AED 50k) · `legal/Privacy.md` · `.well-known/security.txt` (safe harbor, Law 34/2021 Art. 2) — all served live at `/legal/*` and `/.well-known/security.txt`.

## 📋 Docs & rules
`.clinerules` (locked pricing + security contract) · `SERVER_PATCH_1_THEN_2.md` (deploy checklist) · `ENV_SECURE.md` (env runbook) · `README.md`.

## ✅ Verification status
`authShield.test.js` 11/11 · `lockdown.test.js` 12/12 · `antiCloneShield.test.js` (shield) · boot smoke test green.
