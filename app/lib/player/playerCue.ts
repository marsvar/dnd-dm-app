import type { PlayerViewSnapshot } from "../engine/playerViewProjection";

export type CueState = {
  participantIds: string[];
  partyPcIds: string[];
  expiresAt: number | null;
};

export const PLAYER_CUE_CLASS =
  "bg-accent/10 ring-1 ring-accent/30 shadow-[0_0_12px_rgba(182,106,43,0.2)]";

export function cueClass(active: boolean) {
  return active ? PLAYER_CUE_CLASS : "";
}

export function buildCueState(
  diff: { participantIds: string[]; partyPcIds: string[] },
  nowMs: number
): CueState {
  if (diff.participantIds.length === 0 && diff.partyPcIds.length === 0) {
    return { participantIds: [], partyPcIds: [], expiresAt: null };
  }
  return { ...diff, expiresAt: nowMs + 1500 };
}

export function diffPlayerView(prev: PlayerViewSnapshot, next: PlayerViewSnapshot) {
  const participantIds: string[] = [];
  const partyPcIds: string[] = [];

  const isPc = (participant: PlayerViewSnapshot["participants"][number]) => participant.kind === "pc";

  const activeChanged =
    prev.active_encounter?.active_participant_id !== next.active_encounter?.active_participant_id;

  for (const nextP of next.participants ?? []) {
    const prevP = (prev.participants ?? []).find((p) => p.id === nextP.id);
    if (!prevP) {
      participantIds.push(nextP.id);
      continue;
    }
    const changed =
      prevP.initiative !== nextP.initiative ||
      prevP.kind !== nextP.kind ||
      (isPc(prevP) &&
        isPc(nextP) &&
        (prevP.current_hp !== nextP.current_hp ||
          prevP.max_hp !== nextP.max_hp ||
          prevP.temp_hp !== nextP.temp_hp ||
          JSON.stringify(prevP.conditions ?? []) !== JSON.stringify(nextP.conditions ?? []))) ||
      (!isPc(prevP) && !isPc(nextP) && prevP.hp_tier !== nextP.hp_tier);
    if (changed) participantIds.push(nextP.id);
  }

  if (activeChanged) {
    const ids = [prev.active_encounter?.active_participant_id, next.active_encounter?.active_participant_id].filter(
      Boolean
    ) as string[];
    participantIds.push(...ids);
  }

  for (const nextPc of next.party ?? []) {
    const prevPc = (prev.party ?? []).find((p) => p.pc_id === nextPc.pc_id);
    if (!prevPc) {
      partyPcIds.push(nextPc.pc_id);
      continue;
    }
    const changed =
      prevPc.current_hp !== nextPc.current_hp ||
      prevPc.max_hp !== nextPc.max_hp ||
      prevPc.temp_hp !== nextPc.temp_hp ||
      JSON.stringify(prevPc.conditions ?? []) !== JSON.stringify(nextPc.conditions ?? []);
    if (changed) partyPcIds.push(nextPc.pc_id);
  }

  return { participantIds, partyPcIds };
}
