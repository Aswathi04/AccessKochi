"use client";
// Phone: top bar + bottom tabs. Desktop (md+): tabs move into the top bar.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHostSession, usesOf } from "@/lib/hostClient";
import { useSettings } from "@/lib/settings";

const TABS = [
  { href: "/plan", icon: "🗺️", key: "tab_plan" },
  { href: "/discover", icon: "🔎", key: "nav_browse" },
  { href: "/profile", icon: "👤", key: "nav_profile" },
] as const;

function useTabs() {
  const { settings, loaded, t } = useSettings();
  const path = usePathname();
  // Hidden during onboarding/sign-in (one focused flow) and on host/admin pages (their own app).
  const visitorArea = !/^\/(host|admin|signin|start|setup)(\/|$)/.test(path) && path !== "/";
  const show = loaded && settings.onboarded && visitorArea;
  const isOn = (href: string) => path.startsWith(href) || (href === "/discover" && path.startsWith("/venue"));
  return { show, isOn, t, visitorArea, path };
}

export function Header() {
  const { settings, save, t } = useSettings();
  const tabs = useTabs();
  const { session } = useHostSession();
  const uses = usesOf(session);
  // Account link: guests can sign in; hosts switch between the visitor app and their dashboard.
  const account = tabs.visitorArea
    ? !session ? { href: "/signin", key: "sign_in" as const } : uses === "host" || uses === "both" ? { href: "/host", key: "host_short" as const } : null
    : uses === "both" && tabs.path.startsWith("/host") ? { href: "/plan", key: "visitor_app" as const } : null;
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
        {account && (
          <Link href={account.href} className="min-h-11 content-center rounded-full border border-line px-4 text-sm font-semibold text-brand">{t(account.key)}</Link>
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
