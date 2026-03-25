"use client";

import { useEffect, useMemo, useState } from "react";
import { EncounterCompleteDialog } from "../../components/EncounterCompleteDialog";
import { Button, Card, Dialog, DialogClose, DialogContent, DialogTitle, PageShell, Pill, SectionTitle, Select } from "../../components/ui";
import { useAppStore } from "../../lib/store/appStore";
import { getDefaultEncounter } from "../../lib/engine/encounterSelectors";
import { PrepPhase } from "./PrepPhase";
import { CombatHeader } from "./CombatHeader";
import { CombatParticipantList } from "./CombatParticipantList";
import { CombatInspector } from "./CombatInspector";

/** Returns true when viewport width is below the md breakpoint (768px). SSR-safe — returns false on first render. */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

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
  const isMobile = useIsMobile();

  const selectedEncounter = useMemo(() => {
    return getDefaultEncounter(state.encounters, selectedId);
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

  // Clear pin state when switching between mobile and desktop layouts
  // to prevent the sheet from opening involuntarily on orientation change.
  useEffect(() => {
    setPinnedInspectorId(null);
  }, [isMobile]);

  return (
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
                <div className="flex flex-wrap gap-2">
                  {selectedEncounter.status === "completed" ? (
                    <div className="w-full rounded-xl border border-black/10 bg-surface-strong px-4 py-3 text-sm text-muted">
                      <span className="font-semibold text-foreground">Encounter complete.</span>{" "}
                      This encounter is read-only. Start a new encounter to continue playing.
                    </div>
                  ) : (
                    <>
                  {combatMode ? (
                    <Button
                      variant="outline"
                      onClick={() => dispatchEncounterEvent(selectedEncounter.id, { t: "COMBAT_MODE_SET", mode: "prep" })}
                    >
                      Back to prep mode
                    </Button>
                  ) : (
                    <Button
                      onClick={() => dispatchEncounterEvent(selectedEncounter.id, { t: "COMBAT_MODE_SET", mode: "live" })}
                      disabled={!selectedEncounter.isRunning && !combatRequirementsMet}
                    >
                      Go to combat mode
                    </Button>
                  )}
                  {combatMode ? (
                    <>
                      {!selectedEncounter.isRunning ? (
                        <Button
                          variant="outline"
                          onClick={() => startEncounter(selectedEncounter.id)}
                          disabled={!combatRequirementsMet}
                        >
                          Start
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => stopEncounter(selectedEncounter.id)}
                        >
                          Stop
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => advanceEncounterTurn(selectedEncounter.id, -1)}
                        disabled={!selectedEncounter.isRunning || !orderedParticipants.length}
                      >
                        Prev
                      </Button>
                      <Button
                        onClick={() => advanceEncounterTurn(selectedEncounter.id, 1)}
                        disabled={!selectedEncounter.isRunning || !orderedParticipants.length}
                      >
                        Next
                      </Button>
                    </>
                  ) : (
                    !selectedEncounter.isRunning ? (
                      <Button
                        variant="outline"
                        onClick={() => startEncounter(selectedEncounter.id)}
                        disabled={!combatRequirementsMet}
                      >
                        Start
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => stopEncounter(selectedEncounter.id)}
                      >
                        Stop
                      </Button>
                    )
                  )}
                  {/* End Encounter — graduates this encounter to 'completed' */}
                  <Button
                    variant="outline"
                    className="ml-auto text-xs"
                    onClick={() => { setEndEncounterNotes(""); setIsEndEncounterOpen(true); }}
                    disabled={selectedEncounter.isRunning}
                  >
                    End Encounter
                  </Button>
                    </>
                  )}
                </div>
              </div>

              {combatMode ? (
                <>
                  <div className="flex items-stretch overflow-hidden rounded-2xl border border-black/10 bg-surface-strong text-xs text-muted">
                    {/* Segment 1 — Round controls */}
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className="uppercase tracking-[0.25em]">Round</span>
                      <Button
                        variant="outline"
                        className="px-3 py-1 text-xs"
                        onClick={() => adjustRound(-1)}
                      >
                        -
                      </Button>
                      <span className="text-sm font-semibold text-foreground">
                        {selectedEncounter.round}
                      </span>
                      <Button
                        variant="outline"
                        className="px-3 py-1 text-xs"
                        onClick={() => adjustRound(1)}
                      >
                        +
                      </Button>
                      <Button
                        variant="outline"
                        className="px-3 py-1 text-xs"
                        onClick={() => undoEncounterEvent(selectedEncounter.id)}
                        disabled={!selectedEncounter.eventLog.length}
                      >
                        Undo
                      </Button>
                    </div>
                    {/* Divider */}
                    <div className="w-px self-stretch bg-surface-strong" />
                    {/* Segment 2 — Active participant */}
                    <div className="flex min-w-0 items-center gap-2 px-3 py-2">
                      <span className="shrink-0 uppercase tracking-[0.25em]">Active</span>
                      <span className="truncate text-sm text-foreground">
                        {activeParticipant ? activeParticipant.name : "--"}
                      </span>
                    </div>
                    {/* Divider */}
                    <div className="w-px self-stretch bg-surface-strong" />
                    {/* Segment 3 — Last action */}
                    <div className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2">
                      <span className="shrink-0 uppercase tracking-[0.25em]">Last</span>
                      <span className="truncate max-w-[16rem] text-sm text-foreground">
                        {formatEventSummary(lastEvent)}
                      </span>
                    </div>
                    {/* Keyboard hint */}
                    {selectedEncounter.isRunning ? (
                      <div className="ml-auto flex shrink-0 items-center px-3 py-2 text-[0.65rem] uppercase tracking-[0.2em] text-muted">
                        N / P
                      </div>
                    ) : null}
                    {!selectedEncounter.isRunning && !combatRequirementsMet ? (
                      <div className="flex items-center px-3 py-2">
                        <p className="text-xs text-muted">{combatRequirementsMessage}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[0.65fr_1.1fr_0.9fr]">
                <div className="rounded-2xl border border-black/10 bg-surface-strong p-4 xl:sticky xl:top-24 xl:self-start">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">Current</p>
                  {activeIndex >= 0 ? (
                    <div className="mt-1 flex items-center gap-2">
                      <ParticipantAvatar
                        name={orderedParticipants[activeIndex].name}
                        visual={orderedParticipants[activeIndex].visual}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-surface object-cover text-[0.7rem] font-semibold text-muted"
                      />
                      <p className="text-xl font-semibold text-foreground">
                        {orderedParticipants[activeIndex].name}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xl font-semibold text-foreground">Not started</p>
                  )}
                  <p className="text-sm text-muted">Round {selectedEncounter.round}</p>
                  {activeIndex >= 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Pill label={orderedParticipants[activeIndex].kind.toUpperCase()} />
                      <Pill
                        label={`Init ${orderedParticipants[activeIndex].initiative ?? "--"}`}
                        tone="accent"
                      />
                      <Pill label="Active" tone="accent" />
                    </div>
                  ) : null}
                  {nextParticipant ? (
                    <div className="mt-3 rounded-xl border border-black/10 bg-surface px-3 py-2 text-xs text-muted">
                      <span className="uppercase tracking-[0.25em]">Up next</span>
                      <div className="mt-1 flex items-center gap-2">
                        <ParticipantAvatar
                          name={nextParticipant.name}
                          visual={nextParticipant.visual}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-surface-strong object-cover text-[0.6rem] font-semibold text-muted"
                        />
                        <p className="text-sm font-semibold text-foreground">
                          {nextParticipant.name}
                        </p>
                      </div>
                      <p className="text-xs text-muted">{nextParticipant.kind.toUpperCase()}</p>
                    </div>
                  ) : null}
                  {selectedEncounter ? (
                    <div className="mt-4 rounded-xl border border-black/10 bg-surface px-3 py-3">
                      <p className="text-[0.65rem] uppercase tracking-[0.25em] text-muted">
                        Quick actions
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Targeted actions (click a creature to target)
                      </p>
                      <div className="mt-2 grid gap-2">
                        <div>
                          <p className="text-[0.6rem] uppercase tracking-[0.2em] text-muted">
                            Target
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            {effectiveTargetId ? (
                              <Pill
                                label={participantNameById.get(effectiveTargetId) ?? "Unknown"}
                                tone="accent"
                              />
                            ) : (
                              <span className="text-xs text-muted">Click a row to target</span>
                            )}
                            {effectiveTargetId ? (
                              <Button
                                variant="ghost"
                                className="px-2 py-0.5 text-xs"
                                onClick={() => setDamageTargetId(null)}
                              >
                                Clear
                              </Button>
                            ) : null}
                          </div>
                        </div>
                        <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="w-24"
                            placeholder="Dmg"
                            value={damageAmount}
                            onChange={(event) =>
                              setDamageAmount(event.target.value.replace(/[^0-9]/g, ""))
                            }
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              className="px-3 py-1 text-xs"
                              onClick={() => applyDamageToTarget(-1)}
                              disabled={!effectiveTargetId || damageAmount === ""}
                            >
                              Damage
                            </Button>
                            <Button
                              variant="outline"
                              className="px-3 py-1 text-xs"
                              onClick={() => applyDamageToTarget(1)}
                              disabled={!effectiveTargetId || damageAmount === ""}
                            >
                              Heal
                            </Button>
                            <Button
                              variant="outline"
                              className="px-3 py-1 text-xs"
                              onClick={removeTargetFromCombat}
                              disabled={!effectiveTargetId}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <ConditionPicker
                          conditions={SRD_CONDITIONS}
                          active={
                            selectedEncounter.participants.find(
                              (p) => p.id === effectiveTargetId
                            )?.conditions ?? []
                          }
                          onChange={(next) => {
                            if (!effectiveTargetId) return;
                            dispatchEncounterEvent(selectedEncounter.id, {
                              t: "CONDITIONS_SET",
                              participantId: effectiveTargetId,
                              value: next,
                            });
                          }}
                        />
                      </div>
                      <div className="mt-4 border-t border-black/10 pt-3">
                        <p className="text-[0.65rem] uppercase tracking-[0.25em] text-muted">
                          Add participant
                        </p>
                        <Button
                          variant="outline"
                          className="mt-2 px-3 py-1 text-xs"
                          onClick={() => {
                            setAddParticipantMode("premade");
                            setPremadeType("monster");
                            setPremadePcSelectionId("");
                            setIsAddParticipantOpen(true);
                          }}
                        >
                          Add participant
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {activePc ? (
                    <div className="mt-4 space-y-2 text-sm text-muted">
                      <p>
                        <span className="font-semibold text-foreground">AC</span> {activePc.ac} ·
                        <span className="font-semibold text-foreground"> HP</span>{" "}
                        {activePc.currentHp}/{activePc.maxHp}
                      </p>
                      {activeParticipant?.tempHp !== null && activeParticipant?.tempHp !== undefined ? (
                        <p>
                          <span className="font-semibold text-foreground">Temp HP</span>{" "}
                          {activeParticipant.tempHp}
                        </p>
                      ) : null}
                      <p>
                        <span className="font-semibold text-foreground">Speed</span>{" "}
                        {activePc.speed || "--"}
                      </p>
                      <p>
                        <span className="font-semibold text-foreground">Senses</span>{" "}
                        {activePc.senses || "--"}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Pill label={`Passive ${getPassivePerception(activePc)}`} />
                        <Pill label={`WIS ${activePc.abilities.wis}`} />
                        <Pill label={`DEX ${activePc.abilities.dex}`} />
                      </div>
                    </div>
                  ) : null}
                  {activeMonster ? (
                    <div className="mt-4 space-y-2 text-sm text-muted">
                      <p>
                        <span className="font-semibold text-foreground">AC</span>{" "}
                        {activeMonster.ac} · <span className="font-semibold text-foreground">HP</span>{" "}
                        {activeMonster.hp}
                      </p>
                      {activeParticipant?.tempHp !== null && activeParticipant?.tempHp !== undefined ? (
                        <p>
                          <span className="font-semibold text-foreground">Temp HP</span>{" "}
                          {activeParticipant.tempHp}
                        </p>
                      ) : null}
                      <p>
                        <span className="font-semibold text-foreground">Type</span>{" "}
                        {activeMonster.size} {activeMonster.type}
                      </p>
                      <p>
                        <span className="font-semibold text-foreground">Speed</span>{" "}
                        {activeMonster.speed}
                      </p>
                      <p>
                        <span className="font-semibold text-foreground">Senses</span>{" "}
                        {activeMonster.senses || "--"}
                      </p>
                    </div>
                  ) : null}
                </div>
                <div className="rounded-2xl border border-black/10 bg-surface p-4">
                <div className="space-y-2">
                  {orderedParticipants.map((participant, index) => {
                    const isDefeatedRow = participant.currentHp !== null && participant.currentHp !== undefined && participant.currentHp <= 0 && participant.kind !== "pc";
                    return (
                    <div
                      key={participant.id}
                      className={`rounded-xl border px-3 py-3 text-sm transition hover:border-accent/50 ${
                        index === activeIndex
                          ? "border bg-[var(--active-row-bg)] [border-color:var(--active-row-border)] text-foreground"
                          : "border border-black/10 bg-surface text-foreground"
                      } ${
                        effectiveTargetId === participant.id
                          ? "targeted-outline"
                          : ""
                      } ${combatMode ? "cursor-pointer" : ""} ${isDefeatedRow ? "opacity-70" : ""}`}
                      onClick={() => {
                        if (!combatMode) {
                          return;
                        }
                        setDamageTargetId(participant.id);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Zone A — Identity */}
                        <div className="flex min-w-0 flex-1 items-start gap-2">
                          <ParticipantAvatar
                            name={participant.name}
                            visual={participant.visual}
                            className={cn(
                              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border object-cover text-[0.65rem] font-semibold",
                              index === activeIndex
                                ? "border-accent text-accent bg-surface-strong"
                                : "border-black/10 bg-surface-strong text-muted"
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            {/* Name + kind inline */}
                            <div className="flex min-w-0 items-baseline gap-2">
                              <p className={cn(
                                "truncate text-sm font-semibold leading-snug",
                                index === activeIndex ? "text-accent" : "text-foreground"
                              )}>
                                {participant.name}
                              </p>
                              <span className="shrink-0 text-xs uppercase tracking-wide text-muted">
                                {participant.kind}
                              </span>
                            </div>
                            {/* HP bar + value */}
                            {participant.maxHp != null && participant.currentHp != null && (
                              <div className="mt-1 flex items-center gap-2">
                                <HpBar
                                  current={participant.currentHp}
                                  max={participant.maxHp}
                                  className="h-1.5 w-20 shrink-0"
                                />
                                <span className="font-mono text-xs text-muted">
                                  {participant.currentHp} / {participant.maxHp}
                                  {participant.tempHp ? (
                                    <span className="text-accent"> +{participant.tempHp}</span>
                                  ) : null}
                                </span>
                              </div>
                            )}
                            {/* Conditions */}
                            {participant.conditions.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {participant.conditions.map((cond) => (
                                  <ConditionChip
                                    key={cond}
                                    label={cond}
                                    onRemove={() => {
                                      if (!selectedEncounter) return;
                                      dispatchEncounterEvent(selectedEncounter.id, {
                                        t: "CONDITIONS_SET",
                                        participantId: participant.id,
                                        value: participant.conditions.filter((c) => c !== cond),
                                      });
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Zone B — Stats */}
                        <div className="shrink-0 text-right">
                          <p className="font-mono text-sm font-semibold">
                            {participant.initiative ?? "—"}
                          </p>
                          <p className="font-mono text-[0.65rem] uppercase tracking-wide text-muted">init</p>
                          <p className="mt-1 font-mono text-sm font-semibold">
                            {participant.ac ?? "—"}
                          </p>
                          <p className="font-mono text-[0.65rem] uppercase tracking-wide text-muted">ac</p>
                        </div>
                      </div>
                      {/* Death save tracker — shown for PC participants at 0 HP */}
                      {participant.kind === "pc" &&
                        participant.currentHp !== null &&
                        participant.currentHp <= 0 &&
                        participant.refId && (
                          <DmDeathSaveTracker
                            deathSaves={
                              participant.deathSaves ?? { successes: 0, failures: 0, stable: false }
                            }
                            onSave={(ds) => {
                              if (!selectedEncounter) return;
                              dispatchEncounterEvent(selectedEncounter.id, {
                                t: "DEATH_SAVES_SET",
                                participantId: participant.id,
                                pcId: participant.refId!,
                                value: ds,
                              });
                            }}
                          />
                        )}
                    </div>
                  );
                  })}
                  {!orderedParticipants.length ? (
                    <p className="text-sm text-muted">No active participants to run.</p>
                  ) : null}
                  {defeatedParticipants.length ? (
                    <div className="pt-3">
                      <p className="text-xs uppercase tracking-[0.3em] text-muted">Defeated</p>
                      <div className="mt-2 space-y-2">
                        {defeatedParticipants.map((participant) => (
                          <div
                            key={participant.id}
                            className="grid gap-2 rounded-xl border border-black/10 bg-surface px-3 py-2 text-xs text-muted md:grid-cols-[1.2fr_repeat(2,minmax(0,1fr))] md:items-center"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <ParticipantAvatar
                                  name={participant.name}
                                  visual={participant.visual}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-surface object-cover text-[0.6rem] font-semibold text-muted"
                                />
                                <div>
                                  <p className="text-sm font-semibold text-foreground">
                                    {participant.name}
                                  </p>
                                  <p className="text-xs text-muted">
                                    {participant.kind.toUpperCase()}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div>
                              <p className="text-[0.6rem] uppercase tracking-[0.25em] text-muted">
                                Init
                              </p>
                              <p className="text-sm font-semibold">
                                {participant.initiative ?? "--"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[0.6rem] uppercase tracking-[0.25em] text-muted">
                                HP
                              </p>
                              <Input
                                type="number"
                                className="w-24"
                                value={participant.currentHp ?? ""}
                                onChange={(event) =>
                                  setParticipantHp(
                                    participant.id,
                                    event.target.value === "" ? null : Number(event.target.value)
                                  )
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                </div>
                <div className="rounded-2xl border border-black/10 bg-surface p-4 text-sm text-muted">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">Reference</p>
                  {activePc ? (
                    <div className="mt-3 space-y-3">
                      <p className="text-base font-semibold text-foreground">{activePc.name}</p>
                      <div className="space-y-3">
                        {/* Ability scores grid */}
                        <div>
                          <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted">Ability Scores</p>
                          <div className="grid grid-cols-6 gap-1">
                            {(["str", "dex", "con", "int", "wis", "cha"] as const).map((key) => (
                              <div key={key} className="rounded-lg border border-black/10 bg-surface-strong p-1 text-center">
                                <p className="text-[0.55rem] uppercase tracking-widest text-muted">{key}</p>
                                <p className="font-mono text-sm font-bold text-foreground">{activePc.abilities[key]}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Saves grid */}
                        <div>
                          <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted">Saves</p>
                          <div className="grid grid-cols-6 gap-1">
                            {(["str", "dex", "con", "int", "wis", "cha"] as const).map((key) => (
                              <div key={key} className="rounded-lg border border-black/10 bg-surface-strong p-1 text-center">
                                <p className="text-[0.55rem] uppercase tracking-widest text-muted">{key}</p>
                                <p className="font-mono text-sm font-bold text-foreground">{getSaveValue(key)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Skills */}
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted">Skills</p>
                          <p>Perception {activePc.skills.perception}</p>
                          <p>Stealth {activePc.skills.stealth}</p>
                          <p>Insight {activePc.skills.insight}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted">Resources</p>
                        <p>{activePc.resources.length ? activePc.resources.join(", ") : "--"}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted">Notes</p>
                        <p>{activePc.notes || "--"}</p>
                      </div>
                      {(activePc.spellcasting?.spellSlots?.length ?? 0) > 0 && (
                        <SpellSlotsReadout pc={activePc} />
                      )}
                    </div>
                  ) : activeMonster ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-base font-semibold text-foreground">
                        {activeMonster.name}
                      </p>
                      <p>{activeMonster.alignment}</p>
                      <p>
                        <span className="font-semibold text-foreground">Traits:</span>{" "}
                        {activeMonster.traits?.join(" ") || "--"}
                      </p>
                      <p>
                        <span className="font-semibold text-foreground">Actions:</span>{" "}
                        {activeMonster.actions?.join(" ") || "--"}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3">Select a participant to see details.</p>
                  )}
                </div>
                  </div>
                </>
              ) : (
                <>
                  {!selectedEncounter.isRunning && !combatRequirementsMet ? (
                    <div className="rounded-2xl border border-black/10 bg-surface-strong px-4 py-3 text-xs text-muted">
                      {combatRequirementsMessage}
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted">
                      {selectedEncounter.participants.filter((p) => p.initiative === null).length > 0
                        ? `${selectedEncounter.participants.filter((p) => p.initiative === null).length} initiative(s) unset`
                        : "All initiative set"}
                    </p>
                    <Button
                      variant="outline"
                      className="px-3 py-1 text-xs"
                      onClick={rollAllInitiative}
                      disabled={selectedEncounter.participants.every((p) => p.initiative !== null)}
                    >
                      Roll all initiative
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {selectedEncounter.participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="rounded-2xl border border-black/10 bg-surface px-4 py-4 text-sm text-foreground"
                      >
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_auto] xl:items-start">
                          <div className="flex items-center gap-2">
                            <ParticipantAvatar
                              name={participant.name}
                              visual={participant.visual}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-surface-strong object-cover text-[0.65rem] font-semibold text-muted"
                            />
                            <div>
                              <p className="text-sm font-semibold">{participant.name}</p>
                              <Pill label={participant.kind.toUpperCase()} tone="neutral" />
                            </div>
                          </div>
                          <div>
                            <FieldLabel>Init</FieldLabel>
                            <div className="flex flex-wrap items-center gap-2">
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="-?[0-9]*"
                                className="w-20"
                                value={participant.initiative ?? ""}
                                onChange={(event) => {
                                  const nextValue = event.target.value;
                                  if (!/^-?\d*$/.test(nextValue)) {
                                    return;
                                  }
                                  setInitiative(
                                    participant.id,
                                    nextValue === "" ? null : Number(nextValue)
                                  );
                                }}
                              />
                              <Button
                                variant="outline"
                                className="h-8 min-w-[5rem] px-3 py-0 text-xs leading-none"
                                onClick={() =>
                                    rollInitiative(
                                      selectedEncounter.id,
                                      participant.id,
                                      participant.name
                                    )
                                }
                              >
                                Roll
                              </Button>
                            </div>
                          </div>
                          <div>
                            <FieldLabel>AC</FieldLabel>
                            <p className="font-mono text-sm font-semibold">{participant.ac ?? "—"}</p>
                          </div>
                          <div>
                            <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
                                <div>
                                  <FieldLabel className="whitespace-nowrap">HP</FieldLabel>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  className="w-full max-w-[8rem]"
                                  value={participant.currentHp ?? ""}
                                  onChange={(event) => {
                                    const nextValue = event.target.value.replace(/[^0-9]/g, "");
                                    setParticipantHp(
                                      participant.id,
                                      nextValue === "" ? null : Number(nextValue)
                                    );
                                  }}
                                />
                                <p className="mt-1 text-[0.7rem] text-muted">
                                  Max {participant.maxHp ?? "--"}
                                </p>
                              </div>
                                <div>
                                  <FieldLabel className="whitespace-nowrap">Temp HP</FieldLabel>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  className="w-full max-w-[8rem]"
                                  value={participant.tempHp ?? ""}
                                  onChange={(event) => {
                                    const nextValue = event.target.value.replace(/[^0-9]/g, "");
                                    setTempHp(
                                      participant.id,
                                      nextValue === "" ? null : Number(nextValue)
                                    );
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 md:col-span-2 xl:col-span-1 xl:justify-end">
                            <Button
                              variant="outline"
                              className="h-8 min-w-[5rem] px-3 py-0 text-xs leading-none"
                              onClick={() => togglePrepDetails(participant.id)}
                            >
                              {expandedPrepIds.has(participant.id) ? "Hide" : "Details"}
                            </Button>
                            <Button
                              variant="ghost"
                              disabled={selectedEncounter.isRunning}
                              onClick={() =>
                                removeEncounterParticipant(selectedEncounter.id, participant.id)
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                        {expandedPrepIds.has(participant.id) ? (
                          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-black/10 pt-3 md:grid-cols-2">
                            <div>
                              <FieldLabel>Conditions</FieldLabel>
                              {participant.conditions.length > 0 && (
                                <div className="mb-1.5 flex flex-wrap gap-1">
                                  {participant.conditions.map((cond) => (
                                    <ConditionChip
                                      key={cond}
                                      label={cond}
                                      onRemove={() =>
                                        setConditions(
                                          participant.id,
                                          participant.conditions.filter((c) => c !== cond).join(", ")
                                        )
                                      }
                                    />
                                  ))}
                                </div>
                              )}
                              <datalist id={`srd-conditions-prep-${participant.id}`}>
                                {SRD_CONDITIONS.map((c) => (
                                  <option key={c} value={c} />
                                ))}
                              </datalist>
                              <Input
                                className="min-w-0"
                                placeholder="Add condition…"
                                list={`srd-conditions-prep-${participant.id}`}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                                    const next = [...participant.conditions, e.currentTarget.value.trim()];
                                    setConditions(participant.id, next.join(", "));
                                    e.currentTarget.value = "";
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <FieldLabel>Notes</FieldLabel>
                              <Input
                                className="min-w-0"
                                value={participant.notes ?? ""}
                                onChange={(event) => setNotes(participant.id, event.target.value)}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                    {!selectedEncounter.participants.length ? (
                      <p className="text-sm text-muted">No participants in this encounter.</p>
                    ) : null}
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">Select an encounter to start.</p>
          )}
        </Card>
      </div>

      <Dialog
        open={isAddParticipantOpen && combatMode && !!selectedEncounter}
        onOpenChange={setIsAddParticipantOpen}
      >
        <DialogContent maxWidth="2xl">
          <div className="flex items-center justify-between gap-2">
            <div>
              <DialogTitle>Add participant</DialogTitle>
              <p className="text-sm text-muted">Choose premade or custom.</p>
            </div>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </div>

            <div className="mt-4 flex gap-2">
              <Button
                variant={addParticipantMode === "premade" ? "primary" : "outline"}
                className="px-3 py-1 text-xs"
                onClick={() => setAddParticipantMode("premade")}
              >
                Premade
              </Button>
              <Button
                variant={addParticipantMode === "custom" ? "primary" : "outline"}
                className="px-3 py-1 text-xs"
                onClick={() => setAddParticipantMode("custom")}
              >
                Custom
              </Button>
            </div>

            {addParticipantMode === "premade" ? (
              <div className="mt-4 space-y-3">
                <div className="grid gap-2 md:grid-cols-2">
                  <Select
                    className=""
                    value={premadeType}
                    onChange={(event) => {
                      const nextType = event.target.value as "pc" | "monster";
                      setPremadeType(nextType);
                      setPremadePcSelectionId("");
                    }}
                  >
                    <option value="monster">Monster</option>
                    <option value="pc">PC</option>
                  </Select>
                </div>
                {premadeType === "monster" ? (
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-muted">Monster picker</p>
                    <p className="mt-1 text-xs text-muted">Click to add directly to live combat.</p>
                    <div className="mt-2">
                      <MonsterPicker
                        monsters={state.monsters}
                        onPickMonster={(monster) => addMonsterMidCombat(monster.id)}
                        listClassName="max-h-[16rem]"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <Select
                      className=""
                      value={premadePcSelectionId}
                      onChange={(event) => setPremadePcSelectionId(event.target.value)}
                    >
                      <option value="" disabled>
                        Select PC
                      </option>
                      {state.pcs.map((pc) => (
                        <option key={pc.id} value={pc.id}>
                          {pc.name}
                        </option>
                      ))}
                    </Select>
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        className="px-3 py-1 text-xs"
                        onClick={addPremadeParticipantMidCombat}
                        disabled={!premadePcSelectionId}
                      >
                        Add selected
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    placeholder="Name"
                    value={customParticipantForm.name}
                    onChange={(event) =>
                      setCustomParticipantForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                  <Select
                    className=""
                    value={customParticipantForm.kind}
                    onChange={(event) =>
                      setCustomParticipantForm((prev) => ({
                        ...prev,
                        kind: event.target.value as "pc" | "monster" | "npc",
                      }))
                    }
                  >
                    <option value="npc">NPC</option>
                    <option value="monster">Monster</option>
                    <option value="pc">PC</option>
                  </Select>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="AC"
                    value={customParticipantForm.ac}
                    onChange={(event) =>
                      setCustomParticipantForm((prev) => ({
                        ...prev,
                        ac: event.target.value.replace(/[^0-9]/g, ""),
                      }))
                    }
                  />
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="HP"
                    value={customParticipantForm.hp}
                    onChange={(event) =>
                      setCustomParticipantForm((prev) => ({
                        ...prev,
                        hp: event.target.value.replace(/[^0-9]/g, ""),
                      }))
                    }
                  />
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="-?[0-9]*"
                    placeholder="Init"
                    value={customParticipantForm.initiative}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      if (!/^-?\d*$/.test(nextValue)) {
                        return;
                      }
                      setCustomParticipantForm((prev) => ({ ...prev, initiative: nextValue }));
                    }}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    className="px-3 py-1 text-xs"
                    onClick={addCustomParticipantMidCombat}
                    disabled={!customParticipantForm.name.trim()}
                  >
                    Add custom
                  </Button>
                </div>
              </div>
            )}
        </DialogContent>
      </Dialog>

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

      {selectedEncounter && selectedEncounter.combatMode === "live" && selectedEncounter.status !== "completed" ? (
        <div
          className="flex flex-col overflow-hidden animate-[combatEnter_200ms_ease-out_both]"
          style={{ height: "calc(100vh - var(--nav-height))", backgroundColor: "var(--combat-bg)" }}
        >
          <CombatHeader
            encounter={selectedEncounter}
            onEndEncounter={() => setIsEndEncounterOpen(true)}
          />
          {/* Combat layout: side-by-side on desktop, full-width list on mobile */}
          <div
            className="flex-1 min-h-0"
            style={
              isMobile
                ? { overflow: "hidden" }
                : { display: "grid", gridTemplateColumns: "1fr 320px", overflow: "hidden" }
            }
          >
            <CombatParticipantList
              encounter={selectedEncounter}
              pinnedInspectorId={pinnedInspectorId}
              onPin={setPinnedInspectorId}
            />
            {/* Desktop inspector panel — hidden on mobile */}
            {!isMobile && (
              <div className="h-full overflow-hidden" style={{ borderLeft: "1px solid var(--combat-border)" }}>
                <CombatInspector
                  encounter={selectedEncounter}
                  pinnedId={pinnedInspectorId}
                  onUnpin={() => setPinnedInspectorId(null)}
                />
              </div>
            )}
          </div>

          {/* Mobile inspector — bottom sheet, opens when a participant is pinned on mobile */}
          <Dialog
            open={isMobile && pinnedInspectorId !== null}
            onOpenChange={(open) => { if (!open) setPinnedInspectorId(null); }}
          >
            <DialogContent variant="sheet">
              <DialogTitle className="sr-only">Participant Inspector</DialogTitle>
              <CombatInspector
                encounter={selectedEncounter}
                pinnedId={pinnedInspectorId}
                onUnpin={() => setPinnedInspectorId(null)}
              />
            </DialogContent>
          </Dialog>
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
