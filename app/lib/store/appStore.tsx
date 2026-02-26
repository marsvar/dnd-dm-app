"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type {
  AppState,
  Campaign,
  Encounter,
  EncounterBaseline,
  EncounterParticipant,
  LogEntry,
  Monster,
  Note,
  ParticipantVisual,
  Pc,
} from "../models/types";
import { seedState } from "../data/srd";
import { DEFAULT_SKILL_PROFICIENCIES } from "../engine/pcEngine";
import type { EncounterEvent, EncounterEventInput } from "../engine/encounterEvents";
import { applyEncounterEvent } from "../engine/applyEncounterEvent";
import { canStartCombat, deleteCampaignFromState } from "../engine/campaignReducers";

type AppStore = {
  state: AppState;
  hydrated: boolean;
  addMonster: (monster: Omit<Monster, "id" | "source"> & { source?: Monster["source"] }) => void;
  updateMonster: (id: string, updates: Partial<Monster>) => void;
  removeMonster: (id: string) => void;
  addPc: (pc: Omit<Pc, "id">) => void;
  updatePc: (id: string, updates: Partial<Pc>) => void;
  removePc: (id: string) => void;
  addEncounter: (name: string, location?: string, campaignId?: string) => string;
  updateEncounter: (id: string, updates: Partial<Pick<Encounter, "name" | "location">>) => void;
  removeEncounter: (id: string) => void;
  addEncounterParticipant: (encounterId: string, participant: Omit<EncounterParticipant, "id">) => void;
  updateEncounterParticipant: (
    encounterId: string,
    participantId: string,
    updates: Partial<EncounterParticipant>
  ) => void;
  removeEncounterParticipant: (encounterId: string, participantId: string) => void;
  setEncounterRound: (encounterId: string, round: number) => void;
  startEncounter: (encounterId: string) => void;
  stopEncounter: (encounterId: string) => void;
  advanceEncounterTurn: (encounterId: string, direction: 1 | -1) => void;
  dispatchEncounterEvent: (
    encounterId: string,
    event: EncounterEventInput
  ) => void;
  undoEncounterEvent: (encounterId: string) => void;
  addNote: (note: Omit<Note, "id" | "createdAt">) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  removeNote: (id: string) => void;
  addLogEntry: (entry: Omit<LogEntry, "id" | "timestamp">) => void;
  // --- Campaign actions ---
  addCampaign: (name: string, description?: string) => string;
  updateCampaign: (id: string, updates: Partial<Pick<Campaign, "name" | "description">>) => void;
  deleteCampaign: (id: string) => void;
  setActiveCampaign: (id: string | null) => void;
  addCampaignMember: (campaignId: string, pcId: string) => void;
  removeCampaignMember: (campaignId: string, pcId: string) => void;
  resetState: () => void;
};

const STORAGE_KEY = "dnd_dm_app_v1";

const AppStoreContext = createContext<AppStore | null>(null);

const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeVisual = (visual?: ParticipantVisual): ParticipantVisual => ({
  fallback: "initials",
  ...(visual ?? {}),
});

const normalizeParticipant = (
  participant: EncounterParticipant
): EncounterParticipant => ({
  ...participant,
  visual: normalizeVisual(participant.visual),
});

const getEncounterBaseline = (encounter: Encounter): EncounterBaseline => {
  if (encounter.eventLogBase) {
    return encounter.eventLogBase;
  }
  return {
    id: encounter.id,
    name: encounter.name,
    location: encounter.location,
    round: Math.max(1, encounter.round || 1),
    isRunning: false,
    activeParticipantId: null,
    participants: encounter.participants,
  };
};

const rebuildEncounterFromEvents = (
  baseline: EncounterBaseline,
  eventLog: EncounterEvent[]
): Encounter => {
  const projected = eventLog.reduce(applyEncounterEvent, {
    ...baseline,
    eventLog: [],
  });
  return {
    ...projected,
    eventLog,
    eventLogBase: baseline,
  };
};

