# Export: Logs & Notes — Design Spec

**Date:** 2026-03-17
**Status:** Approved
**Roadmap item:** Data and quality → Basic export of logs and notes

---

## Problem

The DM has no way to export session logs or notes out of the app. There is no export UI on any page.

---

## Goals

1. DM can download a human-readable Markdown recap of a single encounter (to share with players).
2. DM can download a raw JSON backup of a single encounter (for archiving).
3. DM can download Markdown and JSON exports of all campaign notes.
4. DM can download Markdown and JSON exports of the full campaign session log.

---

## Out of Scope

- Linking notes to specific encounters (notes only have `campaignId`, not `encounterId`; adding that field is a separate slice of work with its own UI).
- Re-import / restore from export files.
- PDF output.
- Any new navigation pages or routes.

---

## Export Surfaces

| Surface | Trigger | Data exported |
|---------|---------|---------------|
| **Log page** (`/log`) | "Export" button in page header | All `LogEntry[]` for active campaign. Button is **disabled** (with tooltip "Select a campaign first") when no campaign is active. |
| **Notes page** (`/notes`) | "Export" button in page header | All `Note[]` for active campaign. Same disabled behaviour. |
| **Encounter card** (builder) | "Export" button on card footer (only shown when `encounter.eventLog.length > 0`) | Encounter + participants + `eventLog[]` + matching `LogEntry[]` by `encounterId` |
| **Encounter runner** (`CombatHeader`) | "Export" button in header | Same as encounter card |

Each surface downloads two files via the same `ExportMenu` component: Markdown and JSON.

---

## File Formats

### Encounter Markdown (`<encounter-name>-<date>.md`)

```markdown
# Goblin Ambush
**Campaign:** The Lost Mines · **Location:** Forest Road
**Date:** 2026-03-17 · **Rounds:** 5 · **Status:** Completed

## Participants
| Name | Kind | HP | Conditions |
|------|----|-----|-----------|
| Aragorn | PC | 42/50 | — |
| Goblin Boss | Monster | 0/21 | — |

## Combat Log
- 14:23 · Aragorn dealt 8 damage to Goblin Boss
- 14:24 · Goblin Boss dealt 5 damage to Aragorn

## Rolls
| Who | Type | Formula | Result |
|-----|------|---------|--------|
| Aragorn | Attack | d20+4 | 18 |
```

### Encounter JSON (`<encounter-name>-<date>.json`)

Raw `JSON.stringify(data, null, 2)` of:
```ts
{
  encounter: Encounter,
  logEntries: LogEntry[]  // only those with matching encounterId
}
```

### Notes Markdown (`<campaign-name>-notes-<date>.md`)

```markdown
# Campaign Notes: The Lost Mines
*Exported 2026-03-17*

## The Ambush at Forest Road
**Tags:** combat, session-1 · 2026-03-15

The party was ambushed by goblins...

---
```

### Notes JSON (`<campaign-name>-notes-<date>.json`)

Raw `JSON.stringify(notes, null, 2)` of `Note[]`.

### Log Markdown (`<campaign-name>-log-<date>.md`)

```markdown
# Session Log: The Lost Mines
*Exported 2026-03-17*

**2026-03-15 14:23** · Aragorn took 8 damage *(auto)*
**2026-03-15 14:24** · Party arrived at the inn *(manual)*
```

### Log JSON (`<campaign-name>-log-<date>.json`)

Raw `JSON.stringify(entries, null, 2)` of `LogEntry[]`.

---

## Architecture

### New files

**`app/lib/export/formatters.ts`**

Pure functions — no I/O, no side effects. All accept plain data objects and return strings.

```ts
export function encounterToMarkdown(encounter: Encounter, logEntries: LogEntry[]): string
export function encounterToJSON(encounter: Encounter, logEntries: LogEntry[]): string
export function notesToMarkdown(notes: Note[], campaignName: string): string
export function notesToJSON(notes: Note[]): string
export function logToMarkdown(entries: LogEntry[], campaignName: string): string
export function logToJSON(entries: LogEntry[]): string
```

**`app/lib/export/download.ts`**

```ts
export function downloadFile(content: string, filename: string, mimeType: string): void
// Creates Blob → object URL → temp <a> → click → revoke URL
```

### New component

**`app/components/ExportMenu.tsx`** — `'use client'`

Uses existing `@radix-ui/react-popover` (already installed). No new packages.

Props:
```ts
interface ExportMenuProps {
  onMarkdown: () => void
  onJSON: () => void
  disabled?: boolean
}
```

Renders an `outline` Button labeled "Export" with a `ChevronDown` icon. On click, opens a Popover with two ghost buttons: "Download Markdown" (FileText icon) and "Download JSON" (Braces icon). All icons from `lucide-react`.

### Modified files (call sites only)

| File | Change |
|------|--------|
| `app/log/page.tsx` | Add `<ExportMenu>` to page header; wire `onMarkdown`/`onJSON` to formatters + `downloadFile`; disable when no `activeCampaignId` |
| `app/notes/page.tsx` | Same |
| `app/encounters/builder/page.tsx` | Encounter cards are inline in this file. Add `<ExportMenu>` to each card's footer row; show only when `encounter.eventLog.length > 0` |
| `app/encounters/player/CombatHeader.tsx` | Add `<ExportMenu>` to header |

