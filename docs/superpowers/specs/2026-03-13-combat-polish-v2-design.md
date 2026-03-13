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

| Package | Version | Purpose |
|---|---|---|
| `@radix-ui/react-tooltip` | latest | Condition reference text on ConditionChip hover |
| `@radix-ui/react-popover` | latest | Quick damage/heal popover anchored to participant row |
| `react-hotkeys-hook` | `^4` | Keyboard shortcuts scoped to encounter page |

All three follow the existing Radix UI pattern already established by `@radix-ui/react-dialog`. Tooltip and Popover primitives will be added to `app/components/ui.tsx` alongside the existing Dialog exports.

The `react-hotkeys-hook` v4 API is used throughout (e.g. `useHotkeys('space', handler, { preventDefault: true, enableOnFormTags: false })`).

---

## New CSS Tokens

The following tokens must be added to `app/globals.css` (light and dark variants). No hardcoded hex/RGB values are permitted in component files.

| Token | Purpose |
|---|---|
| `--combat-active-bg` | Background for combat-active pill and resume card |
| `--combat-active-fg` | Foreground text for combat-active pill and resume card |
| `--btn-damage-bg` | Background tint for the Hit action button |
| `--btn-damage-fg` | Foreground colour for the Hit action button |
| `--btn-heal-bg` | Background tint for the Heal action button |
| `--btn-heal-fg` | Foreground colour for the Heal action button |

Example values (light mode): `--combat-active-bg: #7b1d1d`, `--combat-active-fg: #fff`, `--btn-damage-bg: #fee2e2`, `--btn-damage-fg: #7b1d1d`, `--btn-heal-bg: #dcfce7`, `--btn-heal-fg: #166534`.

Dark mode overrides should be defined inside `@media (prefers-color-scheme: dark)` in `globals.css`, following the existing pattern. Dark variants should increase saturation/brightness for damage/heal tokens to remain legible on dark surfaces.

---

## Track 1 — App Shell

### 1.1 Nav Restructure

**File:** `app/components/Nav.tsx`

Two visual tiers in a single row:

- **Primary items** (Encounters, Party): filled dark pill (`bg-foreground text-background rounded-full px-3.5 py-1.5 font-semibold`)
- **Secondary items** (Bestiary, Campaigns, Notes, Log): plain text, smaller, muted colour
- A vertical divider (`w-px h-5 bg-black/10`) separates the two tiers
- Active state: primary items keep pill treatment with an accent ring; secondary items get an underline with `text-accent`
- Mobile nav: primary items listed first, secondary items below a visual separator

No items are hidden or moved to a drawer. Everything remains visible.

### 1.2 Combat Active Floating Indicator

**File:** New `app/components/CombatActivePill.tsx`, rendered in the DM root layout (`app/layout.tsx` or the DM layout wrapper).

Condition: any encounter in `state.encounters` where `isRunning === true`.

Renders a fixed floating pill:
- Position: `fixed bottom-6 right-6 z-50`
- Style: `style={{ backgroundColor: "var(--combat-active-bg)", color: "var(--combat-active-fg)" }}`, rounded-full, shadow
- Content: pulsing dot + `⚔ Round {round} · {activeParticipant.name}`
- Clicking navigates to `/encounters/builder` (the encounter runner)
- Disappears when no encounter is running

The pill must not obstruct the main page scroll or overlap the mobile nav. On mobile (`sm` breakpoint and below) position shifts to `bottom-20` to clear the mobile nav bar if one is present.

### 1.3 Resume Last Session — Home Page

**File:** `app/page.tsx`

Condition: any encounter in `state.encounters` where `status !== "completed"`. Prefer the most recently modified encounter if multiple qualify.

When the condition is true, a full-width card is prepended to the Command Deck grid as the first item, spanning both columns (`md:col-span-2`):
- Background: `style={{ backgroundColor: "var(--combat-active-bg)", color: "var(--combat-active-fg)" }}`
- Content: encounter name, round number, active participant name
- CTA: "Resume →" button linking to `/encounters/builder`

