"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Swords, User } from "lucide-react";
import { cn } from "./ui";
import { useAppStore } from "../lib/store/appStore";

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

  const activeCampaign =
    state.activeCampaignId
      ? state.campaigns.find((c) => c.id === state.activeCampaignId) ?? null
      : null;

  return (
    <header className="sticky top-0 z-10 border-b border-black/5 bg-surface/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 sm:px-8">
        {/* Wordmark */}
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-[0.3em] text-muted">
            DM Toolkit
          </span>
          <span className="text-lg font-semibold text-foreground">
            Vault of Encounters
          </span>
          {activeCampaign && (
            <span className="text-xs text-accent truncate max-w-[14rem]">
              {activeCampaign.name}
            </span>
          )}
        </div>

        {/* Desktop nav */}
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
          <Link
            href="/player"
            className="ml-2 flex items-center gap-1.5 rounded-full border border-accent/30 px-3 py-1 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
          >
            <User size={13} />
            Player View
          </Link>
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-3 md:hidden">
          <Link
            href="/player"
            aria-label="Player view"
            className="flex items-center gap-1 rounded-full border border-accent/30 px-3 py-1.5 text-xs font-semibold text-accent"
          >
            <User size={13} />
            Player
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
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
              <Link
                href="/player"
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-accent",
                  "transition-colors hover:bg-accent/10"
                )}
              >
                <Swords size={15} />
                Player View
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
};
