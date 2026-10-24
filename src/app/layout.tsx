import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Baloo_Chettan_2, Fredoka, Noto_Sans_Malayalam } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/lib/settings";
import { BottomNav, Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "AccessKochi",
  description: "Accessible trip planning for Kochi: know before you go.",
  appleWebApp: { capable: true, title: "AccessKochi", statusBarStyle: "default" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f4f0e7" };

// Fredoka: rounded display type for headings. Atkinson Hyperlegible: body and UI text, built for legibility.
// Neither has Malayalam letters, so Malayalam falls back to Baloo Chettan 2 (rounded, for headings)
// and Noto Sans Malayalam (body). Fonts are self-hosted by next/font, so nothing blocks rendering.
const display = Fredoka({ weight: ["500", "600", "700"], subsets: ["latin"], variable: "--font-display-latin", display: "swap" });
const body = Atkinson_Hyperlegible({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-body", display: "swap" });
const mlDisplay = Baloo_Chettan_2({ weight: ["500", "600", "700"], subsets: ["malayalam"], variable: "--font-ml-display", display: "swap" });
const ml = Noto_Sans_Malayalam({ subsets: ["malayalam"], variable: "--font-ml", display: "swap" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mlDisplay.variable} ${ml.variable}`}>
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
