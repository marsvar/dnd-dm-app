# Encounters Redesign — Design Spec

**Date:** 2026-03-17
**Status:** Approved
**Scope:** `/app/encounters/player` page — Prep (initiative staging) and Combat (live tracking) phases. Encounter Builder (`/app/encounters/builder`) is out of scope and working as intended.

---

## Problem Statement

The prep (initiative rolling) and active combat phases of the encounter player view feel disconnected. They share the same visual treatment and the transition between them is a small toggle — there is no meaningful "gate" moment. The DM has no clear sense of moving from setup into live combat.

Additionally, the current damage interaction requires a popover, adding an unnecessary click for the most frequent combat action.

---

## Design Goals

- Create a clear, deliberate **"Launch Combat" gate** between prep and live combat
- Make the two phases **visually distinct** — different tone, different layout emphasis, same URL
- Minimise clicks for the three most frequent combat actions: **applying damage**, **advancing turns**, **scanning HP state**
- Both the participant list (fast actions) and the right inspector panel (detailed editing) must remain first-class surfaces
- Every primary action reachable in **≤ 1 click or 1 keypress** from the active screen

---

## Architecture

One page, one URL (`/encounters/player`). Two `combatMode` states (`prep` | `live`) already exist in the domain model. The redesign uses these states to drive a full visual transformation — no routing changes required.

```
combatMode: "prep"   → Prep phase UI  (light neutral tone)
                         ↓ Launch Combat (dispatches COMBAT_MODE_SET then COMBAT_STARTED)
combatMode: "live"   → Combat phase UI (always-dark warm tone)
```

**Event dispatch sequence on Launch Combat:**
1. `COMBAT_MODE_SET { mode: "live" }` — sets `combatMode` to `"live"`
2. `COMBAT_STARTED` — sets `isRunning: true`, calculates turn order, sets `activeParticipantId`

These are two separate dispatches in sequence. `COMBAT_STARTED` alone does not set `combatMode`; `COMBAT_MODE_SET` alone does not start the turn tracker. Both are required.

No new event types are required. All interactions use existing events.

---

## CSS Tokens

The combat phase uses an always-dark visual treatment independent of OS color scheme. The following new tokens must be added to `globals.css` **outside** any `@media (prefers-color-scheme: dark)` block so they are always dark:

```css
/* Combat phase surfaces — always dark regardless of OS color scheme */
--combat-bg: #1a1814;
--combat-surface: #13110e;
--combat-surface-raised: #1e1c17;
--combat-border: #2e2a22;
--combat-border-raised: #3a3528;
--combat-fg: #e8dfc8;
--combat-fg-muted: #7a6a50;

/* Active turn participant */
--combat-active-row-bg: #1e1a0e;
--combat-active-border: #c8a020;
--combat-active-name: #f0e090;
--combat-active-avatar-ring: #c8a020;

/* LIVE badge */
--combat-live-bg: #7f1d1d;
--combat-live-fg: #fca5a5;
--combat-live-dot: #f87171;

/* Round display */
--combat-round-number: #e8d080;
```

The existing tokens `--hp-full`, `--hp-mid`, `--hp-low`, `--hp-zero`, `--btn-damage-bg`, `--btn-damage-fg`, `--btn-heal-bg`, `--btn-heal-fg` remain in use and are not changed. `--combat-active-bg` and `--combat-active-fg` are **not** used by the redesigned combat view — they are used only by `CombatActivePill` (the floating pill on the home/campaign screens) and the home page resume card, which are outside this spec's scope.

---

## Data Access Pattern

`EncounterParticipant` stores only the fields needed for live combat tracking (`initiative`, `ac`, `maxHp`, `currentHp`, `tempHp`, `conditions`, `notes`). Stats not stored on the participant (DEX modifier for initiative rolling, speed, skill bonuses, ability scores, monster traits) must be resolved from the source record via `refId`.

**Lookup rule:** when rendering any stat not on `EncounterParticipant`, look up `refId` in the store:
- `kind === "pc"` → find `Pc` in `appStore.pcs` where `pc.id === participant.refId`
- `kind === "monster"` → find `Monster` in `appStore.monsters` where `monster.id === participant.refId`
- `kind === "npc"` or `refId` missing → degrade gracefully: hide the section or show `—`

This lookup is read-only (never mutates the source record during combat) and is used in:
- Initiative roll formula (DEX mod from `Pc.abilities.dex` or `Monster.abilities.dex`)
- Inspector Quick Stats and Abilities sections
- Inspector monster stat block (traits, actions, CR)

---

## Phase 1 — Prep (Initiative Staging)

### Visual identity
- Background: `var(--background)` (existing warm light neutral)
- Phase badge: `"PREP — Roll Initiative"` with neutral dot indicator
- No red or combat-intensity indicators
- Standard page chrome (no full-viewport override)

