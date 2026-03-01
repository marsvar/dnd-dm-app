"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Swords, LogOut, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "./ui";
import { useAppStore } from "../lib/store/appStore";
import { useRoleStore } from "../lib/store/roleStore";

const dmLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/encounters", label: "Encounters" },
  { href: "/encounters/builder", label: "Builder" },
  { href: "/encounters/player", label: "Run Combat" },
  { href: "/bestiary", label: "Bestiary" },
  { href: "/pcs", label: "Party" },
  { href: "/notes", label: "Notes" },
  { href: "/log", label: "Log" },
];

export const Nav = () => {
  const [open, setOpen] = useState(false);
  const { state } = useAppStore();
  const { activeRole, clearRole } = useRoleStore();
  const router = useRouter();

  const activeCampaign =
    state.activeCampaignId
      ? state.campaigns.find((c) => c.id === state.activeCampaignId) ?? null
      : null;

  const handleSwitchRole = () => {
    clearRole();
    router.push("/select-role");
  };

  return (
    <header className="sticky top-0 z-10 border-b border-black/5 bg-surface/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 sm:px-8">
        {/* Wordmark */}
        <Link href={activeRole === "dm" ? "/" : activeRole === "player" ? "/player" : "/select-role"} className="flex flex-col">
          <span className="text-xs uppercase tracking-[0.3em] text-muted">
            {activeRole === "dm" ? "DM Toolkit" : activeRole === "player" ? "Player View" : "D&D 5e Assistant"}
          </span>
          <span className="text-xl font-semibold text-foreground" style={{ fontFamily: "var(--font-display), serif", letterSpacing: "0.01em" }}>
            Vault of Encounters
          </span>
          {activeCampaign && activeRole === "dm" && (
            <span className="text-xs text-accent truncate max-w-[14rem]">
              {activeCampaign.name}
            </span>
          )}
        </Link>

        {/* Desktop nav — DM only */}
        {activeRole === "dm" && (
          <nav className="hidden items-center gap-5 text-sm font-medium text-muted md:flex">
            {dmLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={handleSwitchRole}
              className="ml-2 flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
              title="Switch role"
            >
              <LogOut size={13} />
              Exit DM
            </button>
          </nav>
        )}

        {/* Desktop nav — Player or no role */}
        {activeRole !== "dm" && (
          <nav className="hidden items-center gap-3 md:flex">
            {activeRole === "player" && (
              <span className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                Player Mode
              </span>
            )}
            <button
              type="button"
              onClick={handleSwitchRole}
              className="flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <Shield size={13} />
              {activeRole === "player" ? "Switch Role" : "Choose Role"}
            </button>
          </nav>
        )}

        {/* Mobile controls */}
        <div className="flex items-center gap-3 md:hidden">
          <button
            type="button"
            onClick={handleSwitchRole}
            className="flex items-center gap-1 rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-muted"
          >
            <LogOut size={12} />
            {activeRole === "dm" ? "Exit DM" : "Roles"}
          </button>
          {activeRole === "dm" && (
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown — DM only */}
      {open && activeRole === "dm" && (
        <nav className="border-t border-black/5 bg-surface px-6 pb-4 pt-3 md:hidden">
          <ul className="flex flex-col gap-1">
            {dmLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-strong hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 border-t border-black/5 pt-2">
              <button
                type="button"
                onClick={() => { setOpen(false); handleSwitchRole(); }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted",
                  "transition-colors hover:bg-surface-strong hover:text-foreground"
                )}
              >
                <Swords size={15} />
                Exit DM Mode
              </button>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
};
