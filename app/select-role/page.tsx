"use client";

/**
 * /select-role — entry screen.
 * Authenticated users choose whether they want to play as DM or Player
 * for this session. Authentication is handled by Supabase; no PIN required.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, User, ChevronRight } from "lucide-react";
import { useRoleStore } from "../lib/store/roleStore";
import { cn } from "../components/ui";

// ---------------------------------------------------------------------------
// Role card
// ---------------------------------------------------------------------------

function RoleCard({
  title,
  description,
  icon: Icon,
  onClick,
  accent,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex w-full flex-col items-start gap-5 rounded-2xl border p-8 text-left transition-all duration-200",
        "hover:shadow-[0_16px_40px_rgba(0,0,0,0.12)] hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        accent
          ? "border-accent/30 bg-gradient-to-br from-surface to-accent/5"
          : "border-black/10 bg-surface"
      )}
    >
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl transition-colors",
          accent
            ? "bg-accent/15 text-accent group-hover:bg-accent group-hover:text-white"
            : "bg-surface-strong text-muted group-hover:bg-accent/10 group-hover:text-accent"
        )}
      >
        <Icon size={28} />
      </div>

      <div className="flex-1 space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted">{description}</p>
      </div>

      <div
        className={cn(
          "flex items-center gap-1 text-sm font-semibold transition-colors",
          accent ? "text-accent" : "text-muted group-hover:text-accent"
        )}
      >
        Continue <ChevronRight size={16} />
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SelectRolePage() {
  const { activeRole, hydrated, activateDm, activatePlayer } = useRoleStore();
  const router = useRouter();

  // If a role is already active this session, skip straight to the right view.
  useEffect(() => {
    if (!hydrated) return;
    if (activeRole === "dm") router.replace("/");
    if (activeRole === "player") router.replace("/player");
  }, [hydrated, activeRole, router]);

  // Don't render until hydrated (avoids flash).
  if (!hydrated) return null;
  if (activeRole) return null;

  const handleDmClick = () => {
    activateDm();
    router.push("/");
  };

  const handlePlayerClick = () => {
    activatePlayer();
    router.push("/player");
  };

  return (
    <div className="flex min-h-[calc(100dvh-65px)] flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl space-y-10">
        {/* Header */}
        <div className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-muted">
            D&amp;D 5e (2014) Assistant
          </p>
          <h1
            className="text-4xl font-semibold text-foreground sm:text-5xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Vault of Encounters
          </h1>
          <p className="text-base text-muted">Who&apos;s at the table?</p>
        </div>

        {/* Role cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <RoleCard
            title="Dungeon Master"
            description="Full access — encounters, bestiary, party management, notes, and campaign tools."
            icon={Shield}
            accent
            onClick={handleDmClick}
          />
          <RoleCard
            title="Player"
            description="Character sheet, party overview, and live encounter tracker."
            icon={User}
            onClick={handlePlayerClick}
          />
        </div>
      </div>
    </div>
  );
}
