import type { Encounter, LogEntry, Note } from "../models/types";
import type { EncounterEvent } from "../engine/encounterEvents";

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for API symmetry with encounterToJSON; encounter.eventLog provides combat events
  logEntries: LogEntry[]
): string {
  const date = isoDate();

  // Name lookup from current participants state.
  // PARTICIPANT_ADDED events carry Omit<EncounterParticipant, "id"> — no ID in payload.
  // Removed participants are not in encounter.participants, so fall back to "(removed participant)".
  const nameById = new Map<string, string>();
  for (const p of encounter.participants) nameById.set(p.id, p.name);
  const getName = (id: string) => nameById.get(id) ?? "(removed participant)";

  const lines: string[] = [
    `# ${encounter.name}`,
    `**Campaign:** ${encounter.campaignId ?? "—"} · **Location:** ${encounter.location ?? "—"}`,
    `**Date:** ${date} · **Rounds:** ${encounter.round} · **Status:** ${encounter.status ?? "—"}`,
    "",
    "## Participants",
    "| Name | Kind | HP | Conditions |",
    "|------|------|-----|-----------|",
  ];

  for (const p of encounter.participants) {
    const hp =
      p.currentHp !== null && p.maxHp !== null
        ? `${p.currentHp}/${p.maxHp}`
        : "—";
    const conditions = p.conditions.length ? p.conditions.join(", ") : "—";
    lines.push(`| ${p.name} | ${p.kind.toUpperCase()} | ${hp} | ${conditions} |`);
  }
  lines.push("");

  // Combat log (omit TURN_ADVANCED, INITIATIVE_SET, COMBAT_MODE_SET, ROLL_RECORDED)
  lines.push("## Combat Log");
  const combatLines: string[] = [];

  for (const e of encounter.eventLog) {
    const time = formatTime(e.at);
    let text: string | null = null;

    switch (e.t) {
      case "COMBAT_STARTED":
        text = "Combat started";
        break;
      case "COMBAT_STOPPED":
        text = "Combat stopped";
        break;
      case "ENCOUNTER_COMPLETED":
        text = "Encounter completed";
        break;
      case "ROUND_SET":
        text = `Round ${e.value}`;
        break;
      case "PARTICIPANT_ADDED":
        text = `${e.participant.name} joined`;
        break;
      case "PARTICIPANT_REMOVED":
        text = `${getName(e.participantId)} removed`;
        break;
      case "DAMAGE_APPLIED":
        text = `${getName(e.participantId)} took ${e.amount} damage`;
        break;
      case "HEAL_APPLIED":
        text = `${getName(e.participantId)} healed ${e.amount} HP`;
        break;
      case "TEMP_HP_SET":
        text =
          e.value !== null
            ? `${getName(e.participantId)} received ${e.value} temp HP`
            : `${getName(e.participantId)} temp HP cleared`;
        break;
      case "CONDITIONS_SET":
        text = `${getName(e.participantId)} conditions: ${
          e.value.length ? e.value.join(", ") : "—"
        }`;
        break;
      case "NOTES_SET":
        text = `${getName(e.participantId)} note updated`;
        break;
      case "DEATH_SAVES_SET":
        text = `${getName(e.participantId)} death saves: ${e.value.successes} successes, ${e.value.failures} failures`;
        break;
      case "CONCENTRATION_SET":
        text = e.value
          ? `${getName(e.participantId)} is now concentrating`
          : `${getName(e.participantId)} dropped concentration`;
        break;
      // Omitted from combat log:
      case "TURN_ADVANCED":
      case "INITIATIVE_SET":
      case "COMBAT_MODE_SET":
      case "ROLL_RECORDED":
        break;
      default: {
        // Exhaustiveness guard
        const _: never = e;
        void _;
        break;
      }
    }

    if (text !== null) combatLines.push(`- ${time} · ${text}`);
  }

  if (combatLines.length) {
    lines.push(...combatLines);
  } else {
    lines.push("*(no combat events)*");
  }
  lines.push("");

  // Rolls table (ROLL_RECORDED events only)
  const rolls = encounter.eventLog.filter(
    (e): e is Extract<EncounterEvent, { t: "ROLL_RECORDED" }> =>
      e.t === "ROLL_RECORDED"
  );

  lines.push("## Rolls");
  if (rolls.length) {
    lines.push("| Who | Type | Formula | Result |");
    lines.push("|-----|------|---------|--------|");
    for (const r of rolls) {
      const who = r.actorId ? (nameById.get(r.actorId) ?? "DM") : "DM";
      lines.push(`| ${who} | ${r.context} | ${r.formula} | ${r.total} |`);
    }
  } else {
    lines.push("*(no rolls recorded)*");
  }

  return lines.join("\n");
}

export function encounterToJSON(
  encounter: Encounter,
  logEntries: LogEntry[]
): string {
  return JSON.stringify({ encounter, logEntries }, null, 2);
}
