"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { ParticipantAvatar } from "../../components/ParticipantAvatar";
import { EncounterCompleteDialog } from "../../components/EncounterCompleteDialog";
import { MonsterStatBlockDialog } from "../../components/MonsterStatBlockDialog";
import { QuickActionPopover } from "../../components/QuickActionPopover";
import { Button, Card, ConditionChip, ConditionPicker, Dialog, DialogClose, DialogContent, DialogTitle, FieldLabel, HpBar, Input, PageShell, Pill, SectionTitle, Select, cn } from "../../components/ui";
import { SRD_CONDITIONS, SRD_CONDITION_DESCRIPTIONS } from "../../lib/data/srd";
import { getPassivePerception } from "../../lib/engine/pcEngine";
import { useAppStore } from "../../lib/store/appStore";
import type { DeathSaves, Pc } from "../../lib/models/types";

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
  const [damageAmount, setDamageAmount] = useState("");
  const [expandedPrepIds, setExpandedPrepIds] = useState<Set<string>>(new Set());
  const [isEndEncounterOpen, setIsEndEncounterOpen] = useState(false);
  const [completedEncounterSnapshot, setCompletedEncounterSnapshot] = useState<typeof selectedEncounter | null>(null);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [statBlockMonsterId, setStatBlockMonsterId] = useState<string | null>(null);
  const [referencePinnedId, setReferencePinnedId] = useState<string | null>(null);
  const participantRowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

  // For the combat initiative list: living participants first, defeated at the bottom.
  // orderedParticipants (living only) is preserved for activeIndex/nextParticipant/activeParticipant.
  const combatListParticipants = useMemo(
    () => [...orderedParticipants, ...defeatedParticipants],
    [orderedParticipants, defeatedParticipants]
  );

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

  // combatMode is derived from the encounter event log (COMBAT_MODE_SET), not local state.
  // This means it survives page reloads and is part of the undoable event history.
  const combatMode = selectedEncounter?.combatMode === "live";

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

  const showStatBlock = useCallback(
    (participant: import("../../lib/models/types").EncounterParticipant) => {
      if (participant.kind === "monster" && participant.refId) {
        setStatBlockMonsterId(participant.refId);
      }
    },
    []
  );

  const isRunning = !!selectedEncounter?.isRunning;

  useHotkeys(
    ["n", "right"],
    () => {
      if (selectedEncounter) advanceEncounterTurn(selectedEncounter.id, 1);
    },
    { enabled: isRunning, preventDefault: true },
    [selectedEncounter, advanceEncounterTurn]
  );

  useHotkeys(
    ["p", "left"],
    () => {
      if (selectedEncounter) advanceEncounterTurn(selectedEncounter.id, -1);
    },
    { enabled: isRunning, preventDefault: true },
    [selectedEncounter, advanceEncounterTurn]
  );

  useEffect(() => {
    if (!selectedEncounter?.activeParticipantId) return;
    const el = participantRowRefs.current.get(selectedEncounter.activeParticipantId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedEncounter?.activeParticipantId]);

  // Lock page scroll in combat mode — prevents the document from scrolling behind the fixed overlay.
  // Uses "clip" (not "hidden") to avoid scrollbar-width layout shifts.
  useEffect(() => {
    if (!combatMode) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "clip";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [combatMode]);

  // Clear the pinned reference panel target whenever the active participant changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReferencePinnedId(null);
  }, [selectedEncounter?.activeParticipantId]);

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
      case "DEATH_SAVES_SET":
        return `Death saves: ${name || "Participant"} (${event.value.successes}S/${event.value.failures}F)`;
      case "COMBAT_MODE_SET":
        return `Switched to ${event.mode} mode`;
      case "ENCOUNTER_COMPLETED":
        return "Encounter completed";
      default:
        return "Action recorded";
    }
  };

  const handleRollMonsterInitiative = () => {
    if (!selectedEncounter) return;
    selectedEncounter.participants.forEach((participant) => {
      if (participant.kind === "pc") return;
      const monster = participant.refId ? monstersById.get(participant.refId) : undefined;
      const dex = monster?.abilities?.dex ?? 10;
      const dexMod = Math.floor((dex - 10) / 2);
      const roll = Math.floor(Math.random() * 20) + 1 + dexMod;
      dispatchEncounterEvent(selectedEncounter.id, {
        t: "INITIATIVE_SET",
        participantId: participant.id,
        value: roll,
      });
    });
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

  // -------------------------------------------------------------------------
  // COMBAT MODE — fixed viewport overlay, no PageShell, no document scroll
  // -------------------------------------------------------------------------
  if (combatMode && selectedEncounter) {
    const applyDamage = (amount: number) => {
      if (!activeParticipant || !selectedEncounter) return;
      dispatchEncounterEvent(selectedEncounter.id, {
        t: "DAMAGE_APPLIED",
        participantId: activeParticipant.id,
        amount,
      });
      setDamageAmount("");
    };

    const applyHeal = (amount: number) => {
      if (!activeParticipant || !selectedEncounter) return;
      dispatchEncounterEvent(selectedEncounter.id, {
        t: "HEAL_APPLIED",
        participantId: activeParticipant.id,
        amount,
      });
      setDamageAmount("");
    };

    // Reference panel resolution
    const refPanelParticipantId = referencePinnedId ?? selectedEncounter.activeParticipantId;
    const refParticipant = refPanelParticipantId
      ? selectedEncounter.participants.find((p) => p.id === refPanelParticipantId) ?? null
      : null;
    const refPc =
      refParticipant?.kind === "pc" && refParticipant.refId
        ? pcsById.get(refParticipant.refId) ?? null
        : null;
    const refMonster =
      refParticipant?.kind === "monster" && refParticipant.refId
        ? monstersById.get(refParticipant.refId) ?? null
        : null;

    const hpInputDisabled = !activeParticipant || activeParticipant.maxHp === null;
    const hpAmount = Number(damageAmount);
    const hpActionDisabled = hpInputDisabled || !damageAmount || !Number.isFinite(hpAmount) || hpAmount <= 0;

    return (
      <>
        {/* ------------------------------------------------------------------ */}
        {/* Three-column fixed overlay                                          */}
        {/* ------------------------------------------------------------------ */}
        <div className="fixed inset-x-0 bottom-0 top-[var(--nav-height)] flex overflow-hidden bg-background">

          {/* ================================================================ */}
          {/* LEFT PANEL — 280px, no scroll, targets activeParticipant.id      */}
          {/* ================================================================ */}
          <div className="flex w-[280px] shrink-0 flex-col gap-3 overflow-hidden border-r border-black/10 p-4">

            {activeParticipant === null ? (
              /* Null state */
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
                <p className="text-sm text-muted">End of round — advance turn or stop combat.</p>
                <Button
                  onClick={() => advanceEncounterTurn(selectedEncounter.id, 1)}
                  disabled={!isRunning}
                >
                  Next Turn →
                </Button>
                <Button
                  variant="outline"
                  onClick={() => stopEncounter(selectedEncounter.id)}
                >
                  Stop combat
                </Button>
              </div>
            ) : (
              <>
                {/* 1. Encounter name */}
                <p className="truncate text-xs text-muted">{selectedEncounter.name}</p>

                {/* 2. Round N + Prev / Next Turn */}
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    className="h-8 px-2 text-xs"
                    onClick={() => advanceEncounterTurn(selectedEncounter.id, -1)}
                    disabled={!isRunning || !orderedParticipants.length}
                    aria-label="Previous turn"
                  >
                    ← Prev
                  </Button>
                  <span className="min-w-[2rem] text-center font-mono text-2xl font-bold text-foreground">
                    {selectedEncounter.round}
                  </span>
                  <Button
                    className="flex-1 py-2 text-sm font-bold"
                    onClick={() => advanceEncounterTurn(selectedEncounter.id, 1)}
                    disabled={!isRunning || !orderedParticipants.length}
                    aria-label="Next turn (N)"
                  >
                    Next Turn →
                  </Button>
                </div>

                {/* 3. Current participant card */}
                <div className="rounded-xl bg-surface-strong p-3 space-y-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ParticipantAvatar
                      name={activeParticipant.name}
                      visual={activeParticipant.visual}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/10 bg-surface object-cover text-[0.7rem] font-semibold text-muted"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">{activeParticipant.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Pill label={activeParticipant.kind.toUpperCase()} tone="neutral" />
                        <span className="font-mono text-xs text-muted">
                          Init {activeParticipant.initiative ?? "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                  {activeParticipant.maxHp !== null && activeParticipant.currentHp !== null ? (
                    <>
                      <p className="font-mono text-sm">
                        {activeParticipant.currentHp} / {activeParticipant.maxHp}
                      </p>
                      <HpBar
                        current={activeParticipant.currentHp}
                        max={activeParticipant.maxHp}
                      />
                    </>
                  ) : (
                    <p className="text-xs text-muted">HP not tracked</p>
                  )}
                </div>

                {/* 4. Next up preview */}
                {nextParticipant && (
                  <p className="text-xs text-muted truncate">
                    Next: <span className="font-semibold text-foreground">{nextParticipant.name}</span>
                  </p>
                )}

                {/* 5. Damage / Heal */}
                <div className="space-y-1.5">
                  <Input
                    type="number"
                    min={1}
                    className="w-full"
                    placeholder="Amount"
                    value={damageAmount}
                    onChange={(e) => setDamageAmount(e.target.value.replace(/[^0-9]/g, ""))}
                    disabled={hpInputDisabled}
                  />
                  <div className="flex gap-1.5">
                    <Button
                      className="flex-1 text-xs py-1.5"
                      style={{
                        backgroundColor: "var(--btn-damage-bg)",
                        color: "var(--btn-damage-fg)",
                      }}
                      onClick={() => applyDamage(hpAmount)}
                      disabled={hpActionDisabled}
                    >
                      − Damage
                    </Button>
                    <Button
                      className="flex-1 text-xs py-1.5"
                      style={{
                        backgroundColor: "var(--btn-heal-bg)",
                        color: "var(--btn-heal-fg)",
                      }}
                      onClick={() => applyHeal(hpAmount)}
                      disabled={hpActionDisabled}
                    >
                      + Heal
                    </Button>
                  </div>
                </div>

                {/* 6. Condition picker */}
                <ConditionPicker
                  conditions={SRD_CONDITIONS}
                  active={activeParticipant.conditions}
                  onChange={(next) => {
                    dispatchEncounterEvent(selectedEncounter.id, {
                      t: "CONDITIONS_SET",
                      participantId: activeParticipant.id,
                      value: next,
                    });
                  }}
                />

                {/* 7. Tablet stat row (lg:hidden) */}
                <div className="lg:hidden font-mono text-xs text-muted">
                  {(activePc || activeMonster) ? (
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                      {(["str", "dex", "con", "int", "wis", "cha"] as const).map((k) => (
                        <span key={k}>
                          {k.toUpperCase()} {(activePc ?? activeMonster)!.abilities[k]}
                        </span>
                      ))}
                      <span>AC {activeParticipant.ac ?? "—"}</span>
                    </div>
                  ) : (
                    <span>AC {activeParticipant.ac ?? "—"}</span>
                  )}
                </div>

                {/* 8. Last action + Undo */}
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex min-w-0 flex-1 items-center rounded-xl px-2.5 py-1.5 text-xs",
                      lastEvent?.t === "DAMAGE_APPLIED"
                        ? "bg-[var(--hp-low-bg)] text-[var(--hp-low)]"
                        : lastEvent?.t === "HEAL_APPLIED"
                          ? "bg-[var(--hp-full-bg)] text-[var(--hp-full)]"
                          : lastEvent?.t === "TURN_ADVANCED"
                            ? "bg-accent/10 text-accent"
                            : "bg-surface text-muted"
                    )}
                  >
                    <span className="truncate">
                      {lastEvent ? formatEventSummary(lastEvent) : "No actions yet"}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold"
                    onClick={() => undoEncounterEvent(selectedEncounter.id)}
                    disabled={!selectedEncounter.eventLog.length}
                  >
                    ↩ Undo
                  </Button>
                </div>

                {/* 9. Stop / End — mt-auto pushes to bottom */}
                <div className="mt-auto border-t border-black/10 pt-3 flex flex-wrap gap-2">
                  {isRunning ? (
                    <Button
                      variant="outline"
                      className="text-xs px-3 py-1.5"
                      onClick={() => stopEncounter(selectedEncounter.id)}
                    >
                      Stop
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="text-xs px-3 py-1.5"
                      onClick={() => startEncounter(selectedEncounter.id)}
                      disabled={!combatRequirementsMet}
                    >
                      Start
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="text-xs px-3 py-1.5"
                    onClick={() =>
                      dispatchEncounterEvent(selectedEncounter.id, {
                        t: "COMBAT_MODE_SET",
                        mode: "prep",
                      })
                    }
                  >
                    ← Prep
                  </Button>
                  <Button
                    variant="outline"
                    className="ml-auto text-xs px-3 py-1.5"
                    onClick={() => setIsEndEncounterOpen(true)}
                    disabled={isRunning}
                  >
                    End
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* ================================================================ */}
          {/* INITIATIVE LIST — flex-1, scrolls internally                     */}
          {/* ================================================================ */}
          <div className="flex flex-1 flex-col overflow-y-auto p-3 gap-1.5">
            {combatListParticipants.map((participant) => {
              const isActive = participant.id === selectedEncounter.activeParticipantId;
              const isDefeatedRow = isDefeated(participant.currentHp);
              const visibleConds = participant.conditions.slice(0, 2);
              const overflowCount = participant.conditions.length - 2;

              return (
                <div
                  key={participant.id}
                  ref={(el) => {
                    if (el) participantRowRefs.current.set(participant.id, el);
                    else participantRowRefs.current.delete(participant.id);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
                    isActive
                      ? "border-accent bg-surface-strong ring-2 ring-[var(--ring)]"
                      : "border-black/10 bg-surface",
                    isDefeatedRow ? "opacity-60" : "",
                    participant.kind === "monster" && !isDefeatedRow
                      ? "cursor-pointer lg:hover:border-accent/50"
                      : ""
                  )}
                  onClick={() => {
                    if (participant.kind === "monster" && !isDefeatedRow) {
                      setReferencePinnedId(participant.id);
                    }
                  }}
                >
                  <ParticipantAvatar
                    name={participant.name}
                    visual={participant.visual}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/10 bg-surface-strong object-cover text-[0.6rem] font-semibold text-muted"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="truncate text-sm font-semibold">{participant.name}</p>
                      <Pill label={participant.kind.toUpperCase()} tone="neutral" />
                    </div>
                    {participant.conditions.length > 0 && (
                      <div className="flex items-center gap-1 mt-0.5 flex-nowrap overflow-hidden">
                        {visibleConds.map((cond) => (
                          <ConditionChip
                            key={cond}
                            label={cond}
                            description={SRD_CONDITION_DESCRIPTIONS[cond]}
                          />
                        ))}
                        {overflowCount > 0 && (
                          <span className="text-xs text-muted shrink-0">+{overflowCount}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right font-mono text-xs text-muted space-y-0.5">
                    <div>
                      {participant.initiative ?? "—"} · {participant.ac ?? "—"} ·{" "}
                      {participant.maxHp !== null && participant.currentHp !== null
                        ? `${participant.currentHp}/${participant.maxHp}`
                        : "—"}
                    </div>
                    {participant.maxHp !== null && participant.currentHp !== null && (
                      <HpBar
                        current={participant.currentHp}
                        max={participant.maxHp}
                        className="w-16"
                      />
                    )}
                  </div>
                  <div
                    className="shrink-0 flex gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <QuickActionPopover
                      participantName={participant.name}
                      open={openPopoverId === participant.id}
                      onOpenChange={(o) => setOpenPopoverId(o ? participant.id : null)}
                      onDamage={(amount) => {
                        dispatchEncounterEvent(selectedEncounter.id, {
                          t: "DAMAGE_APPLIED",
                          participantId: participant.id,
                          amount,
                        });
                      }}
                      onHeal={(amount) => {
                        dispatchEncounterEvent(selectedEncounter.id, {
                          t: "HEAL_APPLIED",
                          participantId: participant.id,
                          amount,
                        });
                      }}
                    >
                      <Button variant="outline" className="h-7 px-2.5 text-xs">
                        ± HP
                      </Button>
                    </QuickActionPopover>
                    {/* Tablet stat block button — hidden on desktop (reference panel handles it) */}
                    {participant.kind === "monster" && participant.refId && (
                      <Button
                        variant="outline"
                        className="h-7 px-2.5 text-xs lg:hidden"
                        onClick={() => showStatBlock(participant)}
                        aria-label={`View stat block for ${participant.name}`}
                      >
                        Stat Block
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {combatListParticipants.length === 0 && (
              <p className="text-sm text-muted p-3">No participants in this encounter.</p>
            )}
          </div>

          {/* ================================================================ */}
          {/* REFERENCE PANEL — 300px, desktop only (hidden lg:flex)           */}
          {/* ================================================================ */}
          <div className="hidden lg:flex w-[300px] shrink-0 flex-col overflow-y-auto border-l border-black/10 p-4 gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Reference</p>

            {!refParticipant ? (
              <p className="text-sm text-muted">Click a monster row to pin its stat block here.</p>
            ) : refPc ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <ParticipantAvatar
                    name={refPc.name}
                    visual={refPc.visual}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-surface-strong object-cover text-[0.65rem] font-semibold text-muted"
                  />
                  <div>
                    <p className="font-semibold">{refPc.name}</p>
                    <p className="text-xs text-muted">{refPc.className} {refPc.level} · AC {refPc.ac}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 font-mono text-xs">
                  {(["str", "dex", "con", "int", "wis", "cha"] as const).map((k) => (
                    <div key={k} className="rounded bg-surface-strong p-1.5 text-center">
                      <p className="text-muted uppercase">{k}</p>
                      <p className="font-semibold">{refPc.abilities[k]}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs text-muted uppercase tracking-[0.2em]">Saves</p>
                  <p className="font-mono text-xs">
                    {(["str", "dex", "con", "int", "wis", "cha"] as const).map((k) => {
                      const mod = getAbilityMod(refPc.abilities[k]);
                      const prof = refPc.saveProficiencies[k] ? refPc.proficiencyBonus : 0;
                      const bonus = refPc.saveBonuses[k] ?? 0;
                      const total = mod + prof + bonus;
                      return `${k.toUpperCase()} ${total >= 0 ? "+" : ""}${total}`;
                    }).join(" · ")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted uppercase tracking-[0.2em]">Passive Perception</p>
                  <p className="font-mono text-xs">{getPassivePerception(refPc)}</p>
                </div>
                {(refPc.spellcasting?.spellSlots?.length ?? 0) > 0 && (
                  <SpellSlotsReadout pc={refPc} />
                )}
                {refPc.notes && (
                  <div>
                    <p className="text-xs text-muted uppercase tracking-[0.2em]">Notes</p>
                    <p className="text-xs">{refPc.notes}</p>
                  </div>
                )}
              </div>
            ) : refMonster ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold">{refMonster.name}</p>
                  <p className="text-xs text-muted">
                    {refMonster.size} {refMonster.type} · CR {refMonster.challenge} · AC {refMonster.ac} · HP {refMonster.hp}
                  </p>
                  <p className="text-xs text-muted">Speed {refMonster.speed}</p>
                </div>
                <div className="grid grid-cols-3 gap-1 font-mono text-xs">
                  {(["str", "dex", "con", "int", "wis", "cha"] as const).map((k) => (
                    <div key={k} className="rounded bg-surface-strong p-1.5 text-center">
                      <p className="text-muted uppercase">{k}</p>
                      <p className="font-semibold">{refMonster.abilities[k]}</p>
                    </div>
                  ))}
                </div>
                {refMonster.senses && (
                  <p className="text-xs text-muted">Senses {refMonster.senses}</p>
                )}
                {(refMonster.traits?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs text-muted uppercase tracking-[0.2em]">Traits</p>
                    <p className="text-xs">{refMonster.traits?.join(" ")}</p>
                  </div>
                )}
                {(refMonster.actions?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs text-muted uppercase tracking-[0.2em]">Actions</p>
                    <p className="text-xs">{refMonster.actions?.join(" ")}</p>
                  </div>
                )}
              </div>
            ) : (
              /* Custom NPC — no refId */
              <div className="space-y-2 text-sm">
                <p className="font-semibold">{refParticipant.name}</p>
                <p className="text-xs text-muted">{refParticipant.kind.toUpperCase()} · AC {refParticipant.ac ?? "—"} · Init {refParticipant.initiative ?? "—"}</p>
                {refParticipant.conditions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {refParticipant.conditions.map((c) => (
                      <ConditionChip key={c} label={c} description={SRD_CONDITION_DESCRIPTIONS[c]} />
                    ))}
                  </div>
                )}
                {refParticipant.notes && (
                  <p className="text-xs text-muted">{refParticipant.notes}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Dialogs (rendered outside the fixed overlay so they stack above it) */}
        {/* ------------------------------------------------------------------ */}
        {completedEncounterSnapshot && (
          <EncounterCompleteDialog
            encounter={completedEncounterSnapshot}
            monstersById={monstersById}
            open={!!completedEncounterSnapshot}
            onClose={() => setCompletedEncounterSnapshot(null)}
          />
        )}

        <MonsterStatBlockDialog
          monster={statBlockMonsterId ? monstersById.get(statBlockMonsterId) ?? null : null}
          open={!!statBlockMonsterId}
          onClose={() => setStatBlockMonsterId(null)}
        />

        {/* End encounter dialog */}
        <Dialog
          open={isEndEncounterOpen}
          onOpenChange={(open) => {
            if (!open) setIsEndEncounterOpen(false);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogTitle>End encounter?</DialogTitle>
            <p className="text-sm text-muted">
              This will complete the encounter and move it out of the active list.
            </p>
            <div className="mt-4 flex justify-end gap-2">
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
          </DialogContent>
        </Dialog>
      </>
    );
  }

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
                    {selectedEncounter.participants.length > 0 && !selectedEncounter.isRunning && (
                      <Button
                        variant="outline"
                        onClick={handleRollMonsterInitiative}
                      >
                        Roll Monster Initiative
                      </Button>
                    )}
                    <Button
                      onClick={() => dispatchEncounterEvent(selectedEncounter.id, { t: "COMBAT_MODE_SET", mode: "live" })}
                      disabled={!selectedEncounter.isRunning && !combatRequirementsMet}
                    >
                      Go to combat mode
                    </Button>
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
                    {/* End Encounter — graduates this encounter to 'completed' */}
                    <Button
                      variant="outline"
                      className="ml-auto text-xs"
                      onClick={() => { setIsEndEncounterOpen(true); }}
                      disabled={selectedEncounter.isRunning}
                    >
                      End Encounter
                    </Button>
                    </>
                  )}
                </div>
              </div>

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
                                      description={SRD_CONDITION_DESCRIPTIONS[cond]}
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

      {completedEncounterSnapshot && (
        <EncounterCompleteDialog
          encounter={completedEncounterSnapshot}
          monstersById={monstersById}
          open={!!completedEncounterSnapshot}
          onClose={() => setCompletedEncounterSnapshot(null)}
        />
      )}

    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// DmDeathSaveTracker — compact death save circles for the DM encounter view
// ---------------------------------------------------------------------------
function DmDeathSaveTracker({
  deathSaves,
  onSave,
}: {
  deathSaves: DeathSaves;
  onSave: (ds: DeathSaves) => void;
}) {
  const { successes, failures, stable } = deathSaves;

  if (stable || successes >= 3) {
    return (
      <div className="mt-2 text-xs font-semibold text-green-600">
        ✓ Stable
      </div>
    );
  }
  if (failures >= 3) {
    return (
      <div className="mt-2 text-xs font-semibold text-red-600">
        ✗ Death
      </div>
    );
  }

  const handleCircle = (type: "success" | "failure", i: number) => {
    const current = type === "success" ? successes : failures;
    const next = Math.max(0, Math.min(3, i < current ? i : i + 1));
    if (type === "success") onSave({ successes: next, failures, stable: next >= 3 });
    else onSave({ successes, failures: next, stable });
  };

  return (
    <div className="mt-2 flex items-center gap-3 text-xs">
      <span className="text-[0.65rem] uppercase tracking-[0.2em] text-muted">Death saves</span>
      <div className="flex items-center gap-1">
        <span className="text-[0.6rem] text-green-600 mr-0.5">S</span>
        {Array.from({ length: 3 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleCircle("success", i)}
            className={cn(
              "h-3.5 w-3.5 rounded-full border-2 transition-colors",
              i < successes
                ? "border-green-500 bg-green-500"
                : "border-black/20 bg-transparent hover:border-green-400"
            )}
            aria-label={`Death save success ${i + 1}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[0.6rem] text-red-500 mr-0.5">F</span>
        {Array.from({ length: 3 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleCircle("failure", i)}
            className={cn(
              "h-3.5 w-3.5 rounded-full border-2 transition-colors",
              i < failures
                ? "border-red-500 bg-red-500"
                : "border-black/20 bg-transparent hover:border-red-400"
            )}
            aria-label={`Death save failure ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SpellSlotsReadout — read-only spell slot pips for the Reference panel
// ---------------------------------------------------------------------------
function SpellSlotsReadout({ pc }: { pc: Pc }) {
  const slots = pc.spellcasting?.spellSlots ?? [];
  const ability = pc.spellcasting?.spellcastingAbility;
  if (!slots.length) return null;

  const abilityMod = ability ? getAbilityMod(pc.abilities[ability]) : 0;
  const saveDc = ability ? 8 + pc.proficiencyBonus + abilityMod : null;
  const atkBonus = ability ? pc.proficiencyBonus + abilityMod : null;

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Spell Slots</p>
      {saveDc !== null && (
        <p className="mb-1 text-xs text-muted">
          Save DC {saveDc} · Atk {atkBonus! >= 0 ? `+${atkBonus}` : `${atkBonus}`}
        </p>
      )}
      <div className="space-y-1">
        {slots.map((slot) => {
          const available = slot.total - slot.used;
          return (
            <div key={slot.level} className="flex items-center gap-2">
              <span className="w-8 text-[0.65rem] text-muted">Lv {slot.level}</span>
              <div className="flex gap-1">
                {Array.from({ length: slot.total }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-3 w-3 rounded-full border",
                      i < available
                        ? "border-accent bg-accent"
                        : "border-black/20 bg-transparent"
                    )}
                  />
                ))}
              </div>
              <span className="text-[0.65rem] text-muted">
                {available}/{slot.total}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
