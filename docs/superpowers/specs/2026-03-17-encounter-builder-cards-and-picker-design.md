# Encounter Builder — Card Redesign + Inline Monster Picker Design

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace minimal encounter cards with information-dense cards showing difficulty, XP, and combatant count; and eliminate the nested dialog pattern for the monster picker by embedding it inline in both the Create and Edit dialogs.

**Architecture:** All changes are confined to `app/encounters/builder/page.tsx` and `app/globals.css`. No new components, no new dependencies. The monster picker embed reuses the existing `MonsterPicker` component; the collapse behaviour is pure React state + CSS transition. Difficulty data is already computed via existing selectors in scope.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, existing `app/components/ui.tsx` primitives, existing `MonsterPicker` component, `useRouter` from `next/navigation` (new import in builder page).

---

## Part 1 — Encounter Cards

### Current state

Each active encounter card shows: name, location, LIVE/PREP status pill, a strip of up to 6 participant avatars, and Edit + Remove buttons. No difficulty rating, no XP, no combatant count, no direct launch action.

### Approved design (Option B — 21st.dev TripDetailsCard pattern)

Each card has two zones:

**Card body** (`p-4`)
- Top row: name (truncated, `truncate min-w-0`) + location on left; status pill + difficulty pill stacked on right (`flex-col items-end gap-1 flex-shrink-0`)
- Meta row (below top row): `{n} combatants · CR {x} · {xp} XP` — all in `font-mono text-xs text-muted`.
  - **n**: `encounter.participants.length`
  - **CR {x}**: `formatTotalChallenge(getTotalChallenge(challenges))` where `challenges` is the same array used for difficulty (see below). Both functions are already imported.
  - **XP**: `adjustedXp` from `getEncounterDifficultyBreakdown(challenges, partyLevels).adjustedXp` — this is the size-multiplied value that corresponds to the displayed difficulty tier.
  - When `partyLevels.length === 0`, omit the XP segment entirely and append `· no party` instead.
- Avatar strip: up to 6 avatars via `ParticipantAvatar name={p.name} visual={p.visual} size="sm"`; overflow shown as `+N` text in `text-xs text-muted`. Do not apply custom bg/text colors to avatars — `ParticipantAvatar` handles its own styling. When roster is empty: `<span className="text-xs text-muted italic">No participants yet</span>`

**Footer toolbar** (`bg-surface-strong border-t border-black/10 px-3 py-2 flex items-center gap-2`)
- Left: Remove button (`variant="ghost"`, `text-[var(--diff-hard)] hover:text-[var(--diff-deadly)]`); disabled and `opacity-40` when encounter is LIVE
- Spacer: `flex-1`
- Right: Edit button (`variant="outline"`), disabled when LIVE; then Launch/Resume button (`variant="primary"`)
  - Label: `"Launch ⚔"` when PREP, `"Resume ⚔"` when LIVE
  - Launch disabled (and visually `opacity-40`) when `encounter.participants.length === 0`

**Launch action:** `useRouter().push('/encounters/player')`. The player page at `/encounters/player` defaults to `state.encounters[0]` when no encounter ID is selected. This works correctly for the common case of one active encounter. When multiple encounters exist, the player page shows a selector — the DM can choose from there. No URL param passing is required in this iteration.

### Difficulty pill

`EncounterDifficulty` has six values. Pill treatment for each:

| Selector value | Pill label | Token classes |
|---|---|---|
| `"Easy"` | Easy | `bg-[var(--diff-easy-bg)] text-[var(--diff-easy)] border-[var(--diff-easy)]/25` |
| `"Medium"` | Medium | `bg-[var(--diff-medium-bg)] text-[var(--diff-medium)] border-[var(--diff-medium)]/25` |
| `"Hard"` | Hard | `bg-[var(--diff-hard-bg)] text-[var(--diff-hard)] border-[var(--diff-hard)]/25` |
| `"Deadly"` | Deadly | `bg-[var(--diff-deadly-bg)] text-[var(--diff-deadly)] border-[var(--diff-deadly)]/25` |
| `"Trivial"` | Trivial | neutral `Pill` (same as PREP status pill) |
| `"No Party"` | — | neutral `Pill` with label `"—"` |

