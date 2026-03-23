import type { Encounter, LogEntry, Note } from "../models/types";

// ── Shared helpers ───────────────────────────────────────────────────────────

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isoDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ── Log ──────────────────────────────────────────────────────────────────────

export function logToMarkdown(
  entries: LogEntry[],
  campaignName: string
): string {
  return ""; // TODO Task 2
}

export function logToJSON(entries: LogEntry[]): string {
  return ""; // TODO Task 2
}

// ── Notes ────────────────────────────────────────────────────────────────────

export function notesToMarkdown(
  notes: Note[],
  campaignName: string
): string {
  return ""; // TODO Task 3
}

export function notesToJSON(notes: Note[]): string {
  return ""; // TODO Task 3
}

// ── Encounter ────────────────────────────────────────────────────────────────

export function encounterToMarkdown(
  encounter: Encounter,
  logEntries: LogEntry[]
): string {
  return ""; // TODO Task 4
}

export function encounterToJSON(
  encounter: Encounter,
  logEntries: LogEntry[]
): string {
  return ""; // TODO Task 4
}
