// Speech-to-text chain: Sarvam -> Gemini -> OpenAI (ASR env sets the first one; "off" disables voice).
// The browser sends 16 kHz mono WAV (see src/lib/wav.ts). This only TRANSCRIBES;
// the agent still interprets the request and matches place names.
//
// Malayalam word error rates on real phone speech (Voice of India benchmark):
// Sarvam 18.9%, Gemini 3 Flash 27.1%, OpenAI gpt-4o-transcribe 97% (fine for English only).

import { AREAS } from "./agent";
import { venues } from "@/data/venues";

type Provider = "sarvam" | "gemini" | "openai";
export interface Transcript { text: string; provider: Provider; language: string | null }

const KEYTERMS = [...new Set([...Object.keys(AREAS), ...venues.map((v) => v.name.split(",")[0]), "Kochi Metro", "Water Metro", "Akshaya"])]
  .filter((t) => t.length <= 64)
  .slice(0, 50);

async function sarvam(audio: Blob, lang: "en" | "ml"): Promise<Transcript> {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new Error("SARVAM_API_KEY not set");
  const model = process.env.SARVAM_MODEL || "saaras:v4";
  const form = new FormData();
  form.append("file", audio, "speech.wav");
  form.append("model", model);
  form.append("language_code", lang === "ml" ? "ml-IN" : "unknown");
  if (model.startsWith("saaras:v3")) form.append("mode", process.env.SARVAM_MODE || "codemix");
  if (model.startsWith("saaras:v4")) form.append("keyterms", JSON.stringify(KEYTERMS)); // helps with place names
  const res = await fetch("https://api.sarvam.ai/speech-to-text", {
    method: "POST",
    headers: { "api-subscription-key": key },
    body: form,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Sarvam HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  if (typeof data?.transcript !== "string") throw new Error("Sarvam: no transcript");
  return { text: data.transcript, provider: "sarvam", language: data.language_code ?? null };
}

async function gemini(audio: Blob, lang: "en" | "ml"): Promise<Transcript> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const model = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
  const b64 = Buffer.from(await audio.arrayBuffer()).toString("base64");
  const prompt =
    lang === "ml"
      ? "Transcribe this audio exactly. It is Malayalam, possibly mixed with English place names. Write Malayalam in Malayalam script and English words in English. Return only the transcript."
      : "Transcribe this audio exactly. It may mix English and Malayalam. Return only the transcript.";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }, { inline_data: { mime_type: audio.type || "audio/wav", data: b64 } }] }],
      generationConfig: { temperature: 0 },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("").trim();
  if (!text) throw new Error("Gemini: no transcript");
  return { text, provider: "gemini", language: lang === "ml" ? "ml-IN" : null };
}

async function openai(audio: Blob, lang: "en" | "ml"): Promise<Transcript> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");
  const form = new FormData();
  form.append("file", audio, "speech.wav");
  form.append("model", process.env.OPENAI_ASR_MODEL || "gpt-4o-transcribe");
  form.append("language", lang === "ml" ? "ml" : "en");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  if (typeof data?.text !== "string") throw new Error("OpenAI: no transcript");
  return { text: data.text, provider: "openai", language: lang === "ml" ? "ml" : "en" };
}

const FNS: Record<Provider, typeof sarvam> = { sarvam, gemini, openai };

export async function transcribe(audio: Blob, lang: "en" | "ml"): Promise<Transcript> {
  const first = (process.env.ASR || "sarvam") as Provider | "off";
  if (first === "off") throw new Error("Voice input is turned off (ASR=off)");
  const order: Provider[] = [first, ...(["sarvam", "gemini", "openai"] as Provider[]).filter((p) => p !== first)];
  const errors: string[] = [];
  for (const p of order) {
    try {
      return await FNS[p](audio, lang);
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  throw new Error(errors.join(" | "));
}
