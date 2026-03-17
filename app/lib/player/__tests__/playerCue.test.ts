import test from "node:test";
import assert from "node:assert/strict";
import { buildCueState, diffPlayerView, cueClass } from "../playerCue.ts";
import type { PlayerViewSnapshot } from "../../engine/playerViewProjection.ts";

test("diffPlayerView returns changed participant + party ids", () => {
  const prev: PlayerViewSnapshot = {
    participants: [
      {
        id: "p1",
        name: "Sera",
        kind: "pc",
        initiative: 12,
        current_hp: 10,
        max_hp: 20,
        temp_hp: 0,
        conditions: [],
      },
    ],
    party: [
      {
        pc_id: "pc-1",
        name: "Sera",
        class_name: "Bard",
        level: 5,
        current_hp: 10,
        max_hp: 20,
        temp_hp: 0,
        conditions: [],
      },
    ],
    active_encounter: null,
  };
  const next: PlayerViewSnapshot = {
    participants: [
      {
        id: "p1",
        name: "Sera",
        kind: "pc",
        initiative: 12,
        current_hp: 5,
        max_hp: 20,
        temp_hp: 0,
        conditions: ["Poisoned"],
      },
    ],
    party: [
      {
        pc_id: "pc-1",
        name: "Sera",
        class_name: "Bard",
        level: 5,
        current_hp: 5,
        max_hp: 20,
        temp_hp: 0,
        conditions: ["Poisoned"],
      },
    ],
    active_encounter: null,
  };

  const diff = diffPlayerView(prev, next);
  assert.deepEqual(diff.participantIds, ["p1"]);
  assert.deepEqual(diff.partyPcIds, ["pc-1"]);
});

test("diffPlayerView includes monster tier + initiative changes", () => {
  const prev = {
    active_encounter: null,
    participants: [
      {
        id: "m1",
        name: "Goblin",
        kind: "monster",
        hp_tier: "Healthy",
        initiative: 10,
      },
    ],
    party: [],
  } as PlayerViewSnapshot;
  const next = {
    active_encounter: null,
    participants: [
      {
        id: "m1",
        name: "Goblin",
        kind: "monster",
        hp_tier: "Bloodied",
        initiative: 12,
      },
    ],
    party: [],
  } as PlayerViewSnapshot;

  const diff = diffPlayerView(prev, next);
  assert.deepEqual(diff.participantIds, ["m1"]);
});

test("diffPlayerView flags newly added rows", () => {
  const prev: PlayerViewSnapshot = {
    active_encounter: null,
    participants: [],
    party: [],
  };
  const next: PlayerViewSnapshot = {
    active_encounter: null,
    participants: [
      {
        id: "p1",
        kind: "pc",
        current_hp: 10,
        max_hp: 20,
        temp_hp: 0,
        conditions: [],
        initiative: 5,
        name: "Sera",
      },
    ],
    party: [
      {
        pc_id: "pc-1",
        name: "Sera",
        class_name: "Bard",
        level: 5,
        current_hp: 10,
        max_hp: 20,
        temp_hp: 0,
        conditions: [],
      },
    ],
  };
  const diff = diffPlayerView(prev, next);
  assert.deepEqual(diff.participantIds, ["p1"]);
  assert.deepEqual(diff.partyPcIds, ["pc-1"]);
});

test("buildCueState sets expiry and clears when no diff", () => {
  const now = 1000;
  const diff = { participantIds: ["p1"], partyPcIds: [] };
  const next = buildCueState(diff, now);
  assert.equal(next.expiresAt, 2500);
  const cleared = buildCueState({ participantIds: [], partyPcIds: [] }, now);
  assert.equal(cleared.expiresAt, null);
});

test("cueClass returns highlight classes when active", () => {
  assert.ok(cueClass(true).includes("ring-accent"));
  assert.equal(cueClass(false), "");
});
