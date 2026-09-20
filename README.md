# Xtobe-2 — One inbox, AI booking + content studio for UAE beauty clinics

Built on the xtobe-1 bridge (WhatsApp Cloud API gateway, consent-first, numbers masked).

## What it does

1. **One inbox** — WhatsApp Cloud API inbound (Meta webhook), Instagram / Facebook parsing included. Client numbers are masked in the UI (+971 5X XXX XXXX), never spoofed.
2. **Booking** — day-view calendar, book/cancel, auto WhatsApp confirmation once credentials are set.
3. **Content studio** — Reel scripts, captions (EN + Arabic), hashtags, story frames, 7-day calendar. Works offline with templates, goes live with `AI_API_KEY`.
4. **Client cards** — notes, last visit, consent flag, upcoming appointments.

## Quick start (local)

```bash
cd C:\Users\Nishan\xtobe-2
npm install
copy .env.example .env    # then fill values (all optional for local demo)
npm start
```

Open:
- Dashboard:  http://localhost:3000/
- Appointments: http://localhost:3000/appointments
- Content studio: http://localhost:3000/content
- Health: http://localhost:3000/api/health

DB: SQLite. Preferred `better-sqlite3`; automatically falls back to Node's built-in
`node:sqlite` if the native build is blocked. Same tables either way:
`clients, conversations, messages, appointments, content_queue, settings`.

## API

| Method | Path | What |
|---|---|---|
| GET | `/api/health` | status + config flags |
| GET | `/api/webhooks/whatsapp` | Meta handshake (hub.challenge) |
| POST | `/api/webhooks/whatsapp` | Meta inbound (WhatsApp/IG/FB) |
| GET | `/api/inbox` | all conversations (grouped by client) |
| GET | `/api/conversations/:id` | thread + client card + upcoming |
| POST | `/api/send` | `{conversation_id, text}` → WhatsApp Cloud API |
| GET/POST | `/api/appointments` | list by date / create (+ auto confirmation) |
| POST | `/api/appointments/:id/cancel` | cancel |
| GET/PATCH | `/api/clients`, `/api/clients/:id` | list / notes / consent |
| POST | `/api/content/generate` | `{kind: reel\|post\|story\|calendar, topic}` |
| GET/POST/DELETE | `/api/content/queue` | post queue |
| GET | `/api/stats` | top-bar numbers |

## Meta webhook (to go live)

1. Meta app → WhatsApp → Configuration → Webhook:
   - URL: `https://<your-host>/api/webhooks/whatsapp`
   - Verify token: your `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to `messages`
2. Fill `.env`: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`.
3. Without credentials everything still works — messages are saved locally and the UI shows
   "not configured" instead of failing.

## Ethics (same as xtobe-1)

- Consent-based: no cold outreach; replies only in user-initiated threads.
- Numbers masked in UI; raw digits only used to route via the official API.
- Label `via xtobe-2` on outbound messages.

## Test a fake inbound message (no Meta needed)

```powershell
curl -X POST http://localhost:3000/api/webhooks/whatsapp `
  -H "Content-Type: application/json" `
  -d '{\"entry\":[{\"changes\":[{\"field\":\"messages\",\"value\":{\"messages\":[{\"from\":\"971501234567\",\"type\":\"text\",\"text\":{\"body\":\"Hi, is there a slot today?\"}}],\"contacts\":[{\"profile\":{\"name\":\"Demo Client\"}}]}}]}]}'
```

Then open http://localhost:3000/ — the conversation appears instantly.