const loadState = (): AppState => {
  if (typeof window === "undefined") {
    return seedState;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return seedState;
  }
  try {
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.version || parsed.version !== seedState.version) {
      return seedState;
    }
    const parsedMonsters = Array.isArray(parsed.monsters) ? parsed.monsters : [];
    const parsedPcs = Array.isArray(parsed.pcs) ? parsed.pcs : seedState.pcs;
    const missingSeedMonsters = seedState.monsters.filter(
      (monster) => !parsedMonsters.some((existing) => existing.id === monster.id)
    );
    // Build a lookup so SRD seed images can be applied to existing saved monsters
    // that don't yet have a user-set imageUrl.
    const seedById = Object.fromEntries(seedState.monsters.map((m) => [m.id, m]));
    const normalizedEncounters = (parsed.encounters ?? []).map((encounter) => ({
      ...encounter,
      eventLog: Array.isArray(encounter.eventLog) ? encounter.eventLog : [],
      participants: Array.isArray(encounter.participants)
        ? encounter.participants.map(normalizeParticipant)
        : [],
    }));
    return {
      ...seedState,
      ...parsed,
      campaigns: Array.isArray(parsed.campaigns) ? parsed.campaigns : [],
      campaignMembers: Array.isArray(parsed.campaignMembers) ? parsed.campaignMembers : [],
      activeCampaignId: parsed.activeCampaignId ?? null,
      monsters: [...parsedMonsters, ...missingSeedMonsters].map((monster) => {
        const seed = seedById[monster.id];
        // Apply seed imageUrl as a default only when the user hasn't set their own.
        const visual = normalizeVisual(monster.visual);
        if (!visual.imageUrl && seed?.visual?.imageUrl) {
          visual.imageUrl = seed.visual.imageUrl;
        }
        return { ...monster, visual };
      }),
      pcs: parsedPcs.map((pc) => ({
        ...pc,
        visual: normalizeVisual(pc.visual),
        // Migration: backfill skillProficiencies for PCs saved before this field existed
        skillProficiencies: pc.skillProficiencies ?? { ...DEFAULT_SKILL_PROFICIENCIES },
      })),
      encounters: normalizedEncounters,
    };
  } catch {
    return seedState;
  }
};

