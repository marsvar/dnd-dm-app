# Export: Logs & Notes — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Markdown and JSON export to the Log page, Notes page, encounter builder cards, and encounter runner header.

**Architecture:** Two pure-function modules (`formatters.ts`, `download.ts`) handle all data-to-string conversion and browser download triggering. A single reusable `ExportMenu` React component wraps both behind a Popover dropdown. Four call sites consume it with zero duplication.

**Tech Stack:** TypeScript, Next.js 16 App Router (`'use client'`), `@radix-ui/react-popover` (already installed), `lucide-react` (already installed), Node.js native `node:test` for unit tests.

**Spec:** `docs/superpowers/specs/2026-03-17-export-logs-notes-design.md`

---

## File Map

| File | Status | Responsibility |
|------|--------|---------------|
| `app/lib/export/formatters.ts` | Create | All data → Markdown/JSON string conversion. Pure functions, no I/O. |
| `app/lib/export/download.ts` | Create | Browser Blob download trigger. No logic, no formatting. |
| `app/lib/export/__tests__/formatters.test.ts` | Create | Unit tests for all 6 formatter functions. |
| `app/components/ExportMenu.tsx` | Create | Reusable `ExportMenu` component (Popover + two download items). |
| `app/log/page.tsx` | Modify | Add `<ExportMenu>` to page header. |
| `app/notes/page.tsx` | Modify | Add `<ExportMenu>` to page header. |
| `app/encounters/builder/page.tsx` | Modify | Add `<ExportMenu>` to active + completed encounter card footers. |
| `app/encounters/player/CombatHeader.tsx` | Modify | Add `<ExportMenu>` to header right section. |
| `package.json` | Modify | Widen test glob to include `app/lib/export/__tests__/`. |

---

## Task 1: `download.ts` + formatter skeleton

**Files:**
- Create: `app/lib/export/download.ts`
- Create: `app/lib/export/formatters.ts`

- [ ] **Step 1: Create `app/lib/export/download.ts`**

```typescript
// app/lib/export/download.ts
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Create `app/lib/export/formatters.ts` with shared helpers and stub exports**

```typescript
// app/lib/export/formatters.ts
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
```

- [ ] **Step 3: Widen the test glob in `package.json`**

Change:
```json
"test": "node --test --experimental-strip-types app/lib/engine/__tests__/*.test.ts"
```
To:
```json
"test": "node --test --experimental-strip-types 'app/lib/**/__tests__/*.test.ts'"
```

- [ ] **Step 4: Run lint to confirm no errors**

```bash
npm run lint
```

Expected: zero errors on new files.

- [ ] **Step 5: Commit**

```bash
git add app/lib/export/formatters.ts app/lib/export/download.ts package.json
git commit -m "feat(export): add formatter skeleton, download utility, widen test glob"
```

---

## Task 2: Log and Notes formatters + tests

**Files:**
- Modify: `app/lib/export/formatters.ts`
- Create: `app/lib/export/__tests__/formatters.test.ts`

- [ ] **Step 1: Write failing tests for log and notes formatters**

Create `app/lib/export/__tests__/formatters.test.ts`:

```typescript
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
    // Should not throw or produce garbage
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test 2>&1 | grep -E "FAIL|PASS|Error" | head -20
```

Expected: tests fail because functions return `""`.

- [ ] **Step 3: Implement `logToMarkdown`, `logToJSON`, `notesToMarkdown`, `notesToJSON` in `formatters.ts`**

Replace the stub bodies:

```typescript
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
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npm test 2>&1 | grep -E "✓|✗|FAIL|PASS|pass|fail" | head -30
```

Expected: all log and notes tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/lib/export/formatters.ts app/lib/export/__tests__/formatters.test.ts
git commit -m "feat(export): implement log and notes formatters with tests"
```

---

## Task 3: Encounter formatters + tests

**Files:**
- Modify: `app/lib/export/formatters.ts`
- Modify: `app/lib/export/__tests__/formatters.test.ts`

- [ ] **Step 1: Add encounter tests to `formatters.test.ts`**

Add these imports at the top of the test file:

```typescript
import type { Encounter, EncounterParticipant } from "../../models/types.ts";
import { encounterToMarkdown, encounterToJSON } from "../formatters.ts";
```

Add this fixture after the existing fixtures:

```typescript
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
```

Add the encounter test suite:

```typescript
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
      // Goblin Boss is removed — no longer in participants
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
          // actorId intentionally omitted
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
```

- [ ] **Step 2: Run tests to confirm the new encounter tests fail**

