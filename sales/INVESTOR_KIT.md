# Xtobe — Investor Kit
*Structure: Track 1 = working prototype (verified today, proof of execution). Track 2 = the product to be built with funding (the actual investment opportunity). Nothing in Track 2 is claimed as existing.*

---

## 1. One-liner
**Xtobe is a clinic-operations AI platform for the UAE market**: today a working self-hosted prototype (Track 1, verified below); with funding, a ground-up rebuild into a multi-tenant, white-label commercial product (Track 2) — not a clone of the prototype, a fresh commercial codebase.

## 1b. Two-track structure (read this first)
| | Track 1 — Prototype (exists) | Track 2 — Commercial rebuild (the ask) |
|---|---|---|
| Codebase | `xtobe-2` repo — Node/Express, single-tenant, self-hosted | New codebase — multi-tenant SaaS + white-label licensing |
| Purpose | Proof of execution + first pilot customers | The scalable product investors are funding |
| Sold as | Pilot access / lifetime deals to early clinics | Subscription tiers + clinic-chain licensing |
| Status | ✅ Running, verified 2026-09-24 | 📋 Specification + roadmap (does not exist yet) |

## 2. Problem
Small clinics (initial focus: UAE) juggle WhatsApp messages, appointments, and marketing content across disconnected tools. Existing clinic SaaS is priced for enterprises, phones home telemetry, and can't be self-hosted or white-labeled.

## 3. Track 1 — Prototype (what exists and works today)
*This is the evidence that the founder can ship. It is not the product being funded.*
| Component | Status | Proof |
|---|---|---|
| Auth-locked clinic server (Express + JWT sessions, helmet, rate limiting, SQLite) | ✅ Working | `lockdown.test.js` — **12/12 PASS** (ran 2026-09-24) |
| Dashboard, appointments, content studio pages | ✅ Working | Served with auth gate (lockdown check #10) |
| WhatsApp Cloud API webhook with HMAC-SHA256 signature verification | ✅ Code verified | `secure/webhookVerify.js` (timing-safe compare) |
| Brand/session license token issuer | ✅ Working | e2e checks #8, #12–15 pass |
| Local PC agent bridge (polls local commands, local token ledger) | ✅ Working | `pc-agent/pc-agent.js`, ledger at `pc-agent/data/tokens.json` |
| File-integrity guard (blocks unauthorized writes to core files) | ✅ Working | `node pc-agent/file-guard-strict.js check` → **0 failures** (ran 2026-09-24) |
| Mobile PWA / Capacitor package | ✅ Packaged | `xtobe-cline-package/` (Capacitor config, icons, store listing) |
| Deployment config | ✅ Ready | `render.yaml`, `.env.example`, legal docs (`legal/`, `.well-known/security.txt`) |

## 4. Known gaps (honesty section — investors respect this)
| Item | Reality |
|---|---|
| License-shield / watermark / injection.js hardening | ⚠️ **Currently broken** — e2e suite: 6/15 pass, 9 fail (ran 2026-09-24). Fix is the next engineering milestone. |
| Desktop app (Tauri/Rust), hypervisor, microVM | ❌ Does not exist. Any prior marketing claiming this was wrong and has been corrected. |
| Payment integration (Paddle/Stripe) | ❌ Not integrated yet. Planned for first paid tier. |
| Production customers / revenue | Pre-revenue. [FILL IN: pilot conversations, waitlist, LOIs] |
| Test coverage | Two integration suites exist (lockdown 12 checks, e2e 15 checks) plus `tests/`. Unit coverage: [FILL IN %]. |

## 5. Business model
- **Self-hosted license** per clinic (domain-locked, issued via `/api/brand/session`) — target: [FILL IN price, e.g., $29–99/mo or lifetime deal for first 20 clinics].
- **Managed hosting** on Render for clinics that don't want to self-host.
- **White-label** for clinic chains (the brand/licensing layer is already architected for this).

## 6. Why now / why us
- UAE clinic digitization wave; WhatsApp is the dominant patient channel in-region.
- Founder built and shipped the entire stack solo — server, auth, webhook security, local agent, mobile package, legal docs — demonstrating extreme capital efficiency.

## 7. Track 2 — The commercial rebuild (what funding buys)
*A fresh codebase, designed for scale from day one — not a clone of the prototype.*

1. **Multi-tenant architecture** — one deployment serving many clinics, isolated data per tenant (prototype is single-tenant).
2. **White-label licensing engine** — hardened domain-locked licensing (prototype's shield layer exists but currently fails 9/15 e2e checks; rebuilt properly rather than patched).
3. **Payment + subscription infrastructure** — Paddle/Stripe, tiers, trials (absent in prototype).
4. **Production hardening** — unit test coverage, CI, monitoring, backups.
5. **Desktop/mobile companions** — polished installable clients (prototype has a Capacitor PWA package and a local PC agent as proof-of-concept only).

### Roadmap
1. Fix prototype license-shield e2e failures → pilot-ready Track 1 (near-term, no funding needed)
2. First 10 pilot clinics on Track 1 (validates pricing + demand)
3. Track 2 rebuild: multi-tenant core (months 1–4 post-funding)
4. White-label tier for clinic chains (months 4–6)

## 8. The ask
[FILL IN: amount, instrument (SAFE/equity), runway, use of funds — e.g., 70% Track 2 engineering, 20% pilot acquisition, 10% infra.]

## Appendix — reproduce the verification
```bash
cd xtobe-2
node lockdown.test.js                  # auth lockdown: 12/12 PASS
node pc-agent/file-guard-strict.js check   # integrity guard: 0 failures
node e2e.test.js                       # license shield: 6/15 (known gap, see §4)
npm start                              # boots full clinic server locally
```