When no such encounter exists, the card is not rendered and the Command Deck grid is unchanged.

---

## Track 2 — Encounter Builder

### 2.1 Roll Initiative for All

**File:** `app/encounters/builder/page.tsx`

A "Roll Monster Initiative" button added to the encounter controls bar, alongside the existing "Start Combat" button. Visible only when `combatMode === "prep"` and there are participants.

Behaviour:
- Iterates over all **monster and NPC** participants (skips PCs — DMs roll those at the table)
- For each, computes `Math.floor(Math.random() * 20) + 1 + dexModifier`
- DEX modifier derived from the monster's `abilities.dex` via `Math.floor((dex - 10) / 2)`. Source: look up the participant's `refId` in `monstersById` to get `abilities.dex`; fall back to `+0` if `refId` is absent, not found, or abilities are absent
- Dispatches one `INITIATIVE_SET` event per affected participant in a loop within a single event handler. React 18 automatic batching ensures all dispatches within the same synchronous handler are batched into one re-render — no batch dispatch API is needed. The resulting rapid sequential `setState` calls are safe and performant for up to ~20 participants.

### 2.2 Encounter Completion Ceremony

**File:** `app/encounters/player/page.tsx` (the encounter runner — this is where the "End Encounter" button lives)

**Component:** new `EncounterCompleteDialog.tsx` in `app/components/`

**Trigger flow:**
1. DM clicks "End Encounter"
2. A local `useState<Encounter | null>` flag (`completedEncounter`) is set to the current encounter snapshot *before* dispatching the event
3. `ENCOUNTER_COMPLETED` is dispatched
4. The dialog renders using `completedEncounter` (the pre-dispatch snapshot), which guarantees the XP/HP data is available regardless of how `applyEncounterEvent` mutates state

**XP calculation:**
- Defeated monsters: `encounter.participants.filter(p => p.kind === "monster" && (p.currentHp ?? 1) <= 0)` — use the raw `participants` array, **not** `orderedParticipants` (which filters out defeated entries)
- XP per defeated monster: use the existing `getChallengeXp(challenge: string)` selector from `app/lib/engine/selectors.ts`, resolving `challenge` via `refId → monstersById`. `EncounterParticipant` has no `challenge` field — if `refId` is absent or the monster is not found in `monstersById`, the participant contributes 0 XP
- Total XP: sum of all defeated monster XP values
- Per-PC XP: `Math.floor(totalXp / pcCount)` where `pcCount` is `encounter.participants.filter(p => p.kind === "pc").length`; if `pcCount === 0`, skip the XP split row

**Dialog contents:**
- Header: `{encounter.name} — Complete`
- Subheader: `{round} rounds · {defeatedCount} defeated`
- Stats row (3 columns): Rounds, Defeated, Total XP
- Party table: one row per PC participant
  - Columns: avatar + name, final HP (colour-coded using existing HP token logic), XP earned
  - HP colour: uses existing `hpBarColors()` logic from `ui.tsx`
- Optional session note textarea
- Actions: "Done" (primary, closes dialog) and "View log" (secondary, navigates to `/log`)

**Note handling:** The optional session note creates a **standalone** `LogEntry` via `addLogEntry({ text: note.trim(), source: "manual", campaignId: ... })`. It does **not** use the `notes` field on the `ENCOUNTER_COMPLETED` event (which feeds into the auto-generated completion log line). This produces two separate log entries: the auto-generated "Encounter completed" line (appended to the log array by the event reducer) and the manual DM note (prepended to the log array by `addLogEntry`). The manual note will therefore appear at the top of the log page — as the most recently added entry — which is the correct behaviour. Both entries are clearly labelled by their `source` field (`"auto"` and `"manual"` respectively).

