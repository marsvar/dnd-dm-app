import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildStateFromRows } from "../normalizedState.ts";
import type { EncounterEvent } from "../../engine/encounterEvents";

describe("buildStateFromRows", () => {
  it("reconstructs encounter state from baseline + events", () => {
    const events: EncounterEvent[] = [
      {
        id: "event-1",
        at: "2026-03-23T10:00:00Z",
        t: "COMBAT_STARTED",
      },
    ];

    const state = buildStateFromRows({
      campaigns: [
        {
          id: "camp-1",
          name: "Test",
          description: null,
          created_at: "2026-03-23T09:00:00Z",
        },
      ],
      pcs: [],
      pcAssignments: [],
      encounters: [
        {
          id: "enc-1",
          campaign_id: "camp-1",
          name: "Ambush",
          location: null,
          status: "active",
          baseline: {
            id: "enc-1",
            name: "Ambush",
            round: 1,
            isRunning: false,
            activeParticipantId: null,
            participants: [],
          },
          created_at: "2026-03-23T09:00:00Z",
        },
      ],
      encounterEvents: [
        {
          encounter_id: "enc-1",
          event: events[0],
          created_at: "2026-03-23T10:00:00Z",
        },
      ],
      notes: [],
      logEntries: [],
    });

    const encounter = state.encounters.find((e) => e.id === "enc-1");
    assert.ok(encounter);
    assert.equal(encounter?.isRunning, true);
    assert.equal(encounter?.eventLog.length, 1);
  });
});