```bash
npm test 2>&1 | grep -E "✓|✗|fail|pass" | head -30
```

Expected: encounter tests fail, log/notes tests still pass.

- [ ] **Step 3: Implement `encounterToMarkdown` and `encounterToJSON` in `formatters.ts`**

Replace the stub bodies:

```typescript
export function encounterToMarkdown(
  encounter: Encounter,
  logEntries: LogEntry[]
): string {
  const date = isoDate();

  // Participant name lookup from current state.
  // Note: PARTICIPANT_ADDED events carry `Omit<EncounterParticipant, "id">` — no ID is
  // present in the event payload, so we cannot index removed participants by ID from the
  // event log. Removed participants fall back to "(removed participant)".
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

  // Combat log
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
      // Omitted:
      case "TURN_ADVANCED":
      case "INITIATIVE_SET":
      case "COMBAT_MODE_SET":
      case "ROLL_RECORDED":
        break;
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
```

- [ ] **Step 4: Run all tests and confirm they all pass**

```bash
npm test
```

Expected: all tests pass with no failures.

- [ ] **Step 5: Commit**

```bash
git add app/lib/export/formatters.ts app/lib/export/__tests__/formatters.test.ts
git commit -m "feat(export): implement encounter formatters with tests"
```

---

## Task 4: `ExportMenu` component

**Files:**
- Create: `app/components/ExportMenu.tsx`

- [ ] **Step 1: Create `app/components/ExportMenu.tsx`**

Use the project's own Popover wrappers from `ui.tsx` — do **not** import `@radix-ui/react-popover` directly. `PopoverContent` already portals internally, so no `<Popover.Portal>` wrapper is needed.

```tsx
// app/components/ExportMenu.tsx
"use client";
import { ChevronDown, FileText, Braces } from "lucide-react";
import { Button, cn, Popover, PopoverTrigger, PopoverContent } from "./ui";

interface ExportMenuProps {
  onMarkdown: () => void;
  onJSON: () => void;
  disabled?: boolean;
  /** Optional override for the trigger button's className */
  className?: string;
}

export function ExportMenu({
  onMarkdown,
  onJSON,
  disabled = false,
  className,
}: ExportMenuProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          title={disabled ? "Select a campaign first" : undefined}
          className={cn("flex items-center gap-1.5", className)}
        >
          Export
          <ChevronDown size={14} />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={4}
        className="w-44 p-1"
      >
        <button
          onClick={onMarkdown}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-strong"
        >
          <FileText size={14} className="text-muted" />
          Download Markdown
        </button>
        <button
          onClick={onJSON}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-strong"
        >
          <Braces size={14} className="text-muted" />
          Download JSON
        </button>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/ExportMenu.tsx
git commit -m "feat(export): add ExportMenu component"
```

---

## Task 5: Wire Log and Notes pages

**Files:**
- Modify: `app/log/page.tsx`
- Modify: `app/notes/page.tsx`

- [ ] **Step 1: Wire `app/log/page.tsx`**

At the top, add imports:
```typescript
import { ExportMenu } from "../components/ExportMenu";
import { logToMarkdown, logToJSON, slugify } from "../lib/export/formatters";
import { downloadFile } from "../lib/export/download";
```

In the component, find the campaign name for filenames. Add a `campaignName` variable after `activeCampaignId`:
```typescript
const campaignName =
  state.campaigns.find((c) => c.id === activeCampaignId)?.name ?? "all-campaigns";
```

Replace the bare `<SectionTitle ... />` with a flex wrapper:
```tsx
<div className="flex items-start justify-between gap-4">
  <SectionTitle
    title="Combat Log"
    subtitle="Capture quick events and memorable rolls."
  />
  <ExportMenu
    disabled={!activeCampaignId}
    onMarkdown={() => {
      const date = new Date().toISOString().slice(0, 10);
      downloadFile(
        logToMarkdown(visibleLog, campaignName),
        `${slugify(campaignName)}-log-${date}.md`,
        "text/markdown"
      );
    }}
    onJSON={() => {
      const date = new Date().toISOString().slice(0, 10);
      downloadFile(
        logToJSON(visibleLog),
        `${slugify(campaignName)}-log-${date}.json`,
        "application/json"
      );
    }}
  />
</div>
```

- [ ] **Step 2: Wire `app/notes/page.tsx`**

Add imports:
```typescript
import { ExportMenu } from "../components/ExportMenu";
import { notesToMarkdown, notesToJSON, slugify } from "../lib/export/formatters";
import { downloadFile } from "../lib/export/download";
```