> **Note on PageShell/Card:** The prep phase uses the standard `PageShell` wrapper. The combat phase (Phase 2) intentionally opts out of `PageShell` / `SectionTitle` / `Card` hierarchy — it is a full-viewport mode with a fixed header and independent scrolling panels, not a standard content page.

### Layout
Full-width single-column. No right inspector panel in prep mode.

```
Nav bar
├── Encounter name + meta (location, difficulty pill, XP estimate)
├── Phase badge (top-right): "PREP — Roll Initiative"
├── Initiative controls bar: [Initiative Order label] [Roll All button] [Sort by Name]
├── Participant table (full width)
│   ├── Header: Avatar | Participant | Initiative | AC | HP | HP Bar | Actions
│   └── Rows (sorted by current initiative desc, nulls at bottom, then name asc)
│       ├── Full opacity: initiative is set
│       ├── Dimmed (65% opacity): initiative not yet set
│       └── Each row: Avatar · Name · Kind pill · Init input + d20 button · AC · HP · HP bar mini · delete
├── Turn order preview strip (below table, updates in real-time)
│   └── Ordered chips: [init] Name → [init] Name → [?] Name (unset, dashed)
└── Fixed footer
    ├── Status: "3 of 7 initiatives rolled · 4 pending"
    ├── "Skip unrolled →" ghost button (proceeds with nulls sorted to bottom)
    └── "⚔ Launch Combat" primary CTA + ⌘↵ shortcut hint
```

### Initiative interactions
- **Per-row `d20` button** — rolls D20, adds DEX modifier (looked up via `refId` — see Data Access Pattern), fills initiative input, row shifts to full opacity. For participants with no `refId` or missing abilities, rolls D20 only.
- **Manual input** — DM types directly into the initiative field; triggers real-time reorder in the preview strip on each keystroke
- **Roll All** — dispatches one `INITIATIVE_SET` event per participant with unset initiative, in sequence. Undo will undo only the last `INITIATIVE_SET` in the batch (not the whole group); this is expected and acceptable.
- **Skip unrolled →** — proceeds to Launch with null initiatives; reducer sorts nulls to the bottom of turn order
- Drag-to-reorder rows for tie-breaking — deferred to future enhancement

### Turn order preview strip
Live-updating horizontal strip below the table. Each chip shows `[init number] Name`. Unset participants show `[?] Name` with dashed border and reduced opacity. Updates on every initiative change without requiring a save action.

### Launch Combat
- Fixed footer button: `⚔ Launch Combat` (primary variant, `var(--foreground)` background, `var(--accent)` text)
- Keyboard: `⌘↵`
- On activation, dispatch in sequence:
  1. `COMBAT_MODE_SET { mode: "live" }` — sets `combatMode: "live"`
  2. `COMBAT_STARTED` — sorts participants by initiative (desc, then name asc), sets `isRunning: true`, sets `activeParticipantId` to first in order
  3. Full visual transformation to combat phase (no navigation, no page reload)
  4. Auto-scroll participant list to the first active participant

---

## Phase 2 — Combat (Live Tracking)

### Visual identity
All values reference the new `--combat-*` tokens defined above.
- Page background: `var(--combat-bg)`
- Header background: `var(--combat-surface)`
- Active participant row: `var(--combat-active-border)` left accent + `var(--combat-active-row-bg)` + name in `var(--combat-active-name)`
- HP colour states use existing tokens: `--hp-full` (full) · `--hp-mid` (≤50%, bloodied) · `--hp-low` (≤25%, critical) · `--hp-zero` (0, down)

### Layout
Full-viewport two-column fixed layout. `overflow: hidden` on the page body; each panel scrolls independently. This layout intentionally bypasses `PageShell`.

```
Combat header (full width, h-14, sticky, var(--combat-surface))
├── Left: Brand + encounter name + LIVE badge (var(--combat-live-bg/fg), pulsing dot)
├── Centre: Round [N] (read-only, var(--combat-round-number)) + "← Prev Turn" / "Next Turn →" buttons
└── Right: Undo button (last action label) · Log · End Encounter

Main layout (grid: 1fr 320px, height: 100vh - header)
├── Left: Participant list (overflow-y: auto)
└── Right: Inspector panel (overflow-y: auto, border-left: var(--combat-border))
```

### Combat header

The header has two distinct areas to avoid the semantic confusion of arrows next to a round number:

**Round display (read-only, centred):** Shows `Round [N]` in large `font-mono`. The number increments automatically when `TURN_ADVANCED` wraps past the last participant (handled by the reducer). There are no buttons flanking the round number — it is a passive counter only.