XP display is informational only — no automatic application to PC experience points.

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
   - `⚔ Hit` — `style={{ backgroundColor: "var(--btn-damage-bg)", color: "var(--btn-damage-fg)" }}`, opens damage popover
   - `+ Heal` — `style={{ backgroundColor: "var(--btn-heal-bg)", color: "var(--btn-heal-fg)" }}`, opens heal popover
   - `📋` stat block button or spacer (see rules below)

**Stat block button / spacer rules (third column):**
- Show `📋` button when: `participant.kind === "monster"`, OR `participant.kind === "npc"` AND `participant.refId` exists AND `monstersById.has(participant.refId)`
- Show equal-width spacer (`w-[30px] flex-shrink-0`) for PC rows and NPC rows without a resolvable `refId`

This ensures column alignment is consistent across all row types.

Active turn row: `border-2 border-foreground` dark outline, elevated shadow.

### 3.2 Quick Damage/Heal Popover

**Component:** new `QuickActionPopover` using `@radix-ui/react-popover`, co-located with the encounter runner in `app/encounters/player/page.tsx` or extracted to `app/components/QuickActionPopover.tsx`.

Props: `participantId: string`, `mode: "damage" | "heal"`, `participantName: string`, `open: boolean`, `onOpenChange: (open: boolean) => void`.

**Popover contents:**
- Label: `"Apply damage to {name}"` or `"Heal {name}"` (`text-xs uppercase tracking-widest text-muted`)
- Large centered number `<Input type="number" min="0">` — auto-focused on open via `autoFocus` prop
- "Apply" button (primary variant)
- Enter key submits; Escape closes (Radix Popover handles Escape natively)

On submit:
- `mode === "damage"` → dispatches `DAMAGE_APPLIED` event
- `mode === "heal"` → dispatches `HEAL_APPLIED` event
- Input is reset to empty; popover closes after dispatch

**One popover at a time:** the parent component tracks `openPopoverId: string | null` in local state. Opening any popover sets `openPopoverId` to the participant's ID + mode key; all other popovers derive their `open` prop from this value, ensuring only one is ever open.

### 3.3 Monster Stat Block Reference

**Component:** new `MonsterStatBlockDialog.tsx` in `app/components/`, using existing `Dialog`/`DialogContent`/`DialogTitle`/`DialogClose` from `ui.tsx`.

Triggered by the `📋` button. Resolves the full `Monster` object from `state.monsters` using the participant's `refId`.

Dialog contents (read-only):
- Name, size, type, CR, AC, HP, speed
- Ability scores with modifiers
- Saving throws (if present on the monster object)
- Traits and Actions (rendered as a list; use `<p className="text-sm text-muted whitespace-pre-line">` for trait text)
- `DialogClose` button in top-right

`maxWidth="2xl"`. If the resolved monster is `undefined` (refId absent or not found in store), the `📋` button is not rendered (per the rules in Section 3.1 — the column shows a spacer instead).

### 3.4 Condition Reference Tooltips

**Files:** `app/components/ui.tsx` (add Tooltip exports), `app/components/ui.tsx` update `ConditionChip`.

**Tooltip primitive exports to add to `ui.tsx`:**
```
export const Tooltip = RadixTooltip.Root;
export const TooltipTrigger = RadixTooltip.Trigger;
export const TooltipContent = ...  // styled wrapper with bg-surface border shadow p-2 text-xs
export const TooltipProvider = RadixTooltip.Provider;
```

**`TooltipProvider` placement:** Add it as the outermost element returned by `AppStoreProvider` in `app/lib/store/appStore.tsx` (which is already `"use client"`), wrapping the `AppStoreContext.Provider` itself — not just `children`. The structure should be: `<TooltipProvider delayDuration={300}><AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider></TooltipProvider>`. This ensures all Tooltip consumers in the tree are covered regardless of context read order, and avoids introducing a new client boundary.

