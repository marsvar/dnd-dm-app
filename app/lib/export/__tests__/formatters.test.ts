import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Encounter, EncounterParticipant, LogEntry, Note } from "../../models/types.ts";
import {
  logToMarkdown,
  logToJSON,
  notesToMarkdown,
  notesToJSON,
  encounterToMarkdown,
  encounterToJSON,
} from "../formatters.ts";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const logEntries: LogEntry[] = [
  {
    id: "l1",
    timestamp: "2026-03-15T14:23:00.000Z",
    text: "Aragorn took damage",
    source: "auto",
    campaignId: "c1",
  },
  {
    id: "l2",
    timestamp: "2026-03-15T14:24:00.000Z",
    text: "Party arrived at the inn",
    source: "manual",
    campaignId: "c1",
  },
];

const notes: Note[] = [
  {
    id: "n1",
    title: "The Ambush",
    body: "Goblins in the forest.",
    tags: ["combat", "session-1"],
    createdAt: "2026-03-15T12:00:00.000Z",
    campaignId: "c1",
  },
];

// ── Log tests ─────────────────────────────────────────────────────────────────

describe("logToMarkdown", () => {
  it("includes the campaign name in the header", () => {
    const md = logToMarkdown(logEntries, "The Lost Mines");
    assert.ok(md.includes("# Session Log: The Lost Mines"), md);
  });

  it("marks auto entries with (auto)", () => {
    const md = logToMarkdown(logEntries, "Test");
    assert.ok(md.includes("*(auto)*"), `Expected *(auto)* in:\n${md}`);
  });

  it("marks manual entries with (manual)", () => {
    const md = logToMarkdown(logEntries, "Test");
    assert.ok(md.includes("*(manual)*"), `Expected *(manual)* in:\n${md}`);
  });

  it("includes entry text", () => {
    const md = logToMarkdown(logEntries, "Test");
    assert.ok(md.includes("Party arrived at the inn"), md);
  });

  it("returns valid header when entries array is empty", () => {
    const md = logToMarkdown([], "Empty Campaign");
    assert.ok(md.includes("# Session Log: Empty Campaign"), md);
    assert.ok(md.includes("*(no log entries)*"), md);
  });
});

describe("logToJSON", () => {
  it("returns valid JSON array", () => {
    const json = logToJSON(logEntries);
    const parsed = JSON.parse(json);
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].id, "l1");
  });
});

// ── Notes tests ───────────────────────────────────────────────────────────────

describe("notesToMarkdown", () => {
  it("includes the campaign name in the header", () => {
    const md = notesToMarkdown(notes, "The Lost Mines");
    assert.ok(md.includes("# Campaign Notes: The Lost Mines"), md);
  });

  it("includes note title as a heading", () => {
    const md = notesToMarkdown(notes, "Test");
    assert.ok(md.includes("## The Ambush"), md);
  });

  it("includes note body", () => {
    const md = notesToMarkdown(notes, "Test");
    assert.ok(md.includes("Goblins in the forest."), md);
  });

  it("includes tags", () => {
    const md = notesToMarkdown(notes, "Test");
    assert.ok(md.includes("combat"), md);
  });

  it("returns valid header when notes array is empty", () => {
    const md = notesToMarkdown([], "Empty Campaign");
    assert.ok(md.includes("# Campaign Notes: Empty Campaign"), md);
    assert.equal(typeof md, "string");
  });
});

describe("notesToJSON", () => {
  it("returns valid JSON array", () => {
    const json = notesToJSON(notes);
    const parsed = JSON.parse(json);
    assert.equal(parsed[0].title, "The Ambush");
  });
});

// ── Encounter fixtures ─────────────────────────────────────────────────────────

const makeParticipant = (
  overrides: Partial<EncounterParticipant> & Pick<EncounterParticipant, "id" | "name">
): EncounterParticipant => ({
  kind: "pc",
  initiative: 14,
  ac: 15,
  maxHp: 50,
  currentHp: 42,
  tempHp: 0,
  conditions: [],
  deathSaves: null,
  ...overrides,
});

const baseEncounter: Encounter = {
  id: "enc-1",
  name: "Goblin Ambush",
  location: "Forest Road",
  campaignId: "c1",
  round: 3,
  isRunning: false,
  status: "completed",
  activeParticipantId: null,
  participants: [
    makeParticipant({ id: "p-1", name: "Aragorn", currentHp: 42, maxHp: 50 }),
    makeParticipant({ id: "p-2", name: "Goblin Boss", kind: "monster", currentHp: 0, maxHp: 21 }),
  ],
  eventLog: [],
};

