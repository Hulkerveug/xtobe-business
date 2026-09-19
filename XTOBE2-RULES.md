# XTOBE-2 LOCKED RULES — all AI agents MUST follow

## 💰 LOCKED PRICING — DO NOT CHANGE ANY NUMBER

These are locked by the founder (Nishan) based on UAE market research (Sept 2026).
Changing any number below REQUIRES explicit founder approval in writing.

### Packages (setup = one-time, monthly = recurring)

| Tier | Setup (one-time) | Monthly |
|------|-----------------|---------|
| Starter | AED 1,500 | AED 499 |
| Growth | AED 2,500 | AED 999 |
| Elite | AED 4,000 | AED 1,999 |
| **Pilot** (first 3 clinics only) | **FREE** | **AED 299** (first month) |

### Never change
- All prices above
- "+971 54 358 5550" — the WhatsApp contact number
- "AED" currency everywhere (never USD/AED mix)
- Pilot limit: first 3 clinics only
- Contract terms: 3-month minimum, then monthly cancel, no lock-in

## 🛡️ LOCKED PRODUCT RULES

1. **NOTHING automated sends without staff approval** — AI drafts, humans approve. This is the #1 selling point. Never bypass, never "auto-send" anything.
2. **Client phone numbers always masked in UI** — format: `+971 5X XXX XXXX`. Full numbers never displayed.
3. **No phone spoofing** — inherited from xtobe-1 ethics.
4. **Data belongs to the clinic** — exportable as Excel anytime, deletable on request, no lock-in.
5. **AI content is always labeled as draft** until a human approves it.

## 🎨 UI RULES

- Light theme (#f5f5f7 background, white cards) — clinics are not tech people
- Inter font, big rounded cards (18-26px radius)
- Blue #0a84ff primary, green #34c759 success/approve, red only for destructive
- Big touch-friendly buttons (min 44px) — receptionists use tablets
- English first; Arabic support where marked (content studio outputs EN+AR)

## 📁 FILE STRUCTURE (do not reorganize without approval)

```
xtobe-2/
├── main          ← stable, deployable
├── development   ← active work
├── server/       ← Express + SQLite (index, db, whatsapp, content, leads)
├── public/       ← index (dashboard), pricing, appointments, content + app.js, ui.css
└── data/         ← xtobe2.db (gitignored)
```

## 🚫 NEVER DO

- Never commit .env, data/*.db, or any real client data
- Never change ports (3000) without updating all docs
- Never add npm dependencies without listing them in the commit message
- Never touch ../xtobe-connector (xtobe-1 — separate live product)
- Never invent credentials — placeholders only (YOUR_TOKEN_HERE)

## Context for new agents

- Founder: Nishan, Dubai, solo, $0 budget, ships fast
- xtobe-1 (consumer bridge): LIVE at t.me/xtobe_bridge_bot + hulkerveug.github.io/xtobe-connector
- xtobe-2 (this repo): B2B clinic platform, pre-launch, first 3 pilot clinics are the goal
- Language with founder: short, direct, English (he uses Tanglish casually but docs are English)
