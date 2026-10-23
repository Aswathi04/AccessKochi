import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SettingsProvider } from "@/lib/settings";
import { BottomNav, Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "AccessKochi",
  description: "Accessible trip planning for Kochi: know before you go.",
  appleWebApp: { capable: true, title: "AccessKochi", statusBarStyle: "default" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0f6e5f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <SettingsProvider>
          <Header />
          <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pt-8 md:pb-12">{children}</main>
          <BottomNav />
        </SettingsProvider>
      </body>
    </html>
  );
}
