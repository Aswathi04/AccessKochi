# AccessKochi

**Plan a day out in Kochi that works for your body.** Say or type your plans in English or Malayalam. AccessKochi picks places you can actually get into, and for every stop it says whether it works for you, why, and what is still unconfirmed.

> "Accessible" means different things to different bodies. A ramp at 1:8 is fine on crutches and impossible in a manual wheelchair. A map icon can't tell you which one you'll meet at the door.

**Core rule: code decides, AI explains.** Pass and fail come from plain code ([src/lib/matcher.ts](src/lib/matcher.ts)) and cited Indian accessibility rules. The AI only reads the request, reads photos and writes the summary. It can never change a verdict.

---

## Contents

- [What it does](#what-it-does)
- [How a plan is made](#how-a-plan-is-made)
- [Accessibility rules](#accessibility-rules)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Demo](#demo)
- [Security and privacy](#security-and-privacy)
- [Known limitations](#known-limitations)
- [Roadmap](#roadmap)

---

## What it does

### For visitors (no account needed)

- **Profiles:** wheelchair, crutches / walker / cane, or low stamina, plus companion mode ("possible with help").
- **Trip planner:** voice or text, English or Malayalam. It handles multi-stop trips ("hospital, lunch nearby, home by metro"), "which one works for me?" questions with other options, and follow-ups that add to the same trip ("grocery shopping too").
- **A verdict for each person and place:** Works for you, Mostly works, Unconfirmed (call ahead), Risky or Doesn't work for you. Each verdict comes with its reasons and lists any popular places that were **skipped, and why**.
- **Venue page:** checks feature by feature, with host, visitor and audit evidence shown separately, documents on file, visitor reports with host replies, and a Call button.
- **Help verify:** upload a photo of a ramp, door or step. The AI reads it; with an A4 sheet in the frame, confidence rises from Low to Medium.
- **Browse:** venues ranked for your profile; "show places that don't work for me" reveals the hidden ones with reasons.
- **Fully bilingual UI** (English and മലയാളം). It's an installable web app built mobile-first.

### For hosts (venue owners)

- **Claim a venue** with proof. Nothing reaches visitors until an admin approves.
- **Guideline checklist** based on HG 2021 and KPBR/KMBR rule 42, with photos per item. The AI checks each photo against the answer (agrees / disagrees / unclear).
- **Live status:** lift out of order, ramp blocked, toilet closed. Plans show it within about 15 s.
- **Documents:** access audits count as the audit track. A lift licence, fire NOC and similar papers back up checklist items until they expire.
- **Replies** to visitor reports. Conflicts stay flagged; a reply never overrides a visitor.
- **Insights:** "skipped N times by wheelchair users, top reason", plus fixes ranked with rough costs.

### For admins

- Claims queue (approve / reject / ask for more) and documents queue.
- Read-only view of any venue. Admins are set on the server through `ADMIN_EMAILS`.

---

## How a plan is made

```
Browser (Next.js pages)
  ├─ Speak  ─> /api/transcribe ─> Sarvam ─(fail)─> Gemini ─(fail)─> OpenAI
  ├─ Plan   ─> /api/agent
  │             1. parse the request:  Gemma on Neysa ─(fail or no stops)─> keyword parser
  │             2. match each venue:   matcher.ts + profiles.json     (code only)
  │             3. choose the stops:   pass > partial > unknown, then distance (code only)
  │             4. summary:            Gemma from the plan JSON ─(fail)─> template
  ├─ Venue  ─> /api/venues/[id]   verdict, evidence tracks, documents, reports
  ├─ Photo  ─> /api/vision ─> Gemma reads the photo ─> sanitised (no invented numbers) ─> Supabase
  ├─ Browse ─> /api/venues
  └─ Host / admin ─> /api/host/*, /api/admin/*   (Supabase, service role, server-checked access)
```

**Principles the matcher enforces:**

1. **Evidence tracks are never averaged.** Host, visitor and audit evidence stay separate. When they disagree (for example, the host says the ramp is fine but a visitor measured 1:8), both are shown and the conflict is flagged.
2. **Missing data means "Unconfirmed, call ahead"**, never a pass.
3. **No overall score.** One step at the entrance is a fail for a wheelchair user, however good everything else is.
4. **Google's "wheelchair accessible" label is shown but never scored.**
5. **Every AI step has a fallback**, so the planner still works with no AI keys and no Wi-Fi to the AI providers.

---

## Accessibility rules

| Source | What it is |
| --- | --- |
| **HG 2021** | *Harmonised Guidelines and Standards for Universal Accessibility in India* (MoHUA): the national good-practice standard |
| **KMBR 2019 / KPBR 2019, rule 42** | Kerala Municipality / Panchayat Building Rules. Rule 42 sets the same values in both and is cited as "KPBR/KMBR". KMBR covers Kochi Corporation and Thrikkakara. |

Where the Kerala legal minimum is lower than HG: **meeting HG = pass, meeting only Kerala = partial, below Kerala = fail.**

| Feature (wheelchair) | Limit | Source |
| --- | --- | --- |
| Entrance | 0 steps without a ramp; doorstep ≤ 12 mm; door ≥ 900 mm | HG 4.10.3, 4.1.4(2); KPBR/KMBR 42(8)(c) |
| Ramp | Never steeper than 1:12. Longest run before a landing: 1:12 6 m, 1:14 9 m, 1:15 11 m, 1:20 15 m, 1:25 18 m. Width 1200 mm, handrails both sides | HG 3.10.2 Table 3.4, 3.10.3, 3.10.6; KPBR/KMBR 42(3) |
| Lift car | 1500 × 1500 mm pass; 1100 × 2000 mm partial; smaller fails | HG 4.7.1(2); KPBR/KMBR 42(2) |
| Accessible toilet | 2200 × 2000 mm pass; 1500 × 1750 mm partial; smaller fails | HG 4.9.4 Table 4.1; KPBR/KMBR 42(4)(b) |
| Parking | Within 30 m (preferred) | HG 3.4.2(1); KPBR/KMBR 42(5)(a) |
| Drop-off to entrance | Step-free; 300 m (assumed) | HG 3.5 |

All thresholds live in [src/data/profiles.json](src/data/profiles.json), each with a `_source` note. **Edit values there, never in code.** Values marked "assumed" are placeholders. The full host checklist is in [docs/host-checklist-requirements.md](docs/host-checklist-requirements.md).

---

## Tech stack

| Layer | Choice |
| --- | --- |
| App | Next.js 15.5 (App Router), React 19.1, TypeScript, Tailwind CSS v4 |
| Language model | Gemma `gemma-4-26-b-a4-b-it` on Neysa (OpenAI-compatible API); OpenAI as an optional backup |
| Speech to text | Sarvam (`saaras:v4`) with Gemini and OpenAI as backups |
| Database, sign-in, files | Supabase: Postgres (RLS on, no policies), email OTP, private `host-evidence` bucket |
| Tests | Vitest |
| Hosting | Vercel |

---

## Quick start

Requires **Node.js 20+**.

```bash
npm install
cp .env.example .env.local   # then fill in the keys (see below)
npm test                     # 58 tests should pass
npm run dev                  # http://localhost:3000
```

Then open **http://localhost:3000/api/health** and check:

- `neysa.reachable: true` and `neysa_model_matches: true`
- `asr.sarvam: true`

**Supabase (needed for sign-in, host and admin features):**

1. Create a project and run all of [supabase/schema.sql](supabase/schema.sql) in the SQL Editor. It is safe to re-run after every pull.
2. Enable Email sign-in. Put `{{ .Token }}` in the Magic Link email template so users get a 6-digit code.
3. Copy the URL, the anon key and the service-role key into `.env.local`, and add your email to `ADMIN_EMAILS`.

The visitor planner works without Supabase. Full step-by-step setup and troubleshooting are in **[SETUP.md](SETUP.md)**.

---

## Environment variables

| Variable | Used for | Required |
| --- | --- | --- |
| `NEYSA_BASE_URL`, `NEYSA_API_KEY`, `NEYSA_MODEL` | Parsing requests, summaries, photo reading | Recommended (keyword fallback without it) |
| `SARVAM_API_KEY` | Voice input, English and Malayalam | For voice |
| `GEMINI_API_KEY`, `OPENAI_API_KEY` | Voice and AI backups | Optional |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sign-in | For accounts |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side database access | For host and admin |
| `ADMIN_EMAILS` | Comma-separated admin emails | For admin |
| `SERPAPI_API_KEY` | Real venue data (not wired yet) | No |

Optional switches: `LLM=openai` (try OpenAI first), `ASR=...`, `DATA_MODE=dummy`.

> **Never commit `.env.local`.** It is git-ignored. The service-role key can read and change the whole database.

---

## Project structure

```
src/
  app/
    page.tsx              Welcome: sign in or continue without an account
    signin/  start/       Email-code sign-in; routes each account to its dashboard
    setup/   profile/     Visitor profile wizard and settings
    plan/                 Trip planner (conversation)
    discover/             Browse venues for your profile
    venue/[id]/           Venue page + Help verify
    host/  host/[id]/     Host dashboard: claim, checklist, documents, reports, insights
    admin/                Claims and documents queues
    api/                  agent, transcribe, vision, venues, health, host/*, admin/*
  lib/
    matcher.ts            Rules engine: per feature, per track, conflicts, ranking
    agent.ts              Planner: AI parse + keyword fallback, stop choice, summary
    host.ts               Host evidence to features, documents, reports, skips, fixes
    hostAuth.ts           Server-side access checks (claimant writes, admin reads)
    llm.ts  vision.ts     AI client and photo-reading contract
    asr.ts  wav.ts        Voice chain and 16 kHz WAV recorder
    i18n.ts               English + Malayalam strings
    settings.tsx          Profile and settings (synced to the account when signed in)
  data/
    profiles.json         Thresholds per profile, with sources
    venues.ts             34 demo venues
    checklist.ts          Host checklist (HG 2021 + KPBR/KMBR)
    documents.ts fixes.ts Accepted document kinds; fixes with rough costs
supabase/schema.sql       Tables, RLS, storage bucket (re-runnable)
tests/                    matcher, rules, agent, host, demo scenarios
docs/                     Demo script, host checklist requirements, host dashboard plan
```

---

## Testing

```bash
npm test          # Vitest: 58 tests
npx tsc --noEmit  # type check
```

| Suite | Covers |
| --- | --- |
| `matcher.test.ts` | Verdicts per profile, separate tracks, conflicts, call-ahead, companion rule |
| `rules.test.ts` | HG Table 3.4 ramp runs, two-tier lift and toilet checks, documents and expiry (IST), AI photo check, ranked fixes |
| `agent.test.ts` | Parsing, keyword fallback, multi-stop plans, skipped-and-why |
| `host.test.ts` | Checklist data, host answers to matcher, live status, section scores |
| `demo.test.ts` | Every demo scenario returns the result the demo script promises |

> Don't run `npm run build` while `npm run dev` is running. Both write to `.next` and the dev server breaks. If it does, stop it, delete `.next` and restart.

---

## Demo

Start from **Edappally** with the **wheelchair** profile.

1. *"What theatres can I go to near Edappally?"* returns **Edappally Cineplex** (works). It skips Palarivattom Star Talkies (4 steps, no ramp).
2. *"Grocery shopping too"* adds **Edappally Daily Supermarket**, about 0.2 km away, which also works. It skips the closer Corner Stores (1 step, narrow door).
3. Same in Malayalam: *ഇടപ്പള്ളിയിൽ ഏതൊക്കെ തിയേറ്ററുകളിൽ പോകാം?* then *പലചരക്ക് സാധനങ്ങളും വാങ്ങണം*.

The full script (15 more queries, expected results per profile, and what to avoid) is in **[docs/demo-script.md](docs/demo-script.md)**.

> All venues are **demo data**: fictional businesses with dummy accessibility details. Only the metro station names are real.

---

## Security and privacy

- Row-level security is on with **no policies**, so the public anon key can read nothing. All data access goes through server API routes that use the service role.
- Access is checked on the server. Only an approved claimant can edit a venue; admins come from `ADMIN_EMAILS`. The visitor/host choice a user picks only sets their landing page.
- Host and visitor photos sit in a **private** bucket and are served through short-lived signed URLs.
- `next` redirects after sign-in accept same-site paths only.

---

## Known limitations

- Venue data is demo data; real map data is not wired yet.
- Sign-in is email only. Gmail SMTP has a sending limit, and there is a 60 s cooldown between codes.
- In Malayalam UI mode, voice input expects Malayalam speech.
- Not yet tested end to end on a real phone. The mic, camera and install need HTTPS.
- `npm audit` flags `postcss` through Next.js; the fix needs Next.js 16.
- Some thresholds are assumptions (300 m drop-off walk, crutches step tolerance).

## Roadmap

1. Real venues from Google Places / OpenStreetMap, with accessibility left "unconfirmed" until verified.
2. Field tests with wheelchair users and caregivers in Kochi; a fluent Malayalam review.
3. Phone OTP (Twilio / MSG91) and claim verification by a code sent to the venue's listed phone.
4. Staff accounts per venue.
5. Next.js 16, a proper email provider, key rotation.
6. More rules (KMBR 42(4)(a), 42(8)(b)) and more profiles (low vision, deaf and hard of hearing).
