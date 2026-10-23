# AccessKochi: handoff

**Status (Oct 23, 2026):** all four screens, the agent, photo reading and voice are written. 29 automated tests pass and the TypeScript check is clean. **Not yet run end to end:** the production build and live calls to Neysa, Sarvam, Gemini and OpenAI. The build environment couldn't reach those services, so the first live run will be on the laptop. Start with `SETUP.md`.

## What it does

A wheelchair, crutches or low-stamina user says or types their day ("Wedding at the Kakkanad auditorium, then home by metro"). AccessKochi returns a plan where every stop shows **Works for you / Mostly works / Not confirmed / Risky / Doesn't work for you**, the reasons, what's unconfirmed (with a call-ahead number), and which popular places were skipped and why.

**Core rule: code decides, AI explains.** Pass/fail is plain code (`src/lib/matcher.ts`) using thresholds from the Harmonised Guidelines. The AI only reads the request, reads photos and writes a short summary from the matcher's output.

## Architecture

```
Browser (Next.js pages)
  ├─ Speak ──> /api/transcribe ──> Sarvam ─(fail)─> Gemini ─(fail)─> OpenAI
  ├─ Plan  ──> /api/agent
  │              1. parse request: Gemma on Neysa (OpenAI backup) ─(fail)─> keyword parser
  │              2. match: rules matcher + profiles.json  (code only)
  │              3. build plan from matcher records       (code only)
  │              4. summary: Gemma from plan JSON         ─(fail)─> template
  ├─ Venue ──> /api/venues/[id]  (verdict + host/visitor tracks + Google says)
  ├─ Photo ──> /api/vision ──> Gemma on Neysa reads photo ──> sanitize (caps, no invented numbers) ──> evidence store
  └─ Browse ─> /api/venues
```

Every AI step has a fallback, so the demo still works with no keys or no Wi-Fi. The keyword parser handles the demo requests in English and Malayalam.

## File map

| Path | What it is |
| --- | --- |
| `src/data/profiles.json` | Thresholds per profile. Harmonised Guidelines values, with `_source` notes; placeholders marked. **Edit values here, not in code.** |
| `src/data/venues.ts` | 28 dummy Kochi venues (fictional businesses; real metro station names with dummy data). Trap cases listed at the top. |
| `src/lib/types.ts` | Data schema |
| `src/lib/matcher.ts` | Rules matcher: per feature, per track (host/visitor/audit, never averaged), conflicts, companion rule, Google cross-check, ranking |
| `src/lib/agent.ts` | Agent: LLM parse + keyword fallback, stop resolution, rejected list, summary with guardrails |
| `src/lib/llm.ts` | OpenAI-compatible client: Neysa first, OpenAI backup; robust JSON extraction |
| `src/lib/vision.ts` | Photo reading prompt and contract: Low without a reference, Medium with one, High with phone tilt; `cant_tell` on bad photos |
| `src/lib/asr.ts` | Voice chain: Sarvam (`saaras:v4`, place-name keyterms) → Gemini → OpenAI |
| `src/lib/store.ts` | In-memory evidence store (resets when the server restarts) |
| `src/lib/wav.ts` | Browser recorder → 16 kHz mono WAV |
| `src/lib/i18n.ts` | English and Malayalam UI strings |
| `src/lib/settings.tsx` | User profile in the browser (localStorage) |
| `src/app/page.tsx`, `src/app/profile/` | Screen 1: onboarding / "What best describes you?" |
| `src/app/plan/` | Screens 2 + 3: "What's on your mind?" and plan result |
| `src/app/venue/[id]/` | Screen 4: venue page + "Help verify this place" |
| `src/app/discover/` | Browse list |
| `src/app/api/*` | `agent`, `vision`, `transcribe`, `venues`, `health` |
| `tests/` | Matcher scenarios (2–6, 9, 12, 13, 15), agent (1, 10, 13, 14), vision contract (7, 8) |

## Test scenarios covered (29 tests)

| # | Scenario | Where |
| --- | --- | --- |
| 1 | Hospital, lunch, metro: plan with reasons + rejected popular café | agent.test |
| 2 | Popular café with steps excluded with reason | matcher.test |
| 3 | Unknown restroom → call ahead | matcher.test |
| 4 | Host vs visitor conflict flagged, tracks separate | matcher.test |
| 5 | Crutches + 2 low steps with handrail → Partial | matcher.test |
| 6 | Low stamina, 400 m drop-off vs 150 m limit | matcher.test |
| 7 | Bad photo → can't tell, nothing invented | agent.test (vision) |
| 8 | No reference = Low, A4 = Medium | agent.test (vision) |
| 9 | Google disagrees → flag, score unchanged | matcher.test |
| 10 | Never says "fully accessible" | agent.test |
| 12 | Companion → "possible with help" | matcher.test |
| 13 | Kakkanad wedding: dining upstairs no lift, toilet unconfirmed | both |
| 14 | Same request in Malayalam | agent.test |
| 15 | Temple: wheelchair fail, crutches Partial | matcher.test |

Not automated: 11 (multi-stop reordering; the plan keeps the user's order) and live-model behaviour.

## First things to do on the laptop

1. `npm install && npm test && npm run dev`
2. Open `/api/health`: confirm Neysa is reachable and the model id matches.
3. Run the wedding request. The notes line at the bottom says `parsed: llm` when Gemma answered, `parsed: keywords` when the fallback ran.
4. Read one real ramp photo through **Help verify**. If Gemma's JSON is poor, tighten the prompt in `src/lib/vision.ts`.
5. Add the Sarvam key and test Malayalam voice.
6. Run `npm run build` once to make sure the production build passes.

## Known gaps and risks

- **Not live-tested:** Neysa, Sarvam, Gemini and OpenAI calls are written to their documented APIs, but none has been called yet. If Neysa rejects image input, set `LLM=openai` with an OpenAI key for photos.
- **Evidence store is in memory:** uploaded photo evidence disappears when the server restarts. Don't restart mid-demo.
- **Malayalam UI strings** were drafted, not checked by a native speaker.
- **Thresholds:** the ramp gradient-by-length table, the 2021 Harmonised Guidelines edition and the KMBR 2019 clauses are still to confirm. Walking distances are assumptions.
- **SerpApi / real Google data:** not wired. `google_says` is simulated (`simulated: true`).
- **Route planning:** straight-line distances only; no footpath or kerb data; stops stay in the order the user said.
- **Not built (on purpose for the demo):** sign-in, host claim/OTP, report button, written feedback, database.

## Demo script (3 minutes)

1. Onboarding in Malayalam → "I use a wheelchair" → Kakkanad.
2. Speak (or tap the chip): "Wedding at the Kakkanad auditorium, then home by metro."
3. Point at: dining hall upstairs, no lift (✕); toilet unconfirmed, call ahead (⚠); metro lift working (✓).
4. Open Kakkanad Medical Centre (`/venue/v02`): host says the ramp is fine, visitor's tilt reading says 1:8. The conflict is flagged, not resolved.
5. Help verify: ramp photo with no reference = **Low**; with an A4 sheet = **Medium**.
6. Close: "Code decides, AI explains. Kochi first, then all of Kerala."

## Next steps after the hackathon

SerpApi import of real venues (cached), a database instead of the in-memory store, host claim with OTP, a report button, validating against Access Anywhere Kochi's 9 audited venues, and confirming KMBR clauses.
