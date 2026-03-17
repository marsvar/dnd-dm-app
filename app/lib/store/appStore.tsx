"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { TooltipProvider } from "../../components/ui";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AppState,
  Campaign,
  CampaignMember,
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
import {
  DEFAULT_CURRENCY,
  DEFAULT_DEATH_SAVES,
  DEFAULT_FEATURES,
  DEFAULT_SKILL_PROFICIENCIES,
  DEFAULT_SPELLCASTING,
  DEFAULT_WEAPONS,
} from "../engine/pcEngine";
import type { EncounterEvent, EncounterEventInput } from "../engine/encounterEvents";
import { applyEncounterEvent } from "../engine/applyEncounterEvent";
import { canStartCombat, deleteCampaignFromState } from "../engine/campaignReducers";
import { buildPlayerViewSnapshot } from "../engine/playerViewProjection";

// ── Phase 2a: entity-table helpers ─────────────────────────────────────────
// campaigns / pcs / campaign_members are mirrored to dedicated Supabase tables
// so players can access DM data via proper per-entity RLS instead of relying
// on the full blob being world-readable.

/** Upsert campaigns, pcs, and campaign_members to their dedicated tables.
 *  Also removes rows that no longer exist in the local state (orphan cleanup). */
async function syncEntityTables(
  supabase: SupabaseClient,
  state: AppState,
  userId: string
): Promise<void> {
  // ── Upsert campaigns ──────────────────────────────────────────────────────
  if (state.campaigns.length > 0) {
    await supabase.from("campaigns").upsert(
      state.campaigns.map((c) => ({
        id: c.id,
        dm_user_id: userId,
        name: c.name,
        description: c.description ?? null,
        created_at: c.createdAt,
      })),
      { onConflict: "id" }
    );
  }

  // ── Upsert pcs ────────────────────────────────────────────────────────────
  if (state.pcs.length > 0) {
    await supabase.from("pcs").upsert(
      state.pcs.map((pc) => ({
        id: pc.id,
        dm_user_id: userId,
        name: pc.name,
        pin: pc.pin ?? null,
        data: pc as unknown as Record<string, unknown>,
      })),
      { onConflict: "id" }
    );
  }

  // ── Upsert campaign_members ───────────────────────────────────────────────
  if (state.campaignMembers.length > 0) {
    await supabase.from("campaign_members").upsert(
      state.campaignMembers.map((m) => ({
        id: m.id,
        campaign_id: m.campaignId,
        pc_id: m.pcId,
      })),
      { onConflict: "id" }
    );
  }

  // ── Orphan cleanup ────────────────────────────────────────────────────────
  // Read IDs that exist in the DB for this DM and delete any that are no
  // longer present in local state (handles deletes that failed to propagate).
  const [existingCampaigns, existingPcs] = await Promise.all([
    supabase.from("campaigns").select("id").eq("dm_user_id", userId),
    supabase.from("pcs").select("id").eq("dm_user_id", userId),
  ]);

  const stateCampaignIds = new Set(state.campaigns.map((c) => c.id));
  const orphanCampaignIds = (existingCampaigns.data ?? [])
    .map((r: { id: string }) => r.id)
    .filter((id) => !stateCampaignIds.has(id));
  if (orphanCampaignIds.length > 0) {
    await supabase.from("campaigns").delete().in("id", orphanCampaignIds);
    // campaign_members are cascade-deleted via FK
  }

  const statePcIds = new Set(state.pcs.map((p) => p.id));
  const orphanPcIds = (existingPcs.data ?? [])
    .map((r: { id: string }) => r.id)
    .filter((id) => !statePcIds.has(id));
  if (orphanPcIds.length > 0) {
    await supabase.from("pcs").delete().in("id", orphanPcIds);
    // campaign_members are cascade-deleted via FK
  }
}

