import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyEncounterEvent } from "../applyEncounterEvent.ts";
import type { Encounter, EncounterParticipant } from "../../models/types.ts";
import type { EncounterEvent } from "../encounterEvents.ts";

const createParticipants = (): EncounterParticipant[] => [
  {
    id: "p-1",
    name: "Alpha",
    kind: "pc",
    initiative: 14,
    ac: 15,
    maxHp: 12,
    currentHp: 12,
    tempHp: 0,
    conditions: [],
  },
  {
    id: "p-2",
    name: "Beta",
    kind: "monster",
    initiative: 10,
    ac: 13,
    maxHp: 9,
    currentHp: 9,
    tempHp: 0,
    conditions: [],
  },
];

const createEncounter = (overrides: Partial<Encounter> = {}): Encounter => ({
  id: "enc-1",
  name: "Test Encounter",
  round: 1,
  isRunning: false,
  activeParticipantId: null,
  participants: createParticipants(),
  eventLog: [],
  ...overrides,
});

const applyEvents = (baseline: Encounter, events: EncounterEvent[]) => {
  return events.reduce(applyEncounterEvent, { ...baseline, eventLog: [] });
};

describe("applyEncounterEvent", () => {
  it("sets activeParticipantId on COMBAT_STARTED", () => {
    const encounter = createEncounter();
    const event: EncounterEvent = {
      id: "evt-1",
      at: "2026-02-13T00:00:00.000Z",
      t: "COMBAT_STARTED",
    };
    const next = applyEncounterEvent(encounter, event);
    assert.equal(next.activeParticipantId, "p-1");
    assert.equal(next.isRunning, true);
  });

  it("increments round when advancing past end of order", () => {
    const encounter = createEncounter();
    const events: EncounterEvent[] = [
      { id: "evt-1", at: "2026-02-13T00:00:00.000Z", t: "COMBAT_STARTED" },
      { id: "evt-2", at: "2026-02-13T00:00:01.000Z", t: "TURN_ADVANCED", direction: 1 },
      { id: "evt-3", at: "2026-02-13T00:00:02.000Z", t: "TURN_ADVANCED", direction: 1 },
    ];
    const next = applyEvents(encounter, events);
    assert.equal(next.round, 2);
    assert.equal(next.activeParticipantId, "p-1");
  });

  it("stops combat and clears active participant", () => {
    const encounter = createEncounter({ isRunning: true, activeParticipantId: "p-1" });
    const event: EncounterEvent = {
      id: "evt-1",
      at: "2026-02-13T00:00:00.000Z",
      t: "COMBAT_STOPPED",
    };
    const next = applyEncounterEvent(encounter, event);
    assert.equal(next.isRunning, false);
    assert.equal(next.activeParticipantId, null);
  });

  it("sets round to a minimum of 1", () => {
    const encounter = createEncounter({ round: 3 });
    const event: EncounterEvent = {
      id: "evt-1",
      at: "2026-02-13T00:00:00.000Z",
      t: "ROUND_SET",
      value: 0,
    };
    const next = applyEncounterEvent(encounter, event);
    assert.equal(next.round, 1);
  });

  it("clamps damage to zero", () => {
    const encounter = createEncounter({
      participants: [
        {
          id: "p-1",
          name: "Alpha",
          kind: "pc",
          initiative: 10,
          ac: 15,
          maxHp: 12,
          currentHp: 3,
          tempHp: 0,
          conditions: [],
        },
      ],
    });
    const event: EncounterEvent = {
      id: "evt-1",
      at: "2026-02-13T00:00:00.000Z",
      t: "DAMAGE_APPLIED",
      participantId: "p-1",
      amount: 10,
    };
    const next = applyEncounterEvent(encounter, event);
    assert.equal(next.participants[0].currentHp, 0);
  });

  it("rebuilds correctly after undo", () => {
    const encounter = createEncounter();
    const events: EncounterEvent[] = [
      { id: "evt-1", at: "2026-02-13T00:00:00.000Z", t: "COMBAT_STARTED" },
      { id: "evt-2", at: "2026-02-13T00:00:01.000Z", t: "TURN_ADVANCED", direction: 1 },
      { id: "evt-3", at: "2026-02-13T00:00:02.000Z", t: "TURN_ADVANCED", direction: 1 },
    ];

    const fullState = applyEvents(encounter, events);
    const undoState = applyEvents(encounter, events.slice(0, -1));

    assert.equal(fullState.round, 2);
    assert.equal(undoState.round, 1);
    assert.equal(undoState.activeParticipantId, "p-2");
  });

  it("adds participant from event log with deterministic id", () => {
    const encounter = createEncounter();
    const event: EncounterEvent = {
      id: "evt-add-1",
      at: "2026-02-13T00:00:00.000Z",
      t: "PARTICIPANT_ADDED",
      participant: {
        name: "Gamma",
        kind: "npc",
        initiative: 12,
        ac: 14,
        maxHp: 11,
        currentHp: 11,
        tempHp: 0,
        conditions: [],
        notes: "",
      },
    };
    const next = applyEncounterEvent(encounter, event);
    assert.equal(next.participants.length, 3);
    const added = next.participants[2];
    assert.equal(added.id, "participant-evt-add-1");
    assert.equal(added.name, "Gamma");
    assert.equal(added.initiative, 12);
  });

  it("removes participant by id", () => {
    const encounter = createEncounter();
    const event: EncounterEvent = {
      id: "evt-rem-1",
      at: "2026-02-13T00:00:00.000Z",
      t: "PARTICIPANT_REMOVED",
      participantId: "p-2",
    };
    const next = applyEncounterEvent(encounter, event);
    assert.equal(next.participants.length, 1);
    assert.equal(next.participants[0].id, "p-1");
  });

  it("rebuilds correctly after participant remove undo", () => {
    const encounter = createEncounter();
    const events: EncounterEvent[] = [
      { id: "evt-1", at: "2026-02-13T00:00:00.000Z", t: "COMBAT_STARTED" },
      {
        id: "evt-2",
        at: "2026-02-13T00:00:01.000Z",
        t: "PARTICIPANT_REMOVED",
        participantId: "p-2",
      },
    ];

    const fullState = applyEvents(encounter, events);
    const undoState = applyEvents(encounter, events.slice(0, -1));

    assert.equal(fullState.participants.length, 1);
    assert.equal(undoState.participants.length, 2);
  });

  it("sets combatMode to 'live' on COMBAT_MODE_SET(live)", () => {
    const encounter = createEncounter();
    const event: EncounterEvent = {
      id: "evt-mode-1",
      at: "2026-02-13T00:00:00.000Z",
      t: "COMBAT_MODE_SET",
      mode: "live",
    };
    const next = applyEncounterEvent(encounter, event);
    assert.equal(next.combatMode, "live");
  });

  it("sets combatMode to 'prep' on COMBAT_MODE_SET(prep)", () => {
    const encounter = createEncounter({ combatMode: "live" });
    const event: EncounterEvent = {
      id: "evt-mode-2",
      at: "2026-02-13T00:00:00.000Z",
      t: "COMBAT_MODE_SET",
      mode: "prep",
    };
    const next = applyEncounterEvent(encounter, event);
    assert.equal(next.combatMode, "prep");
  });

  it("marks encounter completed on ENCOUNTER_COMPLETED", () => {
    const encounter = createEncounter({ isRunning: true });
    const event: EncounterEvent = {
      id: "evt-done-1",
      at: "2026-02-13T00:00:00.000Z",
      t: "ENCOUNTER_COMPLETED",
      notes: "Party survived!",
    };
    const next = applyEncounterEvent(encounter, event);
    assert.equal(next.status, "completed");
    assert.equal(next.isRunning, false);
    assert.equal(next.activeParticipantId, null);
  });

  it("ENCOUNTER_COMPLETED is undoable (event pop restores running state)", () => {
    const encounter = createEncounter();
    const events: EncounterEvent[] = [
      { id: "e1", at: "2026-02-13T00:00:00.000Z", t: "COMBAT_STARTED" },
      { id: "e2", at: "2026-02-13T00:00:01.000Z", t: "ENCOUNTER_COMPLETED" },
    ];
    const completed = applyEvents(encounter, events);
    const beforeComplete = applyEvents(encounter, events.slice(0, 1));
    assert.equal(completed.status, "completed");
    assert.equal(beforeComplete.isRunning, true);
    assert.equal(beforeComplete.status, undefined);
  });
});
