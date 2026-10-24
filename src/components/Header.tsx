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
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
        <Link href="/" className="mr-auto flex min-h-11 min-w-0 items-center gap-2.5 text-sm font-medium uppercase tracking-[0.14em] text-ink">
          <span aria-hidden className="ui-orb h-6 w-6 shrink-0 rounded-full" />
          {t("app")}
        </Link>
        {tabs.show && (
          <nav aria-label="Main" className="hidden gap-1 md:flex">
            {TABS.map((tab) => (
              <Link key={tab.href} href={tab.href} aria-current={tabs.isOn(tab.href) ? "page" : undefined}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] ${tabs.isOn(tab.href) ? "border-brand/50 bg-brand/15 text-ink" : "border-transparent text-ink hover:border-line"}`}>
                {t(tab.key)}
              </Link>
            ))}
          </nav>
        )}
        {account && (
          <Link href={account.href} className="ui-press min-h-10 shrink-0 content-center whitespace-nowrap rounded-md ui-aurora px-3 text-xs font-medium uppercase tracking-[0.1em] sm:px-4">{t(account.key)}</Link>
        )}
        <button
          type="button"
          onClick={() => save({ language: settings.language === "en" ? "ml" : "en" })}
          className="ui-chip ui-press min-h-10 shrink-0 whitespace-nowrap rounded-md bg-card px-3 text-sm font-medium text-ink sm:px-4"
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
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-deep pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="grid grid-cols-3">
        {TABS.map((tab) => {
          const on = tabs.isOn(tab.href);
          return (
            <li key={tab.href}>
              <Link href={tab.href} aria-current={on ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium uppercase tracking-[0.1em] ${on ? "text-ink" : "text-muted"}`}>
                <span className={`rounded-md border px-4 py-0.5 text-xl ${on ? "border-brand/50 bg-brand/15" : "border-transparent"}`} aria-hidden>{tab.icon}</span>
                {tabs.t(tab.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
