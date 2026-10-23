// Photo reading: the vision model reads a photo into the feature schema.
// Rules (from the project doc):
//  - Always accept the photo. No reference object -> confidence capped at LOW ("visual estimate only").
//  - Reference object (A4 sheet, phone upright, standard door) -> capped at MEDIUM.
//  - Phone tilt reading + vision confirms it's a ramp -> HIGH, and the slope comes from the tilt, not the model.
//  - The model must never guess a number it can't support: numbers are dropped unless a reference is in frame.
//  - Bad photo -> cant_tell.

import { chatJson } from "./llm";
import type { Confidence, FeatureName, FeatureValue, Method } from "./types";

export type Reference = "none" | "a4_sheet" | "phone_upright" | "standard_door";

export interface VisionOutput {
  feature: FeatureName;
  is_subject_visible: boolean;
  attributes: Record<string, unknown>;
  reading_confidence: Confidence;
  reasons: string[];
  cant_tell_fields: string[];
}

// What the model may fill for each feature, with allowed values.
const SCHEMA: Partial<Record<FeatureName, Record<string, string>>> = {
  entrance: {
    step_count: "integer number of steps at the entrance, 0 if step-free, null if you can't tell",
    threshold_mm: "raised doorstep height in mm ONLY if a reference object is in frame, else null",
    door_type: '"swing" | "sliding" | "automatic" | "revolving" | "turnstile" | "open" | null',
    door_width_mm: "clear door width in mm ONLY if a reference object is in frame, else null",
    handrail: '"none" | "one" | "both" | null (handrails on entrance steps)',
  },
  ramp: {
    present: "true | false | null",
    slope_ratio: "N for a 1:N slope ONLY if a reference object is in frame, else null",
    width_mm: "ramp width in mm ONLY if a reference object is in frame, else null",
    handrails: '"none" | "one" | "both" | null',
    surface: '"firm" | "slippery" | "gravel" | null',
    blocked: "true if bikes, objects or a locked gate block it, false if clear, null if you can't tell",
  },
  toilet: {
    accessible: "true if it looks like an accessible toilet, false if clearly not, null if you can't tell",
    wc_type: '"western" | "indian" | null',
    grab_bars: '"none" | "one_side" | "both" | null',
    transfer_space: "true if there is clear floor space beside the WC, false if not, null",
    door_swing: '"outward" | "inward" | "sliding" | null',
  },
  lift: {
    present: "true | false | null",
    working: "true | false | null (false only if an out-of-order sign or similar is visible)",
  },
  dropoff_path: {
    step_free: "true | false | null",
    surface: '"firm" | "broken" | "gravel" | "mud" | null',
    shaded: "true | false | null",
  },
};

const NUMERIC_NEEDS_REFERENCE = new Set(["threshold_mm", "door_width_mm", "slope_ratio", "width_mm"]);
const CONF_RANK: Record<Confidence, number> = { cant_tell: 0, low: 1, medium: 2, high: 3 };

export function capFor(reference: Reference, tiltDeg: number | null): Confidence {
  if (tiltDeg != null) return "high";
  return reference === "none" ? "low" : "medium";
}

