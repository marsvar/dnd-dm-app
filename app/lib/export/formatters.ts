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
  const lines: string[] = [
    `# Session Log: ${campaignName}`,
    `*Exported ${isoDate()}*`,
    "",
  ];

  if (!entries.length) {
    lines.push("*(no log entries)*");
  } else {
    for (const entry of entries) {
      const date = new Date(entry.timestamp).toLocaleDateString();
      const time = formatTime(entry.timestamp);
      const sourceLabel = entry.source === "auto" ? " *(auto)*" : " *(manual)*";
      lines.push(`**${date} ${time}** · ${entry.text}${sourceLabel}`);
    }
  }

  return lines.join("\n");
}

export function logToJSON(entries: LogEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

// ── Notes ────────────────────────────────────────────────────────────────────

export function notesToMarkdown(
  notes: Note[],
  campaignName: string
): string {
  const lines: string[] = [
    `# Campaign Notes: ${campaignName}`,
    `*Exported ${isoDate()}*`,
    "",
  ];

  if (!notes.length) {
    lines.push("*(no notes)*");
  } else {
    for (const note of notes) {
      lines.push(`## ${note.title}`);
      const date = new Date(note.createdAt).toLocaleDateString();
      const tags = note.tags.length ? note.tags.join(", ") : "—";
      lines.push(`**Tags:** ${tags} · ${date}`);
      lines.push("");
      if (note.body) {
        lines.push(note.body);
        lines.push("");
      }
      lines.push("---");
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function notesToJSON(notes: Note[]): string {
  return JSON.stringify(notes, null, 2);
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
