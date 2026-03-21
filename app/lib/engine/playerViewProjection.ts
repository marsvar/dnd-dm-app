import type { AppState } from "../models/types";

export type PlayerViewSnapshot = {
  active_encounter: null | {
    id: string;
    name: string;
    round: number;
    active_participant_id: string | null;
  };
  participants: Array<
    | {
        id: string;
        name: string;
        kind: "pc";
        pc_id: string | null;
        initiative: number | null;
        current_hp: number | null;
        max_hp: number | null;
        temp_hp: number | null;
        conditions: string[];
      }
    | {
        id: string;
        name: string;
        kind: "monster" | "npc";
        initiative: number | null;
        hp_tier: "Healthy" | "Bloodied" | "Critical" | "Down" | "Unknown";
      }
  >;
  party: Array<{
    pc_id: string;
    name: string;
    class_name: string;
    level: number;
    current_hp: number;
    max_hp: number;
    temp_hp: number;
    conditions: string[];
  }>;
};

const hpTier = (current: number | null, max: number | null) => {
  if (current === null || max === null || max <= 0) return "Unknown" as const;
  if (current <= 0) return "Down" as const;
  const pct = current / max;
  if (pct <= 0.25) return "Critical" as const;
  if (pct <= 0.5) return "Bloodied" as const;
  return "Healthy" as const;
};

export function buildPlayerViewSnapshot(state: AppState, campaignId: string): PlayerViewSnapshot {
  const encounter = state.encounters.find((e) => e.campaignId === campaignId && e.isRunning) ?? null;

  const participants = encounter
    ? encounter.participants.map((p) =>
        p.kind === "pc"
          ? {
              id: p.id,
              name: p.name,
              kind: "pc" as const,
              pc_id: p.refId ?? null,
              initiative: p.initiative ?? null,
              current_hp: p.currentHp ?? null,
              max_hp: p.maxHp ?? null,
              temp_hp: p.tempHp ?? null,
              conditions: p.conditions ?? [],
            }
          : {
              id: p.id,
              name: p.name,
              kind: p.kind,
              initiative: p.initiative ?? null,
              hp_tier: hpTier(p.currentHp ?? null, p.maxHp ?? null),
            }
      )
    : [];

  const memberPcIds = new Set(
    state.campaignMembers.filter((m) => m.campaignId === campaignId).map((m) => m.pcId)
  );
  const party = state.pcs
    .filter((pc) => memberPcIds.has(pc.id))
    .map((pc) => ({
      pc_id: pc.id,
      name: pc.name,
      class_name: pc.className,
      level: pc.level,
      current_hp: pc.currentHp,
      max_hp: pc.maxHp,
      temp_hp: pc.tempHp,
      conditions: pc.conditions,
    }));

  return {
    active_encounter: encounter
      ? {
          id: encounter.id,
          name: encounter.name,
          round: encounter.round,
          active_participant_id: encounter.activeParticipantId,
        }
      : null,
    participants,
    party,
  };
}
