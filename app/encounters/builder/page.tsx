"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MonsterPicker } from "../../components/MonsterPicker";
import { ParticipantAvatar } from "../../components/ParticipantAvatar";
import { Button, Card, Dialog, DialogClose, DialogContent, DialogTitle, FieldLabel, Input, PageShell, Pill, SectionTitle, Select } from "../../components/ui";
import {
  estimateChallengeFromDefenses,
  evaluateEncounterDifficulty,
  formatTotalChallenge,
  formatChallenge,
  getEncounterDifficultyBreakdown,
  getTotalChallenge,
  parseChallenge,
  suggestUniqueName,
} from "../../lib/engine/selectors";
import { useAppStore } from "../../lib/store/appStore";

type DraftMonster = {
  draftId: string;
  name: string;
  refId: string;
  ac: number;
  hp: number;
  visual?: { imageUrl?: string; fallback: "initials" };
};

const getParticipantChallenge = (
  participant: {
    kind: "pc" | "monster" | "npc";
    refId?: string;
    ac: number | null;
    maxHp: number | null;
    currentHp: number | null;
  },
  challengeByMonsterId: Map<string, string>
) => {
  if (participant.kind === "pc") {
    return null;
  }
  if (participant.refId) {
    const refChallenge = challengeByMonsterId.get(participant.refId);
    if (refChallenge) {
      return refChallenge;
    }
  }
  return estimateChallengeFromDefenses(
    participant.maxHp ?? participant.currentHp ?? 1,
    participant.ac ?? 10
  );
};

const formatMultiplier = (value: number) =>
  Number.isInteger(value) ? `${value}` : value.toFixed(1);

