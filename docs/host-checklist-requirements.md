# Host checklist: requirements draft

Draft, not built. Source for every row:

- **HG** = Harmonised Guidelines and Standards for Universal Accessibility in India 2021 (MoHUA). A guideline; cited by section/table.
- **KPBR** = Kerala Panchayat Building Rules 2019, rule 42 (and 34, 35, 40). Binding law, but **only in village panchayats**.

> **Gap:** Kochi Corporation and Thrikkakara (Kakkanad) are urban local bodies, so the **Kerala Municipality Building Rules 2019 (KMBR)** apply there, not KPBR. Get the KMBR accessibility rule and check it before any "Law" label is shown for city venues. Until then, show KPBR values as "Kerala rule (panchayat)".

Host answers per item: **We have this / We don't / Not sure / Doesn't apply (reason)**. Proof per item: measurement, photo, tilt reading or document.

Column **Feeds** = which matcher feature the answer updates (`profiles.json`). "score" = counts toward the section score only, no verdict change.

---

## 1. Which sections a venue sees

KPBR rule 42 applies to buildings open to the public in groups A2, B, C, D, E, F, J and to apartments. HG Table 6.2 lists minimum provisions per building type.

| App category | HG typology | KPBR group | Extra sections beyond the core (entrance, routes, toilets, signage, emergency) |
| --- | --- | --- | --- |
| hospital | 6.5 Healthcare | C | Lifts, reception counters, waiting seating, segregated visitor toilets (KPBR 34(3)(3), >1000 m²) |
| auditorium | 6.9 Assembly | D | Wheelchair seating spaces (HG Table 6.3), stage access (6.9.2), eating spaces if dining |
| restaurant | 6.7 / 4.13 | F | Eating spaces |
| metro, water_metro | 6.3 Transport | (exempt, KPBR rule 7) | Platforms, lifts, ticket counters, segregated toilets |
| mall, grocery | 6.6 Retail | F / J | Lifts, changing room, aisles |
| theatre | 6.9 Assembly | D / J | Wheelchair seating spaces |
| government | 6.4 Office/public | E | Reception counters, segregated visitor toilets (KPBR 34(3)(3)) |
| worship | 6.13 Religious | D | Footwear area seating, queue priority |
| tourism | 6.8 Hotels | A2 | Accessible rooms: 1 per 25 rooms (KPBR 42(7)); HG 5% |

Lift section shows only if the venue has public floors above or below ground. Toilet section shows only if public toilets exist.

---

## 2. Arrival: parking and drop-off

| ID | Requirement | Value | Source | Feeds |
| --- | --- | --- | --- | --- |
| P1 | At least one accessible car bay | 1 per first 50 bays, +1 next 50, +1 per 100 after | HG 3.4.1, Table 3.1 | parking |
| P2 | Same, Kerala rule | 3% of required parking, min 1 | KPBR 42(5)(a) | parking |
| P3 | Bay size incl. transfer zone | ≥5000 × 3600 mm (KPBR width ≥3.6 m) | HG 3.4.1(2); KPBR 42(5)(b) | parking |
| P4 | Bay distance from entrance | ≤30 m | HG 3.4.2(1); KPBR 42(5)(a) | parking |
| P5 | Bay marked with accessibility symbol, sign 1500–1800 mm | — | HG 3.4.4 | score |
| P6 | Drop-off point at entrance level, aisle ≥1500 × 6000 mm, kerb ramp if kerb | — | HG 4.1.1, 4.1.2 | dropoff_path |

## 3. Route from drop-off to door

| ID | Requirement | Value | Source | Feeds |
| --- | --- | --- | --- | --- |
| W1 | Walkway clear width | ≥1200 mm (≥1800 two-way) | HG 3.5.1(1) | dropoff_path |
| W2 | Walkway slope, incl. cross slope | ≤1:20 | HG 3.5.1(2) | dropoff_path |
| W3 | Firm, level, non-slip surface; no cobbles or loose gravel | — | HG 3.5.2(1); KPBR 42(6)(a) | dropoff_path |
| W4 | Level changes treated | ≤6 mm none; 6–15 mm bevel 1:2; >15 mm per HG Table 3.2 | HG 3.6.1 | dropoff_path |
| W5 | Grating gaps | ≤12 mm, perpendicular to travel | HG 3.6.3; KPBR 42(6)(a) | dropoff_path |
| W6 | Route does not cross vehicle traffic | — | KPBR 42(6)(b) | dropoff_path |
| W7 | Kerb ramps where kerbs exist | ≤1:12, flares ≤1:10, ≥900 mm wide | HG 3.7 | dropoff_path |
| W8 | No obstructions below 2.1 m; protrusions ≤100 mm | — | HG 3.14.4, 4.4.3; KPBR 42(8)(a) | score |
| W9 | Seating every 30 m on walkways longer than 60 m, seat 450–500 mm with back and arms | — | HG 3.5.1(3) | seating |
| W10 | Tactile guide path from gate to entrance | — | HG 3.9, 4.1.2(5) | score |

