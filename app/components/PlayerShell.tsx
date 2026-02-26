"use client";

/**
 * PlayerShell — mobile-first wrapper for the /player/* area.
 * Provides a bottom-tab navigation (Character · Encounter · Party) and
 * redirects to /player if no session is active.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { User, Swords, Users } from "lucide-react";
import { cn } from "./ui";
import { usePlayerSession } from "../lib/store/usePlayerSession";

const tabs = [
  { href: "/player/character", label: "Character", Icon: User },
  { href: "/player/encounter", label: "Encounter", Icon: Swords },
  { href: "/player/party", label: "Party", Icon: Users },
];

export function PlayerShell({ children }: { children: ReactNode }) {
  const { selectedPcId, hydrated } = usePlayerSession();
  const router = useRouter();
  const pathname = usePathname();

  // Only redirect after localStorage has been read — avoids the flash where
  // selectedPcId is null on first render before hydration completes.
  useEffect(() => {
    if (hydrated && !selectedPcId) {
      router.replace("/player");
    }
  }, [hydrated, selectedPcId, router]);

  // While hydrating, render nothing (avoids layout flash and false redirect)
  if (!hydrated) return null;
  if (!selectedPcId) return null;

  return (
    <div className="flex min-h-[calc(100dvh-65px)] flex-col">
      {/* Scrollable content area — padded so it clears the tab bar */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-6">
        {children}
      </main>

      {/* Fixed bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-black/10 bg-surface/95 backdrop-blur">
        <ul className="mx-auto flex max-w-2xl">
          {tabs.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors",
                    active ? "text-accent" : "text-muted hover:text-foreground"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
