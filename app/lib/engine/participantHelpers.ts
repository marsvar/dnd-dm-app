// app/lib/engine/participantHelpers.ts
import type { EncounterParticipant, Pc, Monster } from "../models/types.ts";

/**
 * Look up the source record (Pc or Monster) for a participant via refId.
 * Returns null for NPCs or when refId is absent/unmatched.
 */
export function resolveParticipantSource(
  participant: EncounterParticipant,
  pcs: Pc[],
  monsters: Monster[]
): Pc | Monster | null {
  if (!participant.refId) return null;
  if (participant.kind === "pc") {
    return pcs.find((p) => p.id === participant.refId) ?? null;
  }
  if (participant.kind === "monster") {
    return monsters.find((m) => m.id === participant.refId) ?? null;
  }
  return null;
}

/** Convert an ability score to its modifier: floor((score - 10) / 2). */
export function getDexMod(dexScore: number): number {
  return Math.floor((dexScore - 10) / 2);
}

/**
 * Get the initiative modifier for a participant.
 * Returns the DEX mod from the source Pc or Monster record, or 0 if unavailable.
 */
export function getInitiativeMod(
  participant: EncounterParticipant,
  pcs: Pc[],
  monsters: Monster[]
): number {
  const source = resolveParticipantSource(participant, pcs, monsters);
  if (!source) return 0;
  return getDexMod(source.abilities.dex);
}