**Per-card computation strategy:** Compute difficulty/XP/CR inline inside the `.map()` render — do not add new `useMemo` calls per encounter. The card list is small (typically 1–5 items) and the computation is O(participants) with only map lookups; the cost is negligible. Inline computation avoids memo sprawl.

For each encounter in the `.map()`:
```ts
// Use the existing getParticipantChallenge helper (already defined at the top of the file)
// to ensure NPC/custom-monster participants without a refId fall back to
// estimateChallengeFromDefenses — consistent with the edit panel's display.
const challenges = encounter.participants
  .map(p => getParticipantChallenge(p, monsterChallengeById))
  .filter((c): c is string => c !== null);

const partyLevels = encounter.participants
  .filter(p => p.kind === "pc" && p.refId)
  .map(p => pcsById.get(p.refId!)?.level ?? null)
  .filter((l): l is number => l !== null);

const difficulty = evaluateEncounterDifficulty(challenges, partyLevels);
const breakdown = getEncounterDifficultyBreakdown(challenges, partyLevels);
const totalCr = formatTotalChallenge(getTotalChallenge(challenges));
```

Both `monsterChallengeById` and `pcsById` are already memoised at page level.

### New CSS tokens

Add to `app/globals.css` `:root` (light mode):
```css
--surface-raised: #ebe5db;
--diff-easy: #2d6a4f;
--diff-easy-bg: #d8f3dc;
--diff-medium: #b5860d;
--diff-medium-bg: #fff3cd;
--diff-hard: #c0441c;
--diff-hard-bg: #fde8e1;
--diff-deadly: #7b1515;
--diff-deadly-bg: #f8d7da;
```

Add to the existing `@media (prefers-color-scheme: dark) { :root { ... } }` block (mirrors the `--hp-*` dark pattern — muted dark backgrounds, lightened text):
```css
--surface-raised: #2e2520;
--diff-easy: #6fcf8a;
--diff-easy-bg: #1a3d23;
--diff-medium: #e8b84d;
--diff-medium-bg: #3a2e0a;
--diff-hard: #e87070;
--diff-hard-bg: #3a1515;
--diff-deadly: #c87070;
--diff-deadly-bg: #2a0a0a;
```

### Completed encounter cards

Same layout as active cards, with `className="opacity-75"` on the card. Footer: Remove button enabled (no disabled state). **No Launch button.** The "Review" button (`variant="outline"`) replaces Edit and remains — it opens the edit overlay (read-only, since completed encounters are not `isRunning` but are `status === "completed"`, and the builder already handles that). No change to the Review button behaviour.

---

## Part 2 — Inline Monster Picker

### Current state

`isMonsterPickerModalOpen` + `monsterPickerMode` state drives a `<Dialog>` that opens on top of either the Create or Edit dialog, producing a stacked-dialog anti-pattern.

### Approved design (Option C hybrid — 21st.dev Collapse pattern)

#### Create dialog — always-visible two-column layout below name/location

Layout:
```
[ Name (flex-1) ] [ Location (flex-1) ]   ← full-width 2-col row at top
─────────────────────────────────────────
[ MonsterPicker inline  ] [ Draft roster ]   ← below, 50/50 split
[ + Party toggle row   ]
─────────────────────────────────────────
[ Create button (right-aligned) ]
```

- Name + Location inputs stay as a full-width 2-column grid row at the top of the dialog body
- Below, a `grid grid-cols-2 gap-4` contains:
  - **Left:** `MonsterPicker` rendered directly (no wrapping dialog). `onPickMonster` calls `addMonsterToCreateDraft`. Below the picker, the existing party toggle buttons ("Add entire party" / "Clear party") and party member pills stay inline in this column.
  - **Right:** Draft roster list (already exists — monsters click to remove, party pills shown)
- Remove the "Open monster picker" button section from the left panel
- Remove the separate monster picker Dialog and all state/functions that drove it for the create path

#### Edit dialog — collapsible inline section (21st.dev Collapse + Ark UI Collapsible pattern)

Add a new local state: `const [isPickerOpen, setIsPickerOpen] = useState(false)` inside the edit section (or as a page-level boolean, reset when the edit overlay opens).

Replace the "Open monster picker" button with:

