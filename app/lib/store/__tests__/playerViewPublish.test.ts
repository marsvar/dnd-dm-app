import test from "node:test";
import assert from "node:assert/strict";
import { seedState } from "../../data/srd.ts";
import type { AppState, Encounter } from "../../models/types.ts";
import { collectPlayerSnapshotCampaignIds } from "../playerViewPublish.ts";

test("collectPlayerSnapshotCampaignIds returns active and running encounter campaigns", () => {
  const encounters: Encounter[] = [
    {
      id: "enc-running",
      name: "Running",
      campaignId: "camp-running",
      round: 1,
      isRunning: true,
      activeParticipantId: null,
      participants: [],
      eventLog: [],
    },
    {
      id: "enc-stopped",
      name: "Stopped",
      campaignId: "camp-stopped",
      round: 1,
      isRunning: false,
      activeParticipantId: null,
      participants: [],
      eventLog: [],
    },
    {
      id: "enc-no-campaign",
      name: "No Campaign",
      round: 1,
      isRunning: true,
      activeParticipantId: null,
      participants: [],
      eventLog: [],
    },
  ];

  const state: AppState = {
    ...seedState,
    activeCampaignId: "camp-active",
    encounters,
  };

  const result = collectPlayerSnapshotCampaignIds(state);

  assert.equal(result.length, 2);
  assert.ok(result.includes("camp-active"));
  assert.ok(result.includes("camp-running"));
});
