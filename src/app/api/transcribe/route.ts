// POST /api/transcribe (multipart): audio (16 kHz mono WAV, max ~30 s), language (en|ml)
import { NextRequest, NextResponse } from "next/server";
import { transcribe } from "@/lib/asr";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const audio = form.get("audio");
  const lang = form.get("language") === "ml" ? "ml" : "en";
  if (!(audio instanceof Blob) || audio.size < 1000) return NextResponse.json({ error: "audio required" }, { status: 400 });
  if (audio.size > 5 * 1024 * 1024) return NextResponse.json({ error: "audio too long (keep it under 30 seconds)" }, { status: 400 });
  try {
    const t = await transcribe(audio, lang);
    return NextResponse.json(t);
  } catch (e) {
    console.warn("[asr]", (e as Error).message);
    return NextResponse.json({ error: "Couldn't transcribe. Please type your request instead.", detail: (e as Error).message }, { status: 502 });
  }
}
