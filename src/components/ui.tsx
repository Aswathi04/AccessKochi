"use client";
import type { ReactNode } from "react";
import { useSettings } from "@/lib/settings";
import type { Confidence, VenueVerdict, Verdict } from "@/lib/types";

const STYLE: Record<VenueVerdict, { cls: string; icon: string }> = {
  pass: { cls: "bg-emerald-100 text-emerald-900 border-emerald-300", icon: "✓" },
  partial: { cls: "bg-amber-100 text-amber-900 border-amber-300", icon: "◐" },
  unknown: { cls: "bg-slate-100 text-slate-800 border-slate-300", icon: "?" },
  risky: { cls: "bg-orange-100 text-orange-900 border-orange-300", icon: "!" },
  fail: { cls: "bg-red-100 text-red-900 border-red-300", icon: "✕" },
};

// left-edge colour for cards, so the verdict reads at a glance while scrolling
export const VERDICT_STRIPE: Record<VenueVerdict, string> = {
  pass: "border-l-emerald-500", partial: "border-l-amber-500", unknown: "border-l-slate-400", risky: "border-l-orange-500", fail: "border-l-red-500",
};

export function VerdictBadge({ verdict, size = "md" }: { verdict: VenueVerdict | Verdict; size?: "sm" | "md" | "lg" }) {
  const { t } = useSettings();
  const s = STYLE[verdict as VenueVerdict];
  const pad = size === "lg" ? "px-4 py-2 text-lg" : size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${s.cls} ${pad}`}>
      <span aria-hidden>{s.icon}</span>
      {t(`v_${verdict}` as const)}
    </span>
  );
}

export function ConfidenceTag({ c }: { c: Confidence }) {
  const { t } = useSettings();
  const label = c === "cant_tell" ? t("cant_tell") : c[0].toUpperCase() + c.slice(1);
  const cls = c === "high" ? "bg-emerald-50 text-emerald-800" : c === "medium" ? "bg-sky-50 text-sky-800" : "bg-slate-100 text-slate-700";
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>{t("confidence")}: {label}</span>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-card p-4 shadow-sm ${className}`}>{children}</section>;
}

export function DummyBadge() {
  const { t } = useSettings();
  return <span className="rounded bg-violet-100 px-1.5 py-0.5 text-xs font-medium text-violet-800">{t("dummy")}</span>;
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`min-h-12 rounded-xl bg-brand px-5 py-3 text-base font-semibold text-brand-ink disabled:opacity-50 ${props.className ?? ""}`}
    />
  );
}
