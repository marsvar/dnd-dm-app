import test from "node:test";
import assert from "node:assert/strict";
import { getDefaultEncounter, getRunningEncounter } from "../encounterSelectors.ts";
import type { Encounter } from "../../models/types.ts";

const baseEncounter = (overrides: Partial<Encounter>): Encounter => ({
  id: "enc-1",
  name: "Encounter",
  campaignId: undefined,
  location: undefined,
  participants: [],
  round: 1,
  isRunning: false,
  status: "idle",
  combatMode: "prep",
  activeParticipantId: null,
  eventLog: [],
  ...overrides,
});

test("getDefaultEncounter prefers selected encounter id", () => {
  const encounters = [
    baseEncounter({ id: "enc-1", name: "First" }),
    baseEncounter({ id: "enc-2", name: "Second", isRunning: true, status: "running" }),
  ];
  const selected = getDefaultEncounter(encounters, "enc-1");
  assert.equal(selected?.id, "enc-1");
});

test("getDefaultEncounter prefers running encounter over first", () => {
  const encounters = [
    baseEncounter({ id: "enc-1", status: "completed" }),
    baseEncounter({ id: "enc-2", isRunning: true, status: "running" }),
  ];
  const selected = getDefaultEncounter(encounters, null);
  assert.equal(selected?.id, "enc-2");
});

test("getDefaultEncounter returns null when no encounters", () => {
  const selected = getDefaultEncounter([], null);
  assert.equal(selected, null);
});

test("getRunningEncounter filters by campaign when provided", () => {
  const encounters = [
    baseEncounter({ id: "enc-1", campaignId: "c1", isRunning: true, status: "running" }),
    baseEncounter({ id: "enc-2", campaignId: "c2", isRunning: true, status: "running" }),
  ];
  const running = getRunningEncounter(encounters, "c2");
  assert.equal(running?.id, "enc-2");
});