**Turn controls (centred, below or flanking the round display):** `← Prev Turn` and `Next Turn →` text buttons. These dispatch `TURN_ADVANCED { direction: -1 }` and `TURN_ADVANCED { direction: 1 }` respectively. Labelled as "turn" controls, not "round" controls, so the DM always understands they are moving the active combatant pointer, not jumping rounds.

- **Undo button** — shows last event as inline text e.g. `↩ HP –8 on Goblin Boss`; click dispatches `undoEncounterEvent`
- **End Encounter** — opens existing `EncounterCompleteDialog`

### Participant list (left panel)

#### Row anatomy (in order)
1. `ParticipantAvatar` (32px) — avatar ring `var(--combat-active-avatar-ring)` when active. **Click on avatar pins/unpins the inspector** (`e.stopPropagation()` — does not expand the inline damage input).
2. Name (truncated, `var(--combat-active-name)` when active) + kind pill + initiative value
3. Inline condition chips (first 2, overflow count `+N`)
4. Stat cluster (right-aligned): HP `current/max` in HP colour token · HP bar mini · AC

#### Active participant
- `var(--combat-active-border)` left-border (3px)
- `var(--combat-active-row-bg)` background tint
- Name in `var(--combat-active-name)`

#### Defeated participants
- Collapsed into a `"Defeated"` section at the bottom, below a labelled divider
- 38% opacity, non-interactive (pointer-events: none)

#### Inline damage interaction (primary fast-path)

**Click target disambiguation:** the row has two distinct click targets:
- **`ParticipantAvatar` click** → pins/unpins inspector. Must call `e.stopPropagation()` to prevent row expansion.
- **Row click (anywhere except avatar)** → expands inline damage input.

Interaction:
- Row click → inline number input pre-focused, `Dmg` and `Heal` buttons appear in the row
- **`Enter`** → dispatches `DAMAGE_APPLIED { participantId, amount }` → row collapses
- **`Shift+Enter`** → dispatches `HEAL_APPLIED { participantId, amount }` → row collapses
- **`Esc`** → cancel, row collapses, no event dispatched
- Only one row expanded at a time; expanding a new row collapses the previous
- Works for **any participant**, not just the active turn participant

### Inspector panel (right panel)

Always visible. Auto-follows the active turn participant on every `TURN_ADVANCED` event.

**Pinning:** clicking the `ParticipantAvatar` in any list row pins the inspector to that participant (sets `pinnedInspectorId`). A pin icon appears in the inspector header. Clicking the pin icon releases it. Advancing the turn (`TURN_ADVANCED`) also releases the pin.

**Data resolution:** all stats beyond `EncounterParticipant` fields are looked up via `refId` (see Data Access Pattern). Sections that require `refId` data degrade gracefully when `refId` is absent.

#### Inspector sections (in order)
1. **Header** — `ParticipantAvatar` (36px, avatar ring if active) · Name · subtitle: `Kind · Class/Type · init · AC · ✦ Active Turn`
2. **Hit Points** — Large `current / max` display in `font-mono` · HP bar · temp HP indicator · damage/heal amount input with `Dmg` and `Heal` buttons (dispatches `DAMAGE_APPLIED` / `HEAL_APPLIED`)
3. **Quick Stats** — 2×3 grid tiles: AC · Speed · Init mod · Perception · two highest skill bonuses by value descending (PC via `refId`) or CR + passive perception (Monster via `refId`). Hidden if `refId` absent.
4. **Abilities** — 6-cell row: STR DEX CON INT WIS CHA, score + modifier (via `refId`). Hidden if `refId` absent.
5. **Conditions** — active condition chips (dismissible, dispatches `CONDITIONS_SET`) + `+ Add condition` button (opens existing `ConditionPicker`)
6. **Notes** — `Textarea` (dispatches `NOTES_SET` on blur)
7. **Death saves** — visible only for `kind === "pc"` participants at `currentHp === 0`. Three success circles + three failure circles. Tapping a circle dispatches `DEATH_SAVES_SET { participantId, pcId, value }`. Uses the existing `DeathSaves` type and event — both are already implemented in `encounterEvents.ts` and `applyEncounterEvent.ts`; this section adds the UI surface only. **Undo note:** undoing a `DEATH_SAVES_SET` event reverts the in-encounter death save state but does not revert the `Pc` record writeback (the reducer syncs death save completion back to the canonical `Pc`). This is acceptable and expected.

#### Monster inspector
For monster participants, sections 3 and 4 are replaced with a compact stat block reading traits, action names, and CR from the source `Monster` record via `refId`.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `⌘↵` | Launch Combat (prep phase only) |
| `→` or `]` | Next turn (advance active combatant) |
| `←` or `[` | Previous turn (retreat active combatant) |
| `↵` | Apply damage (when row input is focused) |
| `⇧↵` | Apply heal (when row input is focused) |
| `Esc` | Cancel inline input / close picker |
| `⌘Z` | Undo last event |