Add `campaignName` variable:
```typescript
const campaignName =
  state.campaigns.find((c) => c.id === activeCampaignId)?.name ?? "all-campaigns";
```

Replace bare `<SectionTitle ... />` with flex wrapper:
```tsx
<div className="flex items-start justify-between gap-4">
  <SectionTitle
    title="Campaign Notes"
    subtitle="Track scenes, NPCs, and discoveries."
  />
  <ExportMenu
    disabled={!activeCampaignId}
    onMarkdown={() => {
      const date = new Date().toISOString().slice(0, 10);
      downloadFile(
        notesToMarkdown(visibleNotes, campaignName),
        `${slugify(campaignName)}-notes-${date}.md`,
        "text/markdown"
      );
    }}
    onJSON={() => {
      const date = new Date().toISOString().slice(0, 10);
      downloadFile(
        notesToJSON(visibleNotes),
        `${slugify(campaignName)}-notes-${date}.json`,
        "application/json"
      );
    }}
  />
</div>
```

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/log/page.tsx app/notes/page.tsx
git commit -m "feat(export): wire ExportMenu to Log and Notes pages"
```

---

## Task 6: Wire Encounter builder cards

**Files:**
- Modify: `app/encounters/builder/page.tsx`

The builder has two sets of encounter cards: **active encounters** (have a Launch/Resume button) and **completed encounters** (have a Review button). Both get an ExportMenu.

- [ ] **Step 1: Add imports to `app/encounters/builder/page.tsx`**

At the top with other imports:
```typescript
import { ExportMenu } from "../../components/ExportMenu";
import { encounterToMarkdown, encounterToJSON, slugify } from "../../lib/export/formatters";
import { downloadFile } from "../../lib/export/download";
```

- [ ] **Step 2: Add a shared helper function inside the component (before the return)**

```typescript
function exportEncounter(encounter: Encounter) {
  const date = new Date().toISOString().slice(0, 10);
  const slug = slugify(encounter.name);
  const logEntries = state.log.filter((l) => l.encounterId === encounter.id);
  return {
    onMarkdown: () =>
      downloadFile(
        encounterToMarkdown(encounter, logEntries),
        `${slug}-${date}.md`,
        "text/markdown"
      ),
    onJSON: () =>
      downloadFile(
        encounterToJSON(encounter, logEntries),
        `${slug}-${date}.json`,
        "application/json"
      ),
  };
}
```

Note: `state` and `Encounter` type are already in scope in this component.

- [ ] **Step 3: Wire active encounter cards**

In the active encounter card footer toolbar (around line 654), add `<ExportMenu>` before the `<div className="flex-1" />` spacer. The Export button only appears when `encounter.eventLog.length > 0`:

```tsx
{/* Footer toolbar */}
<div className="flex items-center gap-2 border-t border-black/10 bg-surface-strong px-3 py-2">
  <Button
    variant="outline"
    onClick={() => removeEncounter(encounter.id)}
    disabled={encounter.isRunning}
    className={`text-[var(--diff-hard)] hover:text-[var(--diff-deadly)] ${encounter.isRunning ? "opacity-40" : ""}`}
  >
    Remove
  </Button>
  <div className="flex-1" />
  {encounter.eventLog.length > 0 && (
    <ExportMenu {...exportEncounter(encounter)} />
  )}
  <Button
    variant="outline"
    onClick={() => openEditOverlay(encounter.id)}
    disabled={encounter.isRunning}
  >
    Edit
  </Button>
  <Button
    variant="primary"
    onClick={() => router.push("/encounters/player")}
    disabled={encounter.participants.length === 0}
    className={encounter.participants.length === 0 ? "opacity-40" : ""}
  >
    {encounter.isRunning ? "Resume ⚔" : "Launch ⚔"}
  </Button>
</div>
```

- [ ] **Step 4: Wire completed encounter cards**

In the completed encounter card footer toolbar (around line 777), add `<ExportMenu>` before the `<div className="flex-1" />` spacer. Completed encounters always have events so no conditional:

```tsx
{/* Footer toolbar — no Launch button, Remove always enabled */}
<div className="flex items-center gap-2 border-t border-black/10 bg-surface-strong px-3 py-2">
  <Button
    variant="outline"
    onClick={() => removeEncounter(encounter.id)}
    className="text-[var(--diff-hard)] hover:text-[var(--diff-deadly)]"
  >
    Remove
  </Button>
  <div className="flex-1" />
  <ExportMenu {...exportEncounter(encounter)} />
  <Button
    variant="outline"
    onClick={() => openEditOverlay(encounter.id)}
  >
    Review
  </Button>
