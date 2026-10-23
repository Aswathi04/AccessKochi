// 28 DUMMY Kochi venues for the demo. Every venue is data_origin: "dummy".
// Businesses, hospitals, auditoriums and places of worship are FICTIONAL names.
// Metro / Water Metro stations use real station names but DUMMY accessibility data,
// so the UI must show the "dummy data" badge. Phone numbers are placeholders.
// Google tags are simulated (simulated: true) until a real fetch replaces them.
//
// Deliberate traps (see tests/matcher.test.ts):
//  v02 host vs visitor conflict on ramp      v07 popular café with steps, no ramp
//  v03 unknown restroom                       v10 low-confidence visual estimate only
//  v04 wedding hall: dining upstairs, no lift v11 one step, no ramp (companion rule)
//  v13 lift reported broken (conflict)        v14 two low steps with handrail (crutches)
//  v15 great features, 400 m drop-off walk    v24 temple steps + footwear area
//  v25 raised doorstep (padi)                 v28 Google says accessible, evidence says no

import type {
  AttrMap, Confidence, FeatureName, FeatureValue, Method, SourceType, Track, Venue,
} from "@/lib/types";

const D = "2026-10-20";

function sourceFor(track: Track, method: Method): SourceType {
  if (track === "audit") return "verified";
  if (method === "self_reported") return "unconfirmed";
  return "ai_estimated";
}

function f<F extends FeatureName>(
  feature: F,
  track: Track,
  attributes: Partial<AttrMap[F]>,
  reading_confidence: Confidence = "medium",
  measurement_method: Method = "reference_object",
  updated_at: string = D,
  note?: string,
): FeatureValue<F> {
  return {
    feature, track, attributes, reading_confidence, measurement_method,
    source_type: sourceFor(track, measurement_method), updated_at, note,
  };
}

// Common "good" building blocks
const goodEntrance = { step_count: 0, threshold_mm: 0, door_type: "automatic" as const, door_width_mm: 1200, handrail: null };
const goodLift = { present: true, working: true, last_confirmed: "2026-10-12", car_w_mm: 1600, car_d_mm: 1600, door_mm: 1000 };
const goodToilet = {
  accessible: true, wc_type: "western" as const, width_mm: 2300, depth_mm: 2100, door_mm: 950,
  door_swing: "sliding" as const, grab_bars: "both" as const, transfer_space: true,
};
const goodDropoff = { dropoff_at_gate: true, distance_m: 20, step_free: true, surface: "firm" as const, shaded: true, monsoon_risk: "low" as const };
const goodParking = { accessible_bay: true, distance_m: 20 };
const goodSeating = { rest_interval_m: 20, queue_seating: true, armrests: true };
const sim = (e?: boolean | null, p?: boolean | null, r?: boolean | null, s?: boolean | null) => ({
  wheelchair_entrance: e ?? null, wheelchair_parking: p ?? null, wheelchair_restroom: r ?? null, wheelchair_seating: s ?? null, simulated: true,
});

const base = { google_place_id: null, data_origin: "dummy" as const };
const ph = (n: string) => `+91 00000 0${n} (demo)`;