---

## State Management

No new store actions or event types required. Changes are purely at the component/UI layer.

| Existing event | Used for |
|---|---|
| `COMBAT_MODE_SET` | Launch Combat step 1 — sets `combatMode: "live"` |
| `COMBAT_STARTED` | Launch Combat step 2 — sets `isRunning`, `activeParticipantId` |
| `INITIATIVE_SET` | Per-row d20 button, manual input, Roll All (N events in sequence) |
| `DAMAGE_APPLIED` | Inline row Enter / inspector Dmg button |
| `HEAL_APPLIED` | Inline row Shift+Enter / inspector Heal button |
| `CONDITIONS_SET` | Inspector condition picker dismiss + add |
| `NOTES_SET` | Inspector notes blur |
| `TURN_ADVANCED` | Header ‹ › buttons |
| `ROUND_SET` | Manual DM override — sets round to an explicit value (not auto-dispatched on turn wrap; round increment is handled inline by the `TURN_ADVANCED` reducer case) |
| `DEATH_SAVES_SET` | Inspector death save circle taps |

New local UI state (component-level, not in store):
- `expandedRowId: string | null` — which participant row has inline input open
- `pinnedInspectorId: string | null` — inspector override; null = follows active turn

---

## Component Changes

### `/app/encounters/player/page.tsx`
Major refactor. Split into two clearly distinct render branches based on `combatMode`:
- `combatMode === "prep"` → renders `<PrepPhase>` subtree
- `combatMode === "live"` → renders `<CombatPhase>` subtree

Both branches remain in the same file/page. Extract into named sub-components to manage line count. Each sub-component gets its own file in `app/encounters/player/`:
- `PrepPhase.tsx` — initiative table, turn order preview, launch footer
- `CombatHeader.tsx` — round counter, turn controls, undo, end encounter
- `CombatParticipantList.tsx` — scrollable list with inline damage rows
- `CombatInspector.tsx` — right panel, auto-follows active turn

### New shared components (in `app/components/`)
- `TurnOrderPreview.tsx` — stateless. Props: `participants: EncounterParticipant[]`. Renders the horizontal chip strip. New standalone file.
- `CombatParticipantRow.tsx` — encapsulates expanded/collapsed row state. Props: `participant`, `isActive`, `isExpanded`, `onExpand`, `onCollapse`, `onDamage`, `onHeal`. New standalone file.

### `QuickActionPopover`
**Retired** in favour of the inline row input pattern. Remove from combat view once `CombatParticipantList` is in place.

---

## Definition of Done

- [ ] New CSS tokens added to `globals.css` outside any `@media` block
- [ ] Prep phase renders correctly; initiative table, Roll All, per-row d20, manual input all work
- [ ] Per-row d20 correctly reads DEX mod via `refId` lookup; falls back to D20-only when `refId` absent
- [ ] Turn order preview strip updates in real-time on every initiative change
- [ ] Launch Combat button and `⌘↵` shortcut both dispatch `COMBAT_MODE_SET` then `COMBAT_STARTED` in sequence
- [ ] Visual transformation on launch: background, header, badges all use `--combat-*` tokens
- [ ] Active participant row shows `--combat-active-border` left accent, `--combat-active-row-bg`, name in `--combat-active-name`
- [ ] HP colour states use existing `--hp-full / --hp-mid / --hp-low / --hp-zero` tokens
- [ ] Avatar click pins/unpins inspector with `e.stopPropagation()` — does not expand damage input
- [ ] Row click (non-avatar) expands inline damage input; only one row expanded at a time
- [ ] Enter applies damage, Shift+Enter heals, Esc cancels — all dispatch correct events
- [ ] Inspector auto-follows active turn on `TURN_ADVANCED`; pin releases on turn advance
- [ ] Inspector stats requiring `refId` degrade gracefully when `refId` absent
- [ ] Death save circles tappable and dispatch `DEATH_SAVES_SET`; undo reverts in-encounter death save state but not the `Pc` record writeback (expected behaviour per spec)
- [ ] Death saves section visible only for PCs at `currentHp === 0`
- [ ] Defeated participants in collapsed section at bottom of list
- [ ] All keyboard shortcuts functional
- [ ] `QuickActionPopover` removed from combat view
- [ ] Lint passes, existing tests pass
- [ ] No hardcoded hex/rgb values — `--combat-*` tokens and existing tokens only
- [ ] No `dark:` Tailwind variants

---

## Out of Scope

- Encounter Builder (`/app/encounters/builder`) — no changes
- Player view (`/app/player/encounter`) — no changes
- Drag-to-reorder in prep (deferred)
- Legendary actions / concentration tracking (separate features)
- New event types
- Mobile layout
