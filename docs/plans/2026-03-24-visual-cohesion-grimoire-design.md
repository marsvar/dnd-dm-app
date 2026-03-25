# Visual Cohesion + Grimoire Alignment — Design Document

**Date:** 2026-03-24
**Branch:** feature-v8
**Status:** Approved

---

## Problem Statement

The app has drifted from design intent across several files:

1. **Token drift** — `globals.css` values differ slightly from the Grimoire spec created in `main`
2. **Border inconsistency** — Several places use `border-black/5` instead of the governance-required `border-black/10`
3. **Surface inversion** — `PcCard` outer container uses `bg-surface-strong` while all inner panels use `bg-surface`, creating a light-on-dark inversion against the intended hierarchy (background → surface → surface-strong)
4. **Missing container** — Participant list column in combat tracker floats directly on the background with no Card/Panel wrapper
5. **Text overflow** — Participant names, "Last action" summary, and PcCard header name can all wrap instead of truncating
6. **Active row overstatement** — Current active row styling (`border-l-4 + ring-2`) is visually aggressive; Grimoire spec calls for a subtle translucent warm tint
7. **Redundant Active pill** — Active rows in the participant list show a separate `<Pill label="Active">` chip below the name, redundant with the row highlight
8. **Status bar segmentation** — Round / Active / Last action sit in one unseparated `flex-wrap` div with no visual dividers
9. **Reference panel border** — Uses `border-black/5` and ability scores are rendered as prose text instead of a stat grid
10. **Campaign Pulse tiles** — Use inline `rounded-xl` instead of `rounded-2xl` from the `Panel` primitive; inconsistent radius
11. **Undefined CSS variables** — `pcs/page.tsx` references `var(--color-text-muted)` and `var(--color-border)` which don't exist

---

## Grimoire Design System Reference

Sourced from `main/app/design-system/page.tsx` — Direction A "Grimoire".

### Token Values

| Token | Current | Grimoire target |
|---|---|---|
| `--background` | `#f7f3ee` | `#F5EFE6` |
| `--surface` | `#fffaf2` | `#FBF5EA` |
| `--surface-strong` | `#f1e8dc` | `#EDE0CB` |
| `--accent` | `#7a4b1e` | `#8B5220` |
| `--muted` | `#5a4f45` | `#6B5C4D` |

Dark mode tokens already correct (no changes needed).

### New tokens to add

```css
--active-row-bg: rgba(139, 82, 32, 0.06);      /* light mode */
--active-row-border: rgba(139, 82, 32, 0.3);

/* dark mode */
--active-row-bg: rgba(232, 176, 96, 0.08);
--active-row-border: rgba(232, 176, 96, 0.3);
```

### Grimoire Participant Row Layout (2-zone)

```
Zone A (flex-1, min-w-0):
  [Avatar with accent border if active]  [Name (accent color if active) · KIND inline]
                                          [Conditions row]
                                          [HpBar ─────────] hp / maxHp

Zone B (shrink-0, text-right):
  [INIT]
  [AC  ]
```

Active row background: `var(--active-row-bg)` with `border: 1px solid var(--active-row-border)`.

---

## Solution Categories (all approved)

### A — Border token normalization
Fix all `border-black/5` → `border-black/10` in:
- `Nav.tsx` (3 occurrences)
- `PcCard.tsx` expanded section divider
- `encounters/player/page.tsx` reference panel
- `campaigns/page.tsx` party member rows

Fix undefined CSS vars in `pcs/page.tsx`:
- `var(--color-text-muted)` → `text-muted` class
- `var(--color-border)` → `border-black/10` class

Remove redundant `bg-surface` from `notes/page.tsx` Card (Card already sets it).

### B — Combat tracker layering
Wrap the middle participant list column (`div.space-y-2` at line 861) in a Card/Panel container equivalent (`rounded-2xl border border-black/10 bg-surface p-4`).

### C — Text truncation
- Participant names in combat rows: `truncate min-w-0` on the name element
- PcCard header name row: change `flex-wrap` → `flex-nowrap` on the outer flex, `truncate` on name span
- "Last action" text in status bar: `truncate max-w-[16rem]`

### D — Container radius + defeated opacity
- Campaign Pulse stat tiles: replace inline `rounded-xl` with `rounded-2xl` (use `Panel` primitive or match it)
- Compact panel padding: normalize to `p-3` where `p-4` is too heavy in dense context
- Defeated/0 HP participants: add `opacity-70` to their row wrapper

### E — Status bar segmentation
Split the single `flex-wrap` div into 3 visually separated segments with `|` dividers or border separators. Each segment: Round (with controls + Undo), Active (current participant name), Last (last action summary).

### F — Remove redundant Active pill
Remove the `{index === activeIndex && <Pill label="Active" tone="accent" />}` block beneath the name in participant rows. The row tint + avatar accent border communicate active state.

### G — Reference panel stat grid
Replace the prose ability score paragraphs (`STR 15 · DEX 12 · CON 14`) with a proper 6-cell grid using `font-mono` labels and values. Fix panel border to `border-black/10`.

### H — PcCard surface inversion fix
Swap surfaces throughout PcCard:
- Outer container: `bg-surface-strong` → `bg-surface`
- `StatBadge`, `AbilityBlock`, all inner panels: `bg-surface` → `bg-surface-strong`
- Hover: `hover:bg-surface` → `hover:bg-surface-strong`
- Avatar: `bg-surface` → `bg-surface-strong`

### I — Grimoire token update
Update `:root` in `globals.css` with exact Grimoire values for the 5 differing tokens.

### J — Active row new tokens + restyling
Add `--active-row-bg` and `--active-row-border` to `globals.css` (light + dark).
Replace active row className:
```
"border-l-4 border-accent bg-surface-strong ring-2 ring-[var(--ring)]"
→
"bg-[var(--active-row-bg)] border-[var(--active-row-border)]"
```

### K — Grimoire participant row layout
Refactor the 4-column grid to 2-zone layout:
- Zone A (identity): avatar + name (accent if active) + kind + conditions + HpBar + hp text — all inline within a flex column
- Zone B (stats): INIT and AC stacked right-aligned
- HP moved into identity zone (no longer a separate column)
