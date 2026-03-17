"use client";

import { useEffect, useMemo, useState } from "react";
import { EncounterCompleteDialog } from "../../components/EncounterCompleteDialog";
import { Button, Card, Dialog, DialogClose, DialogContent, DialogTitle, PageShell, Pill, SectionTitle, Select } from "../../components/ui";
import { useAppStore } from "../../lib/store/appStore";
import { PrepPhase } from "./PrepPhase";
import { CombatHeader } from "./CombatHeader";
import { CombatParticipantList } from "./CombatParticipantList";
import { CombatInspector } from "./CombatInspector";

const isDefeated = (currentHp: number | null) =>
  currentHp !== null && currentHp <= 0;

export default function EncounterPlayerPage() {
  const {
    state,
    dispatchEncounterEvent,
  } = useAppStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEndEncounterOpen, setIsEndEncounterOpen] = useState(false);
  const [completedEncounterSnapshot, setCompletedEncounterSnapshot] = useState<typeof selectedEncounter | null>(null);
  const [pinnedInspectorId, setPinnedInspectorId] = useState<string | null>(null);

  const selectedEncounter = useMemo(() => {
    if (selectedId) {
      return state.encounters.find((encounter) => encounter.id === selectedId) || null;
    }
    return state.encounters[0] || null;
  }, [selectedId, state.encounters]);

  const monstersById = useMemo(() => {
    return new Map(state.monsters.map((monster) => [monster.id, monster]));
  }, [state.monsters]);

  const defeatedParticipants = useMemo(() => {
    if (!selectedEncounter) {
      return [];
    }
    return selectedEncounter.participants
      .filter((participant) => isDefeated(participant.currentHp))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedEncounter]);

  // Lock page scroll in combat mode — prevents the document from scrolling behind the fixed overlay.
  // Uses "clip" (not "hidden") to avoid scrollbar-width layout shifts.
  useEffect(() => {
    if (selectedEncounter?.combatMode !== "live") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "clip";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selectedEncounter?.combatMode]);

  // Clear the pinned reference panel target whenever the active participant changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPinnedInspectorId(null);
  }, [selectedEncounter?.activeParticipantId]);

  return (
    <>
      {/* Dialogs rendered outside PageShell so they stack correctly in combat mode */}
      {completedEncounterSnapshot && (
        <EncounterCompleteDialog
          encounter={completedEncounterSnapshot}
          monstersById={monstersById}
          open={!!completedEncounterSnapshot}
          onClose={() => setCompletedEncounterSnapshot(null)}
        />
      )}

      {/* End Encounter Dialog */}
      <Dialog open={isEndEncounterOpen} onOpenChange={setIsEndEncounterOpen}>
        <DialogContent maxWidth="md">
          <DialogTitle>End Encounter</DialogTitle>
          {selectedEncounter && (
            <div className="mt-4 space-y-4">
              <div className="space-y-1 text-sm text-muted">
                <p>
                  <span className="font-semibold text-foreground">Rounds:</span>{" "}
                  {selectedEncounter.round}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Defeated:</span>{" "}
                  {defeatedParticipants.length === 0
                    ? "None"
                    : defeatedParticipants.map((p) => p.name).join(", ")}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  onClick={() => {
                    setCompletedEncounterSnapshot(selectedEncounter);
                    dispatchEncounterEvent(selectedEncounter.id, { t: "ENCOUNTER_COMPLETED" });
                    setIsEndEncounterOpen(false);
                  }}
                >
                  Complete Encounter
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedEncounter && selectedEncounter.combatMode === "live" ? (
        <div
          className="flex flex-col overflow-hidden"
          style={{
            backgroundColor: "var(--combat-bg)",
            height: "calc(100vh - var(--nav-height))",
          }}
        >
          <CombatHeader
            encounter={selectedEncounter}
            onEndEncounter={() => setIsEndEncounterOpen(true)}
          />
          <div className="grid flex-1 min-h-0" style={{ gridTemplateColumns: "1fr 320px" }}>
            <CombatParticipantList
              encounter={selectedEncounter}
              pinnedInspectorId={pinnedInspectorId}
              onPin={setPinnedInspectorId}
            />
            <div style={{ borderLeft: "1px solid var(--combat-border)" }}>
              <CombatInspector
                encounter={selectedEncounter}
                pinnedId={pinnedInspectorId}
                onUnpin={() => setPinnedInspectorId(null)}
              />
            </div>
          </div>
        </div>
      ) : (
        <PageShell>
          <SectionTitle
            title="Encounter Player"
            subtitle="Run encounters with live HP and turn controls."
          />

          <div className="grid gap-6">
            <Card className="space-y-4">
              {selectedEncounter ? (
                <>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">{selectedEncounter.name}</h3>
                        <Pill
                          label={selectedEncounter.status === "completed" ? "Completed" : selectedEncounter.isRunning ? "Live" : "Prep"}
                          tone={selectedEncounter.status === "completed" ? "neutral" : selectedEncounter.isRunning ? "accent" : "neutral"}
                        />
                      </div>
                      <p className="text-sm text-muted">
                        {selectedEncounter.location || "Unknown location"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted">
                          Encounter
                        </span>
                        <Select
                          className="w-56"
                          value={selectedEncounter.id}
                          onChange={(event) => setSelectedId(event.target.value)}
                        >
                          {state.encounters.map((encounter) => (
                            <option key={encounter.id} value={encounter.id}>
                              {encounter.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  </div>

                  <PrepPhase encounter={selectedEncounter} />
                </>
              ) : (
                <div className="rounded-xl border border-black/10 bg-surface-strong px-5 py-8 text-center">
                  <p className="text-sm font-medium text-foreground">No encounters yet</p>
                  <p className="mt-1 text-sm text-muted">
                    Build an encounter first, then come back here to run it.
                  </p>
                  <a
                    href="/encounters/builder"
                    className="mt-4 inline-block rounded-xl border border-black/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:border-accent"
                  >
                    Go to Encounter Builder →
                  </a>
                </div>
              )}
            </Card>
          </div>
        </PageShell>
      )}
    </>
  );
}
