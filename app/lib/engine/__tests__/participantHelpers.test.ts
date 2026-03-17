// app/lib/engine/__tests__/participantHelpers.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveParticipantSource,
  getDexMod,
  getInitiativeMod,
} from "../participantHelpers.ts";
import type { EncounterParticipant, Pc, Monster } from "../../models/types.ts";

// Cast as unknown first — Pc has many required fields not needed for these tests.
// saveProficiencies/saveBonuses are the correct field names (not saves).
const basePc = {
  id: "pc-1", name: "Atrynn", playerName: "Alex", className: "Rogue",
  race: "Elf", level: 5, ac: 16, maxHp: 42, currentHp: 42, tempHp: 0,
  abilities: { str: 10, dex: 18, con: 14, int: 12, wis: 13, cha: 16 },
  skills: {}, saveProficiencies: {}, saveBonuses: {},
  resources: [], notes: "", inspiration: false, conditions: [],
} as unknown as Pc;

// alignment is required on Monster — include it.
const baseMonster = {
  id: "mon-1", name: "Goblin", size: "Small", type: "humanoid",
  alignment: "neutral evil",
  ac: 13, hp: 7, speed: "30 ft.", challenge: "1/4",
  abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
  source: "SRD",
} as unknown as Monster;

const makeParticipant = (overrides: Partial<EncounterParticipant> = {}): EncounterParticipant => ({
  id: "p-1", name: "Test", kind: "pc", refId: undefined,
  initiative: null, ac: 10, maxHp: 10, currentHp: 10, tempHp: 0,
  conditions: [], deathSaves: null,
  ...overrides,
});

describe("resolveParticipantSource", () => {
  it("returns Pc when kind is pc and refId matches", () => {
    const result = resolveParticipantSource(
      makeParticipant({ kind: "pc", refId: "pc-1" }), [basePc], []
    );
    assert.equal(result, basePc);
  });

  it("returns Monster when kind is monster and refId matches", () => {
    const result = resolveParticipantSource(
      makeParticipant({ kind: "monster", refId: "mon-1" }), [], [baseMonster]
    );
    assert.equal(result, baseMonster);
  });

  it("returns null when refId is absent", () => {
    assert.equal(
      resolveParticipantSource(makeParticipant({ kind: "pc" }), [basePc], []),
      null
    );
  });

  it("returns null when refId does not match any record", () => {
    assert.equal(
      resolveParticipantSource(makeParticipant({ kind: "pc", refId: "pc-999" }), [basePc], []),
      null
    );
  });

  it("returns null for npc kind even with refId", () => {
    assert.equal(
      resolveParticipantSource(makeParticipant({ kind: "npc", refId: "pc-1" }), [basePc], []),
      null
    );
  });
});

describe("getDexMod", () => {
  it("returns 0 for score 10", () => assert.equal(getDexMod(10), 0));
  it("returns +4 for score 18", () => assert.equal(getDexMod(18), 4));
  it("returns -1 for score 8", () => assert.equal(getDexMod(8), -1));
  it("returns +5 for score 20", () => assert.equal(getDexMod(20), 5));
  it("rounds down: +2 for score 15", () => assert.equal(getDexMod(15), 2));
});

describe("getInitiativeMod", () => {
  it("returns DEX mod from Pc (dex 18 → +4)", () => {
    assert.equal(
      getInitiativeMod(makeParticipant({ kind: "pc", refId: "pc-1" }), [basePc], []),
      4
    );
  });

  it("returns DEX mod from Monster (dex 14 → +2)", () => {
    assert.equal(
      getInitiativeMod(makeParticipant({ kind: "monster", refId: "mon-1" }), [], [baseMonster]),
      2
    );
  });

  it("returns 0 when refId is absent", () => {
    assert.equal(
      getInitiativeMod(makeParticipant({ kind: "pc" }), [basePc], []),
      0
    );
  });
});
