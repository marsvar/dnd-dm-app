import type { Metadata } from "next";
import { headers } from "next/headers";
import { Alegreya_Sans, Marcellus, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AppStoreProvider } from "./lib/store/appStore";
import { RoleStoreProvider } from "./lib/store/roleStore";
import { Nav } from "./components/Nav";
import { DmLayoutGuard } from "./components/DmLayoutGuard";
import { CombatActivePill } from "./components/CombatActivePill";

const bodyFont = Alegreya_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const displayFont = Marcellus({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "DM Assistant",
  description: "Local-first D&D 5e DM assistant for encounter tracking and notes.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const suppressAnalytics = headerList.get("x-invite-suppress-analytics") === "true";
  const minimalShell = headerList.get("x-invite-minimal") === "true";

  return (
    <html lang="en">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable} antialiased text-foreground`}
      >
        <AppStoreProvider>
          <RoleStoreProvider>
            <div className="min-h-screen">
              {minimalShell ? (
                <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-16 sm:px-8">
                  {children}
                </main>
              ) : (
                <>
                  <Nav />
                  <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-16 sm:px-8">
                    <DmLayoutGuard>{children}</DmLayoutGuard>
                  </main>
                </>
              )}
            </div>
            {!minimalShell && <CombatActivePill />}
          </RoleStoreProvider>
        </AppStoreProvider>
        {!suppressAnalytics && <Analytics />}
        {!suppressAnalytics && <SpeedInsights />}
      </body>
    </html>
  );
}