## 4. Entrance

| ID | Requirement | Value | Source | Feeds |
| --- | --- | --- | --- | --- |
| E1 | Step-free main entrance, or ramp beside the steps | — | HG 4.1.3(4); KPBR 42(1) | entrance |
| E2 | Accessible entrance is the main one or next to it, not at the rear | — | HG 4.1.3(2), (9) | entrance |
| E3 | Entrance door clear width | ≥900 mm (1000 preferred) | HG 4.1.4(2); KPBR 42(8)(c) | entrance |
| E4 | No step at the door | — | KPBR 42(8)(c) | entrance |
| E5 | Threshold | none; if unavoidable ≤12 mm, bevelled if >5 mm | HG 4.10.3 | entrance |
| E6 | Level landing both sides of door | ≥1800 × 1800 mm | HG 4.1.4(4) | entrance |
| E7 | Door handle lever/D type, 800–1100 mm; door light to open or automatic | — | HG 4.10.1, 4.10.8 | score |
| E8 | Revolving door or turnstile has a ≥900 mm swing door beside it | — | HG 4.1.5, 4.10.1(3) | entrance |
| E9 | Glass doors marked at 800–1000 and 1400–1600 mm | — | HG 4.1.4(9) | score |
| E10 | Covered entrance (porch or canopy) | — | HG 4.1.1(4) | score |
| E11 | Steps at entrance have handrails and contrasting edges | — | HG 4.1.3(5) | entrance (crutches) |

## 5. Ramps (external and internal)

| ID | Requirement | Value | Source | Feeds |
| --- | --- | --- | --- | --- |
| R1 | Slope for the run length | 1:12 → run ≤6 m; 1:14 → ≤9 m; 1:15 → ≤11 m; 1:20 → ≤15 m; ≤1:25 → ≤18 m | HG 3.10.2, Table 3.4 | ramp |
| R2 | Slope, Kerala rule | ≤1:12, constant within the building | KPBR 42(3) | ramp |
| R3 | Clear width | ≥1200 mm | HG 3.10.3; KPBR 42(3) | ramp |
| R4 | Landings at top, bottom and turns | ≥1200 × 1500 mm | HG 3.10.5; KPBR 42(3) | ramp |
| R5 | Handrails both sides when rise >150 mm | 750–900 mm (KPBR 800 mm), 50 mm from wall, extend 300 mm | HG 3.10.6, 3.11; KPBR 42(3) | ramp |
| R6 | Edge protection where not against a wall | kerb ≥75 mm or rail ≤75 mm off floor | HG 3.10.6 | ramp |
| R7 | Non-slip surface, no rumble strips, drains water | — | HG 3.10.4; KPBR 42(3) | ramp |
| R8 | At most 4 runs (3 intermediate landings) | — | HG 3.10.2(4) | ramp |
| R9 | Curved ramp, if any | ≤1:16 | HG 3.10.2(2) | ramp |
| R10 | Tactile warning strip at start and end | — | HG 3.10.1(4) | score |

Note: HG 3.10.5 also says landings every ≤9 m; Table 3.4 allows only 6 m at 1:12. Use the table.

## 6. Handrails (ramps and stairs)

| ID | Requirement | Value | Source | Feeds |
| --- | --- | --- | --- | --- |
| H1 | Round grip | 38–50 mm diameter | HG 3.11.1(2) | score |
| H2 | Gap to wall | 40 mm (smooth) to 60 mm (rough) | HG 3.11.1(4) | score |
| H3 | Continuous, firm, takes 250 kg, contrasting colour | — | HG 3.11.1 | score |

