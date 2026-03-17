// app/encounters/player/PrepPhase.tsx
"use client";
import { useState, useCallback, useEffect } from "react";
import {
  Button, Input, PageShell, Card, cn,
} from "../../components/ui";
import { ParticipantAvatar } from "../../components/ParticipantAvatar";
import { TurnOrderPreview } from "../../components/TurnOrderPreview";
import { useAppStore } from "../../lib/store/appStore";
import { getInitiativeMod } from "../../lib/engine/participantHelpers";
import type { Encounter } from "../../lib/models/types";

interface Props {
  encounter: Encounter;
}

export function PrepPhase({ encounter }: Props) {
  const { dispatchEncounterEvent, startEncounter, state } = useAppStore();
  const pcs = state.pcs;
  const monsters = state.monsters;

  // Local draft values for initiative inputs (before committing on blur/enter)
  const [initDrafts, setInitDrafts] = useState<Record<string, string>>({});

  // Sort: initiative desc, name asc; nulls at bottom
  const sorted = [...encounter.participants].sort((a, b) => {
    if (a.initiative === null && b.initiative === null) return a.name.localeCompare(b.name);
    if (a.initiative === null) return 1;
    if (b.initiative === null) return -1;
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    return a.name.localeCompare(b.name);
  });

  const rollOne = useCallback(
    (participantId: string) => {
      const p = encounter.participants.find((x) => x.id === participantId);
      if (!p) return;
      const mod = getInitiativeMod(p, pcs, monsters);
      const d20 = Math.ceil(Math.random() * 20);
      dispatchEncounterEvent(encounter.id, { t: "INITIATIVE_SET", participantId, value: d20 + mod });
    },
    [encounter, pcs, monsters, dispatchEncounterEvent]
  );

  const rollAll = useCallback(() => {
    for (const p of encounter.participants) {
      if (p.initiative === null) {
        const mod = getInitiativeMod(p, pcs, monsters);
        const d20 = Math.ceil(Math.random() * 20);
        dispatchEncounterEvent(encounter.id, { t: "INITIATIVE_SET", participantId: p.id, value: d20 + mod });
      }
    }
  }, [encounter, pcs, monsters, dispatchEncounterEvent]);

  const commitInitiative = useCallback(
    (participantId: string) => {
      const draft = initDrafts[participantId];
      if (draft === undefined) return;
      const parsed = parseInt(draft, 10);
      if (!isNaN(parsed)) {
        dispatchEncounterEvent(encounter.id, { t: "INITIATIVE_SET", participantId, value: parsed });
      }
      setInitDrafts((prev) => {
        const next = { ...prev };
        delete next[participantId];
        return next;
      });
    },
    [initDrafts, encounter.id, dispatchEncounterEvent]
  );

  const handleLaunch = useCallback(() => {
    dispatchEncounterEvent(encounter.id, { t: "COMBAT_MODE_SET", mode: "live" });
    startEncounter(encounter.id);
  }, [encounter.id, dispatchEncounterEvent, startEncounter]);

  // ⌘↵ keyboard shortcut to launch combat
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleLaunch();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleLaunch]);

  return (
    <PageShell>
      {/* PREP status badge */}
      <div className="flex items-center gap-2 rounded-lg border border-black/10 bg-surface px-3 py-1.5 self-start">
        <span className="size-2 rounded-full bg-muted/30" />
        <span className="text-xs font-bold uppercase tracking-widest text-muted">
          PREP — Roll Initiative
        </span>
      </div>

      {/* Initiative table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-widest text-muted">
            Initiative Order
          </span>
          <Button variant="outline" onClick={rollAll}>
            Roll All
          </Button>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[28px_1fr_100px_52px_80px] gap-3 items-center px-2 pb-2 border-b border-black/10">
          <div />
          <span className="text-[0.62rem] font-bold uppercase tracking-widest text-muted">Participant</span>
          <span className="text-[0.62rem] font-bold uppercase tracking-widest text-muted text-center">Initiative</span>
          <span className="text-[0.62rem] font-bold uppercase tracking-widest text-muted text-center">AC</span>
          <span className="text-[0.62rem] font-bold uppercase tracking-widest text-muted text-center">HP</span>
        </div>

        {/* Participant rows */}
        <div className="divide-y divide-black/5">
          {sorted.map((p) => {
            const hasInit = p.initiative !== null;
            const draft = initDrafts[p.id];
            const displayVal = draft !== undefined
              ? draft
              : p.initiative !== null ? String(p.initiative) : "";

            return (
              <div
                key={p.id}
                className={cn(
                  "grid grid-cols-[28px_1fr_100px_52px_80px] gap-3 items-center py-2.5 px-2 transition-opacity",
                  hasInit ? "opacity-100" : "opacity-65"
                )}
              >
                <ParticipantAvatar name={p.name} visual={p.visual} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{p.name}</div>
                  <div className="text-[0.6rem] font-bold uppercase tracking-wide text-muted">{p.kind}</div>
                </div>

                {/* Initiative: inline input + optional d20 button */}
                <div className="flex items-center justify-center gap-1.5">
                  <Input
                    type="number"
                    value={displayVal}
                    placeholder="—"
                    className="w-12 text-center font-mono font-bold text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    onChange={(e) =>
                      setInitDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))
                    }
                    onBlur={() => commitInitiative(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitInitiative(p.id);
                    }}
                  />
                  {!hasInit && (
                    <Button
                      variant="ghost"
                      onClick={() => rollOne(p.id)}
                      aria-label={`Roll initiative for ${p.name}`}
                    >
                      d20
                    </Button>
                  )}
                </div>

                <div className="text-center font-mono font-bold text-sm">{p.ac ?? "—"}</div>
                <div className="text-center font-mono text-sm">
                  {p.currentHp !== null && p.maxHp !== null
                    ? `${p.currentHp}/${p.maxHp}` : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Live turn order preview — pass pre-sorted array to avoid duplicating sort logic */}
      <TurnOrderPreview participants={sorted} />

      {/* Footer must come BEFORE the spacer so the spacer provides clearance */}
      <PrepLaunchFooter encounter={encounter} onLaunch={handleLaunch} />

      {/* Spacer for fixed footer */}
      <div className="h-20" />
    </PageShell>
  );
}

export function PrepLaunchFooter({
  encounter,
  onLaunch,
}: {
  encounter: Encounter;
  onLaunch: () => void;
}) {
  const rolledCount = encounter.participants.filter((p) => p.initiative !== null).length;
  const totalCount = encounter.participants.length;
  const pending = totalCount - rolledCount;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 flex items-center justify-between gap-4 border-t border-black/10 bg-background/90 px-6 py-3 backdrop-blur-sm">
      <span className="text-sm text-muted">
        <strong className="text-foreground">{rolledCount} of {totalCount}</strong>{" "}
        initiatives rolled{pending > 0 && ` · ${pending} pending`}
      </span>
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onLaunch}>
          Skip unrolled →
        </Button>
        <Button variant="primary" onClick={onLaunch} aria-label="Launch Combat (⌘Enter)">
          ⚔ Launch Combat
          <span className="ml-2 font-mono text-[0.65rem] opacity-50">⌘↵</span>
        </Button>
      </div>
    </div>
  );
}