/** Fetch campaigns, pcs, and campaign_members for a specific DM from entity tables. */
async function fetchEntityTables(
  supabase: SupabaseClient,
  dmUserId: string
): Promise<{ campaigns: Campaign[]; pcs: Pc[]; campaignMembers: CampaignMember[] }> {
  const [campaignsRes, pcsRes] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, name, description, created_at")
      .eq("dm_user_id", dmUserId),
    supabase
      .from("pcs")
      .select("id, name, pin, data")
      .eq("dm_user_id", dmUserId),
  ]);

  const campaigns: Campaign[] = (campaignsRes.data ?? []).map(
    (r: { id: string; name: string; description: string | null; created_at: string }) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? undefined,
      createdAt: r.created_at,
    })
  );

  const pcs: Pc[] = (pcsRes.data ?? []).map(
    (r: { id: string; name: string; pin: string | null; data: Record<string, unknown> }) => ({
      ...(r.data as Pc),
      id: r.id,
      pin: r.pin ?? null,
    })
  );

  const campaignIds = campaigns.map((c) => c.id);
  let campaignMembers: CampaignMember[] = [];

  if (campaignIds.length > 0) {
    const { data: membersData } = await supabase
      .from("campaign_members")
      .select("id, campaign_id, pc_id")
      .in("campaign_id", campaignIds);

    campaignMembers = (membersData ?? []).map(
      (m: { id: string; campaign_id: string; pc_id: string }) => ({
        id: m.id,
        campaignId: m.campaign_id,
        pcId: m.pc_id,
      })
    );
  }

  return { campaigns, pcs, campaignMembers };
}

async function upsertPlayerView(
  supabase: SupabaseClient,
  campaignId: string,
  payload: unknown
): Promise<void> {
  await supabase.from("campaign_player_view").upsert({
    campaign_id: campaignId,
    payload,
    updated_at: new Date().toISOString(),
  }, { onConflict: "campaign_id" });
}

// ── localStorage keys ───────────────────────────────────────────────────────

// localStorage key that stores the DM's user ID when a player has connected
// via a /player?u=<dmUserId> link. Persists across page reloads so the player
// doesn't need to re-enter the link every session.
const PLAYER_CONNECT_KEY = "dnd_player_connect_id";

/**
 * v8 fields are optional in addPc so callers that don't supply them get
 * sensible defaults.  All other Pc fields (minus id) are still required.
 */
type AddPcInput = Omit<
  Pc,
  | "id"
  | "deathSaves"
  | "currency"
  | "features"
  | "spellcasting"
  | "weapons"
  | "personalityTraits"
  | "ideals"
  | "bonds"
  | "flaws"
> &
  Partial<
    Pick<
      Pc,
      | "deathSaves"
      | "currency"
      | "features"
      | "spellcasting"
      | "weapons"
      | "personalityTraits"
      | "ideals"
      | "bonds"
      | "flaws"
    >
  >;

type AppStore = {
  state: AppState;
  hydrated: boolean;
  syncing: boolean;
  /**
   * Connect to a DM's game as an unauthenticated player.
   * Stores the DM's userId in localStorage and fetches their app state from
   * Supabase, hydrating the store for the player view.
   */
  connectToGame: (dmUserId: string) => Promise<void>;
  addMonster: (monster: Omit<Monster, "id" | "source"> & { source?: Monster["source"] }) => void;
  updateMonster: (id: string, updates: Partial<Monster>) => void;
  removeMonster: (id: string) => void;
  addPc: (pc: AddPcInput) => void;
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
  deathSaves: participant.deathSaves ?? null,
});

const shouldPersistPc = (pc: Pc) => pc.persistToCloud !== false;

const getPersistableState = (state: AppState): AppState => {
  const pcs = state.pcs.filter(shouldPersistPc);
  if (pcs.length === state.pcs.length) return state;
  const persistedPcIds = new Set(pcs.map((pc) => pc.id));
  return {
    ...state,
    pcs,
    campaignMembers: state.campaignMembers.filter((m) => persistedPcIds.has(m.pcId)),
  };
};