export const venues: Venue[] = [
  // ---------------- Hospitals ----------------
  {
    ...base, id: "v01", name: "Periyar General Hospital", name_ml: "പെരിയാർ ജനറൽ ആശുപത്രി", category: "hospital",
    area: "Ernakulam North", address: "Hospital Road, Ernakulam North", lat: 9.9906, lng: 76.2876, phone: ph("0101"),
    floors: 3, upper_floor_areas: [{ name: "OP wards", floor: 1 }, { name: "Pharmacy", floor: 0 }],
    google_says: sim(true, true, true, true),
    features: [
      f("entrance", "host", goodEntrance),
      f("entrance", "visitor", goodEntrance, "medium", "visual_estimate", "2026-10-15"),
      f("lift", "host", goodLift),
      f("lift", "visitor", { present: true, working: true, last_confirmed: "2026-10-09" }, "medium", "visual_estimate", "2026-10-09", "Lift verified working 2 weeks ago"),
      f("toilet", "host", goodToilet),
      f("dropoff_path", "host", goodDropoff),
      f("parking", "host", goodParking),
      f("seating", "host", goodSeating),
    ],
  },
  {
    ...base, id: "v02", name: "Kakkanad Medical Centre", category: "hospital",
    area: "Kakkanad", address: "Seaport-Airport Road, Kakkanad", lat: 10.0159, lng: 76.3419, phone: ph("0102"),
    floors: 2, upper_floor_areas: [{ name: "Consultation rooms", floor: 1 }],
    google_says: sim(true, null, true, null),
    features: [
      f("entrance", "host", { step_count: 4, threshold_mm: 0, door_type: "swing", door_width_mm: 1000, handrail: "both" }),
      f("ramp", "host", { present: true, slope_ratio: 12, width_mm: 1300, handrails: "both", surface: "firm", blocked: false }, "medium", "reference_object"),
      f("ramp", "visitor", { present: true, slope_ratio: 8, width_mm: 1200, handrails: "both", surface: "firm", blocked: false }, "high", "phone_tilt", "2026-10-17", "Visitor tilt reading: about 1:8"),
      f("lift", "host", goodLift),
      f("toilet", "host", goodToilet),
      f("dropoff_path", "host", goodDropoff),
    ],
  },
  {
    ...base, id: "v03", name: "Edappally Family Clinic", category: "hospital",
    area: "Edappally", address: "NH 66, Edappally", lat: 10.0261, lng: 76.3125, phone: ph("0103"),
    floors: 1, upper_floor_areas: [],
    google_says: sim(true, null, null, null),
    features: [
      f("entrance", "host", { step_count: 0, threshold_mm: 5, door_type: "sliding", door_width_mm: 1000, handrail: null }),
      f("dropoff_path", "host", goodDropoff),
      // no toilet data on purpose
    ],
  },

  // ---------------- Wedding auditoriums ----------------
  {
    ...base, id: "v04", name: "Kakkanad Grand Convention Centre", name_ml: "കാക്കനാട് ഗ്രാൻഡ് കൺവെൻഷൻ സെന്റർ", category: "auditorium",
    area: "Kakkanad", address: "Infopark Road, Kakkanad", lat: 10.0105, lng: 76.3505, phone: ph("0104"),
    floors: 2, upper_floor_areas: [{ name: "Dining hall", floor: 1 }], popular: true,
    google_says: sim(true, true, null, null),
    features: [
      f("entrance", "host", { step_count: 3, threshold_mm: 0, door_type: "open", door_width_mm: 2000, handrail: "both" }),
      f("ramp", "host", { present: true, slope_ratio: 12, width_mm: 1500, handrails: "both", surface: "firm", blocked: false }),
      f("ramp", "visitor", { present: true, slope_ratio: null, handrails: "both", surface: "firm" }, "low", "visual_estimate", "2026-10-14"),
      f("lift", "visitor", { present: false, working: null, last_confirmed: "2026-10-14" }, "medium", "visual_estimate", "2026-10-14", "Dining hall is upstairs; only stairs seen"),
      f("dropoff_path", "host", goodDropoff),
      f("parking", "host", goodParking),
      // no toilet data on purpose -> "unconfirmed, call ahead"
    ],
  },
  {
    ...base, id: "v05", name: "Vyttila Pearl Auditorium", category: "auditorium",
    area: "Vyttila", address: "Vyttila Junction", lat: 9.9687, lng: 76.318, phone: ph("0105"),
    floors: 1, upper_floor_areas: [],
    google_says: sim(true, true, true, true),
    features: [
      f("entrance", "host", goodEntrance),
      f("toilet", "host", goodToilet),
      f("dropoff_path", "host", goodDropoff),
      f("parking", "host", goodParking),
      f("seating", "host", goodSeating),
    ],
  },
  {
    ...base, id: "v06", name: "Palarivattom Royal Hall", category: "auditorium",
    area: "Palarivattom", address: "Palarivattom Bypass", lat: 10.0033, lng: 76.3074, phone: ph("0106"),
    floors: 2, upper_floor_areas: [{ name: "Dining hall", floor: 1 }],
    google_says: sim(true, null, true, null),
    features: [
      f("entrance", "host", { step_count: 2, threshold_mm: 0, door_type: "open", door_width_mm: 1800, handrail: "both" }),
      f("ramp", "host", { present: true, slope_ratio: 12, width_mm: 1200, handrails: "both", surface: "firm", blocked: false }),
      f("lift", "host", { present: true, working: true, last_confirmed: "2026-10-05", car_w_mm: 1500, car_d_mm: 1500, door_mm: 900 }),
      f("toilet", "host", { ...goodToilet, door_swing: "inward" }),
      f("dropoff_path", "host", goodDropoff),
    ],
  },

  // ---------------- Restaurants / cafés ----------------
  {
    ...base, id: "v07", name: "Kaloor Coffee House", category: "restaurant",
    area: "Kaloor", address: "Stadium Road, Kaloor", lat: 9.9973, lng: 76.299, phone: ph("0107"),
    floors: 1, upper_floor_areas: [], popular: true,
    google_says: sim(null, null, null, null),
    features: [
      f("entrance", "host", { step_count: 3, threshold_mm: 0, door_type: "swing", door_width_mm: 900, handrail: "none" }),
      f("entrance", "visitor", { step_count: 3, handrail: "none" }, "medium", "visual_estimate", "2026-10-16"),
      f("ramp", "visitor", { present: false }, "medium", "visual_estimate", "2026-10-16"),
    ],
  },
  {
    ...base, id: "v08", name: "Vyttila Spice Kitchen", category: "restaurant",
    area: "Vyttila", address: "Vyttila-Petta Road", lat: 9.9665, lng: 76.3205, phone: ph("0108"),
    floors: 1, upper_floor_areas: [],
    google_says: sim(true, null, null, null),
    features: [
      f("entrance", "host", { step_count: 0, threshold_mm: 0, door_type: "swing", door_width_mm: 1000, handrail: null }),
      f("seating", "visitor", { rest_interval_m: null, queue_seating: null, armrests: true, table_knee_clearance: true }, "medium", "visual_estimate"),
      f("dropoff_path", "host", goodDropoff),
      // no toilet data on purpose
    ],
  },
  {
    ...base, id: "v09", name: "Kakkanad Biryani Point", category: "restaurant",
    area: "Kakkanad", address: "Collectorate Junction, Kakkanad", lat: 10.0142, lng: 76.3388, phone: ph("0109"),
    floors: 1, upper_floor_areas: [],
    google_says: sim(true, null, true, null),
    features: [
      f("entrance", "host", { step_count: 0, threshold_mm: 0, door_type: "sliding", door_width_mm: 1100, handrail: null }),
      f("toilet", "host", goodToilet),
      f("toilet", "visitor", { accessible: true, wc_type: "western", grab_bars: "both" }, "medium", "visual_estimate", "2026-10-18"),
      f("dropoff_path", "host", goodDropoff),
      f("seating", "host", { ...goodSeating, table_knee_clearance: true }),
    ],
  },
  {
    ...base, id: "v10", name: "MG Road Bistro", category: "restaurant",
    area: "MG Road", address: "MG Road, Ernakulam", lat: 9.9711, lng: 76.2852, phone: ph("0110"),
    floors: 1, upper_floor_areas: [],
    google_says: sim(null, null, null, null),
    features: [
      f("entrance", "visitor", { step_count: 0, threshold_mm: null, door_type: "swing", door_width_mm: null, handrail: null }, "low", "visual_estimate", "2026-10-11", "One photo, no reference object"),
      f("toilet", "visitor", { accessible: true, wc_type: "western", grab_bars: "both", transfer_space: true }, "low", "visual_estimate", "2026-10-11"),
      f("dropoff_path", "visitor", { dropoff_at_gate: true, distance_m: 30, step_free: true, surface: "firm" }, "low", "visual_estimate", "2026-10-11"),
    ],
  },
  {
    ...base, id: "v11", name: "Edappally Tea & Snacks", category: "restaurant",
    area: "Edappally", address: "Edappally Toll", lat: 10.0225, lng: 76.3087, phone: ph("0111"),
    floors: 1, upper_floor_areas: [],
    google_says: sim(null, null, null, null),
    features: [
      f("entrance", "visitor", { step_count: 1, threshold_mm: 0, door_type: "open", door_width_mm: 1200, handrail: "none" }, "medium", "visual_estimate"),
      f("ramp", "visitor", { present: false }, "medium", "visual_estimate"),
      f("toilet", "visitor", { accessible: true, wc_type: "western", grab_bars: "both", transfer_space: true }, "medium", "visual_estimate"),
      f("dropoff_path", "visitor", { dropoff_at_gate: true, distance_m: 10, step_free: true, surface: "firm" }, "medium", "visual_estimate"),
    ],
  },

  // ---------------- Malls ----------------
  {
    ...base, id: "v12", name: "Edappally Lake Mall", category: "mall",
    area: "Edappally", address: "NH 66, Edappally", lat: 10.0271, lng: 76.3083, phone: ph("0112"),
    floors: 4, upper_floor_areas: [{ name: "Food court", floor: 3 }, { name: "Cinema", floor: 3 }],
    google_says: sim(true, true, true, true),
    features: [
      f("entrance", "host", goodEntrance),
      f("lift", "host", goodLift),
      f("lift", "visitor", { present: true, working: true, last_confirmed: "2026-10-19" }, "medium", "visual_estimate", "2026-10-19"),
      f("toilet", "host", goodToilet),
      f("dropoff_path", "host", goodDropoff),
      f("parking", "host", goodParking),
      f("seating", "host", goodSeating),
    ],
  },
  {
    ...base, id: "v13", name: "Marine Drive Shopping Arcade", category: "mall",
    area: "Marine Drive", address: "Marine Drive, Ernakulam", lat: 9.979, lng: 76.277, phone: ph("0113"),
    floors: 3, upper_floor_areas: [{ name: "Shops", floor: 1 }, { name: "Shops", floor: 2 }],
    google_says: sim(true, null, null, null),
    features: [
      f("entrance", "host", goodEntrance),
      f("lift", "host", { ...goodLift, last_confirmed: "2026-08-01" }, "low", "self_reported", "2026-08-01"),
      f("lift", "visitor", { present: true, working: false, last_confirmed: "2026-10-18" }, "medium", "visual_estimate", "2026-10-18", "Out of order sign on lift"),
      f("toilet", "host", goodToilet),
      f("dropoff_path", "host", goodDropoff),
    ],
  },

  // ---------------- Grocery ----------------
  {
    ...base, id: "v14", name: "Kadavanthra Fresh Mart", category: "grocery",
    area: "Kadavanthra", address: "KP Vallon Road, Kadavanthra", lat: 9.9667, lng: 76.2992, phone: ph("0114"),
    floors: 1, upper_floor_areas: [],
    google_says: sim(null, null, null, null),
    features: [
      f("entrance", "host", { step_count: 2, threshold_mm: 0, door_type: "swing", door_width_mm: 1000, handrail: "both" }, "medium", "reference_object", D, "Two low steps, handrails both sides"),
      f("ramp", "host", { present: false }),
      f("dropoff_path", "host", { ...goodDropoff, distance_m: 15 }),
      f("seating", "host", { rest_interval_m: null, queue_seating: true, armrests: false }),
    ],
  },

  // ---------------- Theatre ----------------
  {
    ...base, id: "v15", name: "Kaloor Cinemas", category: "theatre",
    area: "Kaloor", address: "Banerji Road, Kaloor", lat: 9.9946, lng: 76.2925, phone: ph("0115"),
    floors: 3, upper_floor_areas: [{ name: "Screens", floor: 2 }],
    google_says: sim(true, true, true, true),
    features: [
      f("entrance", "host", goodEntrance),
      f("lift", "host", goodLift),
      f("toilet", "host", goodToilet),
      f("dropoff_path", "host", { dropoff_at_gate: false, distance_m: 400, step_free: true, surface: "firm", shaded: false, monsoon_risk: "low" }, "medium", "reference_object", D, "Drop-off only at the parking lot across the road"),
      f("parking", "host", { accessible_bay: true, distance_m: 380 }),
      f("seating", "host", { rest_interval_m: 50, queue_seating: false, armrests: true }),
    ],
  },

  // ---------------- Kochi Metro (real station names, DUMMY data) ----------------
  {
    ...base, id: "v16", name: "Edappally Metro Station", category: "metro",
    area: "Edappally", address: "Edappally Junction", lat: 10.0249, lng: 76.3083, phone: ph("0116"),
    floors: 2, upper_floor_areas: [{ name: "Platform", floor: 1 }],
    google_says: sim(true, null, true, null),
    features: [
      f("entrance", "host", { ...goodEntrance, door_type: "open" }, "medium", "reference_object", D, "Step-free via Exit B"),
      f("lift", "host", { ...goodLift, last_confirmed: "2026-10-18" }, "medium", "reference_object", "2026-10-18", "Lift at Exit B"),
      f("toilet", "host", goodToilet),
      f("dropoff_path", "host", goodDropoff),
    ],
  },
  {
    ...base, id: "v17", name: "Vyttila Metro Station", category: "metro",
    area: "Vyttila", address: "Vyttila Hub", lat: 9.9671, lng: 76.3207, phone: ph("0117"),
    floors: 2, upper_floor_areas: [{ name: "Platform", floor: 1 }],
    google_says: sim(true, null, true, null),
    features: [
      f("entrance", "host", { ...goodEntrance, door_type: "open" }),
      f("lift", "host", goodLift),
      f("toilet", "host", goodToilet),
      f("dropoff_path", "host", goodDropoff),
    ],
  },
  {
    ...base, id: "v18", name: "Palarivattom Metro Station", category: "metro",
    area: "Palarivattom", address: "Palarivattom Junction", lat: 10.0042, lng: 76.3066, phone: ph("0118"),
    floors: 2, upper_floor_areas: [{ name: "Platform", floor: 1 }],
    google_says: sim(true, null, null, null),
    features: [
      f("entrance", "host", { ...goodEntrance, door_type: "open" }),
      f("lift", "host", { present: true, working: null, last_confirmed: null }, "low", "self_reported", "2026-06-01"),
      f("dropoff_path", "host", goodDropoff),
    ],
  },
  {
    ...base, id: "v19", name: "MG Road Metro Station", category: "metro",
    area: "MG Road", address: "MG Road, Ernakulam", lat: 9.9734, lng: 76.2843, phone: ph("0119"),
    floors: 2, upper_floor_areas: [{ name: "Platform", floor: 1 }],
    google_says: sim(true, null, true, null),
    features: [
      f("entrance", "host", { ...goodEntrance, door_type: "open" }),
      f("lift", "host", goodLift),
      f("toilet", "host", goodToilet),
      f("dropoff_path", "host", goodDropoff),
    ],
  },
  {
    ...base, id: "v20", name: "Vyttila Water Metro Terminal", category: "water_metro",
    area: "Vyttila", address: "Vyttila Mobility Hub", lat: 9.9663, lng: 76.3226, phone: ph("0120"),
    floors: 1, upper_floor_areas: [],
    google_says: sim(true, null, null, null),
    features: [
      f("entrance", "host", { step_count: 1, threshold_mm: 0, door_type: "open", door_width_mm: 1500, handrail: "both" }, "medium", "reference_object", D, "Step down onto the jetty"),
      f("ramp", "host", { present: true, slope_ratio: 12, width_mm: 1500, handrails: "both", surface: "slippery", blocked: false }, "high", "phone_tilt", D, "Gangway angle changes with the tide; wet in rain"),
      f("toilet", "host", goodToilet),
      f("dropoff_path", "host", { ...goodDropoff, monsoon_risk: "medium" }),
    ],
  },

  // ---------------- Government ----------------
  {
    ...base, id: "v21", name: "District Office Complex, Kakkanad", category: "government",
    area: "Kakkanad", address: "Civil Station Road, Kakkanad", lat: 10.0167, lng: 76.3395, phone: ph("0121"),
    floors: 3, upper_floor_areas: [{ name: "Offices", floor: 1 }, { name: "Offices", floor: 2 }],
    google_says: sim(true, null, null, null),
    features: [
      f("entrance", "host", { step_count: 5, threshold_mm: 0, door_type: "swing", door_width_mm: 1200, handrail: "both" }),
      f("ramp", "host", { present: true, slope_ratio: 12, width_mm: 1200, handrails: "both", surface: "firm", blocked: false }),
      f("ramp", "visitor", { present: true, blocked: true }, "medium", "visual_estimate", "2026-10-18", "Ramp gate locked; bikes parked on it"),
      f("lift", "host", goodLift),
      f("toilet", "host", goodToilet),
      f("dropoff_path", "host", goodDropoff),
    ],
  },
  {
    ...base, id: "v22", name: "Edappally Village Office", category: "government",
    area: "Edappally", address: "Edappally North", lat: 10.0298, lng: 76.3071, phone: ph("0122"),
    floors: 2, upper_floor_areas: [{ name: "Office counter", floor: 1 }],
    google_says: sim(null, null, null, null),
    features: [
      f("entrance", "visitor", { step_count: 3, threshold_mm: 0, door_type: "swing", door_width_mm: 900, handrail: "one" }, "medium", "visual_estimate"),
      f("ramp", "visitor", { present: false }, "medium", "visual_estimate"),
      f("lift", "visitor", { present: false }, "medium", "visual_estimate"),
    ],
  },
  {
    ...base, id: "v23", name: "Akshaya Centre, Kaloor", category: "government",
    area: "Kaloor", address: "Kaloor-Kadavanthra Road", lat: 9.9935, lng: 76.2961, phone: ph("0123"),
    floors: 2, upper_floor_areas: [{ name: "Service counter", floor: 1 }],
    google_says: sim(null, null, null, null),
    features: [
      f("entrance", "host", { step_count: 0, threshold_mm: 0, door_type: "swing", door_width_mm: 900, handrail: null }),
      f("lift", "host", { present: false }),
      f("dropoff_path", "host", goodDropoff),
    ],
  },

  // ---------------- Places of worship ----------------
  {
    ...base, id: "v24", name: "Thrippunithura Devi Temple", name_ml: "തൃപ്പൂണിത്തുറ ദേവി ക്ഷേത്രം", category: "worship",
    area: "Thrippunithura", address: "Temple Road, Thrippunithura", lat: 9.9439, lng: 76.3489, phone: ph("0124"),
    floors: 1, upper_floor_areas: [],
    google_says: sim(null, null, null, null),
    features: [
      f("entrance", "visitor", { step_count: 2, threshold_mm: 150, door_type: "open", door_width_mm: 1500, handrail: "both", footwear_area: true, wheelchair_route_beyond: false }, "medium", "visual_estimate", D, "Footwear removed at the gate; seating at the footwear area"),
      f("ramp", "visitor", { present: false }, "medium", "visual_estimate"),
      f("seating", "visitor", { rest_interval_m: 20, queue_seating: true, armrests: false }, "medium", "visual_estimate"),
    ],
  },
  {
    ...base, id: "v25", name: "St. Mary's Heritage Church, Fort Kochi", category: "worship",
    area: "Fort Kochi", address: "Church Road, Fort Kochi", lat: 9.9658, lng: 76.2421, phone: ph("0125"),
    floors: 1, upper_floor_areas: [],
    google_says: sim(null, null, null, null),
    features: [
      f("entrance", "host", { step_count: 0, threshold_mm: 75, door_type: "swing", door_width_mm: 1400, handrail: null }, "medium", "reference_object", D, "Raised wooden doorstep (padi) at the main door"),
      f("dropoff_path", "host", { ...goodDropoff, surface: "broken", monsoon_risk: "high" }),
    ],
  },
  {
    ...base, id: "v26", name: "Kaloor Juma Masjid", category: "worship",
    area: "Kaloor", address: "Kaloor Junction", lat: 9.9968, lng: 76.3012, phone: ph("0126"),
    floors: 1, upper_floor_areas: [],
    google_says: sim(null, null, null, null),
    features: [
      f("entrance", "host", { step_count: 0, threshold_mm: 0, door_type: "open", door_width_mm: 1500, handrail: null, footwear_area: true, wheelchair_route_beyond: true }),
      f("dropoff_path", "host", goodDropoff),
    ],
  },

  // ---------------- Tourism ----------------
  {
    ...base, id: "v27", name: "Fort Kochi Heritage Homestay", category: "tourism",
    area: "Fort Kochi", address: "Princess Street, Fort Kochi", lat: 9.9671, lng: 76.2437, phone: ph("0127"),
    floors: 2, upper_floor_areas: [{ name: "Guest rooms", floor: 1 }],
    google_says: sim(null, null, null, null),
    features: [
      f("entrance", "host", { step_count: 3, threshold_mm: 100, door_type: "swing", door_width_mm: 850, handrail: "none" }, "medium", "self_reported", D, "Traditional raised plinth"),
      f("ramp", "host", { present: false }, "medium", "self_reported"),
      f("lift", "host", { present: false }, "medium", "self_reported"),
      f("dropoff_path", "host", { dropoff_at_gate: true, distance_m: 15, step_free: true, surface: "broken", shaded: true, monsoon_risk: "high" }, "medium", "self_reported"),
    ],
  },
  {
    ...base, id: "v28", name: "Marine Drive Walkway Café", category: "restaurant",
    area: "Marine Drive", address: "Marine Drive Walkway", lat: 9.9812, lng: 76.2759, phone: ph("0128"),
    floors: 1, upper_floor_areas: [],
    google_says: sim(true, null, true, null),
    features: [
      f("entrance", "visitor", { step_count: 2, threshold_mm: 0, door_type: "swing", door_width_mm: 900, handrail: "none" }, "medium", "reference_object", "2026-10-17"),
      f("ramp", "visitor", { present: false }, "medium", "visual_estimate", "2026-10-17"),
      f("toilet", "visitor", { accessible: false }, "medium", "visual_estimate", "2026-10-17"),
    ],
  },
];

export const venuesById = Object.fromEntries(venues.map((v) => [v.id, v]));
