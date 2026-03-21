import test from "node:test";
import assert from "node:assert/strict";
import { buildPlayerViewSnapshot } from "../playerViewProjection.ts";
import { seedState } from "../../data/srd.ts";
import type { AppState, Encounter } from "../../models/types.ts";

test("buildPlayerViewSnapshot masks monsters and returns PCs", () => {
  const basePc = seedState.pcs[0];
  const encounter: Encounter = {
    id: "enc-1",
    name: "Crypt",
    campaignId: "camp-1",
    round: 2,
    isRunning: true,
    activeParticipantId: "p1",
    participants: [
      {
        id: "p1",
        name: "Sera",
        kind: "pc",
        refId: "pc-1",
        initiative: 15,
        ac: 14,
        maxHp: 20,
        currentHp: 10,
        tempHp: 0,
        conditions: [],
        deathSaves: null,
      },
      {
        id: "m1",
        name: "Ghoul",
        kind: "monster",
        initiative: 12,
        ac: null,
        maxHp: 20,
        currentHp: 5,
        tempHp: 0,
        conditions: [],
        deathSaves: null,
      },
    ],
    eventLog: [],
  };

  const state: AppState = {
    ...seedState,
    pcs: [
      {
        ...basePc,
        id: "pc-1",
        name: "Sera",
        className: "Bard",
        level: 5,
        currentHp: 10,
        maxHp: 20,
        tempHp: 0,
        conditions: [],
      },
    ],
    encounters: [encounter],
    campaigns: [{ id: "camp-1", name: "C1", createdAt: "" }],
    campaignMembers: [{ id: "m1", campaignId: "camp-1", pcId: "pc-1" }],
    activeCampaignId: "camp-1",
  };

  const snapshot = buildPlayerViewSnapshot(state, "camp-1");
  assert.equal(snapshot.active_encounter?.id, "enc-1");
  assert.equal(snapshot.participants.length, 2);
  const pc = snapshot.participants.find((p) => p.kind === "pc");
  assert.equal(pc?.pc_id, "pc-1");
  const monster = snapshot.participants.find((p) => p.kind === "monster");
  assert.ok(monster);
  assert.ok(!("current_hp" in monster));
});

test("buildPlayerViewSnapshot returns empty when no active encounter", () => {
  const state: AppState = { ...seedState, encounters: [], activeCampaignId: null };
  const snapshot = buildPlayerViewSnapshot(state, "camp-1");
  assert.equal(snapshot.active_encounter, null);
  assert.equal(snapshot.participants.length, 0);
});
