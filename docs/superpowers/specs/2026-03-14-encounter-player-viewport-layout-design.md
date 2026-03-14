# Encounter Player — Viewport-Locked Dashboard Design

**Date:** 2026-03-14
**Status:** Approved

---

## Problem

The encounter player page (`/encounters/player`) is designed like a document. In combat mode, the DM must scroll up to reach controls and down to see participants. Each participant row is tall (avatar, stats, conditions, quick actions, death saves). On tablet the three columns stack, requiring heavy vertical scrolling. This is unusable at a live table under time pressure.

## Goal

Combat mode becomes a fixed-height viewport dashboard — no page scroll. Controls are always reachable. The participant list scrolls internally. Prep mode is unchanged.

---

## Layout Structure

### Combat mode: fixed overlay below nav

The combat view renders as a `fixed` container spanning `inset-x-0 bottom-0` with `top` equal to the nav height. It sits above the normal page flow; the root layout does not change.

```
Desktop/laptop (lg+)   ~280px | 1fr | ~300px
┌─────────────┬─────────────────┬──────────────┐
│ LEFT PANEL  │ INITIATIVE LIST │ REFERENCE    │
│ fixed       │ scrolls interna │ scrolls int. │
└─────────────┴─────────────────┴──────────────┘

Tablet (md)            ~240px | 1fr
┌─────────────┬─────────────────┐
│ LEFT PANEL  │ INITIATIVE LIST │
│ fixed       │ scrolls interna │
└─────────────┴─────────────────┘
Reference panel hidden on tablet. Compact stat summary folded into bottom of left panel.
```

**Prep mode:** unchanged — document scroll is appropriate when setting up.

---

## Section 1: Left Panel

Always visible, never scrolls. Targets the **active turn participant only** — no floating target concept. Non-active participants receive damage/heal via the per-row ± HP popover.

Top-to-bottom layout:

1. **Encounter name** — small, muted, one line
2. **Round N + Prev / Next Turn controls** — round counter prominent; Next Turn is the largest button on the panel
3. **Current participant card** — avatar, name (large), kind pill, initiative value, HP bar + `current/max` text
4. **Next up preview** — one muted line: "Next: [name]"
5. **Damage / Heal inputs** — always visible, always targets active participant; number input + `− Damage` and `+ Heal` buttons (using existing `--btn-damage-*` / `--btn-heal-*` tokens)
6. **Condition picker** — compact; shows active conditions as chips, picker below
7. **Last action + Undo** — muted summary pill (e.g. "−8 dmg") + Undo button; always present during combat
8. **Stop Combat / End Encounter** — bottom of panel, separated from action area to avoid accidental taps

On tablet: a collapsed **Stats row** is appended below the condition picker — ability scores (STR/DEX/CON/INT/WIS/CHA) and AC in a tight grid. Replaces the hidden reference panel.

---

## Section 2: Initiative List (middle column)

`overflow-y-auto h-full`. Each row is a single compact line (~48px tall, half current height).

**Row anatomy (left → right):**
- Avatar (small, `h-7 w-7`)
- Name (truncated) + kind pill
- Condition chips inline — truncated with `+N` overflow label if many, no line wrap
- Initiative · AC · HP `current/max` + inline HpBar
- `± HP` button (small, right-aligned) — opens existing `QuickActionPopover`

**Active row:** accent left border + ring (existing style, kept).

**Defeated participants:** shown inline at the bottom of the list, muted, no separate collapsible section.

**Death saves:** downed PCs show a compact `2✓ 1✗` text label in the row. Clicking the row opens the full death save UI in a small inline expansion or popover (not a modal).

**Stat block access:** clicking a monster row populates the reference panel — the per-row "Stat Block" button is removed. On tablet, tapping a monster row shows a stat block modal (reference panel is hidden).

**Targeting:** clicking any row continues to set `damageTargetId`, but this no longer affects the left panel (which is always the active participant). It affects only the ± HP popover which is already row-scoped.

---

## Section 3: Reference Panel (desktop/laptop only, right column)

`overflow-y-auto h-full`. Auto-populates from the **active turn participant** whenever the turn advances — no click required.

**For a PC:**
- Name, class, level, AC
- Ability scores grid (score + modifier)
- Saving throw proficiencies
- Passive Perception
- Spell slots (if applicable)
- Notes

**For a monster:**
- Name, size/type, CR
- AC, HP, Speed
- Ability scores grid
- Senses, Languages
- Traits
- Actions

**Empty state:** "No active participant." (shown before combat starts).

Hidden entirely on tablet. Its content is partially replicated in the left panel stat row (see Section 1).

---

## Files Affected

| File | Change |
|---|---|
| `app/encounters/player/page.tsx` | Major restructure: combat mode wrapped in fixed viewport container; left panel reorganised; participant rows compacted; reference panel auto-populated; defeat section inlined; Stat Block button removed from rows |
| `app/components/ui.tsx` | No changes expected |
| `app/globals.css` | Add `--nav-height` CSS variable if needed for the fixed offset calculation |

---

## What Does Not Change

- Prep mode layout (document scroll, existing participant cards)
- All event dispatch logic (`DAMAGE_APPLIED`, `HEAL_APPLIED`, `CONDITIONS_SET`, etc.)
- `QuickActionPopover` component
- `MonsterStatBlockDialog` component (reused for tablet stat block tap)
- `EncounterCompleteDialog`
- Keyboard shortcuts (n/→ next, p/← prev)
- All existing engine/store logic

---

## Out of Scope

- Mobile layout (< md breakpoint) — still stacked/scrollable, acceptable for now
- Drag-to-reorder initiative
- Any new event types
