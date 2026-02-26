/**
 * Pure campaign-level reducers / guards.
 *
 * These functions operate on plain AppState values with no React dependency,
 * so they can be imported in unit tests and in the store alike.
 */

import type { AppState, Encounter } from "../models/types";

// ---------------------------------------------------------------------------
// Guard: ensure at most one encounter is running per campaign.
// Returns true when it is safe to start combat for the given encounter.
// ---------------------------------------------------------------------------
export function canStartCombat(
  encounters: Encounter[],
  encounterId: string
): boolean {
  const target = encounters.find((e) => e.id === encounterId);
  if (!target?.campaignId) {
    // No campaign assigned — allow start (backwards-compatible).
    return true;
  }
  const conflict = encounters.find(
    (e) =>
      e.id !== encounterId &&
      e.campaignId === target.campaignId &&
      e.isRunning
  );
  return conflict === undefined;
}

// ---------------------------------------------------------------------------
// Cascade: delete a campaign and all its owned data from state.
// ---------------------------------------------------------------------------
export function deleteCampaignFromState(
  state: AppState,
  campaignId: string
): AppState {
  return {
    ...state,
    campaigns: state.campaigns.filter((c) => c.id !== campaignId),
    campaignMembers: state.campaignMembers.filter(
      (m) => m.campaignId !== campaignId
    ),
    encounters: state.encounters.filter((e) => e.campaignId !== campaignId),
    notes: state.notes.filter((n) => n.campaignId !== campaignId),
    log: state.log.filter((l) => l.campaignId !== campaignId),
    activeCampaignId:
      state.activeCampaignId === campaignId ? null : state.activeCampaignId,
  };
}