export default function EncounterBuilderPage() {
  const {
    state,
    addEncounter,
    updateEncounter,
    removeEncounter,
    addEncounterParticipant,
    updateEncounterParticipant,
    removeEncounterParticipant,
  } = useAppStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", location: "" });
  const [createDraftMonsters, setCreateDraftMonsters] = useState<DraftMonster[]>([]);
  const [createPartyIds, setCreatePartyIds] = useState<Set<string>>(new Set());

  const [editingEncounterId, setEditingEncounterId] = useState<string | null>(null);
  const [encounterDraft, setEncounterDraft] = useState({ name: "", location: "" });
  const [activeParticipantActionId, setActiveParticipantActionId] = useState<string | null>(null);

  const [customForm, setCustomForm] = useState({
    name: "",
    kind: "npc" as "npc" | "monster",
    ac: "",
    hp: "",
  });

  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [partySelection, setPartySelection] = useState<Set<string>>(new Set());

  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [variantSourceId, setVariantSourceId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState({ name: "", ac: "", hp: "" });
  const [isMonsterPickerModalOpen, setIsMonsterPickerModalOpen] = useState(false);
  const [monsterPickerMode, setMonsterPickerMode] = useState<"create" | "edit" | null>(null);

  const selectedEncounter = useMemo(() => {
    if (!editingEncounterId) {
      return null;
    }
    const encounter = state.encounters.find((entry) => entry.id === editingEncounterId) ?? null;
    if (!encounter || encounter.isRunning) {
      return null;
    }
    return encounter;
  }, [editingEncounterId, state.encounters]);

  const builderLocked = !!selectedEncounter?.isRunning;

  const monstersById = useMemo(
    () => new Map(state.monsters.map((monster) => [monster.id, monster])),
    [state.monsters]
  );

  const monsterChallengeById = useMemo(
    () => new Map(state.monsters.map((monster) => [monster.id, monster.challenge])),
    [state.monsters]
  );

  const pcsById = useMemo(
    () => new Map(state.pcs.map((pc) => [pc.id, pc])),
    [state.pcs]
  );

  const encounterNames = selectedEncounter?.participants.map((participant) => participant.name) ?? [];

  const createPartyMembers = useMemo(
    () => state.pcs.filter((pc) => createPartyIds.has(pc.id)),
    [createPartyIds, state.pcs]
  );

  const createChallenges = useMemo(
    () =>
      createDraftMonsters
        .map((monster) => monsterChallengeById.get(monster.refId) ?? "0")
        .filter(Boolean),
    [createDraftMonsters, monsterChallengeById]
  );

  const createTotalCr = useMemo(
    () => formatTotalChallenge(getTotalChallenge(createChallenges)),
    [createChallenges]
  );

  const createDifficulty = useMemo(
    () => evaluateEncounterDifficulty(createChallenges, createPartyMembers.map((pc) => pc.level)),
    [createChallenges, createPartyMembers]
  );

  const createDifficultyBreakdown = useMemo(
    () => getEncounterDifficultyBreakdown(createChallenges, createPartyMembers.map((pc) => pc.level)),
    [createChallenges, createPartyMembers]
  );

  const selectedEncounterChallenges = useMemo(() => {
    if (!selectedEncounter) {
      return [];
    }
    return selectedEncounter.participants
      .map((participant) => getParticipantChallenge(participant, monsterChallengeById))
      .filter((challenge): challenge is string => !!challenge);
  }, [monsterChallengeById, selectedEncounter]);

  const selectedEncounterPartyLevels = useMemo(() => {
    if (!selectedEncounter) {
      return [];
    }
    return selectedEncounter.participants
      .filter((participant) => participant.kind === "pc" && participant.refId)
      .map((participant) => pcsById.get(participant.refId!))
      .filter((pc): pc is NonNullable<typeof pc> => !!pc)
      .map((pc) => pc.level);
  }, [pcsById, selectedEncounter]);

  const selectedEncounterTotalCr = useMemo(
    () => formatTotalChallenge(getTotalChallenge(selectedEncounterChallenges)),
    [selectedEncounterChallenges]
  );

  const selectedEncounterDifficulty = useMemo(
    () => evaluateEncounterDifficulty(selectedEncounterChallenges, selectedEncounterPartyLevels),
    [selectedEncounterChallenges, selectedEncounterPartyLevels]
  );

  const selectedEncounterDifficultyBreakdown = useMemo(
    () => getEncounterDifficultyBreakdown(selectedEncounterChallenges, selectedEncounterPartyLevels),
    [selectedEncounterChallenges, selectedEncounterPartyLevels]
  );

  const createSummary = useMemo(() => {
    if (!createDraftMonsters.length) {
      return {
        count: 0,
        totalHp: 0,
        averageAc: 0,
        highestCr: "0",
      };
    }
    const count = createDraftMonsters.length;
    const totalHp = createDraftMonsters.reduce((sum, monster) => sum + monster.hp, 0);
    const totalAc = createDraftMonsters.reduce((sum, monster) => sum + monster.ac, 0);
    const highestCrNumber = createDraftMonsters.reduce((highest, monster) => {
      const source = monstersById.get(monster.refId);
      const sourceCr = source ? parseChallenge(source.challenge) : 0;
      return Math.max(highest, sourceCr);
    }, 0);
    return {
      count,
      totalHp,
      averageAc: Math.round(totalAc / count),
      highestCr: formatChallenge(highestCrNumber),
    };
  }, [createDraftMonsters, monstersById]);

  const existingPcRefIds = new Set(
    selectedEncounter?.participants
      .filter((participant) => participant.kind === "pc" && participant.refId)
      .map((participant) => participant.refId) ?? []
  );

  const activeVariantSource =
    selectedEncounter?.participants.find((participant) => participant.id === variantSourceId) ??
    null;

  const variantComputedCr = estimateChallengeFromDefenses(
    Number(variantForm.hp) || 1,
    Number(variantForm.ac) || 10
  );

  const openEditOverlay = (encounterId: string) => {
    const encounter = state.encounters.find((entry) => entry.id === encounterId);
    if (!encounter || encounter.isRunning) {
      return;
    }
    setEditingEncounterId(encounter.id);
    setEncounterDraft({
      name: encounter.name,
      location: encounter.location ?? "",
    });
  };

  const closeEditOverlay = useCallback(() => {
    setEditingEncounterId(null);
    setEncounterDraft({ name: "", location: "" });
    setActiveParticipantActionId(null);
    setIsMonsterPickerModalOpen(false);
    setMonsterPickerMode(null);
  }, []);

  const openCreateOverlay = () => {
    setCreateForm({ name: "", location: "" });
    setCreateDraftMonsters([]);
    setCreatePartyIds(new Set());
    setIsMonsterPickerModalOpen(false);
    setMonsterPickerMode(null);
    setIsCreateOpen(true);
  };

  const openCreateMonsterPicker = () => {
    if (!isCreateOpen) {
      return;
    }
    setMonsterPickerMode("create");
    setIsMonsterPickerModalOpen(true);
  };

  const openEditMonsterPicker = () => {
    if (!selectedEncounter || builderLocked) {
      return;
    }
    setMonsterPickerMode("edit");
    setIsMonsterPickerModalOpen(true);
  };

  const closeMonsterPicker = useCallback(() => {
    setIsMonsterPickerModalOpen(false);
    setMonsterPickerMode(null);
  }, []);

  const addMonsterToCreateDraft = (monsterId: string) => {
    const monster = monstersById.get(monsterId);
    if (!monster) {
      return;
    }
    setCreateDraftMonsters((prev) => {
      const nextName = suggestUniqueName(monster.name, prev.map((entry) => entry.name));
      const nextId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${monster.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      return [
        ...prev,
        {
          draftId: nextId,
          name: nextName,
          refId: monster.id,
          ac: monster.ac,
          hp: monster.hp,
          visual: monster.visual,
        },
      ];
    });
  };

  const removeMonsterFromCreateDraft = (draftId: string) => {
    setCreateDraftMonsters((prev) => prev.filter((monster) => monster.draftId !== draftId));
  };

  const confirmCreateEncounter = useCallback(() => {
    const name = createForm.name.trim();
    if (!name) {
      return;
    }
    const encounterId = addEncounter(name, createForm.location.trim() || undefined, state.activeCampaignId ?? undefined);
    createDraftMonsters.forEach((monster) => {
      addEncounterParticipant(encounterId, {
        name: monster.name,
        kind: "monster",
        refId: monster.refId,
        initiative: null,
        ac: monster.ac,
        maxHp: monster.hp,
        currentHp: monster.hp,
        tempHp: 0,
        conditions: [],
        visual: monster.visual,
      });
    });
    createPartyMembers.forEach((pc) => {
      addEncounterParticipant(encounterId, {
        name: pc.name,
        kind: "pc",
        refId: pc.id,
        initiative: null,
        ac: pc.ac,
        maxHp: pc.maxHp,
        currentHp: pc.currentHp,
        tempHp: pc.tempHp,
        conditions: [...pc.conditions],
        visual: pc.visual,
      });
    });
    setCreateForm({ name: "", location: "" });
    setCreateDraftMonsters([]);
    setCreatePartyIds(new Set());
    setIsCreateOpen(false);
    closeMonsterPicker();
  }, [addEncounter, addEncounterParticipant, closeMonsterPicker, createDraftMonsters, createForm.location, createForm.name, createPartyMembers]);

  const saveEncounterMeta = () => {
    if (!selectedEncounter || builderLocked) {
      return;
    }
    const nextName = encounterDraft.name.trim();
    if (!nextName) {
      return;
    }
    updateEncounter(selectedEncounter.id, {
      name: nextName,
      location: encounterDraft.location.trim() || undefined,
    });
  };

  const openPartyModal = () => {
    if (!selectedEncounter || builderLocked) {
      return;
    }
    setPartySelection(new Set(state.pcs.map((pc) => pc.id)));
    setIsPartyModalOpen(true);
  };

  const confirmAddParty = useCallback(() => {
    if (!selectedEncounter || builderLocked || !partySelection.size) {
      return;
    }
    state.pcs
      .filter((pc) => partySelection.has(pc.id))
      .forEach((pc) => {
        addEncounterParticipant(selectedEncounter.id, {
          name: pc.name,
          kind: "pc",
          refId: pc.id,
          initiative: null,
          ac: pc.ac,
          maxHp: pc.maxHp,
          currentHp: pc.currentHp,
          tempHp: pc.tempHp,
          conditions: [],
          visual: pc.visual,
        });
      });
    setIsPartyModalOpen(false);
  }, [addEncounterParticipant, builderLocked, partySelection, selectedEncounter, state.pcs]);

  const requestAddMonster = (monsterId: string) => {
    if (!selectedEncounter || builderLocked) {
      return;
    }
    const monster = monstersById.get(monsterId);
    if (!monster) {
      return;
    }
    const name = suggestUniqueName(monster.name, encounterNames);
    addEncounterParticipant(selectedEncounter.id, {
      name,
      kind: "monster",
      refId: monster.id,
      initiative: null,
      ac: monster.ac,
      maxHp: monster.hp,
      currentHp: monster.hp,
      tempHp: 0,
      conditions: [],
      visual: monster.visual,
    });
  };

  const handleCustomAdd = () => {
    if (!selectedEncounter || builderLocked) {
      return;
    }
    const name = customForm.name.trim();
    if (!name) {
      return;
    }
    const hp = customForm.hp === "" ? null : Number(customForm.hp);
    addEncounterParticipant(selectedEncounter.id, {
      name,
      kind: customForm.kind,
      initiative: null,
      ac: customForm.ac === "" ? null : Number(customForm.ac),
      maxHp: hp,
      currentHp: hp,
      tempHp: 0,
      conditions: [],
      visual: { fallback: "initials" },
    });
    setCustomForm({ name: "", kind: "npc", ac: "", hp: "" });
  };

  const openVariantModal = (participantId: string) => {
    if (!selectedEncounter || builderLocked) {
      return;
    }
    const source = selectedEncounter.participants.find((participant) => participant.id === participantId);
    if (!source) {
      return;
    }
    setVariantSourceId(source.id);
    setVariantForm({
      name: suggestUniqueName(`${source.name} Variant`, encounterNames),
      ac: `${source.ac ?? ""}`,
      hp: `${source.maxHp ?? source.currentHp ?? ""}`,
    });
    setIsVariantModalOpen(true);
  };

  const confirmVariantAdd = useCallback(() => {
    if (!selectedEncounter || builderLocked || !activeVariantSource) {
      return;
    }
    const name = variantForm.name.trim();
    if (!name) {
      return;
    }
    const hp = variantForm.hp === "" ? null : Number(variantForm.hp);
    addEncounterParticipant(selectedEncounter.id, {
      name,
      kind: activeVariantSource.kind,
      refId: activeVariantSource.refId,
      initiative: null,
      ac: variantForm.ac === "" ? null : Number(variantForm.ac),
      maxHp: hp,
      currentHp: hp,
      tempHp: 0,
      conditions: [],
      visual: activeVariantSource.visual,
    });
    setIsVariantModalOpen(false);
    setVariantSourceId(null);
  }, [activeVariantSource, addEncounterParticipant, builderLocked, selectedEncounter, variantForm]);

  useEffect(() => {
    const isOverlayOpen =
      isCreateOpen ||
      isPartyModalOpen ||
      isMonsterPickerModalOpen ||
      isVariantModalOpen ||
      !!selectedEncounter;
    if (!isOverlayOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (isVariantModalOpen) {
          setIsVariantModalOpen(false);
          return;
        }
        if (isMonsterPickerModalOpen) {
          closeMonsterPicker();
          return;
        }
        if (isPartyModalOpen) {
          setIsPartyModalOpen(false);
          return;
        }
        if (isCreateOpen) {
          setIsCreateOpen(false);
          return;
        }
        if (selectedEncounter) {
          closeEditOverlay();
        }
        return;
      }

      if (event.key !== "Enter") {
        return;
      }

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "textarea") {
        return;
      }

      if (isVariantModalOpen) {
        if (!variantForm.name.trim() || !variantForm.ac || !variantForm.hp) {
          return;
        }
        event.preventDefault();
        confirmVariantAdd();
        return;
      }

      if (isPartyModalOpen) {
        if (builderLocked || !partySelection.size) {
          return;
        }
        event.preventDefault();
        confirmAddParty();
        return;
      }

      if (isCreateOpen) {
        if (!createForm.name.trim()) {
          return;
        }
        event.preventDefault();
        confirmCreateEncounter();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    builderLocked,
    closeEditOverlay,
    confirmAddParty,
    confirmCreateEncounter,
    confirmVariantAdd,
    closeMonsterPicker,
    createForm.name,
    isCreateOpen,
    isMonsterPickerModalOpen,
    isPartyModalOpen,
    isVariantModalOpen,
    selectedEncounter,
    partySelection.size,
    variantForm.ac,
    variantForm.hp,
    variantForm.name,
  ]);

  return (
    <PageShell>
      <SectionTitle
        title="Encounter Builder"
        subtitle="Overview of encounters. Add and edit in overlays."
      />

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Built Encounters</h3>
          <Button onClick={openCreateOverlay}>Add Encounter</Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(state.activeCampaignId
            ? state.encounters.filter((e) => e.campaignId === state.activeCampaignId)
            : state.encounters
          ).map((encounter) => {
            const previewParticipants = encounter.participants.slice(0, 6);
            const overflowCount = Math.max(0, encounter.participants.length - previewParticipants.length);
            return (
              <div
                key={encounter.id}
                className="rounded-2xl border border-black/10 bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{encounter.name}</p>
                    <p className="text-xs text-muted">{encounter.location || "Unknown location"}</p>
                  </div>
                  <Pill
                    label={encounter.isRunning ? "LIVE" : "PREP"}
                    tone={encounter.isRunning ? "accent" : "neutral"}
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {previewParticipants.map((participant) => (
                    <ParticipantAvatar
                      key={participant.id}
                      name={participant.name}
                      visual={participant.visual}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-surface-strong object-cover text-[0.65rem] font-semibold text-muted"
                    />
                  ))}
                  {overflowCount > 0 ? (
                    <span className="text-xs text-muted">+{overflowCount} more</span>
                  ) : null}
                  {!encounter.participants.length ? (
                    <span className="text-xs text-muted">No participants</span>
                  ) : null}
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => openEditOverlay(encounter.id)}
                    disabled={encounter.isRunning}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => removeEncounter(encounter.id)}
                    disabled={encounter.isRunning}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}
          {!(state.activeCampaignId
            ? state.encounters.some((e) => e.campaignId === state.activeCampaignId)
            : state.encounters.length) ? (
            <p className="text-sm text-muted">
              {state.activeCampaignId
                ? "No encounters in this campaign yet. Add one to start building."
                : "No encounters yet. Add one to start building."}
            </p>
          ) : null}
        </div>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent maxWidth="6xl">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>Create Encounter</DialogTitle>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-3 rounded-2xl border border-black/10 bg-surface-strong p-4">
                <div className="space-y-2">
                  <div>
                    <FieldLabel>Encounter Name</FieldLabel>
                    <Input
                      value={createForm.name}
                      onChange={(event) =>
                        setCreateForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Location</FieldLabel>
                    <Input
                      value={createForm.location}
                      onChange={(event) =>
                        setCreateForm((prev) => ({ ...prev, location: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-black/10 bg-surface px-3 py-2 text-xs text-muted">
                  <span className="uppercase tracking-[0.2em]">Summary</span>
                  <p className="mt-1">
                    {createSummary.count} monsters · Total HP {createSummary.totalHp} · Avg AC {createSummary.averageAc || "--"} · Highest CR {createSummary.highestCr}
                  </p>
                  <p className="mt-1">Total CR {createTotalCr}</p>
                  <p className="mt-1">
                    Difficulty {createDifficulty} ({createPartyMembers.length} PCs)
                  </p>
                  <p className="mt-1">
                    Base XP {createDifficultyBreakdown.baseXp} × {formatMultiplier(createDifficultyBreakdown.multiplier)} = Adjusted XP {createDifficultyBreakdown.adjustedXp}
                  </p>
                  <p className="mt-1">
                    Thresholds E/M/H/D: {createDifficultyBreakdown.thresholds.easy} / {createDifficultyBreakdown.thresholds.medium} / {createDifficultyBreakdown.thresholds.hard} / {createDifficultyBreakdown.thresholds.deadly}
                  </p>
                </div>
                <div className="rounded-xl border border-black/10 bg-surface px-3 py-3 text-xs text-muted">
                  <p className="uppercase tracking-[0.2em]">Party</p>
                  <p className="mt-1">Add party for difficulty rating based on size and level.</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCreatePartyIds(new Set(state.pcs.map((pc) => pc.id)))}
                    >
                      Add entire party
                    </Button>
                    <Button variant="outline" onClick={() => setCreatePartyIds(new Set())}>
                      Clear party
                    </Button>
                  </div>
                  {createPartyMembers.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {createPartyMembers.map((pc) => (
                        <Pill key={pc.id} label={`${pc.name} Lv ${pc.level}`} tone="neutral" />
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="rounded-xl border border-black/10 bg-surface px-3 py-3 text-xs text-muted">
                  <p className="uppercase tracking-[0.2em]">Monster picker</p>
                  <p className="mt-1">Open picker in popup and click to add monsters immediately.</p>
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={openCreateMonsterPicker}
                  >
                    Open monster picker
                  </Button>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-black/10 bg-surface p-4">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Encounter overview</h4>
                  <p className="text-xs text-muted">Click a drafted monster to remove it.</p>
                </div>
                <div className="max-h-[30rem] space-y-2 overflow-auto pr-1">
                  {createDraftMonsters.map((monster) => {
                    const sourceMonster = monstersById.get(monster.refId);
                    return (
                      <button
                        key={monster.draftId}
                        type="button"
                        className="w-full rounded-xl border border-black/10 bg-surface-strong px-3 py-3 text-left"
                        onClick={() => removeMonsterFromCreateDraft(monster.draftId)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <ParticipantAvatar
                              name={monster.name}
                              visual={monster.visual}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-surface object-cover text-[0.65rem] font-semibold text-muted"
                            />
                            <div>
                              <p className="text-sm font-semibold text-foreground">{monster.name}</p>
                              <p className="text-xs text-muted">{sourceMonster?.type ?? "Monster"}</p>
                            </div>
                          </div>
                          <span className="rounded-full bg-surface-strong px-2 py-1 text-[0.65rem] font-semibold text-muted">
                            CR {sourceMonster?.challenge ?? "--"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted">AC {monster.ac} · HP {monster.hp}</p>
                      </button>
                    );
                  })}
                  {!createDraftMonsters.length ? (
                    <p className="text-sm text-muted">No monsters added yet.</p>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={confirmCreateEncounter} disabled={!createForm.name.trim()}>
                Create
              </Button>
            </div>
        </DialogContent>
      </Dialog>

      {selectedEncounter && (
      <Dialog open onOpenChange={(open) => { if (!open) closeEditOverlay(); }}>
        <DialogContent maxWidth="7xl" fullHeight>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <DialogTitle>Edit Encounter</DialogTitle>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    placeholder="Encounter name"
                    value={encounterDraft.name}
                    disabled={builderLocked}
                    onChange={(event) =>
                      setEncounterDraft((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                  <Input
                    placeholder="Location"
                    value={encounterDraft.location}
                    disabled={builderLocked}
                    onChange={(event) =>
                      setEncounterDraft((prev) => ({ ...prev, location: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={saveEncounterMeta} disabled={builderLocked || !encounterDraft.name.trim()}>
                  Save details
                </Button>
                <Button variant="outline" onClick={openPartyModal} disabled={builderLocked}>
                  Add entire party
                </Button>
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
              </div>
            </div>

            {builderLocked ? (
              <div className="mt-3 rounded-xl border border-black/10 bg-surface-strong px-3 py-2 text-xs text-muted">
                Encounter is live. Builder edits are locked; use Combat actions/events.
              </div>
            ) : null}

            <div className="mt-4 grid min-h-0 flex-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
              <div className="min-h-0 space-y-3 rounded-2xl border border-black/10 bg-surface p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted">Monster picker</p>
                  <p className="mt-1 text-xs text-muted">Use popup picker to auto-add monsters to this encounter.</p>
                </div>
                <Button variant="outline" onClick={openEditMonsterPicker} disabled={builderLocked}>
                  Open monster picker
                </Button>

                <div className="rounded-2xl border border-black/10 bg-surface-strong p-3">
                  <p className="text-xs uppercase tracking-[0.25em] text-muted">Quick custom</p>
                  <div className="mt-2 grid gap-2 md:grid-cols-[1.2fr_0.9fr_0.9fr_0.9fr_auto] md:items-center">
                    <Input
                      placeholder="Name"
                      value={customForm.name}
                      disabled={builderLocked}
                      onChange={(event) =>
                        setCustomForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                    />
                    <Select
                      className=""
                      value={customForm.kind}
                      disabled={builderLocked}
                      onChange={(event) =>
                        setCustomForm((prev) => ({
                          ...prev,
                          kind: event.target.value as "npc" | "monster",
                        }))
                      }
                    >
                      <option value="npc">NPC</option>
                      <option value="monster">Monster</option>
                    </Select>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="AC"
                      value={customForm.ac}
                      disabled={builderLocked}
                      onChange={(event) =>
                        setCustomForm((prev) => ({
                          ...prev,
                          ac: event.target.value.replace(/[^0-9]/g, ""),
                        }))
                      }
                    />
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="HP"
                      value={customForm.hp}
                      disabled={builderLocked}
                      onChange={(event) =>
                        setCustomForm((prev) => ({
                          ...prev,
                          hp: event.target.value.replace(/[^0-9]/g, ""),
                        }))
                      }
                    />
                    <Button
                      variant="outline"
                      onClick={handleCustomAdd}
                      disabled={builderLocked || !customForm.name.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              <div className="min-h-0 space-y-3 rounded-2xl border border-black/10 bg-surface p-4">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Selected participants</h4>
                  <p className="text-xs text-muted">Click a participant row for actions; inline edit AC/HP stays available.</p>
                </div>
                <div className="rounded-xl border border-black/10 bg-surface-strong px-3 py-2 text-xs text-muted">
                  <p>Total CR {selectedEncounterTotalCr}</p>
                  <p>
                    Difficulty {selectedEncounterDifficulty} ({selectedEncounterPartyLevels.length} PCs)
                  </p>
                  <p>
                    Base XP {selectedEncounterDifficultyBreakdown.baseXp} × {formatMultiplier(selectedEncounterDifficultyBreakdown.multiplier)} = Adjusted XP {selectedEncounterDifficultyBreakdown.adjustedXp}
                  </p>
                  <p>
                    Thresholds E/M/H/D: {selectedEncounterDifficultyBreakdown.thresholds.easy} / {selectedEncounterDifficultyBreakdown.thresholds.medium} / {selectedEncounterDifficultyBreakdown.thresholds.hard} / {selectedEncounterDifficultyBreakdown.thresholds.deadly}
                  </p>
                </div>
                <div className="max-h-[30rem] space-y-2 overflow-auto pr-1">
                  {selectedEncounter.participants.map((participant) => {
                    const sourceMonster = participant.refId
                      ? monstersById.get(participant.refId)
                      : null;
                    const showActions = activeParticipantActionId === participant.id;
                    const computedCr = estimateChallengeFromDefenses(
                      participant.maxHp ?? participant.currentHp ?? 1,
                      participant.ac ?? 10
                    );
                    return (
                      <div
                        key={participant.id}
                        className="rounded-xl border border-black/10 bg-surface-strong px-3 py-3"
                        onClick={() =>
                          setActiveParticipantActionId((prev) =>
                            prev === participant.id ? null : participant.id
                          )
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <ParticipantAvatar
                              name={participant.name}
                              visual={participant.visual}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-surface object-cover text-[0.65rem] font-semibold text-muted"
                            />
                            <div>
                              <p className="text-sm font-semibold text-foreground">{participant.name}</p>
                              <Pill label={participant.kind.toUpperCase()} tone="neutral" />
                            </div>
                          </div>
                          {participant.kind !== "pc" ? (
                            <div className="flex items-center gap-2">
                              {sourceMonster?.challenge ? (
                                <Pill
                                  label={`Base CR ${formatChallenge(parseChallenge(sourceMonster.challenge))}`}
                                  tone="stat"
                                />
                              ) : null}
                              <Pill label={`CR ${computedCr}`} tone="stat" />
                            </div>
                          ) : null}
                        </div>

                        <div className="mt-2 grid gap-2 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
                          <div>
                            <FieldLabel>AC</FieldLabel>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={participant.ac ?? ""}
                              disabled={builderLocked}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) =>
                                updateEncounterParticipant(selectedEncounter.id, participant.id, {
                                  ac:
                                    event.target.value === ""
                                      ? null
                                      : Number(event.target.value.replace(/[^0-9]/g, "")),
                                })
                              }
                            />
                          </div>
                          <div>
                            <FieldLabel>HP</FieldLabel>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={participant.currentHp ?? ""}
                              disabled={builderLocked}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => {
                                const next =
                                  event.target.value === ""
                                    ? null
                                    : Number(event.target.value.replace(/[^0-9]/g, ""));
                                updateEncounterParticipant(selectedEncounter.id, participant.id, {
                                  currentHp: next,
                                  maxHp: next,
                                });
                              }}
                            />
                          </div>
                          <div className="text-right text-[0.65rem] uppercase tracking-[0.2em] text-muted">
                            {showActions ? "Actions" : "Click row"}
                          </div>
                        </div>

                        {showActions ? (
                          <div className="mt-2 flex flex-wrap justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                            {participant.kind !== "pc" ? (
                              <Button
                                variant="outline"
                                disabled={builderLocked}
                                onClick={() => openVariantModal(participant.id)}
                              >
                                Create variant
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              disabled={builderLocked}
                              onClick={() =>
                                removeEncounterParticipant(selectedEncounter.id, participant.id)
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {!selectedEncounter.participants.length ? (
                    <p className="text-sm text-muted">Add participants to begin.</p>
                  ) : null}
                </div>
              </div>
            </div>
        </DialogContent>
      </Dialog>
      )}

      <Dialog
        open={isMonsterPickerModalOpen && (monsterPickerMode === "create" || (monsterPickerMode === "edit" && !!selectedEncounter))}
        onOpenChange={(open) => { if (!open) closeMonsterPicker(); }}
      >
        <DialogContent maxWidth="2xl">
            <div className="flex items-center justify-between gap-2">
              <div>
                <DialogTitle>Monster picker</DialogTitle>
                <p className="text-sm text-muted">Click any monster to add it immediately.</p>
              </div>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </div>
            <div className="mt-3">
              <MonsterPicker
                monsters={state.monsters}
                disabled={monsterPickerMode === "edit" ? builderLocked : false}
                onPickMonster={(monster) => {
                  if (monsterPickerMode === "create") {
                    addMonsterToCreateDraft(monster.id);
                    return;
                  }
                  requestAddMonster(monster.id);
                }}
                listClassName="max-h-[16rem]"
              />
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPartyModalOpen && !!selectedEncounter} onOpenChange={setIsPartyModalOpen}>
        <DialogContent maxWidth="xl">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle>Add entire party</DialogTitle>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setPartySelection(new Set(state.pcs.map((pc) => pc.id)))}
              >
                Select all
              </Button>
              <Button variant="outline" onClick={() => setPartySelection(new Set())}>
                Clear all
              </Button>
            </div>
            <div className="mt-3 max-h-72 space-y-2 overflow-auto">
              {state.pcs.map((pc) => {
                const duplicate = existingPcRefIds.has(pc.id);
                return (
                  <label
                    key={pc.id}
                    className="flex items-center justify-between rounded-xl border border-black/10 bg-surface-strong px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="font-semibold text-foreground">{pc.name}</span>
                      <span className="ml-2 text-xs text-muted">Lvl {pc.level} {pc.className}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      {duplicate ? (
                        <span className="text-[0.65rem] uppercase tracking-[0.2em] text-muted">
                          Already added
                        </span>
                      ) : null}
                      <input
                        type="checkbox"
                        checked={partySelection.has(pc.id)}
                        onChange={(event) => {
                          setPartySelection((prev) => {
                            const next = new Set(prev);
                            if (event.target.checked) {
                              next.add(pc.id);
                            } else {
                              next.delete(pc.id);
                            }
                            return next;
                          });
                        }}
                      />
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={confirmAddParty} disabled={builderLocked || !partySelection.size}>
                Add selected
              </Button>
            </div>
        </DialogContent>
      </Dialog>

      {activeVariantSource && (
      <Dialog open={isVariantModalOpen} onOpenChange={setIsVariantModalOpen}>
        <DialogContent maxWidth="xl">
            <DialogTitle>Create variant</DialogTitle>
            <p className="mt-1 text-sm text-muted">
              Adjust name, AC, and HP. CR updates automatically from defenses.
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-[1.4fr_1fr_1fr] md:items-end">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted">Name</p>
                <Input
                  value={variantForm.name}
                  onChange={(event) =>
                    setVariantForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted">AC</p>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={variantForm.ac}
                  onChange={(event) =>
                    setVariantForm((prev) => ({
                      ...prev,
                      ac: event.target.value.replace(/[^0-9]/g, ""),
                    }))
                  }
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted">HP</p>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={variantForm.hp}
                  onChange={(event) =>
                    setVariantForm((prev) => ({
                      ...prev,
                      hp: event.target.value.replace(/[^0-9]/g, ""),
                    }))
                  }
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
              {activeVariantSource.refId ? (
                <span>
                  Base CR {formatChallenge(parseChallenge(monstersById.get(activeVariantSource.refId)?.challenge ?? "0"))}
                </span>
              ) : null}
              <span className="rounded-full bg-surface-strong px-2 py-1 text-[0.7rem] font-semibold text-muted">
                Computed CR {variantComputedCr}
              </span>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={confirmVariantAdd}
                disabled={!variantForm.name.trim() || !variantForm.ac || !variantForm.hp}
              >
                Add variant
              </Button>
            </div>
        </DialogContent>
      </Dialog>
      )}
    </PageShell>
  );
}
