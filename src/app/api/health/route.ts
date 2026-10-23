// GET /api/health -> which services are configured, and whether Neysa answers.
// Open http://localhost:3000/api/health after filling .env.local.
import { NextResponse } from "next/server";

export async function GET() {
  const neysa = { configured: !!(process.env.NEYSA_API_KEY && process.env.NEYSA_BASE_URL), model: process.env.NEYSA_MODEL || "gemma-4-26-b-a4-b-it", reachable: false as boolean, models: [] as string[], error: null as string | null };
  if (neysa.configured) {
    try {
      const res = await fetch(`${process.env.NEYSA_BASE_URL!.replace(/\/+$/, "")}/v1/models`, {
        headers: { Authorization: `Bearer ${process.env.NEYSA_API_KEY}` },
        signal: AbortSignal.timeout(10_000),
      });
      neysa.reachable = res.ok;
      if (res.ok) neysa.models = ((await res.json())?.data ?? []).map((m: { id: string }) => m.id);
      else neysa.error = `HTTP ${res.status}`;
    } catch (e) {
      neysa.error = (e as Error).message;
    }
  }
  return NextResponse.json({
    data_mode: process.env.DATA_MODE || "dummy",
    llm_order: process.env.LLM || "neysa",
    neysa,
    neysa_model_matches: neysa.models.length ? neysa.models.includes(neysa.model) : null,
    openai: { configured: !!process.env.OPENAI_API_KEY },
    asr: {
      order: process.env.ASR || "sarvam",
      sarvam: !!process.env.SARVAM_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
    },
    serpapi: { configured: !!process.env.SERPAPI_API_KEY },
  });
}
