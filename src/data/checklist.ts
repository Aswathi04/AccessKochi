// Host checklist: requirements from the Harmonised Guidelines 2021 (HG) and the Kerala Panchayat
// Building Rules 2019 (KPBR). Full rationale: docs/host-checklist-requirements.md.
// Items with onYes/onNo/inputs feed the matcher's host track; the rest only count toward the section score.
import type { Category, FeatureName, Venue } from "@/lib/types";

export type Answer = "yes" | "no" | "not_sure" | "na";

export interface Patch { feature: FeatureName; attrs: Record<string, unknown> }
export interface ChecklistInput { key: string; label: string; unit: string; feature: FeatureName; attr: string }

export interface ChecklistItem {
  id: string;
  text: string;
  target?: string; // the value to meet, shown next to the item
  source: string;
  onYes?: Patch;
  onNo?: Patch;
  inputs?: ChecklistInput[];
  only?: Category[]; // shown only for these venue categories
}

export interface ChecklistSection { id: string; title: string; guideline: string; when?: "upper_floors"; items: ChecklistItem[] }

const p = (feature: FeatureName, attrs: Record<string, unknown>): Patch => ({ feature, attrs });
const n = (key: string, label: string, unit: string, feature: FeatureName, attr = key): ChecklistInput => ({ key, label, unit, feature, attr });

