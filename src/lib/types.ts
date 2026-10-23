// AccessKochi core types. Mirrors the data schema in the project doc.

export type ProfileId = "wheelchair" | "crutches" | "low_stamina";
export type Companion = "alone" | "with_companion";

export type FeatureName =
  | "entrance"
  | "ramp"
  | "toilet"
  | "lift"
  | "dropoff_path"
  | "parking"
  | "seating";

export type Track = "host" | "visitor" | "audit";
export type Confidence = "low" | "medium" | "high" | "cant_tell";
export type Method = "visual_estimate" | "reference_object" | "phone_tilt" | "self_reported" | "audit";
export type SourceType = "verified" | "ai_estimated" | "unconfirmed";

export type Category =
  | "hospital"
  | "auditorium"
  | "restaurant"
  | "mall"
  | "grocery"
  | "theatre"
  | "metro"
  | "water_metro"
  | "government"
  | "worship"
  | "tourism";

// ---- Feature attributes. null = unknown / can't tell. ----

export interface EntranceAttrs {
  step_count: number | null; // 0 = step-free
  threshold_mm: number | null; // raised doorstep (padi) height
  door_type: "swing" | "sliding" | "automatic" | "revolving" | "turnstile" | "open" | null;
  door_width_mm: number | null;
  handrail: "none" | "one" | "both" | null; // on entrance steps
  footwear_area?: boolean; // worship places: footwear removed at gate
  wheelchair_route_beyond?: boolean | null; // worship: can a wheelchair continue past it
}

export interface RampAttrs {
  present: boolean | null;
  slope_ratio: number | null; // 12 means 1:12; lower number = steeper
  run_m?: number | null; // longest single run between landings (HG Table 3.4)
  width_mm: number | null;
  handrails: "none" | "one" | "both" | null;
  surface: "firm" | "slippery" | "gravel" | null;
  blocked: boolean | null; // bikes parked, gate locked, "staff only"
}

export interface LiftAttrs {
  present: boolean | null;
  working: boolean | null;
  last_confirmed: string | null; // ISO date
  car_w_mm: number | null;
  car_d_mm: number | null;
  door_mm: number | null;
}

export interface ToiletAttrs {
  accessible: boolean | null;
  wc_type: "western" | "indian" | null;
  width_mm: number | null;
  depth_mm: number | null;
  door_mm: number | null;
  door_swing: "outward" | "inward" | "sliding" | null;
  grab_bars: "none" | "one_side" | "both" | null;
  transfer_space: boolean | null;
  family_toilet?: boolean | null;
}

export interface DropoffAttrs {
  dropoff_at_gate: boolean | null;
  distance_m: number | null; // drop-off to entrance
  step_free: boolean | null;
  surface: "firm" | "broken" | "gravel" | "mud" | null;
  shaded: boolean | null;
  monsoon_risk: "low" | "medium" | "high" | null;
}

export interface ParkingAttrs {
  accessible_bay: boolean | null;
  distance_m: number | null;
}

export interface SeatingAttrs {
  rest_interval_m: number | null; // spacing of seats along the main route
  queue_seating: boolean | null;
  armrests: boolean | null;
  table_knee_clearance?: boolean | null;
}

export interface AttrMap {
  entrance: EntranceAttrs;
  ramp: RampAttrs;
  lift: LiftAttrs;
  toilet: ToiletAttrs;
  dropoff_path: DropoffAttrs;
  parking: ParkingAttrs;
  seating: SeatingAttrs;
}

export interface FeatureValue<F extends FeatureName = FeatureName> {
  feature: F;
  track: Track;
  attributes: Partial<AttrMap[F]>;
  reading_confidence: Confidence;
  measurement_method: Method;
  source_type: SourceType;
  updated_at: string; // ISO date
  note?: string;
}

export interface GoogleSays {
  wheelchair_entrance?: boolean | null;
  wheelchair_parking?: boolean | null;
  wheelchair_restroom?: boolean | null;
  wheelchair_seating?: boolean | null;
  simulated: boolean;
}

export interface Venue {
  id: string;
  name: string;
  name_ml?: string;
  category: Category;
  area: string;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  google_place_id: string | null;
  data_origin: "dummy" | "real";
  floors: number;
  upper_floor_areas: { name: string; floor: number }[]; // key areas not on the ground floor
  popular?: boolean;
  google_says: GoogleSays;
  features: FeatureValue[];
  documents_on_file?: { kind: string; label: string; expires_on: string | null }[];
}

// ---- Matcher output ----

export type Verdict = "pass" | "partial" | "fail" | "unknown";
export type VenueVerdict = "pass" | "partial" | "risky" | "unknown" | "fail";
export type Level = "required" | "preferred" | "optional";

export interface TrackResult {
  verdict: Verdict;
  confidence: Confidence;
  reasons: string[];
  unconfirmed: string[];
  source_type: SourceType;
  updated_at: string;
}

export interface FeatureResult {
  feature: FeatureName;
  level: Level;
  verdict: Verdict; // combined across tracks (never averaged; see matcher)
  tracks: Partial<Record<Track, TrackResult>>;
  conflict: boolean;
}

export type FlagKind = "conflict" | "possible_with_help" | "low_evidence" | "google_disagrees";

export interface Flag {
  kind: FlagKind;
  feature?: FeatureName;
  detail: string;
}

export interface VenueResult {
  venue_id: string;
  name: string;
  verdict: VenueVerdict;
  features: FeatureResult[];
  reasons: string[]; // why it failed / is partial
  unconfirmed: string[]; // "call ahead" items
  flags: Flag[];
  call_ahead: string | null;
  distance_km?: number;
}