export async function readPhoto(params: {
  imageDataUrl: string;
  feature: FeatureName;
  reference: Reference;
  tiltDeg: number | null;
}): Promise<{ output: VisionOutput; provider: string } | { error: string }> {
  const schema = SCHEMA[params.feature];
  if (!schema) return { error: `Photo reading not supported for ${params.feature}` };

  const refText =
    params.reference === "none"
      ? "There is NO reference object. Do not estimate any measurement in mm or any slope ratio: set them to null and list them in cant_tell_fields."
      : `A reference object is in frame: ${params.reference.replace("_", " ")} (A4 sheet = 210 x 297 mm; phone upright about 150 mm tall; standard door about 2100 mm tall). You may estimate sizes from it.`;

  const system = [
    "You read photos of building features for an accessibility app. Be strict and honest.",
    "Report only what is visible. If you are not sure, use null and add the field name to cant_tell_fields.",
    "Never guess a number you cannot support from the photo.",
    "If the photo is blurry, dark or does not show the requested feature, set is_subject_visible to false and reading_confidence to \"cant_tell\".",
    "Reply with ONE JSON object and nothing else.",
  ].join(" ");

  const user = [
    `Feature to read: ${params.feature}.`,
    refText,
    "Fill these attributes:",
    ...Object.entries(schema).map(([k, v]) => `- ${k}: ${v}`),
    'Reply as JSON: {"feature": "...", "is_subject_visible": true|false, "attributes": {...}, "reading_confidence": "low"|"medium"|"high"|"cant_tell", "reasons": ["short reason"], "cant_tell_fields": ["..."]}',
  ].join("\n");

  const r = await chatJson<VisionOutput>(
    [
      { role: "system", content: system },
      { role: "user", content: [{ type: "text", text: user }, { type: "image_url", image_url: { url: params.imageDataUrl } }] },
    ],
    { maxTokens: 600, timeoutMs: 90_000 },
  );
  if (!r) return { error: "Photo reading failed (no model answered). Check /api/health." };

  return { output: sanitize(r.data, params), provider: r.provider };
}

/** Enforces the contract: only schema keys, allowed values, no numbers without a reference, confidence caps. */
export function sanitize(raw: Partial<VisionOutput>, p: { feature: FeatureName; reference: Reference; tiltDeg: number | null }): VisionOutput {
  const schema = SCHEMA[p.feature] ?? {};
  const attrs: Record<string, unknown> = {};
  const cantTell = new Set<string>(Array.isArray(raw.cant_tell_fields) ? raw.cant_tell_fields.map(String) : []);
  const reasons = Array.isArray(raw.reasons) ? raw.reasons.map(String).slice(0, 5) : [];

  for (const key of Object.keys(schema)) {
    let v = raw.attributes?.[key];
    if (v === undefined || v === "null") v = null;
    if (NUMERIC_NEEDS_REFERENCE.has(key) && p.reference === "none") v = null;
    if (typeof v === "string" && /^\d+(\.\d+)?$/.test(v)) v = Number(v);
    if (v === null) cantTell.add(key);
    attrs[key] = v;
  }

  // Phone tilt gives the slope directly: 1:N where N = 1 / tan(angle).
  if (p.feature === "ramp" && p.tiltDeg != null && p.tiltDeg > 0.5 && p.tiltDeg < 45) {
    attrs.slope_ratio = Math.round((1 / Math.tan((p.tiltDeg * Math.PI) / 180)) * 10) / 10;
    cantTell.delete("slope_ratio");
    reasons.push(`slope from phone tilt reading (${p.tiltDeg.toFixed(1)}°)`);
  }

  let conf: Confidence = (["low", "medium", "high", "cant_tell"] as Confidence[]).includes(raw.reading_confidence as Confidence)
    ? (raw.reading_confidence as Confidence)
    : "low";
  const visible = raw.is_subject_visible !== false;
  if (!visible) conf = "cant_tell";
  const cap = capFor(p.reference, p.feature === "ramp" ? p.tiltDeg : null);
  if (CONF_RANK[conf] > CONF_RANK[cap]) conf = cap;
  if (p.reference === "none" && conf !== "cant_tell") reasons.push("visual estimate only (no reference object)");

  return {
    feature: p.feature,
    is_subject_visible: visible,
    attributes: visible ? attrs : {},
    reading_confidence: conf,
    reasons,
    cant_tell_fields: [...cantTell],
  };
}

export function toFeatureValue(out: VisionOutput, role: "host" | "visitor", reference: Reference, tiltDeg: number | null): FeatureValue {
  const method: Method = tiltDeg != null && out.feature === "ramp" ? "phone_tilt" : reference === "none" ? "visual_estimate" : "reference_object";
  return {
    feature: out.feature,
    track: role,
    attributes: out.attributes as FeatureValue["attributes"],
    reading_confidence: out.reading_confidence,
    measurement_method: method,
    source_type: "ai_estimated",
    updated_at: new Date().toISOString().slice(0, 10),
    note: out.reasons.join("; ") || undefined,
  };
}