export const SECTIONS: ChecklistSection[] = [
  {
    id: "parking", title: "Parking and drop-off", guideline: "HG 3.4, 4.1 · KPBR 42(5)",
    items: [
      { id: "P1", text: "At least one accessible car parking bay", target: "1 per first 50 bays; KPBR 3%, min 1", source: "HG Table 3.1; KPBR 42(5)(a)", onYes: p("parking", { accessible_bay: true }), onNo: p("parking", { accessible_bay: false }) },
      { id: "P3", text: "Accessible bay is wide enough, including the transfer zone", target: "≥ 5000 × 3600 mm", source: "HG 3.4.1(2); KPBR 42(5)(b)" },
      { id: "P4", text: "Accessible bay is close to the entrance", target: "≤ 30 m", source: "HG 3.4.2(1); KPBR 42(5)(a)", inputs: [n("parking_distance_m", "Distance to entrance", "m", "parking", "distance_m")] },
      { id: "P5", text: "Bay marked with the accessibility symbol and a sign", target: "sign at 1500–1800 mm", source: "HG 3.4.4" },
      { id: "P6", text: "Vehicles can drop off at entrance level, with a kerb ramp if there is a kerb", source: "HG 4.1.1, 4.1.2", onYes: p("dropoff_path", { dropoff_at_gate: true }), onNo: p("dropoff_path", { dropoff_at_gate: false }) },
    ],
  },
  {
    id: "route", title: "Route from drop-off to the door", guideline: "HG 3.5–3.7 · KPBR 42(6)",
    items: [
      { id: "W0", text: "The whole route from drop-off to the entrance is step-free", source: "HG 3.5; KPBR 42(1)", onYes: p("dropoff_path", { step_free: true }), onNo: p("dropoff_path", { step_free: false }), inputs: [n("dropoff_distance_m", "Drop-off to entrance", "m", "dropoff_path", "distance_m")] },
      { id: "W1", text: "Walkway clear width", target: "≥ 1200 mm (1800 two-way)", source: "HG 3.5.1(1)" },
      { id: "W2", text: "Walkway slope, including cross slope", target: "≤ 1:20", source: "HG 3.5.1(2)" },
      { id: "W3", text: "Firm, level, non-slip surface; no cobbles or loose gravel", source: "HG 3.5.2(1); KPBR 42(6)(a)", onYes: p("dropoff_path", { surface: "firm" }), onNo: p("dropoff_path", { surface: "broken" }) },
      { id: "W5", text: "Drain gratings have small gaps, set across the direction of travel", target: "≤ 12 mm", source: "HG 3.6.3; KPBR 42(6)(a)" },
      { id: "W6", text: "The walkway does not cross vehicle traffic", source: "KPBR 42(6)(b)" },
      { id: "W7", text: "Kerb ramps wherever there is a kerb", target: "≤ 1:12, ≥ 900 mm wide", source: "HG 3.7" },
      { id: "W8", text: "No obstructions below head height on the route", target: "nothing below 2.1 m", source: "HG 3.14.4; KPBR 42(8)(a)" },
      { id: "W9", text: "Seats along long walkways", target: "every 30 m on routes over 60 m", source: "HG 3.5.1(3)", inputs: [n("rest_interval_m", "Seats about every", "m", "seating")] },
      { id: "W10", text: "Tactile guide path from gate to entrance", source: "HG 3.9, 4.1.2(5)" },
    ],
  },
  {
    id: "entrance", title: "Entrance", guideline: "HG 4.1, 4.10 · KPBR 42(1), 42(8)",
    items: [
      { id: "E1", text: "Main entrance is step-free, or has a ramp beside the steps", source: "HG 4.1.3(4); KPBR 42(1)", onYes: p("entrance", { step_count: 0 }), inputs: [n("step_count", "Steps at the entrance (0 if none)", "steps", "entrance")] },
      { id: "E2", text: "Accessible entrance is the main one or right next to it, not at the rear", source: "HG 4.1.3(2), (9)" },
      { id: "E3", text: "Entrance door clear width", target: "≥ 900 mm (1000 preferred)", source: "HG 4.1.4(2); KPBR 42(8)(c)", inputs: [n("door_width_mm", "Door clear width", "mm", "entrance")] },
      { id: "E5", text: "Raised doorstep (threshold) is low or absent", target: "≤ 12 mm, bevelled if > 5 mm", source: "HG 4.10.3", inputs: [n("threshold_mm", "Threshold height", "mm", "entrance")] },
      { id: "E6", text: "Level landing on both sides of the door", target: "≥ 1800 × 1800 mm", source: "HG 4.1.4(4)" },
      { id: "E7", text: "Lever or D-handles at a reachable height; door is light or automatic", target: "800–1100 mm", source: "HG 4.10.1, 4.10.8" },
      { id: "E8", text: "Any revolving door or turnstile has a swing door beside it", target: "≥ 900 mm", source: "HG 4.1.5, 4.10.1(3)" },
      { id: "E9", text: "Glass doors marked at two heights", target: "800–1000 and 1400–1600 mm", source: "HG 4.1.4(9)" },
      { id: "E10", text: "Entrance is covered (porch or canopy)", source: "HG 4.1.1(4)" },
      { id: "E11", text: "Entrance steps have handrails on both sides", source: "HG 4.1.3(5)", onYes: p("entrance", { handrail: "both" }), onNo: p("entrance", { handrail: "none" }) },
    ],
  },
  {
    id: "ramp", title: "Ramps", guideline: "HG 3.10, 4.6 · KPBR 42(3)",
    items: [
      { id: "R0", text: "There is a ramp at the entrance", source: "HG 3.10", onYes: p("ramp", { present: true }), onNo: p("ramp", { present: false }) },
      { id: "R1", text: "Ramp slope suits its length", target: "1:12 up to 6 m run · 1:14 up to 9 m · 1:15 up to 11 m · 1:20 up to 15 m", source: "HG Table 3.4; KPBR 42(3)", inputs: [n("slope_ratio", "Slope is 1 in", "", "ramp"), n("ramp_run_m", "Longest single run", "m", "ramp", "run_m")] },
      { id: "R3", text: "Ramp clear width", target: "≥ 1200 mm", source: "HG 3.10.3; KPBR 42(3)", inputs: [n("ramp_width_mm", "Ramp width", "mm", "ramp", "width_mm")] },
      { id: "R4", text: "Level landings at top, bottom and every turn", target: "≥ 1200 × 1500 mm", source: "HG 3.10.5; KPBR 42(3)" },
      { id: "R5", text: "Handrails on both sides", target: "750–900 mm high, extend 300 mm", source: "HG 3.10.6, 3.11; KPBR 42(3)", onYes: p("ramp", { handrails: "both" }), onNo: p("ramp", { handrails: "none" }) },
      { id: "R6", text: "Edge protection where the ramp is not against a wall", target: "kerb ≥ 75 mm", source: "HG 3.10.6" },
      { id: "R7", text: "Non-slip surface, no rumble strips, water drains off", source: "HG 3.10.4; KPBR 42(3)", onYes: p("ramp", { surface: "firm" }), onNo: p("ramp", { surface: "slippery" }) },
      { id: "R8", text: "Ramp is kept clear and unlocked (no parked bikes, no locked gate)", source: "HG 7.2.1", onYes: p("ramp", { blocked: false }), onNo: p("ramp", { blocked: true }) },
      { id: "R10", text: "Tactile warning strip at the start and end", source: "HG 3.10.1(4)" },
    ],
  },
  {
    id: "handrails", title: "Handrails", guideline: "HG 3.11",
    items: [
      { id: "H1", text: "Handrails are round and easy to grip", target: "38–50 mm diameter", source: "HG 3.11.1(2)" },
      { id: "H2", text: "Gap between handrail and wall", target: "40–60 mm", source: "HG 3.11.1(4)" },
      { id: "H3", text: "Handrails are continuous, firmly fixed and in a contrasting colour", source: "HG 3.11.1" },
    ],
  },
  {
    id: "lift", title: "Lifts", guideline: "HG 4.7 · KPBR 40, 42(2)", when: "upper_floors",
    items: [
      { id: "L1", text: "A lift (or ramp) reaches every public floor", source: "KPBR 42(2), 40(1)", onYes: p("lift", { present: true }), onNo: p("lift", { present: false }) },
      { id: "L3", text: "Lift car size", target: "≥ 1500 × 1500 mm (1900 × 1900 for new buildings)", source: "HG 4.7.1(2); KPBR 42(2)", inputs: [n("car_w_mm", "Car width", "mm", "lift"), n("car_d_mm", "Car depth", "mm", "lift")] },
      { id: "L4", text: "Lift door clear width", target: "≥ 900 mm", source: "HG 4.7.2(1); KPBR 42(2)", inputs: [n("lift_door_mm", "Lift door width", "mm", "lift", "door_mm")] },
      { id: "L5", text: "Lift stops level with the floor", target: "gap ≤ 12 mm", source: "HG 4.7.2(2)" },
      { id: "L6", text: "Door stays open at least 3 seconds and reopens if blocked", source: "HG 4.7.2(3), (6)" },
      { id: "L7", text: "Call button within reach, clear space in front", target: "800–1000 mm high", source: "HG 4.7.3" },
      { id: "L8", text: "Control panel within reach, raised or Braille buttons", target: "900–1200 mm", source: "HG 4.7.4" },
      { id: "L9", text: "Grab bars on three sides of the car", target: "800–900 mm", source: "HG 4.7.5" },
      { id: "L10", text: "Voice and visual floor announcements; alarm with a light", source: "HG 4.7.6" },
      { id: "L11", text: "The lift is working right now", source: "HG 7.2.3", onYes: p("lift", { working: true }), onNo: p("lift", { working: false }) },
    ],
  },
  {
    id: "toilet", title: "Accessible toilet", guideline: "HG 4.9, Table 4.1 · KPBR 42(4)",
    items: [
      { id: "T1", text: "At least one accessible toilet with a washbasin, on the ground floor", source: "KPBR 42(4)(a)", onYes: p("toilet", { accessible: true }), onNo: p("toilet", { accessible: false }) },
      { id: "T2", text: "Toilet room size", target: "HG 2200 × 2000 mm (Kerala minimum 1500 × 1750)", source: "HG 4.9.4; KPBR 42(4)(b)", inputs: [n("toilet_width_mm", "Room width", "mm", "toilet", "width_mm"), n("toilet_depth_mm", "Room depth", "mm", "toilet", "depth_mm")] },
      { id: "T3", text: "Door opens outward or slides; lock opens from outside in an emergency", target: "≥ 900 mm", source: "HG 4.9.5; KPBR 42(4)(c), (g)", inputs: [n("toilet_door_mm", "Door width", "mm", "toilet", "door_mm")] },
      { id: "T4", text: "Wheelchair turning space inside", target: "1500 mm circle", source: "HG Table 4.1" },
      { id: "T5", text: "WC seat height", target: "450–480 mm (KPBR 500)", source: "HG 4.9.6; KPBR 42(4)(e)", onYes: p("toilet", { wc_type: "western" }) },
      { id: "T6", text: "Clear transfer space beside the WC", target: "≥ 900 mm wide", source: "HG 4.9.4(2)(b)", onYes: p("toilet", { transfer_space: true }), onNo: p("toilet", { transfer_space: false }) },
      { id: "T7", text: "Grab bars: L-bar on the wall side and a flip-up bar on the open side", source: "HG 4.9.7; KPBR 42(4)(d)", onYes: p("toilet", { grab_bars: "both" }), onNo: p("toilet", { grab_bars: "none" }) },
      { id: "T8", text: "Washbasin with knee space underneath", target: "top 750–850 mm, knee space 680–700 mm", source: "HG 4.9.8; KPBR 42(4)(f)" },
      { id: "T9", text: "Lever or sensor taps", source: "HG 4.9.10" },
      { id: "T10", text: "Emergency pull cord reachable from the WC and from the floor", source: "HG 4.9.12" },
      { id: "T11", text: "Signed with the accessibility symbol", source: "HG 4.9.17; KPBR 42(4)" },
      { id: "T12", text: "Kept unlocked, or the key is nearby with a notice saying where", source: "HG 7.2.4(3)" },
      { id: "T13", text: "Transfer space kept clear (no bins or stored items)", source: "HG 7.2.4(7)" },
      { id: "T14", text: "An ambulant cubicle with grab bars in each toilet block", source: "HG 4.9.2(2)" },
    ],
  },
  {
    id: "stairs", title: "Stairs", guideline: "HG 4.5 · KPBR 35",
    items: [
      { id: "S1", text: "Even steps", target: "tread ≥ 300 mm, riser ≤ 150 mm", source: "HG 4.5(2); KPBR 35(1)(3)" },
      { id: "S2", text: "Stair width", target: "≥ 1200 mm (HG 1500)", source: "KPBR 35(1)(3); HG 4.5(6)" },
      { id: "S3", text: "Handrails on both sides at two heights", target: "600–750 and 900–1000 mm", source: "HG 4.5(10)" },
      { id: "S4", text: "At most 12 steps per flight, no open risers", source: "HG 4.5(3), (4)" },
      { id: "S5", text: "Contrasting band on step edges; warning tiles before and after", source: "HG 4.5(11), (14)" },
    ],
  },
  {
    id: "inside", title: "Inside the building", guideline: "HG 4.2–4.4",
    items: [
      { id: "C1", text: "Corridor clear width", target: "≥ 1200 mm (1500 for passing)", source: "HG 4.4.1" },
      { id: "C2", text: "Rest seats on long indoor routes", target: "every ≤ 50 m", source: "HG 4.4.2" },
      { id: "C3", text: "Priority seats with backrest and armrests", target: "seat 450–500 mm", source: "HG 4.2", onYes: p("seating", { armrests: true, queue_seating: true }), onNo: p("seating", { armrests: false }) },
      { id: "C4", text: "Wheelchair space in waiting areas", target: "900 × 1200 mm", source: "HG 4.2(6)" },
      { id: "C5", text: "Reception counter has a lowered section", target: "750–800 mm, knee space 680 mm", source: "HG 4.3" },
      { id: "C6", text: "Hearing loop at the counter", source: "HG 4.3(7)" },
    ],
  },
  {
    id: "extras", title: "For this type of venue", guideline: "HG 4.12, 4.13, 6.9",
    items: [
      { id: "X1", text: "Accessible tables", target: "1 per 10 tables, min 2; ≤ 800 mm high", source: "HG 4.13.1", only: ["restaurant"], onYes: p("seating", { table_knee_clearance: true }), onNo: p("seating", { table_knee_clearance: false }) },
      { id: "X2", text: "Clear path between tables", target: "≥ 1200 mm main, ≥ 900 mm to tables", source: "HG 4.13.2", only: ["restaurant"] },
      { id: "X3", text: "Wheelchair seating spaces in the hall", target: "6 up to 600 seats", source: "HG Table 6.3", only: ["auditorium", "theatre", "worship"] },
      { id: "X4", text: "Dining hall and stage are on a step-free route (lift or ramp if on another floor)", source: "HG 6.9.2; KPBR 42(2)", only: ["auditorium"] },
      { id: "X5", text: "Accessible guest rooms", target: "1 per 25 rooms (KPBR)", source: "KPBR 42(7); HG 4.12", only: ["tourism"] },
      { id: "X6", text: "Separate visitor toilet block with an accessible WC and basin", source: "KPBR 34(3)(3)", only: ["hospital", "government", "metro", "water_metro"] },
      { id: "X7", text: "A drinking water tap at wheelchair height", target: "750 mm", source: "HG 4.8" },
    ],
  },
  {
    id: "info", title: "Information and emergency", guideline: "HG 5, 7",
    items: [
      { id: "I1", text: "Accessibility symbol at the accessible entrance; signs to it from other entrances", source: "HG 4.1.3(10); KPBR 42(8)(d)" },
      { id: "I2", text: "Braille or tactile signs", target: "900–1500 mm", source: "HG 5.4.5(6)" },
      { id: "I3", text: "Evacuation plan posted at a reachable height", target: "base ≤ 1200 mm", source: "HG 7.3.1" },
      { id: "I4", text: "Flashing (visual) fire alarm as well as sound", source: "HG 7.3.6" },
      { id: "I5", text: "Staff trained to help; a named contact for people who call ahead", source: "HG 7.2.9" },
    ],
  },
];

export const ITEMS: Record<string, ChecklistItem> = Object.fromEntries(SECTIONS.flatMap((s) => s.items.map((i) => [i.id, i])));

export function sectionsFor(venue: Pick<Venue, "category" | "floors" | "upper_floor_areas">): ChecklistSection[] {
  const upper = venue.floors > 1 || venue.upper_floor_areas.some((a) => a.floor !== 0);
  return SECTIONS.filter((s) => s.when !== "upper_floors" || upper)
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.only || i.only.includes(venue.category)) }))
    .filter((s) => s.items.length);
}