export const AppStoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AppState>(() => loadState());
  const hydrated = true;

  // Persist every state change to localStorage.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // React to changes made by the DM in another tab/window.
  // The `storage` event fires in every tab EXCEPT the one that wrote the change,
  // giving the player view live updates with zero extra dependencies.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.newValue === null) return;
      try {
        const next = loadState();
        setState(next);
      } catch {
        // Ignore malformed storage events
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const addMonster = useCallback(
    (monster: Omit<Monster, "id" | "source"> & { source?: Monster["source"] }) => {
      setState((prev) => ({
        ...prev,
        monsters: [
          ...prev.monsters,
          {
            ...monster,
            id: createId(),
            source: monster.source ?? "Custom",
            visual: normalizeVisual(monster.visual),
          },
        ],
      }));
    },
    []
  );

  const updateMonster = useCallback((id: string, updates: Partial<Monster>) => {
    setState((prev) => ({
      ...prev,
      monsters: prev.monsters.map((monster) =>
        monster.id === id ? { ...monster, ...updates } : monster
      ),
    }));
  }, []);

  const removeMonster = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      monsters: prev.monsters.filter((monster) => monster.id !== id),
    }));
  }, []);

  const addPc = useCallback((pc: Omit<Pc, "id">) => {
    setState((prev) => ({
      ...prev,
      pcs: [...prev.pcs, { ...pc, id: createId(), visual: normalizeVisual(pc.visual) }],
    }));
  }, []);

  const updatePc = useCallback((id: string, updates: Partial<Pc>) => {
    setState((prev) => ({
      ...prev,
      pcs: prev.pcs.map((pc) => (pc.id === id ? { ...pc, ...updates } : pc)),
    }));
  }, []);

  const removePc = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      pcs: prev.pcs.filter((pc) => pc.id !== id),
    }));
  }, []);

  const addEncounter = useCallback((name: string, location?: string, campaignId?: string) => {
    const id = createId();
    setState((prev) => ({
      ...prev,
      encounters: [
        ...prev.encounters,
        {
          id,
          name,
          location,
          campaignId,
          round: 1,
          isRunning: false,
          activeParticipantId: null,
          participants: [],
          eventLog: [],
        },
      ],
    }));
    return id;
  }, []);

  const removeEncounter = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      encounters: prev.encounters.filter((encounter) => encounter.id !== id),
    }));
  }, []);

  const updateEncounter = useCallback(
    (id: string, updates: Partial<Pick<Encounter, "name" | "location">>) => {
      setState((prev) => ({
        ...prev,
        encounters: prev.encounters.map((encounter) =>
          encounter.id === id && !encounter.isRunning
            ? {
                ...encounter,
                name: updates.name ?? encounter.name,
                location: updates.location !== undefined ? updates.location : encounter.location,
              }
            : encounter
        ),
      }));
    },
    []
  );

  const addEncounterParticipant = useCallback(
    (encounterId: string, participant: Omit<EncounterParticipant, "id">) => {
      setState((prev) => ({
        ...prev,
        encounters: prev.encounters.map((encounter) =>
          encounter.id === encounterId
            ? {
                ...encounter,
                ...(encounter.isRunning
                  ? {}
                  : {
                participants: [
                  ...encounter.participants,
                  { ...participant, id: createId(), visual: normalizeVisual(participant.visual) },
                ],
                  }),
              }
            : encounter
        ),
      }));
    },
    []
  );

  const updateEncounterParticipant = useCallback(
    (encounterId: string, participantId: string, updates: Partial<EncounterParticipant>) => {
      setState((prev) => ({
        ...prev,
        encounters: prev.encounters.map((encounter) =>
          encounter.id === encounterId
            ? {
                ...encounter,
                ...(encounter.isRunning
                  ? {}
                  : {
                participants: encounter.participants.map((participant) =>
                  participant.id === participantId
                    ? (() => {
                        const nextMaxHp =
                          updates.maxHp !== undefined ? updates.maxHp : participant.maxHp;
                        let nextCurrentHp =
                          updates.currentHp !== undefined
                            ? updates.currentHp
                            : participant.currentHp;
                        if (nextCurrentHp !== null && nextCurrentHp !== undefined) {
                          const floor = 0;
                          if (nextMaxHp !== null && nextMaxHp !== undefined) {
                            nextCurrentHp = Math.min(nextMaxHp, Math.max(floor, nextCurrentHp));
                          } else {
                            nextCurrentHp = Math.max(floor, nextCurrentHp);
                          }
                        }
                        return {
                          ...participant,
                          ...updates,
                          maxHp: nextMaxHp ?? participant.maxHp,
                          currentHp:
                            updates.currentHp === undefined
                              ? participant.currentHp
                              : nextCurrentHp,
                        };
                      })()
                    : participant
                ),
                  }),
              }
            : encounter
        ),
      }));
    },
    []
  );

  const removeEncounterParticipant = useCallback(
    (encounterId: string, participantId: string) => {
      const fullEvent: EncounterEvent = {
        id: createId(),
        at: new Date().toISOString(),
        t: "PARTICIPANT_REMOVED",
        participantId,
      };
      setState((prev) => ({
        ...prev,
        encounters: prev.encounters.map((encounter) =>
          encounter.id === encounterId
            ? {
                ...encounter,
                ...(encounter.isRunning
                  ? (() => {
                      const baseline = getEncounterBaseline(encounter);
                      const eventLog = [...encounter.eventLog, fullEvent];
                      return rebuildEncounterFromEvents(baseline, eventLog);
                    })()
                  : {
                participants: encounter.participants.filter(
                  (participant) => participant.id !== participantId
                ),
                activeParticipantId:
                  encounter.activeParticipantId === participantId
                    ? null
                    : encounter.activeParticipantId,
                  }),
              }
            : encounter
        ),
      }));
    },
    []
  );

  const setEncounterRound = useCallback((encounterId: string, round: number) => {
    setState((prev) => ({
      ...prev,
      encounters: prev.encounters.map((encounter) =>
        encounter.id === encounterId
          ? encounter.isRunning
            ? encounter
            : { ...encounter, round }
          : encounter
      ),
    }));
  }, []);

  const dispatchEncounterEvent = useCallback(
    (encounterId: string, event: EncounterEventInput) => {
      // Enforce: only one encounter may be running per campaign at a time.
      if (event.t === "COMBAT_STARTED") {
        setState((prev) => {
          if (!canStartCombat(prev.encounters, encounterId)) {
            const target = prev.encounters.find((e) => e.id === encounterId);
            const conflict = prev.encounters.find(
              (e) =>
                e.id !== encounterId &&
                e.campaignId === target?.campaignId &&
                e.isRunning
            );
            console.warn(
              `[AppStore] Cannot start encounter "${target?.name}": ` +
                `encounter "${conflict?.name}" is already running in this campaign.`
            );
            return prev; // no-op
          }
          return prev; // proceed to the real setState below
        });
      }
      const normalizedEvent: EncounterEventInput =
        event.t === "PARTICIPANT_ADDED"
          ? {
              ...event,
              participant: {
                ...event.participant,
                visual: normalizeVisual(event.participant.visual),
              },
            }
          : event;
      const fullEvent: EncounterEvent = {
        ...normalizedEvent,
        id: createId(),
        at: new Date().toISOString(),
      };
      const AUTO_LOG_EVENTS = new Set([
        "COMBAT_STARTED",
        "COMBAT_STOPPED",
        "ENCOUNTER_COMPLETED",
      ]);
      setState((prev) => {
        const updatedEncounters = prev.encounters.map((encounter) => {
          if (encounter.id !== encounterId) return encounter;
          const eventLog = [...encounter.eventLog, fullEvent];
          const baseline = getEncounterBaseline(encounter);
          return rebuildEncounterFromEvents(baseline, eventLog);
        });
        if (!AUTO_LOG_EVENTS.has(fullEvent.t)) {
          return { ...prev, encounters: updatedEncounters };
        }
        const sourceEncounter = prev.encounters.find((e) => e.id === encounterId);
        const encounterName = sourceEncounter?.name ?? "Unknown encounter";
        const completedNotes =
          fullEvent.t === "ENCOUNTER_COMPLETED" && (fullEvent as { notes?: string }).notes
            ? ` \u2014 ${(fullEvent as { notes?: string }).notes}`
            : "";
        const textMap: Record<string, string> = {
          COMBAT_STARTED: `Combat started: ${encounterName}`,
          COMBAT_STOPPED: `Combat stopped: ${encounterName}`,
          ENCOUNTER_COMPLETED: `Encounter completed: ${encounterName}${completedNotes}`,
        };
        const autoEntry: LogEntry = {
          id: createId(),
          timestamp: fullEvent.at,
          text: textMap[fullEvent.t] ?? `[${fullEvent.t}] ${encounterName}`,
          encounterId,
          campaignId: sourceEncounter?.campaignId,
          source: "auto",
        };
        return {
          ...prev,
          encounters: updatedEncounters,
          log: [...prev.log, autoEntry],
        };
      });
    },
    []
  );

  const undoEncounterEvent = useCallback((encounterId: string) => {
    setState((prev) => ({
      ...prev,
      encounters: prev.encounters.map((encounter) => {
        if (encounter.id !== encounterId) {
          return encounter;
        }
        if (!encounter.eventLog.length) {
          return encounter;
        }
        const baseline = getEncounterBaseline(encounter);
        const eventLog = encounter.eventLog.slice(0, -1);
        if (!eventLog.length) {
          return {
            ...baseline,
            eventLog: [],
          };
        }
        return rebuildEncounterFromEvents(baseline, eventLog);
      }),
    }));
  }, []);

  const startEncounter = useCallback((encounterId: string) => {
    dispatchEncounterEvent(encounterId, { t: "COMBAT_STARTED" });
  }, [dispatchEncounterEvent]);

  const stopEncounter = useCallback((encounterId: string) => {
    dispatchEncounterEvent(encounterId, { t: "COMBAT_STOPPED" });
  }, [dispatchEncounterEvent]);

  const advanceEncounterTurn = useCallback((encounterId: string, direction: 1 | -1) => {
    dispatchEncounterEvent(encounterId, { t: "TURN_ADVANCED", direction });
  }, [dispatchEncounterEvent]);

  const addNote = useCallback((note: Omit<Note, "id" | "createdAt">) => {
    setState((prev) => ({
      ...prev,
      notes: [
        ...prev.notes,
        { ...note, id: createId(), createdAt: new Date().toISOString() },
      ],
    }));
  }, []);

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    setState((prev) => ({
      ...prev,
      notes: prev.notes.map((note) => (note.id === id ? { ...note, ...updates } : note)),
    }));
  }, []);

  const removeNote = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      notes: prev.notes.filter((note) => note.id !== id),
    }));
  }, []);

  const addLogEntry = useCallback((entry: Omit<LogEntry, "id" | "timestamp">) => {
    setState((prev) => ({
      ...prev,
      log: [
        { ...entry, id: createId(), timestamp: new Date().toISOString() },
        ...prev.log,
      ],
    }));
  }, []);

  const addCampaign = useCallback((name: string, description?: string) => {
    const id = createId();
    setState((prev) => ({
      ...prev,
      campaigns: [
        ...prev.campaigns,
        { id, name, description, createdAt: new Date().toISOString() },
      ],
      // Auto-select if this is the first campaign
      activeCampaignId: prev.activeCampaignId ?? id,
    }));
    return id;
  }, []);

  const updateCampaign = useCallback(
    (id: string, updates: Partial<Pick<Campaign, "name" | "description">>) => {
      setState((prev) => ({
        ...prev,
        campaigns: prev.campaigns.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      }));
    },
    []
  );

  const deleteCampaign = useCallback((id: string) => {
    setState((prev) => deleteCampaignFromState(prev, id));
  }, []);

  const setActiveCampaign = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, activeCampaignId: id }));
  }, []);

  const addCampaignMember = useCallback((campaignId: string, pcId: string) => {
    setState((prev) => {
      // Idempotent: skip if already a member
      const exists = prev.campaignMembers.some(
        (m) => m.campaignId === campaignId && m.pcId === pcId
      );
      if (exists) return prev;
      return {
        ...prev,
        campaignMembers: [
          ...prev.campaignMembers,
          { id: createId(), campaignId, pcId },
        ],
      };
    });
  }, []);

  const removeCampaignMember = useCallback(
    (campaignId: string, pcId: string) => {
      setState((prev) => ({
        ...prev,
        campaignMembers: prev.campaignMembers.filter(
          (m) => !(m.campaignId === campaignId && m.pcId === pcId)
        ),
      }));
    },
    []
  );

  const resetState = useCallback(() => {
    setState({ ...seedState });
  }, []);

  const value = useMemo(
    () => ({
      state,
      hydrated,
      addMonster,
      updateMonster,
      removeMonster,
      addPc,
      updatePc,
      removePc,
      addEncounter,
      updateEncounter,
      removeEncounter,
      addEncounterParticipant,
      updateEncounterParticipant,
      removeEncounterParticipant,
      setEncounterRound,
      startEncounter,
      stopEncounter,
      advanceEncounterTurn,
      dispatchEncounterEvent,
      undoEncounterEvent,
      addNote,
      updateNote,
      removeNote,
      addLogEntry,
      addCampaign,
      updateCampaign,
      deleteCampaign,
      setActiveCampaign,
      addCampaignMember,
      removeCampaignMember,
      resetState,
    }),
    [
      state,
      hydrated,
      addMonster,
      updateMonster,
      removeMonster,
      addPc,
      updatePc,
      removePc,
      addEncounter,
      updateEncounter,
      removeEncounter,
      addEncounterParticipant,
      updateEncounterParticipant,
      removeEncounterParticipant,
      setEncounterRound,
      startEncounter,
      stopEncounter,
      advanceEncounterTurn,
      dispatchEncounterEvent,
      undoEncounterEvent,
      addNote,
      updateNote,
      removeNote,
      addLogEntry,
      addCampaign,
      updateCampaign,
      deleteCampaign,
      setActiveCampaign,
      addCampaignMember,
      removeCampaignMember,
      resetState,
    ]
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
};

export const useAppStore = () => {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error("useAppStore must be used within AppStoreProvider");
  }
  return context;
};
