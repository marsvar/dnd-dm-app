import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapCampaignRows } from "../campaigns.ts";
import { mapPcRow } from "../pcs.ts";
import { mapEncounterRow } from "../encounters.ts";
import { mapNoteRow } from "../notes.ts";
import { mapLogRow } from "../log.ts";
import { mapEncounterEventRow } from "../encounterEvents.ts";
import type { Pc } from "../../../models/types.ts";
import type { EncounterEvent } from "../../../engine/encounterEvents.ts";

describe("campaigns mapping", () => {
  it("maps campaign rows", () => {
    const rows = [
      { id: "1", name: "A", description: null, created_at: "2026-03-23" },
    ];
    assert.deepEqual(mapCampaignRows(rows), [
      { id: "1", name: "A", description: undefined, createdAt: "2026-03-23" },
    ]);
  });
});

describe("pcs mapping", () => {
  it("uses row name and preserves data", () => {
    const data = { name: "FromData", playerName: "Zoe" } as Partial<Pc>;
    const row = {
      id: "pc-1",
      campaign_id: "camp-1",
      name: "RowName",
      data,
      created_by: "user-1",
      created_at: "2026-03-23",
    };

    const result = mapPcRow(row);
    assert.equal(result.id, "pc-1");
    assert.equal(result.name, "RowName");
    assert.equal(result.playerName, "Zoe");
  });
});

describe("encounters mapping", () => {
  it("maps planned to idle status", () => {
    const row = {
      id: "enc-1",
      campaign_id: "camp-1",
      name: "Planned",
      location: null,
      status: "planned" as const,
      baseline: { round: 2, participants: [] },
      created_at: "2026-03-23",
    };

    const result = mapEncounterRow(row);
    assert.equal(result.status, "idle");
    assert.equal(result.round, 2);
  });

  it("maps active to running status", () => {
    const row = {
      id: "enc-2",
      campaign_id: "camp-1",
      name: "Active",
      location: "Forest",
      status: "active" as const,
      baseline: null,
      created_at: "2026-03-23",
    };

    const result = mapEncounterRow(row);
    assert.equal(result.status, "running");
    assert.equal(result.round, 1);
  });
});

describe("notes mapping", () => {
  it("defaults tags to empty array", () => {
    const row = {
      id: "note-1",
      campaign_id: null,
      title: "Note",
      body: "Body",
      tags: null,
      created_at: "2026-03-23",
    };

    const result = mapNoteRow(row);
    assert.deepEqual(result.tags, []);
  });
});

describe("log mapping", () => {
  it("uses created_at when timestamp missing", () => {
    const row = {
      id: "log-1",
      campaign_id: "camp-1",
      encounter_id: "enc-1",
      text: "Log",
      timestamp: null,
      created_at: "2026-03-23T10:00:00Z",
      source: null,
    };

    const result = mapLogRow(row);
    assert.equal(result.timestamp, "2026-03-23T10:00:00Z");
    assert.equal(result.source, "manual");
  });
});

describe("encounter events mapping", () => {
  it("returns event payload", () => {
    const event: EncounterEvent = {
      id: "event-1",
      at: "2026-03-23T10:00:00Z",
      t: "COMBAT_STARTED",
    };
    const row = {
      id: "row-1",
      encounter_id: "enc-1",
      event,
      created_at: "2026-03-23T10:00:00Z",
    };
    assert.deepEqual(mapEncounterEventRow(row), event);
  });
});
