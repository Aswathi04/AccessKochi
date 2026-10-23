# Host dashboard: agreed design (not built)

## Context
Venue owners need their own login to add accessibility evidence for their venue. Their claims sit in the existing **host** track, which the matcher keeps separate from visitor reports, so they never override visitors. This file records what was agreed in chat so it can be built later. The checklist detail is in `docs/host-checklist-requirements.md`.

## 1. Sign-in and claim
- Phone number + OTP.
- Claim a venue, giving role (owner / manager / staff).
- Proof of ownership, at least one of:
  - code sent to the venue's **listed** phone number (verifies automatically)
  - trade licence / GST / FSSAI matching name + address
  - short video shot at the venue
- Admin queue: approve / reject with a reason / ask for more.
- While pending: drafts only, nothing reaches users.
- A second claim on the same venue opens a dispute; every change is logged.

## 2. Checklist (guideline-first)
- Items from HG 2021 + KPBR rule 42 (KMBR still needed for Kochi/Kakkanad), grouped by guideline section.
- Answers: We have this / We don't / Not sure / Doesn't apply (with a reason).
- Proof attached → host-confirmed; no proof → self-declared (Low).
- Sections shown by venue type; a score per section, never one overall %.
- "We don't" shows what users will see.

## 3. Photos
Attached per checklist item, read by the existing pipeline (`src/lib/vision.ts`, `src/components/PhotoUpload.tsx`). Hosts can't delete visitor photos.

## 4. Documents (agreed list)
| Tier | Document | Proves | Check |
| --- | --- | --- | --- |
| Audit | Access audit report in HG ch. 8 format | Items it covers → **audit** track | Auditor registration, date, scope |
| Audit | Accessible India Campaign audit (govt buildings) | Same | Same |
| Approvals | Approved building plan + permit | Designed dimensions | Permit no., survey no. |
| Approvals | Occupancy certificate | Built as approved; RPwD s.44 | Issue date vs 8 Nov 2019 |
| Approvals | Architect/engineer completion certificate (Appendix E3) | Built as approved | Registration no. |
| Feature | Lift licence + annual inspection (Electrical Inspectorate) | L1–L11 | Expiry |
| Feature | Fire NOC | I3, I4 | Expiry |

Not accepted: self-made certificates or stickers, paid badges with no audit, trade licence/GST (ownership only).
Rules: name and address must match; when a document expires its items go back to "unconfirmed"; each document is linked to items; shown as "Documents on file", never "certified".
To confirm: the Kerala Lifts and Escalators Act name, and the KMBR 2019 commencement date.

## 5. Live status
One-tap switches (lift out of order, ramp blocked, toilet closed) with an end time, shown in plans straight away.

## 6. User view and replies
Preview per profile; replies to visitor reports (conflicts stay flagged); host-set call-ahead number and staff-assistance note.

## 7. Insights
"Skipped N times for <profile>, top reason", plus ranked fixes with rough cost.

## 8. Admin
Claim and document queues, abuse flags, audit log.

## Stack (chosen)
Supabase: Postgres, phone OTP sign-in, file storage. Indian SMS through a Twilio or MSG91 key.

## Before building
- KMBR 2019 accessibility rule.
- Decisions: toilet threshold (HG 2200×2000 vs KPBR 1500×1750); lift pass vs "mostly works"; permission for the HG rating scale.
- Database instead of `src/lib/store.ts`; SMS provider; file storage.
- Update `src/data/profiles.json` to HG 2021 (Table 3.4 ramp slopes, citations, corridor rest ≤50 m).
- Disclaimer, photo privacy rule, Malayalam strings (`src/lib/i18n.ts`).

## Build order (MVP)
1. OTP sign-in + claim with venue-phone code + admin approve.
2. Checklist with per-item photos.
3. Live status switches.
4. User-view preview.
Later: documents + admin check, replies, insights, staff accounts.

## Verification (when built)
- Claim with the correct venue phone: auto-verifies; a wrong document gets rejected with the reason shown.
- Pending host edits never change `/api/venues/[id]`.
- Approved host answers appear only in the host track; a visitor conflict stays flagged.
- An expired lift licence turns the lift items back to "unconfirmed".
- `npm test` stays green, with new matcher tests for the Table 3.4 ramp rule.
