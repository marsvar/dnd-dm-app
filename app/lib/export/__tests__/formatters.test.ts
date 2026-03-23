import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { LogEntry, Note } from "../../models/types.ts";
import {
  logToMarkdown,
  logToJSON,
  notesToMarkdown,
  notesToJSON,
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