const mergeLocalOnlyPcs = (remote: AppState, local: AppState): AppState => {
  const localOnlyPcs = local.pcs.filter((pc) => pc.persistToCloud === false);
  if (localOnlyPcs.length === 0) return remote;
  const localOnlyIds = new Set(localOnlyPcs.map((pc) => pc.id));
  return {
    ...remote,
    pcs: [
      ...remote.pcs.filter((pc) => !localOnlyIds.has(pc.id)),
      ...localOnlyPcs,
    ],
    campaignMembers: [
      ...remote.campaignMembers.filter((m) => !localOnlyIds.has(m.pcId)),
      ...local.campaignMembers.filter((m) => localOnlyIds.has(m.pcId)),
    ],
  };
};

const getEncounterBaseline = (encounter: Encounter): EncounterBaseline => {
  if (encounter.eventLogBase) {
    // Patch campaignId back in for baselines saved before this field was included
    // (backwards-compat: encounters that ran before this fix lost campaignId from their baseline)
    if (!encounter.eventLogBase.campaignId && encounter.campaignId) {
      return { ...encounter.eventLogBase, campaignId: encounter.campaignId };
    }
    return encounter.eventLogBase;
  }
  return {
    id: encounter.id,
    name: encounter.name,
    location: encounter.location,
    campaignId: encounter.campaignId,
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

/**
 * Apply migrations and normalize a raw parsed AppState object.
 * Used both by the localStorage loader and the Supabase remote loader.
 */
const normalizeState = (parsed: AppState): AppState => {
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
      // Migrate legacy seed monster image paths to the new public/monsters assets.
      if (
        visual.imageUrl?.startsWith("/images/monsters/") &&
        seed?.visual?.imageUrl
      ) {
        visual.imageUrl = seed.visual.imageUrl;
      }
      return { ...monster, visual };
    }),
    pcs: parsedPcs.map((pc) => ({
      ...pc,
      visual: normalizeVisual(pc.visual),
      // Migration: backfill skillProficiencies for PCs saved before this field existed
      skillProficiencies: pc.skillProficiencies ?? { ...DEFAULT_SKILL_PROFICIENCIES },
      // Migration: backfill pin for PCs saved before this field existed
      pin: pc.pin ?? null,
      // Migration: default persistToCloud for older PCs
      persistToCloud: pc.persistToCloud ?? true,
      // v8: backfill new required fields
      deathSaves: pc.deathSaves ?? { ...DEFAULT_DEATH_SAVES },
      currency: pc.currency ?? { ...DEFAULT_CURRENCY },
      features: pc.features ?? [...DEFAULT_FEATURES],
      spellcasting: pc.spellcasting ?? { ...DEFAULT_SPELLCASTING },
      weapons: pc.weapons ?? [...DEFAULT_WEAPONS],
      personalityTraits: pc.personalityTraits ?? "",
      ideals: pc.ideals ?? "",
      bonds: pc.bonds ?? "",
      flaws: pc.flaws ?? "",
    })),
    encounters: normalizedEncounters,
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
    return normalizeState(parsed);
  } catch {
    return seedState;
  }
};

