"use client";
// Phone: top bar + bottom tabs. Desktop (md+): tabs move into the top bar.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSettings } from "@/lib/settings";

const TABS = [
  { href: "/plan", icon: "🗺️", key: "tab_plan" },
  { href: "/discover", icon: "🔎", key: "nav_browse" },
  { href: "/profile", icon: "👤", key: "nav_profile" },
] as const;

function useTabs() {
  const { settings, loaded, t } = useSettings();
  const path = usePathname();
  const show = loaded && settings.onboarded; // hidden during onboarding: one focused flow
  const isOn = (href: string) => path.startsWith(href) || (href === "/discover" && path.startsWith("/venue"));
  return { show, isOn, t };
}

export function Header() {
  const { settings, save, t } = useSettings();
  const tabs = useTabs();
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-card/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
        <Link href="/" className="mr-auto text-lg font-bold text-brand">{t("app")}</Link>
        {tabs.show && (
          <nav aria-label="Main" className="hidden gap-1 md:flex">
            {TABS.map((tab) => (
              <Link key={tab.href} href={tab.href} aria-current={tabs.isOn(tab.href) ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${tabs.isOn(tab.href) ? "bg-brand text-brand-ink" : "text-ink hover:bg-line"}`}>
                {t(tab.key)}
              </Link>
            ))}
          </nav>
        )}
        <button
          type="button"
          onClick={() => save({ language: settings.language === "en" ? "ml" : "en" })}
          className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold"
          aria-label={t("lang_label")}
        >
          {settings.language === "en" ? "മലയാളം" : "English"}
        </button>
      </div>
    </header>
  );
}

export function BottomNav() {
  const tabs = useTabs();
  if (!tabs.show) return null;
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="grid grid-cols-3">
        {TABS.map((tab) => {
          const on = tabs.isOn(tab.href);
          return (
            <li key={tab.href}>
              <Link href={tab.href} aria-current={on ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${on ? "text-brand" : "text-muted"}`}>
                <span className={`rounded-full px-4 py-0.5 text-xl ${on ? "bg-emerald-100" : ""}`} aria-hidden>{tab.icon}</span>
                {tabs.t(tab.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
