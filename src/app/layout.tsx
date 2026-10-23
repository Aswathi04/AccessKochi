import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SettingsProvider } from "@/lib/settings";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "AccessKochi",
  description: "Accessible trip planning for Kochi: know before you go.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <SettingsProvider>
          <Header />
          <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-4">{children}</main>
        </SettingsProvider>
      </body>
    </html>
  );
}