export const AppStoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AppState>(() => loadState());
  const [syncing, setSyncing] = useState(false);
  const hydrated = true;
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerViewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerViewOwnedIdsRef = useRef<Set<string> | null>(null);
  const playerViewOwnedIdsFetchedAtRef = useRef<number | null>(null);
  const playerViewOwnedUserIdRef = useRef<string | null>(null);
  const playerViewCampaignSignatureRef = useRef<string>("");
  const playerViewActiveCampaignRef = useRef<string | null>(null);
  const PLAYER_VIEW_OWNED_IDS_TTL = 60000;

  // On mount: subscribe to auth state changes and fetch from Supabase whenever the
  // user is authenticated (INITIAL_SESSION fires on page load if already logged in;
  // SIGNED_IN fires when the user logs in mid-session, e.g. in a fresh incognito tab).
  // localStorage is the fast first-paint cache; Supabase is source of truth.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const { createSupabaseClient } = await import("../supabase/client");
      const supabase = createSupabaseClient();

      const fetchRemoteState = async (userId: string) => {
        setSyncing(true);
        try {
          // Step 1: fetch the blob (full state for encounters, notes, monsters, etc.)
          const { data: blobData } = await supabase
            .from("user_app_state")
            .select("state")
            .eq("user_id", userId)
            .single();

          let remote: AppState | null = blobData?.state
            ? normalizeState(blobData.state as AppState)
            : null;

          // Step 2: fetch entity tables and overlay (tables are authoritative for
          // campaigns / pcs / campaign_members because they support proper RLS).
          try {
            const entities = await fetchEntityTables(supabase, userId);
            if (
              entities.campaigns.length > 0 ||
              entities.pcs.length > 0 ||
              entities.campaignMembers.length > 0
            ) {
              const base = remote ?? { ...seedState };
              remote = {
                ...base,
                campaigns: entities.campaigns,
                pcs: entities.pcs.map((pc) => ({
                  ...pc,
                  visual: normalizeVisual(pc.visual),
                  skillProficiencies:
                    pc.skillProficiencies ?? { ...DEFAULT_SKILL_PROFICIENCIES },
                  pin: pc.pin ?? null,
                })),
                campaignMembers: entities.campaignMembers,
              };
            }
          } catch {
            // Entity table fetch failure is non-fatal — continue with blob state.
          }

          if (!cancelled && remote) {
            const merged = mergeLocalOnlyPcs(remote, loadState());
            setState(merged);
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          }
        } catch {
          // Remote fetch failure is non-fatal — continue with localStorage state.
        } finally {
          if (!cancelled) setSyncing(false);
        }
      };

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (
          (event === "INITIAL_SESSION" || event === "SIGNED_IN") &&
          session?.user
        ) {
          fetchRemoteState(session.user.id);
        } else if (event === "INITIAL_SESSION" && !session?.user) {
          // Unauthenticated page load — check for a stored DM user ID.
          // This powers the "Player Connect" flow: the player visited
          // /player?u=<dmUserId> at some point and we stored that ID.
          const connectId =
            typeof window !== "undefined"
              ? window.localStorage.getItem(PLAYER_CONNECT_KEY)
              : null;
          if (connectId) {
            fetchRemoteState(connectId);
          }
        }
      });

      return () => {
        cancelled = true;
        subscription.unsubscribe();
      };
    };

    let cleanup: (() => void) | undefined;
    run().then((fn) => { cleanup = fn; });
    return () => { cancelled = true; cleanup?.(); };
  }, []);

  // Persist every state change: immediately to localStorage, debounced to Supabase.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Debounced Supabase sync (500 ms) — non-blocking, non-fatal.
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      try {
        const { createSupabaseClient } = await import("../supabase/client");
        const supabase = createSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const persistableState = getPersistableState(state);

        // Sync full blob (existing behaviour — source of truth for encounters, notes, etc.)
        await supabase.from("user_app_state").upsert({
          user_id: user.id,
          state: persistableState as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        // Also sync entity tables (campaigns, pcs, campaign_members).
        await syncEntityTables(supabase, persistableState, user.id);
      } catch {
        // Sync failure is non-fatal — state is safely in localStorage.
      }
    }, 500);
  }, [state]);

  useEffect(() => {
    if (syncing) return;
    const collectCampaignIds = () => {
      const ids = new Set<string>();
      if (state.activeCampaignId) ids.add(state.activeCampaignId);
      for (const encounter of state.encounters) {
        if (encounter.isRunning && encounter.campaignId) {
          ids.add(encounter.campaignId);
        }
      }
      return Array.from(ids);
    };

    if (playerViewTimerRef.current) clearTimeout(playerViewTimerRef.current);
    playerViewTimerRef.current = setTimeout(() => {
      void (async () => {
        try {
          const { createSupabaseClient } = await import("../supabase/client");
          const supabase = createSupabaseClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;

          const now = Date.now();
          if (playerViewOwnedUserIdRef.current !== user.id) {
            playerViewOwnedUserIdRef.current = user.id;
            playerViewOwnedIdsRef.current = null;
            playerViewOwnedIdsFetchedAtRef.current = null;
          }
          // Ownership does not change within the app; IDs are sufficient here.
          // TTL refresh covers any rare external ownership changes.
          const campaignSignature = state.campaigns.map((c) => c.id).sort().join("|");
          if (playerViewCampaignSignatureRef.current !== campaignSignature) {
            playerViewCampaignSignatureRef.current = campaignSignature;
            playerViewOwnedIdsRef.current = null;
            playerViewOwnedIdsFetchedAtRef.current = null;
          }
          let ownedIds = playerViewOwnedIdsRef.current ?? new Set<string>();
          const ownedFresh =
            ownedIds &&
            playerViewOwnedIdsFetchedAtRef.current !== null &&
            now - playerViewOwnedIdsFetchedAtRef.current < PLAYER_VIEW_OWNED_IDS_TTL;
          const activeCampaignId = state.activeCampaignId;
          const activeChanged = playerViewActiveCampaignRef.current !== activeCampaignId;
          if (activeChanged) {
            playerViewActiveCampaignRef.current = activeCampaignId;
          }
          const needsRefreshForActive =
            Boolean(activeCampaignId) &&
            activeChanged &&
            !ownedIds.has(activeCampaignId as string);

          if (!ownedFresh || needsRefreshForActive) {
            const { data: ownedCampaigns } = await supabase
              .from("campaigns")
              .select("id")
              .eq("dm_user_id", user.id);
            ownedIds = new Set(
              (ownedCampaigns ?? []).map((c: { id: string }) => c.id)
            );
            playerViewOwnedIdsRef.current = ownedIds;
            playerViewOwnedIdsFetchedAtRef.current = now;
          }
          if (!ownedIds.size) return;

          const campaignIds = collectCampaignIds().filter((id) => ownedIds.has(id));
          if (!campaignIds.length) return;

          await Promise.all(
            campaignIds.map((campaignId) =>
              upsertPlayerView(
                supabase,
                campaignId,
                buildPlayerViewSnapshot(state, campaignId)
              )
            )
          );
        } catch {
          // Non-fatal
        }
      })();
    }, 300);

    return () => {
      if (playerViewTimerRef.current) {
        clearTimeout(playerViewTimerRef.current);
        playerViewTimerRef.current = null;
      }
    };
  }, [state.activeCampaignId, state.campaignMembers, state.encounters, state.pcs, state.campaigns, syncing]);

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

  const addPc = useCallback((pc: AddPcInput) => {
    setState((prev) => ({
      ...prev,
      pcs: [
        ...prev.pcs,
        {
          // Spread caller values first, then apply v8 defaults via ?? so
          // existing keys win and TypeScript doesn't raise TS2783.
          ...pc,
          id: createId(),
          visual: normalizeVisual(pc.visual),
          persistToCloud: pc.persistToCloud ?? true,
          deathSaves: pc.deathSaves ?? { ...DEFAULT_DEATH_SAVES },
          currency: pc.currency ?? { ...DEFAULT_CURRENCY },
          features: pc.features ?? [...DEFAULT_FEATURES],
          spellcasting: pc.spellcasting ?? { ...DEFAULT_SPELLCASTING },
          weapons: pc.weapons ?? [...DEFAULT_WEAPONS],
          personalityTraits: pc.personalityTraits ?? "",
          ideals: pc.ideals ?? "",
          bonds: pc.bonds ?? "",
          flaws: pc.flaws ?? "",
        },
      ],
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
    // Fire-and-forget: delete from entity table immediately.
    // The orphan cleanup in syncEntityTables catches any network failures.
    void (async () => {
      try {
        const { createSupabaseClient } = await import("../supabase/client");
        const supabase = createSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await supabase.from("pcs").delete().eq("id", id);
        // campaign_members cascade-deleted via FK
      } catch { /* non-fatal */ }
    })();
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

        // --- PC side-effects ---
        let updatedPcs = prev.pcs;

        // Death save writeback: atomically sync deathSaves to canonical Pc record.
        if (fullEvent.t === "DEATH_SAVES_SET") {
          const dsEvent = fullEvent as Extract<EncounterEvent, { t: "DEATH_SAVES_SET" }>;
          updatedPcs = prev.pcs.map((pc) =>
            pc.id === dsEvent.pcId ? { ...pc, deathSaves: dsEvent.value } : pc
          );
        }

        // HP writeback on encounter completion: sync currentHp / tempHp back to Pc.
        if (fullEvent.t === "ENCOUNTER_COMPLETED") {
          const completedEncounter = updatedEncounters.find((e) => e.id === encounterId);
          if (completedEncounter) {
            const hpMap = new Map(
              completedEncounter.participants
                .filter((p) => p.kind === "pc" && p.refId)
                .map((p) => [p.refId!, { currentHp: p.currentHp, tempHp: p.tempHp }])
            );
            if (hpMap.size > 0) {
              updatedPcs = prev.pcs.map((pc) => {
                const hp = hpMap.get(pc.id);
                if (!hp) return pc;
                return {
                  ...pc,
                  currentHp: hp.currentHp ?? pc.currentHp,
                  tempHp: hp.tempHp ?? 0,
                };
              });
            }
          }
        }

        if (!AUTO_LOG_EVENTS.has(fullEvent.t)) {
          return { ...prev, encounters: updatedEncounters, pcs: updatedPcs };
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
          pcs: updatedPcs,
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
    // Fire-and-forget: delete from entity table immediately.
    // campaign_members cascade-deleted via FK.
    void (async () => {
      try {
        const { createSupabaseClient } = await import("../supabase/client");
        const supabase = createSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await supabase.from("campaigns").delete().eq("id", id);
      } catch { /* non-fatal */ }
    })();
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
      // Fire-and-forget: delete from entity table immediately.
      void (async () => {
        try {
          const { createSupabaseClient } = await import("../supabase/client");
          const supabase = createSupabaseClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from("campaign_members")
              .delete()
              .eq("campaign_id", campaignId)
              .eq("pc_id", pcId);
          }
        } catch { /* non-fatal */ }
      })();
    },
    []
  );

  const resetState = useCallback(() => {
    setState({ ...seedState });
  }, []);

  /**
   * Connect to a DM's game as an unauthenticated player.
   * Called when the player visits /player?u=<dmUserId> for the first time.
   * The DM's userId is persisted in localStorage so subsequent page loads
   * automatically fetch the DM's state without re-entering the link.
   */
  const connectToGame = useCallback(async (dmUserId: string) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PLAYER_CONNECT_KEY, dmUserId);
    }
    try {
      const { createSupabaseClient } = await import("../supabase/client");
      const supabase = createSupabaseClient();

      // Fetch the full blob (for encounters, notes, monsters, etc.)
      const { data: blobData } = await supabase
        .from("user_app_state")
        .select("state")
        .eq("user_id", dmUserId)
        .single();

      let remote: AppState | null = blobData?.state
        ? normalizeState(blobData.state as AppState)
        : null;

      // Overlay entity tables (campaigns / pcs / members are more reliably
      // up-to-date here than in the blob, especially after Phase 2 migrations).
      try {
        const entities = await fetchEntityTables(supabase, dmUserId);
        if (
          entities.campaigns.length > 0 ||
          entities.pcs.length > 0 ||
          entities.campaignMembers.length > 0
        ) {
          const base = remote ?? { ...seedState };
          remote = {
            ...base,
            campaigns: entities.campaigns,
            pcs: entities.pcs.map((pc) => ({
              ...pc,
              visual: normalizeVisual(pc.visual),
              skillProficiencies:
                pc.skillProficiencies ?? { ...DEFAULT_SKILL_PROFICIENCIES },
              pin: pc.pin ?? null,
            })),
            campaignMembers: entities.campaignMembers,
          };
        }
      } catch {
        // Non-fatal — fall back to blob-only state.
      }

      if (remote) {
        setState(remote);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
        }
      }
    } catch {
      // Non-fatal — player continues with whatever state is in localStorage.
    }
  }, []);

  const value = useMemo(
    () => ({
      state,
      hydrated,
      syncing,
      connectToGame,
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
      syncing,
      connectToGame,
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

  return (
    <AppStoreContext.Provider value={value}>
      <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
    </AppStoreContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error("useAppStore must be used within AppStoreProvider");
  }
  return context;
};