**`ConditionChip` update:** Wrap the chip in `<Tooltip>`. The tooltip content is drawn from a hardcoded `SRD_CONDITION_DESCRIPTIONS` record defined in `app/lib/data/srd.ts` (or inline in `ui.tsx`):

Conditions covered: Blinded, Charmed, Deafened, Exhaustion, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious.

Each entry is the SRD one-liner (≤ 2 sentences). Custom conditions not present in the map render no tooltip — the `<Tooltip>` still wraps the chip but `TooltipContent` is conditionally null, so the tooltip simply does not open.

### 3.5 Keyboard Shortcuts

**File:** `app/encounters/player/page.tsx` (encounter runner only)

Implemented via `react-hotkeys-hook` v4. All shortcuts use `enableOnFormTags: false` to ensure they are suppressed when focus is inside an `<input>`, `<textarea>`, or `<select>`.

| Key | Action | Guard |
|---|---|---|
| `space` | Advance turn | `isRunning === true` |
| `arrowright` | Advance turn | `isRunning === true` |
| `arrowleft` | Go back one turn | `isRunning === true && eventLog.length > 0` |
| `ctrl+z` | Undo last action | `eventLog.length > 0` |

`Escape` is handled natively by Radix Popover and Dialog — no explicit hotkey binding needed.

Space is scoped to this page only; it does not affect browser scroll on other pages.

---

## Component Additions to `ui.tsx`

| Export | Source |
|---|---|
| `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger` | `@radix-ui/react-tooltip` |
| `Popover`, `PopoverContent`, `PopoverTrigger` | `@radix-ui/react-popover` |

Both follow the same pattern as the existing Dialog exports — thin wrappers with project-standard styling (border, shadow, bg-surface, rounded-2xl) applied to the Content components.

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
- [ ] Nav shows two visual tiers with `bg-black/10` divider; active state correct on all pages
- [ ] CSS tokens `--combat-active-bg` / `--combat-active-fg` defined in `globals.css` with dark-mode variants
- [ ] Combat Active pill visible on every page when encounter is running; uses CSS tokens; hidden otherwise
- [ ] Resume card appears in Command Deck when an active encounter exists; uses same CSS tokens; absent otherwise

### Track 2
- [ ] CSS tokens `--btn-damage-bg/fg` and `--btn-heal-bg/fg` defined in `globals.css` with dark-mode variants
- [ ] "Roll Monster Initiative" button dispatches `INITIATIVE_SET` for each non-PC participant with correct d20+DEX calculation
- [ ] Completion dialog opens after "End Encounter"; reads from pre-dispatch snapshot; shows correct round, defeated count, XP total, and per-PC XP split using `getChallengeXp()`
- [ ] Defeated count and XP use `encounter.participants` directly (not `orderedParticipants`)
- [ ] Optional note creates a standalone `LogEntry` via `addLogEntry` (not via `ENCOUNTER_COMPLETED` notes field)

### Track 3
- [ ] All participant rows show Hit / Heal buttons with token-based colour styles
- [ ] Monster rows (and NPC rows with resolvable refId) show `📋` button; all others show spacer
- [ ] Hit/Heal popovers open, auto-focus input, dispatch correct events, close on submit/Escape
- [ ] Only one popover open at a time (controlled via `openPopoverId` state)
- [ ] Monster stat block dialog renders correctly for known monsters; button absent for unresolvable participants
- [ ] `TooltipProvider` added inside `AppStoreProvider` in `appStore.tsx`
- [ ] Condition tooltips show SRD text for known conditions; no tooltip for custom conditions
- [ ] Keyboard shortcuts fire correctly with `react-hotkeys-hook@^4`; suppressed when focus is in a form field

### All tracks
- [ ] No hardcoded hex/RGB values — all colours via CSS tokens
- [ ] No `dark:` Tailwind variants
- [ ] Lint passes; existing tests pass
