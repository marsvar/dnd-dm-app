# Combat Polish v2 — Design Spec

**Date:** 2026-03-13
**Status:** Approved
**Scope:** Three-track sprint covering app shell, encounter builder, and combat runtime improvements.

---

## Overview

A cohesive set of improvements evaluated through the DM's primary question: *"Would I trust this app while running combat for 6 players at a noisy table?"*

The sprint is split into three independent tracks, each with a clear blast radius:

- **Track 1 — App Shell:** Nav restructure, Combat Active floating indicator, Resume last session on home
- **Track 2 — Encounter Builder:** Roll initiative for all, Encounter completion ceremony
- **Track 3 — Combat Runtime:** Participant row redesign, Quick damage/heal popover, Monster stat block reference, Condition tooltips, Keyboard shortcuts

---

## New Dependencies

| Package | Purpose |
|---|---|
| `@radix-ui/react-tooltip` | Condition reference text on ConditionChip hover |
| `@radix-ui/react-popover` | Quick damage/heal popover anchored to participant row |
| `react-hotkeys-hook` | Keyboard shortcuts scoped to encounter page |

All three follow the existing Radix UI pattern already established by `@radix-ui/react-dialog`. Tooltip and Popover primitives will be added to `app/components/ui.tsx` alongside the existing Dialog exports.

---

## Track 1 — App Shell

### 1.1 Nav Restructure

**File:** `app/components/Nav.tsx`

Two visual tiers in a single row:

- **Primary items** (Encounters, Party): filled dark pill (`bg-foreground text-background rounded-full px-3.5 py-1.5 font-semibold`)
- **Secondary items** (Bestiary, Campaigns, Notes, Log): plain text, smaller, muted colour
- A vertical divider (`w-px h-5 bg-border`) separates the two tiers
- Active state: primary items keep pill treatment with an accent ring; secondary items get an underline with `text-accent`
- Mobile nav: primary items listed first, secondary items below a visual separator

No items are hidden or moved to a drawer. Everything remains visible.

### 1.2 Combat Active Floating Indicator

**Files:** `app/components/Nav.tsx` or a new `app/components/CombatActivePill.tsx`, rendered in the root layout

Condition: any encounter in `state.encounters` where `isRunning === true`.

Renders a fixed floating pill:
- Position: `fixed bottom-6 right-6 z-50`
- Style: dark red background (`bg-red-900`), white text, pulsing dot indicator, rounded-full, shadow
- Content: `⚔ Round {round} · {activeParticipant.name}`
- Clicking navigates to `/encounters/builder` (the encounter runner)
- Disappears when no encounter is running

The pill must not obstruct the main page scroll or overlap the mobile nav.

### 1.3 Resume Last Session — Home Page

**File:** `app/page.tsx`

Condition: any encounter in `state.encounters` where `status !== "completed"`.

When the condition is true, a full-width card is prepended to the Command Deck grid as the first item, spanning both columns (`col-span-2` / `md:col-span-2`):
- Background: dark red (`bg-red-900 text-white`)
- Content: encounter name, round number, active participant name
- CTA: "Resume →" button linking to `/encounters/builder`

When no such encounter exists, the card is not rendered and the Command Deck grid is unchanged.

---

## Track 2 — Encounter Builder

### 2.1 Roll Initiative for All

**File:** `app/encounters/builder/page.tsx`

A "Roll initiative" button added to the encounter controls bar, alongside the existing "Start Combat" button. Visible only when `combatMode === "prep"` and there are participants.

Behaviour:
- Iterates over all **monster and NPC** participants (skips PCs — DMs roll those at the table)
- For each, computes `Math.floor(Math.random() * 20) + 1 + dexModifier`
- DEX modifier derived from the monster's `abilities.dex` via `Math.floor((dex - 10) / 2)`; falls back to `+0` if `refId` is not found or abilities are absent
- Dispatches one `INITIATIVE_SET` event per affected participant
- Button label: "Roll Monster Initiative"

### 2.2 Encounter Completion Ceremony

**Files:** `app/encounters/builder/page.tsx` (or encounter runner), new `EncounterCompleteDialog` component

Triggered when the DM clicks "End Encounter" (which dispatches `ENCOUNTER_COMPLETED`). Immediately after that event, a Dialog opens:

**Dialog contents:**
- Header: `{encounter.name} — Complete`
- Subheader: `{round} rounds · {defeatedCount} defeated`
- Stats row (3 columns): Rounds, Defeated, Total XP
  - Total XP: sum of `xpValue` from each defeated monster (participants with `currentHp <= 0` and `kind === "monster"`)
- Party table: one row per PC participant
  - Columns: avatar + name, final HP (colour-coded using existing HP token logic), XP earned
  - XP per PC: `Math.floor(totalXp / pcCount)`, split equally among all PC participants
  - HP colour: red for critical/down, amber for bloodied, green for healthy
- Optional session note textarea → on save, creates a `LogEntry` with `source: "manual"` and `campaignId` if set
- Actions: "Done" (primary, closes dialog) and "View log" (secondary, navigates to `/log`)

XP values must be present on the Monster type. If a monster has no `xpValue`, it contributes 0 to the total. XP display is informational only — no automatic application to PC experience points.

---

## Track 3 — Combat Runtime

### 3.1 Participant Row Redesign

**File:** `app/encounters/player/page.tsx` (encounter runner participant list)

Each participant row during live combat (`isRunning === true`) is redesigned. Left-to-right anatomy:

1. Turn indicator dot (filled when active, transparent otherwise)
2. `ParticipantAvatar` (34×34, existing component)
3. Name (`font-semibold truncate`) + kind/class subtitle (`text-xs uppercase text-muted`)
4. Stat chips: INIT, AC, HP — each in a `bg-surface-strong rounded-lg` container with a label row and monospace value
5. HP bar with `showLabel` enabled (Critical / Bloodied / Down)
6. Action buttons (right-aligned, flex-shrink-0):
   - `⚔ Hit` — `bg-red-50 text-red-800` tint, opens damage popover
   - `+ Heal` — `bg-green-50 text-green-800` tint, opens heal popover
   - `📋` — stat block button, **monster rows only**; PC rows render an equal-width spacer (`w-[30px]`) for column alignment

Active turn row: `border-2 border-foreground` dark outline, elevated shadow.

### 3.2 Quick Damage/Heal Popover

**Component:** new `QuickActionPopover` using `@radix-ui/react-popover`, added to `app/components/ui.tsx` or inline in the encounter runner.

Props: `participantId`, `mode: "damage" | "heal"`, `participantName`, `open`, `onOpenChange`.

**Popover contents:**
- Label: `"Apply damage to {name}"` or `"Heal {name}"`
- Large centered number `<Input type="number" min="0">` — auto-focused on open
- "Apply" button (primary)
- Enter key submits; Escape closes

On submit:
- `mode === "damage"` → dispatches `DAMAGE_APPLIED` event
- `mode === "heal"` → dispatches `HEAL_APPLIED` event
- Closes popover after dispatch

Only one popover open at a time. Opening a new one closes any previously open one.

### 3.3 Monster Stat Block Reference

**Component:** new `MonsterStatBlockDialog` using the existing `Dialog`/`DialogContent` from `ui.tsx`.

Triggered by the `📋` button on monster participant rows. Resolves the full `Monster` object from `state.monsters` using the participant's `refId`.

Dialog contents (read-only):
- Name, size, type, CR, AC, HP, speed
- Ability scores with modifiers
- Saving throws (if present)
- Traits and Actions (rendered as a simple list)
- Close button (`DialogClose`)

`maxWidth="2xl"`. If `refId` is absent or the monster is not found, the button is hidden (not disabled — no broken state).

### 3.4 Condition Reference Tooltips

**Files:** `app/components/ui.tsx` (add `Tooltip`/`TooltipContent`/`TooltipProvider` exports), update `ConditionChip`.

A `Tooltip` wraps each `ConditionChip`. The tooltip content is drawn from a hardcoded `SRD_CONDITION_DESCRIPTIONS` map:

```
Blinded, Charmed, Deafened, Exhaustion, Frightened, Grappled,
Incapacitated, Invisible, Paralyzed, Petrified, Poisoned,
Prone, Restrained, Stunned, Unconscious
```

Each entry holds the SRD one-liner (≤ 2 sentences). Custom conditions not in the map render no tooltip (tooltip simply doesn't open).

`TooltipProvider` is added once at the root layout level.

### 3.5 Keyboard Shortcuts

**File:** `app/encounters/player/page.tsx` (encounter runner only)

Implemented via `react-hotkeys-hook`. All shortcuts are disabled when focus is inside an `<input>`, `<textarea>`, or `[contenteditable]` element.

| Key | Action | Condition |
|---|---|---|
| `Space` | Advance turn | `isRunning === true` |
| `ArrowRight` | Advance turn | `isRunning === true` |
| `ArrowLeft` | Go back one turn | `isRunning === true`, `eventLog.length > 0` |
| `ctrl+z` | Undo last action | `eventLog.length > 0` |
| `Escape` | Close open popover/dialog | Any open overlay |

Space is only bound on the encounter page to avoid interfering with the browser's default scroll behaviour on other pages.

---

## Component Additions to `ui.tsx`

| Export | Source |
|---|---|
| `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger` | `@radix-ui/react-tooltip` |
| `Popover`, `PopoverContent`, `PopoverTrigger` | `@radix-ui/react-popover` |

Both follow the same pattern as the existing `Dialog` exports — thin wrappers with project-standard styling applied.

---

## Event Engine — No New Event Types Required

All actions in this sprint use existing event types:
- `INITIATIVE_SET` — roll initiative
- `DAMAGE_APPLIED` — hit popover
- `HEAL_APPLIED` — heal popover
- `ENCOUNTER_COMPLETED` — completion ceremony trigger

No changes to `encounterEvents.ts` or `applyEncounterEvent` are required.

---

## Definition of Done

### Track 1
- [ ] Nav shows two visual tiers with divider; active state correct on all pages
- [ ] Combat Active pill visible on every page when encounter is running; hidden otherwise
- [ ] Resume card appears in Command Deck when an active encounter exists; absent otherwise

### Track 2
- [ ] "Roll Monster Initiative" button dispatches `INITIATIVE_SET` for each non-PC participant with correct d20+DEX calculation
- [ ] Completion dialog opens after `ENCOUNTER_COMPLETED`; shows correct round, defeated count, XP total, and per-PC XP split
- [ ] Optional note creates a `LogEntry` on save

### Track 3
- [ ] All participant rows show Hit / Heal buttons and stat chip layout
- [ ] Monster rows show `📋` button; PC rows show spacer
- [ ] Hit/Heal popovers open, dispatch correct events, close on submit/Escape
- [ ] Monster stat block dialog renders correctly for known monsters; button hidden for participants without `refId`
- [ ] Condition tooltips show SRD text for known conditions; no tooltip for custom conditions
- [ ] Keyboard shortcuts fire correctly; disabled when focus is in an input

### All tracks
- [ ] No hardcoded hex/RGB values — all colours via CSS tokens
- [ ] No new `dark:` Tailwind variants
- [ ] Lint passes; existing tests pass
