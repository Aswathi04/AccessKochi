"use client";
import type { ReactNode } from "react";
import { useSettings } from "@/lib/settings";
import type { Confidence, VenueVerdict, Verdict } from "@/lib/types";

const STYLE: Record<VenueVerdict, { cls: string; icon: string }> = {
  // soft tinted fills with light text on the dark surfaces (AA contrast); the icon carries the meaning too
  pass: { cls: "border-good/50 bg-good-soft text-good", icon: "✓" },
  partial: { cls: "border-warn/50 bg-warn-soft text-warn", icon: "◐" },
  unknown: { cls: "border-line bg-white/5 text-mist", icon: "?" },
  risky: { cls: "border-flag/50 bg-flag-soft text-flag", icon: "!" },
  fail: { cls: "border-bad/50 bg-bad-soft text-bad", icon: "✕" },
};

// left-edge colour for cards, so the verdict reads at a glance while scrolling
export const VERDICT_STRIPE: Record<VenueVerdict, string> = {
  pass: "border-l-good", partial: "border-l-warn", unknown: "border-l-muted", risky: "border-l-flag", fail: "border-l-bad",
};

export function VerdictBadge({ verdict, size = "md" }: { verdict: VenueVerdict | Verdict; size?: "sm" | "md" | "lg" }) {
  const { t } = useSettings();
  const s = STYLE[verdict as VenueVerdict];
  const pad = size === "lg" ? "px-4 py-2 text-lg" : size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border font-medium ${s.cls} ${pad}`}>
      <span aria-hidden>{s.icon}</span>
      {t(`v_${verdict}` as const)}
    </span>
  );
}

export function ConfidenceTag({ c }: { c: Confidence }) {
  const { t } = useSettings();
  const label = c === "cant_tell" ? t("cant_tell") : c[0].toUpperCase() + c.slice(1);
  const cls = c === "high" ? "text-good" : c === "medium" ? "text-brand" : "text-muted";
  return <span className={`inline-block whitespace-nowrap rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.06em] ${cls}`}>{t("confidence")}: {label}</span>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`ui-card rounded-2xl bg-card p-5 ${className}`}>{children}</section>;
}

export function DummyBadge() {
  const { t } = useSettings();
  return <span className="rounded-md bg-lavender/10 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-lavender">{t("dummy")}</span>;
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`ui-press min-h-12 rounded-full bg-brand px-6 py-3 text-base font-medium text-brand-ink  disabled:opacity-50 ${props.className ?? ""}`}
    />
  );
}
