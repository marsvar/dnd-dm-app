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
                         ↓ Launch Combat (dispatches COMBAT_STARTED)
combatMode: "live"   → Combat phase UI (dark warm tone)
```

No new event types are required. All interactions use existing events (`COMBAT_STARTED`, `DAMAGE_APPLIED`, `HEAL_APPLIED`, `CONDITIONS_SET`, `NOTES_SET`, `TURN_ADVANCED`, `ROUND_SET`).

---

## Phase 1 — Prep (Initiative Staging)

### Visual identity
- Background: warm light neutral (`--background`, `#f5f4f0`)
- Header phase badge: `"PREP — Roll Initiative"` with neutral dot indicator
- No red or combat-intensity indicators

### Layout
Full-width single-column. No right inspector panel in prep mode.

```
Nav bar
├── Encounter name + meta (location, difficulty pill, XP estimate)
├── Phase badge (top-right): "PREP — Roll Initiative"
├── Initiative controls bar: [Initiative Order label] [Roll All button] [Sort by Name]
├── Participant table (full width)
│   ├── Header: Avatar | Participant | Initiative | AC | HP | HP Bar | Actions
│   └── Rows (sorted by current initiative, nulls at bottom)
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
- **Per-row `d20` button** — rolls initiative (D20 + DEX mod for PCs, D20 for monsters/NPCs), fills input, row shifts to full opacity
- **Manual input** — DM types directly into the initiative field; typing triggers real-time reorder in the preview strip
- **Roll All** — rolls all participants with unset initiative in one action
- **Skip unrolled →** — proceeds to Launch with null initiatives sorted to the bottom of turn order
- Drag-to-reorder rows for tie-breaking (future enhancement; not required for v1)

### Turn order preview strip
Live-updating horizontal strip below the table. Each chip shows `[init number] Name`. Unset participants show `[?] Name` with dashed border and reduced opacity. Updates on every initiative change without requiring a save action.

### Launch Combat
- Fixed footer button: `⚔ Launch Combat` (primary variant, dark background, gold text)
- Keyboard: `⌘↵`
- On activation:
  1. Participants sorted by initiative descending, name ascending (ties)
  2. `COMBAT_STARTED` event dispatched
  3. `combatMode` → `"live"`, `isRunning` → `true`
  4. Full visual transformation to combat phase (no navigation, no page reload)
  5. Auto-scroll participant list to the first active participant

---

## Phase 2 — Combat (Live Tracking)

### Visual identity
- Background: dark warm (`#1a1814`)
- Header: deepest dark (`#13110e`), full-width
- Active phase badge: pulsing red `LIVE` dot indicator
- Active participant row: gold left-border accent + gold avatar ring + gold name text
- HP colour states: green (full) · amber (bloodied, ≤50%) · red (critical, ≤25%) · grey (zero/down)

### Layout
Two-column fixed layout below the header. No scroll on the page level — each panel scrolls independently.

```
Combat header (full width, sticky)
├── Left: Brand + encounter name + LIVE badge
├── Centre: ‹ Round [N] › (prev/next turn controls flanking round number)
└── Right: Undo button (last action label) · Log · End Encounter

Main layout (grid: 1fr 320px)
├── Left: Participant list (scrollable)
└── Right: Inspector panel (scrollable, fixed 320px)
```

### Combat header
- **Round counter** — centred, large monospaced number, `‹` (prev turn) and `›` (next turn) buttons flanking it
- `‹ ›` dispatch `TURN_ADVANCED` events (direction: -1 / +1)
- **Undo button** — shows last event as inline text e.g. `↩ HP –8 on Goblin Boss`; click dispatches undo
- **End Encounter** — opens `EncounterCompleteDialog`

### Participant list (left panel)

#### Row anatomy (in order)
1. `ParticipantAvatar` (32px) — with gold ring when active
2. Name (truncated) + kind pill (`PC` / `MONSTER` / `NPC`) + initiative value
3. Inline condition chips (first 2, overflow count `+N`)
4. Stat cluster (right-aligned): HP `current/max` in HP colour · HP bar mini · AC

#### Active participant
- Gold left-border (3px, `#c8a020`)
- Background tint (`#1e1a0e`)
- Name rendered in gold

#### Defeated participants
- Collapsed into a `"Defeated"` section at the bottom, below a labelled divider
- 38% opacity, non-interactive

#### Inline damage interaction (primary fast-path)
- **Click any participant row** → row expands inline: number input pre-focused + `Dmg` + `Heal` buttons appear
- **`Enter`** → apply damage (`DAMAGE_APPLIED` event) → row collapses
- **`Shift+Enter`** → apply heal (`HEAL_APPLIED` event) → row collapses
- **`Esc`** → cancel, row collapses
- Only one row may be expanded at a time; expanding a new row collapses the previous
- Works for **any participant**, not just the active turn participant

### Inspector panel (right panel)

Always visible. Auto-follows the active turn participant on every `TURN_ADVANCED` event.

