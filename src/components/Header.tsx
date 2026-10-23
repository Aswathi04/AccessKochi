"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSettings } from "@/lib/settings";

export function Header() {
  const { settings, save, t } = useSettings();
  const path = usePathname();
  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm font-medium ${path.startsWith(href) ? "bg-brand text-brand-ink" : "text-ink hover:bg-line"}`}
    >
      {label}
    </Link>
  );
  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-4 py-3">
        <Link href="/" className="mr-auto text-lg font-bold text-brand">
          {t("app")}
        </Link>
        <nav className="flex flex-wrap gap-1" aria-label="Main">
          {link("/plan", t("nav_plan"))}
          {link("/discover", t("nav_browse"))}
          {link("/profile", t("nav_profile"))}
        </nav>
        <button
          type="button"
          onClick={() => save({ language: settings.language === "en" ? "ml" : "en" })}
          className="rounded-lg border border-line px-3 py-2 text-sm font-medium"
          aria-label={t("lang_label")}
        >
          {settings.language === "en" ? "മലയാളം" : "English"}
        </button>
      </div>
    </header>
  );
}