## 7. Lifts

| ID | Requirement | Value | Source | Feeds |
| --- | --- | --- | --- | --- |
| L1 | Lift or ramp to every public floor | public buildings >1000 m² | KPBR 42(2) | lift |
| L2 | Lift required by height | >4 storeys; hospitals >3 | KPBR 40(1) | lift |
| L3 | Car size | ≥1900 × 1900 mm new; ≥1500 × 1500 mm where space limited (KPBR 1100 × 2000) | HG 4.7.1(2); KPBR 42(2) | lift |
| L4 | Door clear width | ≥900 mm | HG 4.7.2(1); KPBR 42(2) | lift |
| L5 | Level stop, gap ≤12 mm | — | HG 4.7.2(2) | lift |
| L6 | Door stays open ≥3 s, reopens on obstruction | — | HG 4.7.2(3), (6) | score |
| L7 | Call button 800–1000 mm, 900 × 1200 mm clear in front | — | HG 4.7.3 | score |
| L8 | Control panel 900–1200 mm, raised/Braille buttons | — | HG 4.7.4 | score |
| L9 | Grab bars 800–900 mm on three sides | — | HG 4.7.5 | score |
| L10 | Voice + visual floor announcements; alarm with light | — | HG 4.7.6 | score |
| L11 | **Working today** (live status, not a checklist answer) | — | HG 7.2.3 | lift |

## 8. Accessible toilet

| ID | Requirement | Value | Source | Feeds |
| --- | --- | --- | --- | --- |
| T1 | At least one accessible WC with washbasin, ground floor | — | KPBR 42(4)(a) | toilet |
| T2 | Room size | HG 2200 × 2000 mm; KPBR legal minimum 1500 × 1750 mm | HG 4.9.4, Table 4.1; KPBR 42(4)(b) | toilet |
| T3 | Door | ≥900 mm, opens out or slides; lock openable from outside | HG 4.9.5; KPBR 42(4)(c), (g) | toilet |
| T4 | Turning space | 1500 mm circle | HG Table 4.1 | toilet |
| T5 | WC seat height | 450–480 mm (KPBR 500 mm) | HG 4.9.6; KPBR 42(4)(e) | toilet |
| T6 | Side transfer space next to WC | ≥900 mm wide | HG 4.9.4(2)(b) | toilet |
| T7 | Grab bars: L-bar 600 × 750 mm on wall side + flip-up bar on open side | — | HG 4.9.7; KPBR 42(4)(d) | toilet |
| T8 | Washbasin 750–850 mm with knee space 680–700 mm | KPBR knee room 70 cm | HG 4.9.8; KPBR 42(4)(f) | toilet |
| T9 | Lever or sensor taps | — | HG 4.9.10 | score |
| T10 | Emergency pull cord reachable from WC and floor (800–1100 mm and 100 mm) | — | HG 4.9.12 | score |
| T11 | Signed with accessibility symbol | — | HG 4.9.17; KPBR 42(4) | score |
| T12 | Kept unlocked, or key nearby with a notice saying where | — | HG 7.2.4(3) | toilet |
| T13 | Transfer space kept clear (no bins, stored items) | — | HG 7.2.4(7) | toilet |
| T14 | Ambulant cubicle with grab bars in each toilet block | — | HG 4.9.2(2) | toilet (crutches) |

## 9. Stairs (crutches, low stamina)

| ID | Requirement | Value | Source | Feeds |
| --- | --- | --- | --- | --- |
| S1 | Tread / riser | tread ≥300 mm, riser ≤150 mm | HG 4.5(2); KPBR 35(1)(3) | entrance / lift (crutches) |
| S2 | Width | ≥1200 mm (KPBR), 1500 mm (HG) | KPBR 35(1)(3); HG 4.5(6) | score |
| S3 | Handrails both sides, at 600–750 and 900–1000 mm, extend 300 mm | — | HG 4.5(10) | entrance (crutches) |
| S4 | ≤12 steps per flight, no open risers | — | HG 4.5(3), (4) | score |
| S5 | 50 mm contrasting band on step edges; warning tiles 300 mm before and after | — | HG 4.5(11), (14) | score |

## 10. Inside: corridors, seating, counters