**Pinning:** clicking the `ParticipantAvatar` in any list row pins the inspector to that participant. A pin indicator appears in the inspector header. Clicking the pin releases it; advancing the turn also releases it.

#### Inspector sections (in order)
1. **Header** — Avatar (36px, gold ring if active) · Name · subtitle: `Kind · Class · init · AC · ✦ Active Turn`
2. **Hit Points** — Large `current / max` display · HP bar · temp HP indicator · damage/heal input with `Dmg` and `Heal` buttons
3. **Quick Stats** — 2×3 grid: AC · Speed · Init mod · Perception · top 2 skills (PC) or key monster stats
4. **Abilities** — 6-cell row: STR DEX CON INT WIS CHA, score + modifier
5. **Conditions** — active condition chips (dismissible) + `+ Add condition` button (opens `ConditionPicker`)
6. **Notes** — `Textarea` (auto-saves on blur as `NOTES_SET` event)
7. **Death saves** — only visible for PC participants at `currentHp === 0`: 3 success circles + 3 failure circles, tappable

#### Monster inspector
For monster participants, Abilities section is replaced with a compact stat block: traits summary, action names, and CR.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `⌘↵` | Launch Combat (prep phase only) |
| `→` or `]` | Next turn |
| `←` or `[` | Previous turn |
| `↵` | Apply damage (when row input is focused) |
| `⇧↵` | Apply heal (when row input is focused) |
| `Esc` | Cancel inline input / close picker |
| `⌘Z` | Undo last event |

---

## State Management

No new store actions or event types required. Changes are purely at the component/UI layer:

| Existing event | Used for |
|---|---|
| `COMBAT_STARTED` | Launch Combat → starts live phase |
| `DAMAGE_APPLIED` | Inline row Dmg button / Enter |
| `HEAL_APPLIED` | Inline row Heal button / Shift+Enter |
| `CONDITIONS_SET` | Inspector condition picker |
| `NOTES_SET` | Inspector notes blur |
| `TURN_ADVANCED` | Header ‹ › buttons |
| `ROUND_SET` | Auto-increment on turn wrap |

New local UI state needed:
- `expandedRowId: string | null` — which participant row has inline input open
- `pinnedInspectorId: string | null` — inspector override; null = follows active turn

---

## Component Changes

### `/app/encounters/player/page.tsx`
Major refactor. Split into two clearly distinct render branches based on `combatMode`:
- `combatMode === "prep"` → renders `<PrepPhase>` subtree
- `combatMode === "live"` → renders `<CombatPhase>` subtree

Both branches remain in the same file/page. Extract into sub-components to manage line count:
- `<PrepPhase>` — initiative table, turn order preview, launch footer
- `<CombatHeader>` — round counter, turn controls, undo, end encounter
- `<CombatParticipantList>` — scrollable list with inline damage rows
- `<CombatInspector>` — right panel, auto-follows active turn

### `QuickActionPopover`
**Retired** in favour of the inline row input pattern. Can be removed once the new combat participant list is in place.

### New: `TurnOrderPreview`
Stateless component. Props: `participants: EncounterParticipant[]`. Renders the horizontal chip strip in prep mode. Exported from `/app/components/`.

### New: `CombatParticipantRow`
Encapsulates the expanded/collapsed row state. Props: `participant`, `isActive`, `isExpanded`, `onExpand`, `onCollapse`, `onDamage`, `onHeal`.

---

## Definition of Done

- [ ] Prep phase renders correctly; initiative table, Roll All, per-row d20, manual input all work
- [ ] Turn order preview strip updates in real-time on every initiative change
- [ ] Launch Combat button and `⌘↵` shortcut both dispatch `COMBAT_STARTED` and transition to combat phase
- [ ] Visual transformation on launch: background, header, badges all shift to dark combat theme
- [ ] Active participant row has gold accent, avatar ring, gold name
- [ ] HP colour states correct: green / amber / red / grey
- [ ] Inline row damage input expands on click, Enter applies damage, Shift+Enter heals, Esc cancels
- [ ] Only one row expanded at a time
- [ ] Inspector auto-follows active turn on `TURN_ADVANCED`
- [ ] Inspector pinning works via avatar click; releases on next turn advance
- [ ] Death saves section visible only for PCs at 0 HP
- [ ] Defeated participants in collapsed section at bottom of list
- [ ] All keyboard shortcuts functional
- [ ] `QuickActionPopover` removed from combat view
- [ ] No new event types (all interactions use existing events)
- [ ] Lint passes, existing tests pass
- [ ] No hardcoded hex/rgb values — CSS tokens only
- [ ] No `dark:` Tailwind variants

---

## Out of Scope

- Encounter Builder (`/app/encounters/builder`) — no changes
- Player view (`/app/player/encounter`) — no changes
- Drag-to-reorder in prep (deferred to future)
- Legendary actions / concentration tracking (separate features)
- New event types (deferred)
- Mobile layout