</div>
```

- [ ] **Step 5: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/encounters/builder/page.tsx
git commit -m "feat(export): wire ExportMenu to encounter builder cards"
```

---

## Task 7: Wire CombatHeader

**Files:**
- Modify: `app/encounters/player/CombatHeader.tsx`

CombatHeader is styled with combat CSS variables (dark surface). `ExportMenu` uses the `Button outline` variant which adapts to CSS tokens — it will look slightly different from the other raw combat buttons, which is acceptable for a secondary action.

- [ ] **Step 1: Add imports to `CombatHeader.tsx`**

`useAppStore` is already imported on line 4 — do not add it again. Add:

```typescript
import { ExportMenu } from "../../components/ExportMenu";
import { encounterToMarkdown, encounterToJSON, slugify } from "../../lib/export/formatters";
import { downloadFile } from "../../lib/export/download";
```

- [ ] **Step 2: Destructure `state` from `useAppStore` and add export handlers**

`useAppStore` is a React context hook — there is no `.getState()` method. Destructure `state` from the existing hook call.

Find the existing destructure on line 33:
```typescript
const { advanceEncounterTurn, undoEncounterEvent } = useAppStore();
```

Change it to:
```typescript
const { advanceEncounterTurn, undoEncounterEvent, state } = useAppStore();
```

Then after the `handleUndo` callback, add:

```typescript
const handleExportMarkdown = useCallback(() => {
  const date = new Date().toISOString().slice(0, 10);
  const logEntries = state.log.filter((l) => l.encounterId === encounter.id);
  downloadFile(
    encounterToMarkdown(encounter, logEntries),
    `${slugify(encounter.name)}-${date}.md`,
    "text/markdown"
  );
}, [encounter, state.log]);

const handleExportJSON = useCallback(() => {
  const date = new Date().toISOString().slice(0, 10);
  const logEntries = state.log.filter((l) => l.encounterId === encounter.id);
  downloadFile(
    encounterToJSON(encounter, logEntries),
    `${slugify(encounter.name)}-${date}.json`,
    "application/json"
  );
}, [encounter, state.log]);
```

- [ ] **Step 3: Add `<ExportMenu>` to the right section of the header**

Find the right section (the `<div className="flex items-center gap-2">` that contains the undo button and "End Encounter"). Add `<ExportMenu>` just before "End Encounter":

```tsx
{/* Right: Undo + Export + End Encounter */}
<div className="flex items-center gap-2">
  {lastEvent && (
    <button
      onClick={handleUndo}
      aria-label="Undo last action"
      title="Undo last action"
      className="text-xs px-3 py-1.5 rounded-md border truncate max-w-[200px] transition-colors"
      style={{
        backgroundColor: "var(--combat-surface-raised)",
        borderColor: "var(--combat-border)",
        color: "var(--combat-fg-muted)",
      }}
    >
      ↩ {lastEventText}
    </button>
  )}
  <ExportMenu
    onMarkdown={handleExportMarkdown}
    onJSON={handleExportJSON}
  />
  <button
    onClick={onEndEncounter}
    className="text-xs font-semibold px-3 py-1.5 rounded-md shrink-0"
    style={{ backgroundColor: "var(--combat-live-bg)", color: "var(--combat-live-fg)" }}
  >
    End Encounter
  </button>
</div>
```

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/encounters/player/CombatHeader.tsx
git commit -m "feat(export): wire ExportMenu to encounter runner header"
```

---

## Task 8: Final check

- [ ] **Step 1: Full lint + build**

```bash
npm run lint && npm run build
```

Expected: zero lint errors, build completes successfully.

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Manual smoke test checklist**

Start the dev server (`npm run dev`) and verify:

- [ ] Log page: "Export" button visible in header; disabled when no active campaign; downloads `.md` and `.json` files with correct content when campaign is active
- [ ] Notes page: same as above
- [ ] Encounter builder: "Export" button visible on cards with events (`eventLog.length > 0`); not visible on empty prep encounters; downloads correct files
- [ ] Encounter builder: "Export" visible on completed encounter cards
- [ ] Encounter runner: "Export" button visible in header; downloads correct files including encounter events and linked log entries

- [ ] **Step 4: Final commit (if any fixups were needed)**

```bash
git add -p  # stage only the fixups
git commit -m "fix(export): smoke test fixups"
```
