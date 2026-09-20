# XTOBE — Self-Learning Growth Engine: Full Architecture

The machine that learns each clinic's market, captures every lead, and turns interest into bookings — even for businesses not registered yet.

---

## 1. THE FULL LOOP (top view)

```
┌─────────────────────────────────────────────────────────────┐
│                     THE XTOBE ENGINE                         │
│                                                              │
│  SENSE → LEARN → CREATE → PUBLISH → CAPTURE → BOOK → REPEAT │
│                                                              │
└─────────────────────────────────────────────────────────────┘

SENSE     Every DM, comment, view, booking, no-show — captured
LEARN     What do patients ask? Which offers convert? When?
CREATE    Reels + captions answering TODAY'S demand
PUBLISH   Instagram/WhatsApp at Dubai-optimal times
CAPTURE   Every viewer/DM becomes a lead with interest profile
BOOK      AI offers slots → staff approves → chair filled
REPEAT    What booked → more of that. What flopped → dropped
```

Every cycle makes the next one smarter. The clinic's data compounds into an advantage no competitor can copy — because it's THEIR patients' demand.

---

## 2. THE SIX LAYERS

### Layer 1 — SENSE (Signal Collection)
| Signal | Source | What it tells us |
|--------|--------|------------------|
| DMs + WhatsApp messages | inbox | Exact treatments asked, price sensitivity, language (EN/AR) |
| Comments on posts | Instagram API | Which content creates conversation |
| Profile visits after post | Instagram insights | Which post pulls attention |
| Replies/emoji reactions | WhatsApp | Sentiment + interest temperature |
| Bookings + cancellations | dashboard | What actually converts |
| No-shows | appointments | Which reminders work |
| Time of every event | all | When THIS clinic's patients are active |

### Layer 2 — LEARN (Interest Profiles)
Every person who touches the clinic becomes a profile:

```
LEAD PROFILE (built in seconds)
├── Interest: hydrafacial (from DM keyword + Reel watched)
├── Temperature: warm (asked price, viewed twice)
├── Language: Arabic-preferred (wrote in AR)
├── Budget signal: asked about offers/discounts
├── Best contact time: 9-10pm (activity pattern)
├── Source: Reel #12 (the hydrafacial before/after)
└── History: every touch, in order
```

**"Whoever views in a second we understand the interest"** — the profile builds from the FIRST interaction: keyword match + content viewed + reaction type → instant classification (treatment, temperature, language).

Clinic-level learning (the aggregate):
- Top 5 asked treatments this week (vs last week = trend)
- Which Reel generated most DMs (attribution)
- Conversion rate per offer type
- Best posting windows for THIS clinic's audience
- EN vs AR ratio → content mix

### Layer 3 — CREATE (Demand-Answering Content)
- AI writes Reels about what patients ASKED THIS WEEK, not generic templates
- Face Lock: doctor's exact face from old promos
- Captions EN+AR in the ratio the clinic's audience actually uses
- Offer text pulled from what converted before
- Every creation logged with a tracking ID (for attribution)

### Layer 4 — PUBLISH (Algorithm-Aware Distribution)
- Dubai timing engine: prayer times, weekend Fri-Sat, late-night scroll windows
- Hashtag sets per treatment (learned from what reached)
- Cover frame rules (stop-scroll first frame)
- First comment strategy (booking question)
- Post → track → learn reach pattern

### Layer 5 — CAPTURE (Lead Intelligence — the moat)
Every post carries attribution. When anyone responds:
- Lead created with source = that exact post
- Interest profile auto-built (Layer 2)
- Lead enters pipeline: new → contacted → booked → won
- **Staff approves every outreach** (the golden rule, always)

### Layer 6 — BOOK (Revenue Close)
- AI offers real slots from the calendar
- WhatsApp confirmation + reminder (no-shows -25-40%)
- Receipts: which post → which lead → which booking → which AED
- **The report clinics pay for:** "This Reel made you AED 2,400 this month"

---

## 3. THE UNREGISTERED BUSINESS FUNNEL (growth engine for XTOBE itself)

Even businesses NOT on xtobe get business through us — and that's how we acquire them:

```
XTOBE's own social presence (or network posts)
        ↓
A salon's customer asks about a treatment we posted about
        ↓
Lead captured — interest profiled — routed
        ↓
UNREGISTERED business receives: "You got 12 leads from
xtobe this month. See all 12 + who they are → register."
        ↓
First month proof → they register → clinic acquired
```

**Lead history as the sales weapon:** we don't cold-pitch clinics. We hand them their own leads — name, interest, temperature — and say "these are yours the moment you're on the system." The product sells itself with its own output.

Rules (locked):
- Leads for unregistered businesses are masked (first name + interest only)
- Full contact unlocks on registration (consent + PDPL clean)
- The lead CHOSE to engage — no scraped data, all opt-in signals

---

## 4. WHAT BUILDS ON WHAT (implementation order)

| Phase | Build | Status |
|-------|-------|--------|
| 1 | Inbox + bookings + approval gate | ✅ LIVE |
| 2 | Lead pipeline + masked profiles | ✅ LIVE (leads module) |
| 3 | AI content studio + video creator | ✅ LIVE (studio) |
| 4 | Interest profiles from DM keywords | 🔨 next — extends leads module |
| 5 | Post attribution (every creation carries tracking ID) | 🔨 next |
| 6 | Learning loop (what converted → next content) | 📋 designed |
| 7 | Unregistered-business lead funnel | 📋 designed |

## 5. THE ONE-LINER (for clinics)

*"It's not software you use. It's a machine that learns your clinic — and books your chairs."*

## 6. THE ONE-LINER (for investors)

*"Every clinic's patient demand becomes training data. The more they use it, the better it sells for them — and the harder it is to leave."*
