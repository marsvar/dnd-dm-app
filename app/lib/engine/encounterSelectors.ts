import type { Encounter } from "../models/types";

export function getRunningEncounter(
  encounters: Encounter[],
  campaignId?: string | null
): Encounter | null {
  if (campaignId) {
    return encounters.find((e) => e.campaignId === campaignId && e.isRunning) ?? null;
  }
  return encounters.find((e) => e.isRunning) ?? null;
}

export function getDefaultEncounter(
  encounters: Encounter[],
  selectedId: string | null
): Encounter | null {
  if (selectedId) {
    return encounters.find((encounter) => encounter.id === selectedId) ?? null;
  }
  return getRunningEncounter(encounters) ?? encounters[0] ?? null;
}