// ── Encounter tests ────────────────────────────────────────────────────────────

describe("encounterToMarkdown", () => {
  it("includes encounter name as h1", () => {
    const md = encounterToMarkdown(baseEncounter, []);
    assert.ok(md.includes("# Goblin Ambush"), md);
  });

  it("includes participant table with name, kind, and HP", () => {
    const md = encounterToMarkdown(baseEncounter, []);
    assert.ok(md.includes("| Aragorn |"), md);
    assert.ok(md.includes("42/50"), md);
    assert.ok(md.includes("| Goblin Boss |"), md);
    assert.ok(md.includes("0/21"), md);
  });

  it("with empty eventLog returns valid Markdown with Combat Log and Rolls sections", () => {
    const md = encounterToMarkdown(baseEncounter, []);
    assert.ok(md.includes("## Combat Log"), md);
    assert.ok(md.includes("## Rolls"), md);
  });

  it("renders DAMAGE_APPLIED as '{name} took {n} damage'", () => {
    const enc: Encounter = {
      ...baseEncounter,
      eventLog: [
        { id: "e1", at: "2026-03-15T14:23:00.000Z", t: "DAMAGE_APPLIED", participantId: "p-1", amount: 8 },
      ],
    };
    const md = encounterToMarkdown(enc, []);
    assert.ok(md.includes("Aragorn took 8 damage"), md);
  });

  it("renders CONCENTRATION_SET true as 'is now concentrating'", () => {
    const enc: Encounter = {
      ...baseEncounter,
      eventLog: [
        { id: "e1", at: "2026-03-15T14:23:00.000Z", t: "CONCENTRATION_SET", participantId: "p-1", value: true },
      ],
    };
    const md = encounterToMarkdown(enc, []);
    assert.ok(md.includes("Aragorn is now concentrating"), md);
  });

  it("renders CONCENTRATION_SET false as 'dropped concentration'", () => {
    const enc: Encounter = {
      ...baseEncounter,
      eventLog: [
        { id: "e1", at: "2026-03-15T14:23:00.000Z", t: "CONCENTRATION_SET", participantId: "p-1", value: false },
      ],
    };
    const md = encounterToMarkdown(enc, []);
    assert.ok(md.includes("dropped concentration"), md);
  });

  it("renders PARTICIPANT_REMOVED as '(removed participant)' when participant is no longer in participants list", () => {
    const enc: Encounter = {
      ...baseEncounter,
      participants: [makeParticipant({ id: "p-1", name: "Aragorn" })],
      eventLog: [
        { id: "e1", at: "2026-03-15T14:23:00.000Z", t: "PARTICIPANT_REMOVED", participantId: "p-2" },
      ],
    };
    const md = encounterToMarkdown(enc, []);
    assert.ok(md.includes("(removed participant) removed"), md);
  });

  it("renders ROLL_RECORDED in Rolls table with 'DM' when actorId is absent", () => {
    const enc: Encounter = {
      ...baseEncounter,
      eventLog: [
        {
          id: "e1",
          at: "2026-03-15T14:23:00.000Z",
          t: "ROLL_RECORDED",
          mode: "dm",
          context: "Attack",
          formula: "d20+5",
          rawRolls: [14],
          total: 19,
        },
      ],
    };
    const md = encounterToMarkdown(enc, []);
    assert.ok(md.includes("| DM |"), md);
    assert.ok(md.includes("19"), md);
  });

  it("renders ROLL_RECORDED with actor name when actorId matches a participant", () => {
    const enc: Encounter = {
      ...baseEncounter,
      eventLog: [
        {
          id: "e1",
          at: "2026-03-15T14:23:00.000Z",
          t: "ROLL_RECORDED",
          actorId: "p-1",
          mode: "digital",
          context: "Attack",
          formula: "d20+4",
          rawRolls: [14],
          total: 18,
        },
      ],
    };
    const md = encounterToMarkdown(enc, []);
    assert.ok(md.includes("| Aragorn |"), md);
  });
});

describe("encounterToJSON", () => {
  it("returns valid JSON with encounter and logEntries keys", () => {
    const json = encounterToJSON(baseEncounter, logEntries);
    const parsed = JSON.parse(json);
    assert.ok("encounter" in parsed, "missing 'encounter' key");
    assert.ok("logEntries" in parsed, "missing 'logEntries' key");
    assert.equal(parsed.encounter.id, "enc-1");
    assert.equal(parsed.logEntries.length, 2);
  });
});
