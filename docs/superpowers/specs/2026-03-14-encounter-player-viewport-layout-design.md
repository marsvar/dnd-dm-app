# Encounter Player — Viewport-Locked Dashboard Design

**Date:** 2026-03-14
**Status:** Approved

---

## Problem

The encounter player page (`/encounters/player`) is designed like a document. In combat mode the DM must scroll up to reach controls and down to see participants. Each participant row is tall. On tablet the three columns stack. Unusable at a live table.

## Goal

Combat mode becomes a fixed-height viewport dashboard — no page scroll. Controls always reachable. Participant list scrolls internally. Prep mode unchanged.

---

## Nav height

The Nav wordmark currently stacks three lines when a campaign is active (DM Toolkit label + encounter name + campaign name). To give the nav a predictable fixed height without clipping content:

1. Remove the campaign name as a third stacked line. Show it **inline** as a muted badge appended to the encounter name line (e.g. `"Vault of Encounters · Campaign Name"` or a `<Pill>` inline).
2. Give `<header>` a fixed height of **`h-16` (64px)**. With `py-4` removed and `items-center`, the two-line wordmark (label row + name row) fits comfortably.
3. Set `--nav-height: 64px` in `globals.css`. This is the positioning anchor for the fixed overlay.

This is a small Nav restructure that eliminates height variability.

---

## Layout

### Fixed full-bleed overlay

Rendered as `position: fixed` with `inset-x-0 bottom-0 top-[var(--nav-height)]`. `position: fixed` is viewport-relative — it escapes `max-w-6xl` naturally. No portal, no layout.tsx changes.

**Scroll lock:** `useEffect` saves `document.body.style.overflow`, sets it to `"clip"`, restores saved value on cleanup. Cleanup runs on unmount and on `combatMode → false`. Idempotent.

```
Desktop/laptop (lg+)   280px | 1fr | 300px
┌─────────────┬─────────────────┬──────────────┐
│ LEFT PANEL  │ INITIATIVE LIST │ REFERENCE    │
│ no scroll   │ overflow-y-auto │ overflow-y-auto│
└─────────────┴─────────────────┴──────────────┘

Tablet (md)            240px | 1fr
┌─────────────┬─────────────────┐
│ LEFT PANEL  │ INITIATIVE LIST │
└─────────────┴─────────────────┘
```

Reference panel hidden on tablet (`hidden lg:block`). Compact stat row at bottom of left panel, tablet only (`lg:hidden`).

### Prep mode

Unchanged — document scroll. Overlay only when `combatMode === true` (`selectedEncounter?.combatMode === "live"`).

### PageShell and transition

`PageShell` is used **only in prep mode**. In combat mode the page returns the fixed overlay directly, with no `PageShell` wrapper:

```tsx
if (combatMode) return <CombatView />;   // fixed overlay, no PageShell, no padding
return (
  <PageShell>
    <PrepView />
  </PageShell>
);
```

This avoids `PageShell`'s `space-y-10` padding interfering with the fixed container, and ensures `overflow: clip` on body clips the actual document scroll (not a nested `PageShell` scroll).

---

## Target model change

The existing left panel uses `damageTargetId` / `effectiveTargetId` for flexible per-row targeting. In the new design **the left panel always targets `activeParticipant.id`**. Per-row `QuickActionPopover` handles all other participants.

**Remove entirely:**
- `damageTargetId` state (line 34)
- `defaultTargetId` (line 141), `selectedTargetId` (line 142), `effectiveTargetId` (lines 143–145)
- All `setDamageTargetId` calls (currently on row click at line 1018)
- `targeted-outline` class usage in `page.tsx` (line 1010) and its definition in `globals.css` (line 228)
- **The Remove participant button** from the left panel. Removing a participant mid-combat when the panel always targets `activeParticipant` would be too dangerous. Participants reach 0 HP and move to the defeated list naturally. If removal is needed the DM can stop combat, return to prep mode, and remove from there.

**Update:**
- Left panel damage dispatch → `activeParticipant.id`
- Left panel condition picker → `activeParticipant.id`
- `localNotes` `useEffect` (lines 236–240): dependency → `activeParticipant?.id`; source → `activeParticipant?.notes ?? ""`

---

## Active participant null / defeated state

When `TURN_ADVANCED` is dispatched and the engine's `activeParticipantId` points to a just-defeated participant, `orderedParticipants` (which filters out defeated entries) will not contain them, so `activeParticipant` will be `null`. **Specified behavior:** the left panel shows a neutral empty state ("End of round — advance turn or stop combat") with all inputs disabled. The DM must manually advance the turn or stop combat. No auto-advance.

This is not a regression — the current code already produces `activeParticipant = null` in this scenario. The new design makes it a visible, labelled state instead of a silent one.

---

## Section 1: Left Panel

Always visible, never scrolls. Targets `activeParticipant.id` exclusively.

**Null state:** `activeParticipant` is null → "End of round — advance turn or stop combat." All inputs disabled.

