"use client";

import Link from "next/link";
import { useAppStore } from "../lib/store/appStore";

export const CombatActivePill = () => {
  const { state } = useAppStore();

  const runningEncounter = state.encounters.find((e) => e.isRunning) ?? null;
  if (!runningEncounter) return null;

  const activeParticipant = runningEncounter.participants.find(
    (p) => p.id === runningEncounter.activeParticipantId
  );

  return (
    <Link
      href="/encounters/builder"
      className="fixed bottom-20 right-6 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg transition-opacity hover:opacity-90 sm:bottom-6"
      style={{
        backgroundColor: "var(--combat-active-bg)",
        color: "var(--combat-active-fg)",
      }}
      aria-label="Return to active combat"
    >
      <span
        className="h-2 w-2 animate-pulse rounded-full"
        style={{ backgroundColor: "var(--combat-active-fg)", opacity: 0.8 }}
        aria-hidden
      />
      <span>
        ⚔ Round {runningEncounter.round}
        {activeParticipant ? ` · ${activeParticipant.name}` : ""}
      </span>
    </Link>
  );
};
