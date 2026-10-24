"use client";
import type { ReactNode } from "react";
import { useSettings } from "@/lib/settings";
import type { Confidence, VenueVerdict, Verdict } from "@/lib/types";

type Glyph = "check" | "half" | "question" | "bang" | "x";

/** Small drawn status icon (drawn, so it renders the same in every font). Decorative: the label carries the meaning. */
export function StatusIcon({ name, size = 14 }: { name: Glyph; size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden focusable="false" className="shrink-0">
      {name === "check" && <path d="M4 10.5l4 4 8-9" {...p} />}
      {name === "x" && <path d="M5 5l10 10M15 5L5 15" {...p} />}
      {name === "half" && <><circle cx="10" cy="10" r="7" {...p} strokeWidth={2} /><path d="M10 3a7 7 0 0 1 0 14z" fill="currentColor" /></>}
      {name === "question" && <><path d="M7.5 7.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7v.5" {...p} /><circle cx="10" cy="15.5" r="1.2" fill="currentColor" /></>}
      {name === "bang" && <><path d="M10 4v7" {...p} /><circle cx="10" cy="15" r="1.3" fill="currentColor" /></>}
    </svg>
  );
}

const STYLE: Record<VenueVerdict, { cls: string; icon: Glyph }> = {
  // light tint + dark status text (all ≥ 4.5:1); the icon and the words carry the meaning, not the colour
  pass: { cls: "border-good bg-good-soft text-good", icon: "check" },
  partial: { cls: "border-warn bg-warn-soft text-warn", icon: "half" },
  unknown: { cls: "border-control bg-card text-ink", icon: "question" },
  risky: { cls: "border-flag bg-flag-soft text-flag", icon: "bang" },
  fail: { cls: "border-bad bg-bad-soft text-bad", icon: "x" },
};

// left-edge colour for cards, so the verdict reads at a glance while scrolling (the badge still carries the words)
export const VERDICT_STRIPE: Record<VenueVerdict, string> = {
  pass: "border-l-good", partial: "border-l-warn", unknown: "border-l-control", risky: "border-l-flag", fail: "border-l-bad",
};

export function VerdictBadge({ verdict, size = "md" }: { verdict: VenueVerdict | Verdict; size?: "sm" | "md" | "lg" }) {
  const { t } = useSettings();
  const s = STYLE[verdict as VenueVerdict];
  const pad = size === "lg" ? "px-4 py-2 text-lg" : size === "sm" ? "px-2.5 py-0.5 text-sm" : "px-3 py-1 text-[0.9375rem]";
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-2xl [overflow-wrap:anywhere] border-[1.5px] text-left font-bold leading-tight ${s.cls} ${pad}`}>
      <StatusIcon name={s.icon} size={size === "lg" ? 18 : 14} />
      {t(`v_${verdict}` as const)}
    </span>
  );
}

export function ConfidenceTag({ c }: { c: Confidence }) {
  const { t } = useSettings();
  const label = c === "cant_tell" ? t("cant_tell") : c[0].toUpperCase() + c.slice(1);
  const cls = c === "high" ? "bg-good-soft text-good" : c === "medium" ? "bg-soft-blue text-brand" : "bg-deep text-muted";
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[0.8125rem] font-bold ${cls}`}>{t("confidence")}: {label}</span>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`ui-card rounded-3xl bg-card p-4 sm:p-5 ${className}`}>{children}</section>;
}

export function DummyBadge() {
  const { t } = useSettings();
  return <span className="rounded-full bg-soft-red px-2 py-0.5 text-[0.8125rem] font-bold text-red-deep">{t("dummy")}</span>;
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`ui-press min-h-12 rounded-full bg-brand px-6 py-3 text-base font-bold text-brand-ink hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60 ${props.className ?? ""}`}
    />
  );
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`ui-press min-h-12 rounded-full border-2 border-brand bg-transparent px-6 py-3 text-base font-bold text-brand hover:bg-soft-blue disabled:cursor-not-allowed disabled:opacity-60 ${props.className ?? ""}`}
    />
  );
}
