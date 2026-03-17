import type { AppState } from "../models/types";

export function collectPlayerSnapshotCampaignIds(state: AppState): string[] {
  const ids = new Set<string>();
  if (state.activeCampaignId) {
    ids.add(state.activeCampaignId);
  }
  for (const encounter of state.encounters) {
    if (encounter.isRunning && encounter.campaignId) {
      ids.add(encounter.campaignId);
    }
  }
  return Array.from(ids);
}