---

## UI Placement Detail

- **Log/Notes pages:** `SectionTitle` has no right-side slot (accepts only `title` and `subtitle`). Do **not** modify `SectionTitle`. Instead, replace the bare `<SectionTitle>` call with a flex row: `<div className="flex items-start justify-between gap-4"><SectionTitle ... /><ExportMenu ... /></div>`. This is a local layout change at the call site only.
- **Encounter card:** Alongside existing Launch/Resume button in card footer. Only visible when the encounter has been started (has events).
- **CombatHeader:** Alongside undo button. Always visible during combat.

UI uses existing design tokens and shared primitives (`Button`, `cn`). No new design tokens needed.

---

## Filename Slugging

Filenames are slugged from the source name + ISO date:
- `"Goblin Ambush"` → `goblin-ambush-2026-03-17.md`
- `"The Lost Mines"` (notes) → `the-lost-mines-notes-2026-03-17.md`
- `"The Lost Mines"` (log) → `the-lost-mines-log-2026-03-17.md`

Slug function: lowercase, replace non-alphanumeric runs with `-`, trim leading/trailing `-`.

---

## Event Log Rendering (Encounter Markdown)

Translate `EncounterEvent` types to human-readable strings:

| Event type | Rendered as |
|------------|-------------|
| `DAMAGE_APPLIED` | `{name} took {amount} damage` |
| `HEAL_APPLIED` | `{name} healed {amount} HP` |
| `TEMP_HP_SET` | `{name} received {value} temp HP` |
| `CONDITIONS_SET` | `{name} conditions: {list \| "—"}` |
| `NOTES_SET` | `{name} note updated` |
| `ROUND_SET` | `Round {value}` |
| `TURN_ADVANCED` | Omitted (low signal) |
| `COMBAT_STARTED` | `Combat started` |
| `COMBAT_STOPPED` | `Combat stopped` |
| `PARTICIPANT_ADDED` | `{event.participant.name} joined` |
| `PARTICIPANT_REMOVED` | `{name} removed` (see note below) |
| `INITIATIVE_SET` | Omitted (prep-phase detail, low recap value) |
| `COMBAT_MODE_SET` | Omitted |
| `DEATH_SAVES_SET` | `{name} death saves: {successes} successes, {failures} failures` |
| `CONCENTRATION_SET` | `{name} is now concentrating` / `{name} dropped concentration` |
| `ROLL_RECORDED` | Rendered in Rolls table separately (see below) |
| `ENCOUNTER_COMPLETED` | `Encounter completed` |

**Timestamps:** Each event has an `at` field (ISO string) — use `event.at`, not `event.timestamp`.

**Participant name resolution:** Build a name-lookup map `Map<id, name>` by iterating the full `eventLog` first, collecting names from every `PARTICIPANT_ADDED` event (`event.participant.name`). For all other events that carry a `participantId`, look up the name in this map. Fall back to the participant's current entry in `encounter.participants` if the map lacks the id, then fall back to `"Unknown"`.

**`PARTICIPANT_REMOVED` edge case:** Since the participant may no longer exist in `encounter.participants` at export time, the name-lookup map (built from `PARTICIPANT_ADDED` events) is the only reliable source. If the name is not found there, render `"(removed participant)"`.

**`ROLL_RECORDED` actor:** Uses `event.actorId` (optional `string`). Look up the name from the participant map. If `actorId` is absent or not found, fall back to `"DM"` (the roll was recorded by the DM without a target participant).

---

## Definition of Done

- [ ] `formatters.ts` — all 6 functions implemented with correct output
- [ ] `download.ts` — `downloadFile` works in Chrome, Firefox, Safari
- [ ] `ExportMenu` — renders correctly, uses existing Popover, no new packages added
- [ ] Log page — Export button downloads correct files for active campaign
- [ ] Notes page — Export button downloads correct files for active campaign
- [ ] Encounter card — Export button only visible when `eventLog.length > 0`; downloads correct files
- [ ] CombatHeader — Export button downloads correct files for active encounter
- [ ] No `any` types; lint passes
- [ ] No new hardcoded hex/rgb values; no `dark:` variants

---

## Testing

| Test | Tier |
|------|------|
| `encounterToMarkdown` produces correct section headers and participant table | Unit |
| `encounterToMarkdown` renders each event type correctly | Unit |
| `encounterToMarkdown` with empty eventLog returns valid Markdown with empty sections | Unit |
| `encounterToMarkdown` with `PARTICIPANT_REMOVED` where participant no longer in `encounter.participants` renders `"(removed participant)"` | Unit |
| `encounterToMarkdown` with `ROLL_RECORDED` where `actorId` is absent renders `"DM"` in Rolls table | Unit |
| `notesToMarkdown` with empty notes array returns valid header-only Markdown | Unit |
| `logToMarkdown` separates auto vs manual entries | Unit |
| `encounterToJSON` output is valid JSON matching the shape | Unit |