1. **Encounter name** — `text-xs text-muted`, truncated.
2. **Round N + Prev/Next** — `font-mono text-2xl` counter; `[← Prev]` `[Next Turn →]`. Next Turn = `variant="primary"` (largest button on panel).
3. **Current participant card** (`bg-surface-strong rounded-xl p-3`) — `ParticipantAvatar`, name (`text-base font-semibold`), kind pill, initiative. `HpBar` + `currentHp / maxHp`. HP null → `—`, muted "HP not tracked", disable inputs.
4. **Next up preview** — `text-xs text-muted`: "Next: [name]". Blank if single participant.
5. **Damage / Heal** — `type="number" min={1}` input. `[− Damage]` → `DAMAGE_APPLIED` on `activeParticipant.id`; `[+ Heal]` → `HEAL_APPLIED`. `--btn-damage-bg/fg` / `--btn-heal-bg/fg` tokens (already in `globals.css`). Disabled if HP null or no `activeParticipant`.
6. **Condition picker** — `ConditionChip`s + tooltips → `activeParticipant.id`.
7. **Tablet stat row** (`lg:hidden`) — STR/DEX/CON/INT/WIS/CHA + AC from `refId` lookup. No `refId` or missing ability scores → AC only.
8. **Last action + Undo** — color-coded pill + `undoEncounterEvent`. Always present.
9. **Stop / End** — `mt-auto`, `border-t border-black/10`, `pt-3`, `variant="outline"`.

---

## Section 2: Initiative List (middle column)

`overflow-y-auto h-full`. Rows ~48px.

**List data source:** the existing `orderedParticipants` memo (living only, sorted by init) is **preserved** for `activeIndex`, `nextParticipant`, and `activeParticipant` derivations. For the initiative list rendering, create a new `combatListParticipants` array: `[...orderedParticipants, ...defeatedParticipants]`. This merges both into a single ordered array for display — living first (existing sort), defeated last (existing `defeatedParticipants` sort). The existing memos are not changed; only the render source changes.

**Row anatomy (left → right):**
- `ParticipantAvatar` (`h-7 w-7`)
- Name (truncated) + kind pill
- Conditions — max 2 chips, `+N` overflow label, no wrap
- `Init · AC · HP current/max` (`font-mono text-xs`); null → `—`. `HpBar` (`w-16`) omitted if HP null.
- `[± HP]` button (`h-7 px-2.5 text-xs variant="outline"`) — `QuickActionPopover` dispatching on **this participant's id**. Component unchanged.

**Row click:**
- Monster row on desktop → sets `referencePinnedId` to this participant's id.
- PC row on desktop → does nothing (no `referencePinnedId`, no `damageTargetId`).
- Any row on tablet → does nothing (stat block is via dedicated button, not row click).

**Ordering:** living first (init desc, name asc); defeated (`currentHp !== null && currentHp <= 0`) at bottom, `opacity-60`, always visible — no collapsible.

**Death saves:** `DmDeathSaveTracker` component is **not rendered in initiative list rows** in this layout. The component and its event dispatch exist in the codebase but its `<DmDeathSaveTracker>` render call(s) inside the initiative list are removed. It is not added to compact rows. The "Unchanged" list refers to the component source — not its render location.

**Reference panel / stat block:**
- Desktop: clicking monster row → `referencePinnedId`. `useEffect([activeParticipantId]) → setReferencePinnedId(null)` clears on turn advance.
- Tablet: `[Stat Block]` button per monster row → `MonsterStatBlockDialog`. Row click itself = no action.
- Per-row "Stat Block" button from previous sprint is **removed** (desktop gets reference panel; tablet gets dedicated button).

---

## Section 3: Reference Panel (`hidden lg:block`, 300px)

`overflow-y-auto h-full`. Priority: `referencePinnedId ?? activeParticipantId`. Cleared by `useEffect([activeParticipantId])`. Empty state if neither resolves.

**PC** (`pcsById.get(refId)`): name/class/level/AC, ability grid, saves, passive perception, `SpellSlotsReadout` (inline component in page.tsx line 1809), notes.

**Monster** (`monstersById.get(refId)`): name/size/type/CR/AC/HP/speed, ability grid, senses/languages, traits, actions.

**Custom NPC** (no `refId`): `EncounterParticipant` fields — name, kind, AC, initiative, conditions, notes.

---

## Keyboard

Existing `react-hotkeys-hook` shortcuts (`n`/`→`, `p`/`←`) preserved. No focus trap. Tab order in left panel: Next Turn → damage input → Damage → Heal → condition picker → Undo → Stop → End. Initiative `[± HP]` buttons in natural tab order after left panel controls.

---

## Files Affected

| File | Change |
|---|---|
| `app/encounters/player/page.tsx` | Major restructure: fixed overlay; Nav campaign name inlined; `damageTargetId`/`effectiveTargetId`/`defaultTargetId`/`selectedTargetId` removed; `localNotes` sync updated; compact rows; `referencePinnedId` state; `useEffect` clear-on-advance; scroll-lock `useEffect`; `DmDeathSaveTracker` render in rows removed; per-row Stat Block replaced; null active participant state handled |
| `app/globals.css` | `--nav-height: 64px` added; `.targeted-outline` deleted |
| `app/components/Nav.tsx` | `<header>` changed from `sticky` to `fixed`; gets `h-16`; `py-4` removed from inner div; campaign name moved inline |
| `app/layout.tsx` | `<main>` gets `pt-16` (was `pt-10`) to prevent content hiding under the now-fixed Nav |

---

## What Does Not Change

- Prep mode layout
- All event dispatch logic
- `QuickActionPopover` (no changes)
- `MonsterStatBlockDialog` (reused for tablet)
- `EncounterCompleteDialog`
- `DmDeathSaveTracker` component source (render location changes only)
- `SpellSlotsReadout` inline component
- `--btn-damage-*` / `--btn-heal-*` tokens
- Engine / store logic

---

## Out of Scope

- Mobile (< md) — stacked/scrollable acceptable
- Drag-to-reorder
- New event types
- Full death save implementation
