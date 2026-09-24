# Xtobe Launch Kit — VERIFIED CLAIMS ONLY

Every claim below was checked against the actual codebase on 2026-09-24.
Nothing here is aspirational. If it isn't in the repo, it isn't in the copy.

---

## What the project actually is (verified)

- **Xtobe-2**: Node.js + Express clinic-operations platform — dashboard, appointments,
  content studio, JWT auth (bcryptjs), helmet, rate limiting, SQLite storage.
- **Security test suite**: `lockdown.test.js` — **ran live: 12/12 PASS**. It verifies auth
  gating (401 without session, token death on logout, health/security.txt/ToS endpoints).
- **File integrity guard**: `pc-agent/file-guard-strict.js` — **ran live: 0 failures**.
  SHA-256 + content rules on 3 core files; blocks forbidden patterns, backs up allowed writes.
- **PC agent**: `pc-agent/pc-agent.js` — local polling agent with a local JSON token ledger
  (`pc-agent/data/tokens.json`, balance 520: story_share +50, dream_share +150, skill_update +100).
- **Webhook security**: `secure/webhookVerify.js` — HMAC-SHA256 signature verification with
  `crypto.timingSafeEqual` (currently wired for WhatsApp/Meta webhooks).
- **Not in the repo (do NOT claim)**: no Rust, no Tauri, no MSI installer, no hypervisor/VMM,
  no WHPX/KVM, no Yocto microVM, no Paddle integration, no `guardian.py`/PyArmor.

---

## 1. GitHub README (paste-ready)

```markdown
# Xtobe — Local-First Clinic Operations Platform with a Local PC Agent

Node.js/Express platform for clinic operations (dashboard, appointments, content studio)
with a companion local PC agent and a file-integrity guard.

## Verified security posture
- **Auth lockdown suite: 12/12 PASS** (`lockdown.test.js`) — protected APIs return 401
  without a session, tokens die on logout, health/security.txt/ToS stay reachable.
- **File guard: 0 failures** (`pc-agent/file-guard-strict.js`) — SHA-256 + content rules
  protect core files; every blocked write is logged, every allowed write is backed up.
- **Webhook verification**: HMAC-SHA256 with timing-safe comparison (`secure/webhookVerify.js`).
- **Local agent state**: the PC agent keeps its token ledger in local JSON
  (`pc-agent/data/tokens.json`) — story_share +50, dream_share +150, skill_update +100.

## Run locally
1. `cp .env.example .env` and fill in placeholder values
2. `npm install`
3. `npm start`
4. `npm test` to run the auth test suite

## Deployment
`render.yaml` included for Render. Set secrets (ADMIN_PASSWORD, JWT_SECRET,
WHATSAPP_APP_SECRET, ...) in your host's secret store — never in Git.
```

---

## 2. Reddit post (r/selfhosted — paste-ready)

**Title:** I built a Node.js clinic-ops platform with an auth lockdown test suite and a local file-integrity guard — feedback welcome

**Body:**
> I run a small clinic-operations stack (Express + SQLite: dashboard, appointments,
> content studio, WhatsApp integration). Two parts the self-hosted crowd might find useful:
>
> 1. A lockdown integration test that boots the real server on a scratch DB and asserts
>    auth gating end-to-end — 12/12 passing (401 without session, tokens invalidated on
>    logout, public endpoints exempt).
> 2. A file-integrity guard that enforces SHA-256/content rules on core files and logs
>    every blocked write.
>
> There's also a small local agent that keeps a token ledger on-device for user actions.
> Repo: [your GitHub link]. Happy to answer questions about the auth design.

---

## 3. Discord outreach (compliant, non-spammy)

```text
Hey! I've been building a local-first clinic-ops platform in Node.js — JWT auth with a
full lockdown test suite (12/12 passing), HMAC-SHA256 webhook verification, and a local
file-integrity guard. I'm looking for a few people to try it and give honest feedback.
No strings attached — would you be up for taking a look? Repo: [link]
```

---

## 4. Product Hunt (only after the product matches the pitch)

Do NOT launch on Product Hunt yet. The current repo is a clinic-ops demo, not the
"Xtobe Final Guardian" product described in earlier drafts. Launch when you have a real
installable product, a real checkout link, and a public repo that proves every claim.

**Tagline (when ready):** Local-first clinic operations with a verifiable security posture.
