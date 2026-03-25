// app/components/TurnOrderPreview.tsx
"use client";
import { cn } from "./ui";
import type { EncounterParticipant } from "../lib/models/types";

interface Props {
  participants: EncounterParticipant[];
}

function sortByInitiative(participants: EncounterParticipant[]): EncounterParticipant[] {
  return [...participants].sort((a, b) => {
    if (a.initiative === null && b.initiative === null) return a.name.localeCompare(b.name);
    if (a.initiative === null) return 1;
    if (b.initiative === null) return -1;
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    return a.name.localeCompare(b.name);
  });
}

export function TurnOrderPreview({ participants }: Props) {
  if (participants.length === 0) return null;
  const sorted = sortByInitiative(participants);

  return (
    <div className="flex items-center gap-2 flex-wrap rounded-xl border border-black/10 bg-surface px-4 py-2.5">
      <span className="text-[0.6rem] font-bold uppercase tracking-widest text-muted shrink-0 mr-1">
        Turn order
      </span>
      {sorted.map((p, i) => (
        <span key={p.id} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-muted text-xs">›</span>}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
              p.initiative !== null
                ? "border-black/10 bg-surface-strong text-foreground"
                : "border-dashed border-black/10 text-muted opacity-50"
            )}
          >
            <span className="font-mono font-bold text-xs">
              {p.initiative !== null ? p.initiative : "?"}
            </span>
            <span className="truncate max-w-[80px]">{p.name}</span>
          </span>
        </span>
      ))}
    </div>
  );
}
