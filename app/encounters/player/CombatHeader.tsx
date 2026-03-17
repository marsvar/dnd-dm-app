// app/encounters/player/CombatHeader.tsx
"use client";
import { useCallback, useEffect } from "react";
import { useAppStore } from "../../lib/store/appStore";
import type { Encounter, EncounterParticipant } from "../../lib/models/types";
import type { EncounterEvent } from "../../lib/engine/encounterEvents";

function describeLastEvent(
  event: EncounterEvent | undefined,
  participants: EncounterParticipant[]
): string {
  if (!event) return "";
  const name = (id: string) => participants.find((p) => p.id === id)?.name ?? "?";
  switch (event.t) {
    case "DAMAGE_APPLIED": return `HP –${event.amount} on ${name(event.participantId)}`;
    case "HEAL_APPLIED": return `HP +${event.amount} on ${name(event.participantId)}`;
    case "CONDITIONS_SET": return `Conditions · ${name(event.participantId)}`;
    case "NOTES_SET": return `Notes · ${name(event.participantId)}`;
    case "TEMP_HP_SET": return `Temp HP · ${name(event.participantId)}`;
    case "DEATH_SAVES_SET": return `Death saves · ${name(event.participantId)}`;
    case "TURN_ADVANCED": return event.direction === 1 ? "Turn advanced" : "Turn reversed";
    case "INITIATIVE_SET": return `Initiative · ${name(event.participantId)}`;
    default: return event.t.replace(/_/g, " ").toLowerCase();
  }
}

interface Props {
  encounter: Encounter;
  onEndEncounter: () => void;
}

export function CombatHeader({ encounter, onEndEncounter }: Props) {
  const { advanceEncounterTurn, undoEncounterEvent } = useAppStore();

  const lastEvent = encounter.eventLog[encounter.eventLog.length - 1];
  const lastEventText = describeLastEvent(lastEvent, encounter.participants);

  const handlePrev = useCallback(() => advanceEncounterTurn(encounter.id, -1), [encounter.id, advanceEncounterTurn]);
  const handleNext = useCallback(() => advanceEncounterTurn(encounter.id, 1), [encounter.id, advanceEncounterTurn]);
  const handleUndo = useCallback(() => undoEncounterEvent(encounter.id), [encounter.id, undoEncounterEvent]);

  // Keyboard shortcuts: →/] next turn, ←/[ prev turn, ⌘Z undo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el?.isContentEditable
      ) return;
      if (e.key === "ArrowRight" || e.key === "]") { e.preventDefault(); handleNext(); }
      else if (e.key === "ArrowLeft" || e.key === "[") { e.preventDefault(); handlePrev(); }
      else if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); handleUndo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleNext, handlePrev, handleUndo]);

  return (
    <header
      className="h-14 flex items-center justify-between px-4 shrink-0 border-b"
      style={{ backgroundColor: "var(--combat-surface)", borderBottomColor: "var(--combat-border)" }}
    >
      {/* Left: brand + name + LIVE badge */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold tracking-widest" style={{ color: "var(--combat-active-border)" }}>
          ⚔ DM
        </span>
        <span className="text-sm font-semibold truncate max-w-[180px]" style={{ color: "var(--combat-fg)" }}>
          {encounter.name}
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-widest shrink-0"
          style={{ backgroundColor: "var(--combat-live-bg)", color: "var(--combat-live-fg)" }}
        >
          <span className="size-1.5 rounded-full animate-pulse" style={{ backgroundColor: "var(--combat-live-dot)" }} />
          LIVE
        </span>
      </div>

      {/* Centre: Round display + Turn controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={handlePrev}
          className="text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors"
          style={{
            backgroundColor: "var(--combat-surface-raised)",
            borderColor: "var(--combat-border-raised)",
            color: "var(--combat-fg-muted)",
          }}
          aria-label="Previous turn"
        >
          ← Prev Turn
        </button>

        <div className="flex flex-col items-center min-w-[52px]">
          <span className="text-[0.55rem] font-bold uppercase tracking-widest" style={{ color: "var(--combat-fg-muted)" }}>
            Round
          </span>
          <span className="font-mono text-2xl font-extrabold leading-none" style={{ color: "var(--combat-round-number)" }}>
            {encounter.round}
          </span>
        </div>

        <button
          onClick={handleNext}
          className="text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors"
          style={{
            backgroundColor: "var(--combat-surface-raised)",
            borderColor: "var(--combat-border-raised)",
            color: "var(--combat-fg-muted)",
          }}
          aria-label="Next turn"
        >
          Next Turn →
        </button>
      </div>

      {/* Right: Undo + End Encounter */}
      <div className="flex items-center gap-2">
        {lastEvent && (
          <button
            onClick={handleUndo}
            aria-label="Undo last action"
            title="Undo last action"
            className="text-xs px-3 py-1.5 rounded-md border truncate max-w-[200px] transition-colors"
            style={{
              backgroundColor: "var(--combat-surface-raised)",
              borderColor: "var(--combat-border)",
              color: "var(--combat-fg-muted)",
            }}
          >
            ↩ {lastEventText}
          </button>
        )}
        <button
          onClick={onEndEncounter}
          className="text-xs font-semibold px-3 py-1.5 rounded-md shrink-0"
          style={{ backgroundColor: "var(--combat-live-bg)", color: "var(--combat-live-fg)" }}
        >
          End Encounter
        </button>
      </div>
    </header>
  );
}