```jsx
{/* Collapse trigger — 21st.dev Collapse pattern */}
<button
  onClick={() => setIsPickerOpen(v => !v)}
  className="flex w-full items-center justify-between rounded-lg bg-surface-strong border border-black/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-muted hover:bg-[var(--surface-raised)] transition-colors duration-150"
  disabled={builderLocked}
>
  <span>Add Monsters</span>
  <span style={{ display: 'inline-block', transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)', transform: isPickerOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
</button>

{/* Collapse content — overflow-hidden + max-height transition */}
<div style={{
  overflow: 'hidden',
  maxHeight: isPickerOpen ? '20rem' : '0',
  opacity: isPickerOpen ? 1 : 0,
  transition: 'max-height 0.25s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease',
}}>
  <div className="pt-1">
    <MonsterPicker
      monsters={state.monsters}
      disabled={builderLocked}
      onPickMonster={(monster) => requestAddMonster(monster.id)}
      listClassName="max-h-[10rem]"
    />
  </div>
</div>
```

Clicking a monster in the picker calls `requestAddMonster` directly — no intermediate state, no closing the picker (DM may want to add several).

### State and function cleanup

The following are removed from `builder/page.tsx`:

**State:**
- `isMonsterPickerModalOpen`
- `monsterPickerMode`

**Functions (remove entirely):**
- `openCreateMonsterPicker()`
- `openEditMonsterPicker()`
- `closeMonsterPicker()`

**Functions (update — remove references to deleted state):**
- `closeEditOverlay()` — remove `setIsMonsterPickerModalOpen(false)` and `setMonsterPickerMode(null)` calls
- `openCreateOverlay()` — remove `setIsMonsterPickerModalOpen(false)` and `setMonsterPickerMode(null)` calls

**`useEffect` keydown handler:**
- Remove `isMonsterPickerModalOpen` from the dependency array
- Remove `closeMonsterPicker` from the dependency array
- Remove the `if (isMonsterPickerModalOpen) { closeMonsterPicker(); return; }` branch from the `Escape` handler

**JSX:**
- Remove the entire `<Dialog open={isMonsterPickerModalOpen ...}>` block (~lines 1117–1146)

**Not removed:** Party modal (`isPartyModalOpen`) and Variant modal (`isVariantModalOpen`) remain as dialogs — they are small, focused, and do not stack on top of a full-screen dialog.

---

## New import required

Add `useRouter` to the import in `builder/page.tsx`:
```ts
import { useRouter } from "next/navigation";
```

Add `const router = useRouter();` near the top of the component. Use `router.push('/encounters/player')` in the Launch/Resume button `onClick`.

---

## Scope boundaries

- No changes to `MonsterPicker` component internals
- No changes to encounter engine or event types
- No changes to `/encounters/player` page
- No new npm dependencies
- Party modal and Variant modal remain as dialogs (no change)

---

## Definition of done

- [ ] Active encounter cards show difficulty pill (all 6 values handled), combatant count, adjusted XP, and Launch/Resume button
- [ ] LIVE cards: Edit + Remove disabled/dimmed, button reads "Resume ⚔"
- [ ] 0-participant cards: Launch button disabled/dimmed
- [ ] Completed cards: opacity-75, Review button kept, no Launch button, Remove enabled
- [ ] Create dialog: MonsterPicker inline (no nested dialog), party toggles inline, name/location above
- [ ] Edit dialog: "Add Monsters" collapse trigger with rotating chevron and animated slide panel
- [ ] `isMonsterPickerModalOpen`, `monsterPickerMode`, `openCreateMonsterPicker`, `openEditMonsterPicker`, `closeMonsterPicker` removed
- [ ] `closeEditOverlay` and `openCreateOverlay` updated to remove deleted state references
- [ ] `useEffect` keydown handler updated: removed branch + dep array cleaned
- [ ] Monster picker Dialog JSX block removed
- [ ] `--surface-raised` + `--diff-*` light tokens added to `:root` in `globals.css`
- [ ] `--surface-raised` + `--diff-*` dark tokens added to `@media (prefers-color-scheme: dark)` block in `globals.css`
- [ ] `useRouter` imported and used for Launch/Resume navigation
- [ ] Build passes, lint clean