| ID | Requirement | Value | Source | Feeds |
| --- | --- | --- | --- | --- |
| C1 | Corridor clear width | ≥1200 mm (1500 for passing) | HG 4.4.1 | score |
| C2 | Rest seats on long routes | every ≤50 m | HG 4.4.2 | seating |
| C3 | Priority seating with backrest and armrests, seat 450–500 mm | — | HG 4.2(3), (7)–(9) | seating |
| C4 | Wheelchair space in waiting areas | 900 × 1200 mm | HG 4.2(6) | score |
| C5 | Reception counter lowered section | 750–800 mm, knee space 680 mm | HG 4.3(3), (5) | score |
| C6 | Hearing loop at counter | — | HG 4.3(7) | score |

## 11. Venue-type extras

| ID | Applies to | Requirement | Value | Source | Feeds |
| --- | --- | --- | --- | --- | --- |
| X1 | restaurant | Accessible tables | 1 per 10 tables, min 2; ≤800 mm high, knee 680 × 480 mm | HG 4.13.1 | score |
| X2 | restaurant | Circulation path / route to tables | ≥1200 / ≥900 mm | HG 4.13.2 | score |
| X3 | auditorium, theatre | Wheelchair seating spaces | 6 up to 600 seats; +2 up to 1000; +1 per extra 1000 | HG Table 6.3 | seating |
| X4 | auditorium | Dining hall / stage on same accessible route (lift or ramp if on another floor) | — | HG 6.9.2; KPBR 42(2) | lift |
| X5 | tourism | Accessible rooms | 1 per 25 rooms (KPBR); 5% (HG) | KPBR 42(7); HG 4.12 | score |
| X6 | hospital, government, transport | Separate visitor toilet block incl. one accessible WC + basin | — | KPBR 34(3)(3) | toilet |
| X7 | all with drinking water | One tap at 750 mm with 900 × 1200 mm clear space | — | HG 4.8 | score |

## 12. Information and emergency

| ID | Requirement | Source | Feeds |
| --- | --- | --- | --- |
| I1 | Accessibility symbol at accessible entrance; signs to it from other entrances | HG 4.1.3(10), 5.5.6; KPBR 42(8)(d) | score |
| I2 | Braille/tactile signs at 900–1500 mm | HG 5.4.5(6) | score |
| I3 | Evacuation plan posted, base ≤1200 mm | HG 7.3.1 | score |
| I4 | Visual (flashing) fire alarm as well as sound | HG 7.3.6 | score |
| I5 | Staff trained to assist; named contact for call-ahead | HG 7.2.9 | score |

---

## Mismatches with `src/data/profiles.json`

Status (Oct 2026): 1, 2, 3, 4 and 5 are done in `profiles.json` and `src/lib/matcher.ts`. Where KPBR's legal minimum is lower than HG: meeting HG = pass, meeting only KPBR = partial (the reason says so), below KPBR = fail. KMBR 2019 is still unchecked.

1. **Ramp slope**: `max_slope_ratio: 12` everywhere is a placeholder. Replace with HG Table 3.4 (slope allowed depends on run length). This closes the open item in HANDOFF.md.
2. **Source edition**: `_about` cites HG 2016 via a secondary summary. Re-cite to HG 2021 sections above.
3. **Lift car**: 1500 × 1500 matches HG's fallback; HG prefers 1900 × 1900 for new buildings, KPBR allows 1100 × 2000. Decide what counts as pass vs "mostly works".
4. **Toilet size**: 2200 × 2000 is HG; the Kerala legal minimum (KPBR) is 1500 × 1750. A venue can be legal and still fail the app's threshold. Decide which one sets the verdict and say so on the venue page.
5. **Rest interval**: `max_rest_interval_m: 30` is right for walkways over 60 m (HG 3.5.1); indoor corridors use ≤50 m (HG 4.4.2).
6. Matches already: threshold 12 mm, door 900 mm, ramp width 1200 mm, parking ≤30 m.

## Also in HG worth reusing

- **Chapter 8, Tables 8.2–8.20**: official audit checklists per element. The items above follow them; use the table numbers in the UI so hosts can cross-check.
- **Table 8.1 Accessibility Rating Scale (1–5)**: marked © Dr. Gaurav Raheja, IIT Roorkee. Ask for permission before using it.
- **Table 6.2**: minimum provisions per building type; drives section 1 above.
