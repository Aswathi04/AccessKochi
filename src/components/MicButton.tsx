"use client";
// Voice input: record (max 25 s), send WAV to /api/transcribe (Sarvam -> Gemini -> OpenAI), return text.
import { useRef, useState } from "react";
import { WavRecorder } from "@/lib/wav";
import { useSettings } from "@/lib/settings";

export function MicButton({ onText, big = false }: { onText: (text: string) => void; big?: boolean }) {
  const { settings, t } = useSettings();
  const rec = useRef<WavRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<"idle" | "recording" | "sending">("idle");
  const [error, setError] = useState<string | null>(null);

  const stop = async () => {
    if (!rec.current) return;
    if (timer.current) clearTimeout(timer.current);
    setState("sending");
    try {
      const wav = await rec.current.stop();
      rec.current = null;
      const form = new FormData();
      form.append("audio", wav, "speech.wav");
      form.append("language", settings.language);
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.text) throw new Error(data.error || "no text");
      onText(data.text);
    } catch {
      setError(t("voice_error"));
    } finally {
      setState("idle");
    }
  };

  const start = async () => {
    setError(null);
    try {
      rec.current = new WavRecorder();
      await rec.current.start();
      setState("recording");
      timer.current = setTimeout(stop, 25_000); // providers accept ~30 s per request
    } catch {
      rec.current = null;
      setError(t("voice_error"));
    }
  };

  const status = state === "recording" ? t("listening") : state === "sending" ? t("transcribing") : error ?? "";
  if (big) {
    return (
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={state === "recording" ? stop : start}
          disabled={state === "sending"}
          aria-pressed={state === "recording"}
          aria-label={state === "recording" ? t("stop") : t("speak")}
          className={`ui-press flex h-28 w-28 items-center justify-center rounded-full text-5xl transition disabled:opacity-60 ${state === "recording" ? "animate-pulse bg-bad text-white ring-8 ring-bad/25" : "ui-orb ring-8 ring-soft-red"}`}
        >
          <span aria-hidden>{state === "recording" ? "■" : "🎤"}</span>
        </button>
        <span className="min-h-6 text-base font-bold text-muted" aria-live="polite">{status || t("tap_speak")}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={state === "recording" ? stop : start}
        disabled={state === "sending"}
        aria-pressed={state === "recording"}
        className={`ui-press min-h-12 rounded-full px-5 py-3 font-bold ${state === "recording" ? "animate-pulse bg-bad text-white" : "border-2 border-brand bg-card text-brand"}`}
      >
        {state === "recording" ? `■ ${t("stop")}` : `🎤 ${t("speak")}`}
      </button>
      <span className="text-sm text-muted" aria-live="polite">{status}</span>
    </div>
  );
}
