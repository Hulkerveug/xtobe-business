# Xtobe Launch Kit — VERIFIED CLAIMS ONLY
*Audit date: 2026-09-24. Every claim below was run/verified against the real codebase at `C:\Users\Nishan\Xtobe\xtobe-2`.*

## ❌ Claims REMOVED from the previous kit (do not post these — they are false)
- ~~Rust / Tauri core~~ — no Rust, no Tauri, no Cargo.toml exists in the repo
- ~~Custom VMM / WHPX / KVM hypervisor, 8MB Yocto microVM, 80ms boot~~ — does not exist
- ~~`npm run tauri build`, MSI installer, pyarmor guardian.py~~ — no such build targets
- ~~Paddle checkout / HMAC Paddle webhooks~~ — not integrated (the HMAC code that exists verifies **WhatsApp** webhooks)
- ~~"12/12 lockdown = zero cloud telemetry leaks"~~ — the real 12/12 test verifies **auth gating** (401s, sessions, logout). Impressive, but a different claim.
- ~~"Guard 0 failures blocks `..` and `.env` at hypervisor level"~~ — the real guard is a Node file-integrity checker over 3 files. It genuinely passes (0 failures), but describe it accurately.
- ~~"Secret investor 5x token tiers" DMs~~ — removed entirely; this pattern gets accounts banned and reads as a scam
- ~~Incentivized "lifetime access for a review"~~ — violates Product Hunt rules; replaced with a feedback ask
- ~~Placeholder checkout link~~ — no checkout exists yet; say "pilot access" instead

## ✅ Claims you CAN make (verified today)
- Self-hosted clinic-operations server: dashboard, appointments, content studio (Express, JWT sessions, helmet, rate-limit, SQLite)
- Auth lockdown integration test: **12/12 PASS** (`node lockdown.test.js`)
- File-integrity guard protecting core server files: **0 failures** (`node pc-agent/file-guard-strict.js check`)
- WhatsApp Cloud API webhook with timing-safe HMAC-SHA256 verification (`secure/webhookVerify.js`)
- Domain-locked license token issuance (`/api/brand/session`) — partial; see honesty note
- Local-first PC agent with an on-device token ledger (`pc-agent/data/tokens.json`)
- Mobile PWA / Capacitor package ready (`xtobe-cline-package/`)
- One-click Render deployment (`render.yaml`)

## ⚠️ Honesty note to include if asked about e2e
The license-shield hardening layer (watermark injection, referer-guarded `injection.js`) currently fails 9 of 15 e2e checks. Either fix it before launch or don't market it. Do not claim "e2e passing."

---

## README.md (verified rewrite)
```markdown
# Xtobe

Self-hosted clinic-operations platform: dashboard, appointments, content studio,
and WhatsApp patient messaging — with domain-locked licensing and an auth-lockdowned API.

## Verified status
- Auth lockdown integration test: 12/12 PASS (`node lockdown.test.js`)
- File-integrity guard on core files: 0 failures (`node pc-agent/file-guard-strict.js check`)
- WhatsApp webhooks verified with timing-safe HMAC-SHA256
- Local PC agent keeps its ledger on-device (`pc-agent/data/tokens.json`)

## Stack
Node.js / Express, SQLite, JWT sessions, helmet + rate limiting, Capacitor (mobile PWA).

## Run
npm install && npm start   # then open http://localhost:3123

## Deploy
Render-ready via render.yaml. Set secrets (ADMIN_PASSWORD, JWT_SECRET,
SESSION_SECRET, WHATSAPP_TOKEN, AI_API_KEY) in your host's secret store.
```

## Reddit post (r/selfhosted) — verified version
**Title:** I built a self-hosted clinic-operations server (appointments + WhatsApp + content studio) with an auth-lockdown test suite — feedback welcome

> Solo-built Node/Express app for small clinics: dashboard, appointments, content studio, and WhatsApp Cloud API messaging with HMAC-SHA256 webhook verification. All API routes sit behind JWT auth — the lockdown suite runs 12/12 green, and a file-integrity guard watches the core server files. Render deployment is one click via render.yaml.
> Still pre-1.0 and I'd genuinely love harsh feedback on the auth design. Repo: [LINK WHEN PUBLIC]

## Discord outreach (compliant version)
```text
Hey! I solo-built a self-hosted clinic-operations server (Express + SQLite) —
auth-lockdowned API, WhatsApp webhook verification, one-click Render deploy.
It's pre-1.0 and I'm looking for 5 people to try it and tear it apart with honest
feedback. Free pilot access, no strings. Interested?
```

## Product Hunt (verified version)
- **Name:** Xtobe
- **Tagline:** Self-hosted clinic operations — appointments, WhatsApp, content, one server.
- **First comment:** Solo-built this to give small clinics a self-hosted alternative with an auth-lockdowned API and verified WhatsApp webhooks. It's early — tell me what's missing.

## Launch checklist (realistic)
1. [ ] Decide: fix the 9 failing e2e license-shield checks first, or launch without marketing that layer
2. [ ] Create public repo with the verified README above
3. [ ] Post r/selfhosted (follow their self-promotion rules — check sidebar first)
4. [ ] Send 5 Discord feedback asks (the compliant version, only where self-promo is allowed)
5. [ ] Product Hunt only after payment or free-tier access actually works
