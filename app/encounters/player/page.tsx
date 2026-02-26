"use client";

import { useEffect, useMemo, useState } from "react";
import { MonsterPicker } from "../../components/MonsterPicker";
import { ParticipantAvatar } from "../../components/ParticipantAvatar";
import { Button, Card, ConditionChip, ConditionPicker, Dialog, DialogClose, DialogContent, DialogTitle, FieldLabel, HpBar, Input, PageShell, Pill, SectionTitle, Select } from "../../components/ui";
import { SRD_CONDITIONS } from "../../lib/data/srd";
import { suggestUniqueName } from "../../lib/engine/selectors";
import { getPassivePerception } from "../../lib/engine/pcEngine";
import { useAppStore } from "../../lib/store/appStore";

const isDefeated = (currentHp: number | null) =>
  currentHp !== null && currentHp <= 0;

const getAbilityMod = (score: number) => Math.floor((score - 10) / 2);
const rollD20 = () => Math.floor(Math.random() * 20) + 1;

export default function EncounterPlayerPage() {
  const {
    state,
    removeEncounterParticipant,
    startEncounter,
    stopEncounter,
    advanceEncounterTurn,
    dispatchEncounterEvent,
    undoEncounterEvent,
  } = useAppStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [damageTargetId, setDamageTargetId] = useState<string | null>(null);
  const [damageAmount, setDamageAmount] = useState("");
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [addParticipantMode, setAddParticipantMode] = useState<"premade" | "custom">(
    "premade"
  );
  const [premadeType, setPremadeType] = useState<"pc" | "monster">("monster");
  const [premadePcSelectionId, setPremadePcSelectionId] = useState("");
  const [customParticipantForm, setCustomParticipantForm] = useState({
    name: "",
    kind: "npc" as "pc" | "monster" | "npc",
    ac: "",
    hp: "",
    initiative: "",
  });
  const [expandedPrepIds, setExpandedPrepIds] = useState<Set<string>>(new Set());
  const [isEndEncounterOpen, setIsEndEncounterOpen] = useState(false);
  const [endEncounterNotes, setEndEncounterNotes] = useState("");

  const selectedEncounter = useMemo(() => {
    if (selectedId) {
      return state.encounters.find((encounter) => encounter.id === selectedId) || null;
    }
    return state.encounters[0] || null;
  }, [selectedId, state.encounters]);

  const pcsById = useMemo(() => {
    return new Map(state.pcs.map((pc) => [pc.id, pc]));
  }, [state.pcs]);

  const monstersById = useMemo(() => {
    return new Map(state.monsters.map((monster) => [monster.id, monster]));
  }, [state.monsters]);

  const orderedParticipants = useMemo(() => {
    if (!selectedEncounter) {
      return [];
    }
    return [...selectedEncounter.participants]
      .filter((participant) => !isDefeated(participant.currentHp))
      .sort((a, b) => {
        const aInit = a.initiative ?? Number.NEGATIVE_INFINITY;
        const bInit = b.initiative ?? Number.NEGATIVE_INFINITY;
        if (aInit !== bInit) {
          return bInit - aInit;
        }
        return a.name.localeCompare(b.name);
      });
  }, [selectedEncounter]);

  const defeatedParticipants = useMemo(() => {
    if (!selectedEncounter) {
      return [];
    }
    return selectedEncounter.participants
      .filter((participant) => isDefeated(participant.currentHp))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedEncounter]);

  const activeIndex = selectedEncounter
    ? orderedParticipants.findIndex(
        (participant) => participant.id === selectedEncounter.activeParticipantId
      )
    : -1;

  const hasParticipants =
    !!selectedEncounter && selectedEncounter.participants.length > 0;
  const allInitiativeSet =
    !!selectedEncounter &&
    selectedEncounter.participants.every((participant) => participant.initiative !== null);
  const combatRequirementsMet = hasParticipants && allInitiativeSet;
  const combatRequirementsMessage = !hasParticipants
    ? "Add at least one participant before going to combat mode."
    : !allInitiativeSet
      ? "Set initiative for all participants before going to combat mode."
      : "Ready for combat mode.";

  const activeParticipant =
    activeIndex >= 0 ? orderedParticipants[activeIndex] : null;
  const nextParticipant =
    activeIndex >= 0 && orderedParticipants.length > 1
      ? orderedParticipants[(activeIndex + 1) % orderedParticipants.length]
      : null;
  const activePc =
    activeParticipant?.kind === "pc" && activeParticipant.refId
      ? pcsById.get(activeParticipant.refId)
      : null;
  const activeMonster =
    activeParticipant?.kind === "monster" && activeParticipant.refId
      ? monstersById.get(activeParticipant.refId)
      : null;

  const participantNameById = useMemo(() => {
    if (!selectedEncounter) {
      return new Map<string, string>();
    }
    return new Map(selectedEncounter.participants.map((participant) => [participant.id, participant.name]));
  }, [selectedEncounter]);

  const lastEvent = selectedEncounter?.eventLog?.length
    ? selectedEncounter.eventLog[selectedEncounter.eventLog.length - 1]
    : null;

  const defaultTargetId = activeParticipant?.id ?? selectedEncounter?.participants[0]?.id ?? "";
  const selectedTargetId = damageTargetId === null ? defaultTargetId : damageTargetId;
  const effectiveTargetId =
    selectedEncounter?.participants.some((participant) => participant.id === selectedTargetId)
      ? selectedTargetId
      : "";
  const encounterNames = selectedEncounter?.participants.map((participant) => participant.name) ?? [];

  // combatMode is derived from the encounter event log (COMBAT_MODE_SET), not local state.
  // This means it survives page reloads and is part of the undoable event history.
  const combatMode = selectedEncounter?.combatMode === "live";

  const getSaveValue = (key: "str" | "dex" | "con" | "int" | "wis" | "cha") => {
    if (!activePc) {
      return "--";
    }
    const mod = getAbilityMod(activePc.abilities[key]);
    const prof = activePc.saveProficiencies[key] ? activePc.proficiencyBonus : 0;
    const bonus = activePc.saveBonuses[key] ?? 0;
    const total = mod + prof + bonus;
    return total >= 0 ? `+${total}` : `${total}`;
  };

  const rollInitiative = (
    encounterId: string,
    participantId: string,
    participantName: string
  ) => {
    const roll = rollD20();
    const shouldLogRoll =
      selectedEncounter?.id === encounterId && selectedEncounter.isRunning;
    if (shouldLogRoll) {
      dispatchEncounterEvent(encounterId, {
        t: "ROLL_RECORDED",
        mode: "digital",
        context: `${participantName} initiative`,
        formula: "1d20",
        rawRolls: [roll],
        total: roll,
      });
    }
    dispatchEncounterEvent(encounterId, {
      t: "INITIATIVE_SET",
      participantId,
      value: roll,
    });
  };

  const rollAllInitiative = () => {
    if (!selectedEncounter) return;
    selectedEncounter.participants
      .filter((p) => p.initiative === null)
      .forEach((p) => rollInitiative(selectedEncounter.id, p.id, p.name));
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedEncounter?.isRunning) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") {
        return;
      }
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "n") {
        event.preventDefault();
        advanceEncounterTurn(selectedEncounter.id, 1);
      }
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "p") {
        event.preventDefault();
        advanceEncounterTurn(selectedEncounter.id, -1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [advanceEncounterTurn, selectedEncounter]);

  const setInitiative = (participantId: string, value: number | null) => {
    if (!selectedEncounter) {
      return;
    }
    dispatchEncounterEvent(selectedEncounter.id, {
      t: "INITIATIVE_SET",
      participantId,
      value,
    });
  };

  const setParticipantHp = (participantId: string, nextValue: number | null) => {
    if (!selectedEncounter || nextValue === null) {
      return;
    }
    const participant = selectedEncounter.participants.find(
      (entry) => entry.id === participantId
    );
    if (!participant) {
      return;
    }
    const baseCurrent = participant.currentHp ?? participant.maxHp ?? 0;
    const delta = nextValue - baseCurrent;
    if (delta === 0) {
      return;
    }
    if (delta < 0) {
      dispatchEncounterEvent(selectedEncounter.id, {
        t: "DAMAGE_APPLIED",
        participantId,
        amount: Math.abs(delta),
      });
      return;
    }
    dispatchEncounterEvent(selectedEncounter.id, {
      t: "HEAL_APPLIED",
      participantId,
      amount: delta,
    });
  };

  const setTempHp = (participantId: string, value: number | null) => {
    if (!selectedEncounter) {
      return;
    }
    dispatchEncounterEvent(selectedEncounter.id, {
      t: "TEMP_HP_SET",
      participantId,
      value,
    });
  };

  const setConditions = (participantId: string, value: string) => {
    if (!selectedEncounter) {
      return;
    }
    dispatchEncounterEvent(selectedEncounter.id, {
      t: "CONDITIONS_SET",
      participantId,
      value: value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    });
  };

  const setNotes = (participantId: string, value: string) => {
    if (!selectedEncounter) {
      return;
    }
    dispatchEncounterEvent(selectedEncounter.id, {
      t: "NOTES_SET",
      participantId,
      value,
    });
  };

  const adjustRound = (delta: number) => {
    if (!selectedEncounter) {
      return;
    }
    const nextRound = Math.max(1, selectedEncounter.round + delta);
    dispatchEncounterEvent(selectedEncounter.id, { t: "ROUND_SET", value: nextRound });
  };

  const formatEventSummary = (event: typeof lastEvent) => {
    if (!event) {
      return "No actions yet";
    }
    const name =
      "participantId" in event ? participantNameById.get(event.participantId) ?? "Unknown" : "";
    switch (event.t) {
      case "COMBAT_STARTED":
        return "Combat started";
      case "COMBAT_STOPPED":
        return "Combat stopped";
      case "PARTICIPANT_ADDED":
        return `Participant added: ${event.participant.name}`;
      case "PARTICIPANT_REMOVED":
        return `Participant removed: ${name || "Participant"}`;
      case "ROUND_SET":
        return `Round set to ${Math.max(1, event.value)}`;
      case "TURN_ADVANCED":
        return event.direction > 0 ? "Advanced turn" : "Rewound turn";
      case "INITIATIVE_SET":
        return `Initiative set: ${name || "Participant"} ${event.value ?? "--"}`;
      case "DAMAGE_APPLIED":
        return `Damage: ${name || "Participant"} -${event.amount}`;
      case "HEAL_APPLIED":
        return `Heal: ${name || "Participant"} +${event.amount}`;
      case "TEMP_HP_SET":
        return `Temp HP: ${name || "Participant"} ${event.value ?? "--"}`;
      case "CONDITIONS_SET":
        return `Conditions updated: ${name || "Participant"}`;
      case "NOTES_SET":
        return `Notes updated: ${name || "Participant"}`;
      case "ROLL_RECORDED":
        return `Roll ${event.context}: ${event.total}`;
      default:
        return "Action recorded";
    }
  };

  const applyDamageToTarget = (direction: 1 | -1) => {
    if (!selectedEncounter || !effectiveTargetId) {
      return;
    }
    const amount = Number(damageAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    dispatchEncounterEvent(selectedEncounter.id, {
      t: direction > 0 ? "HEAL_APPLIED" : "DAMAGE_APPLIED",
      participantId: effectiveTargetId,
      amount,
    });
    setDamageAmount("");
  };

  const removeTargetFromCombat = () => {
    if (!selectedEncounter || !effectiveTargetId) {
      return;
    }
    removeEncounterParticipant(selectedEncounter.id, effectiveTargetId);
    setDamageTargetId(null);
  };

  const dispatchParticipantAdded = (participant: {
    name: string;
    kind: "pc" | "monster" | "npc";
    refId?: string;
    initiative: number | null;
    ac: number | null;
    maxHp: number | null;
    currentHp: number | null;
    tempHp: number | null;
    conditions: string[];
    notes?: string;
    visual?: { imageUrl?: string; fallback: "initials" };
  }) => {
    if (!selectedEncounter) {
      return;
    }
    dispatchEncounterEvent(selectedEncounter.id, {
      t: "PARTICIPANT_ADDED",
      participant,
    });
  };

  const addCustomParticipantMidCombat = () => {
    const name = customParticipantForm.name.trim();
    if (!name) {
      return;
    }
    const nextHp = customParticipantForm.hp === "" ? null : Number(customParticipantForm.hp);
    dispatchParticipantAdded({
      name,
      kind: customParticipantForm.kind,
      initiative:
        customParticipantForm.initiative === ""
          ? null
          : Number(customParticipantForm.initiative),
      ac: customParticipantForm.ac === "" ? null : Number(customParticipantForm.ac),
      maxHp: nextHp,
      currentHp: nextHp,
      tempHp: 0,
      conditions: [],
      notes: "",
      visual: { fallback: "initials" },
    });
    setCustomParticipantForm({ name: "", kind: "npc", ac: "", hp: "", initiative: "" });
    setIsAddParticipantOpen(false);
  };

  const addPremadeParticipantMidCombat = () => {
    if (!premadePcSelectionId) {
      return;
    }
    const pc = state.pcs.find((entry) => entry.id === premadePcSelectionId);
    if (!pc) {
      return;
    }
    dispatchParticipantAdded({
      name: pc.name,
      kind: "pc",
      refId: pc.id,
      initiative: null,
      ac: pc.ac,
      maxHp: pc.maxHp,
      currentHp: pc.currentHp,
      tempHp: pc.tempHp,
      conditions: [...pc.conditions],
      notes: pc.notes,
        visual: pc.visual,
    });
    setPremadePcSelectionId("");
    setIsAddParticipantOpen(false);
  };

  const addMonsterMidCombat = (monsterId: string) => {
    const monster = state.monsters.find((entry) => entry.id === monsterId);
    if (!monster) {
      return;
    }
    dispatchParticipantAdded({
      name: suggestUniqueName(monster.name, encounterNames),
      kind: "monster",
      refId: monster.id,
      initiative: null,
      ac: monster.ac,
      maxHp: monster.hp,
      currentHp: monster.hp,
      tempHp: 0,
      conditions: [],
      notes: "",
      visual: monster.visual,
    });
    setIsAddParticipantOpen(false);
  };

  const togglePrepDetails = (participantId: string) => {
    setExpandedPrepIds((prev) => {
      const next = new Set(prev);
      if (next.has(participantId)) {
        next.delete(participantId);
      } else {
        next.add(participantId);
      }
      return next;
    });
  };

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
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-surface-strong px-3 py-2 text-xs text-muted">
                    <div className="flex flex-wrap items-center gap-2">
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="uppercase tracking-[0.25em]">Active</span>
                      <span className="text-sm text-foreground">
                        {activeParticipant ? activeParticipant.name : "--"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="uppercase tracking-[0.25em]">Last</span>
                      <span className="text-sm text-foreground">{formatEventSummary(lastEvent)}</span>
                    </div>
                    {selectedEncounter.isRunning ? (
                      <div className="text-[0.65rem] uppercase tracking-[0.2em] text-muted">
                        Keys N / P
                      </div>
                    ) : null}
                    {!selectedEncounter.isRunning && !combatRequirementsMet ? (
                      <p className="text-xs text-muted">
                        {combatRequirementsMessage}
                      </p>
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
                <div className="space-y-2">
                  {orderedParticipants.map((participant, index) => (
                    <div
                      key={participant.id}
                      className={`rounded-xl border px-3 py-3 text-sm transition hover:border-accent/50 ${
                        index === activeIndex
                          ? "border-l-4 border-accent bg-surface-strong text-foreground ring-2 ring-[var(--ring)]"
                          : "border-black/10 bg-surface text-foreground"
                      } ${
                        effectiveTargetId === participant.id
                          ? "targeted-outline"
                          : ""
                      } ${combatMode ? "cursor-pointer" : ""}`}
                      onClick={() => {
                        if (!combatMode) {
                          return;
                        }
                        setDamageTargetId(participant.id);
                      }}
                    >
                      <div className="grid gap-3 md:grid-cols-[1.2fr_repeat(3,minmax(0,1fr))] md:items-center">
                        <div>
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
                          {index === activeIndex ? (
                            <div className="mt-2">
                              <Pill label="Active" tone="accent" />
                            </div>
                          ) : null}
                          {participant.conditions.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
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
                        <div>
                          <FieldLabel>Init</FieldLabel>
                          <p className="font-mono text-sm font-semibold">
                            {participant.initiative ?? "—"}
                          </p>
                        </div>
                        <div>
                          <FieldLabel>AC</FieldLabel>
                          <p className="font-mono text-sm font-semibold">{participant.ac ?? "—"}</p>
                        </div>
                        <div>
                          <FieldLabel>HP</FieldLabel>
                          <p className="font-mono text-sm font-semibold">
                            {participant.currentHp ?? "—"}{participant.maxHp != null ? ` / ${participant.maxHp}` : ""}
                          </p>
                          {participant.maxHp != null && participant.currentHp != null && (
                            <HpBar
                              current={participant.currentHp}
                              max={participant.maxHp}
                              className="mt-1.5"
                            />
                          )}
                          {participant.tempHp ? (
                            <p className="mt-1 font-mono text-xs text-muted">
                              +{participant.tempHp} temp
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
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
                <div className="rounded-2xl border border-black/5 bg-surface p-4 text-sm text-muted">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">Reference</p>
                  {activePc ? (
                    <div className="mt-3 space-y-3">
                      <p className="text-base font-semibold text-foreground">{activePc.name}</p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted">Ability</p>
                          <p>
                            STR {activePc.abilities.str} · DEX {activePc.abilities.dex} · CON{" "}
                            {activePc.abilities.con}
                          </p>
                          <p>
                            INT {activePc.abilities.int} · WIS {activePc.abilities.wis} · CHA{" "}
                            {activePc.abilities.cha}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted">Saves</p>
                          <p>
                            STR {getSaveValue("str")} · DEX {getSaveValue("dex")} · CON{" "}
                            {getSaveValue("con")}
                          </p>
                          <p>
                            INT {getSaveValue("int")} · WIS {getSaveValue("wis")} · CHA{" "}
                            {getSaveValue("cha")}
                          </p>
                        </div>
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
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.25em] text-muted">Session notes (optional)</p>
                <textarea
                  className="w-full rounded-xl border border-black/10 bg-surface-strong px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  rows={3}
                  placeholder="What happened? Any notable moments?"
                  value={endEncounterNotes}
                  onChange={(e) => setEndEncounterNotes(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  onClick={() => {
                    dispatchEncounterEvent(selectedEncounter.id, {
                      t: "ENCOUNTER_COMPLETED",
                      ...(endEncounterNotes.trim() ? { notes: endEncounterNotes.trim() } : {}),
                    });
                    setIsEndEncounterOpen(false);
                    setEndEncounterNotes("");
                  }}
                >
                  Complete Encounter
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
