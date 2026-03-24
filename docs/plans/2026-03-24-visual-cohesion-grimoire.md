# Visual Cohesion + Grimoire Alignment — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all visual cohesion issues across the app and align every token, surface, and layout pattern with the Grimoire design system from `main/app/design-system/page.tsx`.

**Architecture:** Pure CSS/TSX changes — no logic, no new state, no new components. Every change is confined to presentation layer. Changes grouped so each commit leaves the app in a consistent state.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, CSS custom properties, shared UI primitives in `app/components/ui.tsx`

**Design reference:** `docs/plans/2026-03-24-visual-cohesion-grimoire-design.md`

---

## Task 1: Grimoire token update in globals.css

**Files:**
- Modify: `app/globals.css:1-30`

**Step 1: Update the 5 drifted light-mode tokens**

Replace these values in `:root`:
```css
/* BEFORE */
--background: #f7f3ee;
--surface: #fffaf2;
--surface-strong: #f1e8dc;
--accent: #7a4b1e;
--muted: #5a4f45;

/* AFTER */
--background: #F5EFE6;
--surface: #FBF5EA;
--surface-strong: #EDE0CB;
--accent: #8B5220;
--muted: #6B5C4D;
```

Also update `--ring` to match new accent:
```css
/* BEFORE */
--ring: rgba(122, 75, 30, 0.35);
/* AFTER */
--ring: rgba(139, 82, 32, 0.35);
```

Also update the body background gradients in the `body` rule to reference the new accent value:
```css
/* BEFORE — rgba(122, 75, 30, ...) */
/* AFTER  — rgba(139, 82, 32, ...) */
```

**Step 2: Add active-row tokens**

After the existing `:root` closing brace (before `@theme inline`), add:
```css
/* Active row (Grimoire) */
--active-row-bg: rgba(139, 82, 32, 0.06);
--active-row-border: rgba(139, 82, 32, 0.3);
```

In the dark mode `@media` block, add inside `:root`:
```css
--active-row-bg: rgba(232, 176, 96, 0.08);
--active-row-border: rgba(232, 176, 96, 0.3);
```

**Step 3: Verify**

```bash
cd /Users/msvarlia/Developer/dnd-dm-app/feature-v8
npm run lint
```
Expected: zero new errors.

**Step 4: Commit**

```bash
git add app/globals.css
git commit -m "fix: align globals.css tokens with Grimoire design system"
```

---

## Task 2: Border token normalization (border-black/5 → border-black/10)

**Files:**
- Modify: `app/components/Nav.tsx`
- Modify: `app/components/PcCard.tsx`
- Modify: `app/encounters/player/page.tsx`
- Modify: `app/campaigns/page.tsx`
- Modify: `app/notes/page.tsx`

**Step 1: Fix Nav.tsx**

Find and replace all `border-black/5` occurrences with `border-black/10`. There are 3 occurrences (line 81 bottom border, lines 197 and 210 for top borders on mobile nav items).

Search pattern: `border-black/5` in `app/components/Nav.tsx`
Replace with: `border-black/10`

**Step 2: Fix PcCard.tsx expanded section divider**

At line 788, the expanded section divider:
```tsx
/* BEFORE */
<div className="flex items-center justify-between border-t border-black/5 px-4 py-1.5">
/* AFTER */
<div className="flex items-center justify-between border-t border-black/10 px-4 py-1.5">
```

**Step 3: Fix encounters/player/page.tsx reference panel**

At line 1028:
```tsx
/* BEFORE */
<div className="rounded-2xl border border-black/5 bg-surface p-4 text-sm text-muted">
/* AFTER */
<div className="rounded-2xl border border-black/10 bg-surface p-4 text-sm text-muted">
```

Also fix the status bar container at line 600:
```tsx
/* BEFORE */
<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-surface-strong px-3 py-2 text-xs text-muted">
/* AFTER */
<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-surface-strong px-3 py-2 text-xs text-muted">
```

**Step 4: Fix campaigns/page.tsx party member rows**

Find: `border border-black/5 bg-surface-strong`
Replace with: `border border-black/10 bg-surface-strong`

**Step 5: Fix notes/page.tsx redundant bg-surface**

Find: `<Card className="space-y-3 bg-surface">`
Replace with: `<Card className="space-y-3">`
(Card already applies `bg-surface` internally)

**Step 6: Verify**

```bash
npm run lint
```

**Step 7: Commit**

```bash
git add app/components/Nav.tsx app/components/PcCard.tsx app/encounters/player/page.tsx app/campaigns/page.tsx app/notes/page.tsx
git commit -m "fix: normalize all border-black/5 to border-black/10 per UI governance"
```

---

## Task 3: Fix pcs/page.tsx undefined CSS variables

**Files:**
- Modify: `app/pcs/page.tsx`

**Step 1: Find and fix undefined variable references**

Search for `var(--color-text-muted)` and `var(--color-border)` in `app/pcs/page.tsx`.

Replace:
- Any element using `style={{ color: "var(--color-text-muted)" }}` or className with the undefined var → use `text-muted` className instead
- Any element using `style={{ borderColor: "var(--color-border)" }}` or similar → use `border-black/10` className instead

Also add a `SectionTitle` at the top of the page content if it's missing. Check: does the page have `<SectionTitle title="..." subtitle="..." />`? If not, add it as the first child of `<PageShell>`.

**Step 2: Verify**

```bash
npm run lint
```
Check for zero new errors; ensure the vars are resolved.

**Step 3: Commit**

```bash
git add app/pcs/page.tsx
git commit -m "fix: replace undefined CSS vars in pcs/page with correct token classes"
```

---

## Task 4: PcCard surface inversion fix (Category H)

**Files:**
- Modify: `app/components/PcCard.tsx`

**Context:** Currently the outer PcCard container uses `bg-surface-strong` and all inner panels use `bg-surface`. This is inverted — inner elements should be `bg-surface-strong` to appear darker/deeper than the card they sit inside.

**Step 1: Fix outer container**

Line 700:
```tsx
/* BEFORE */
<div className="rounded-2xl border border-black/10 bg-surface-strong overflow-hidden">
/* AFTER */
<div className="rounded-2xl border border-black/10 bg-surface overflow-hidden">
```

**Step 2: Fix hover state on the header**

Line 703:
```tsx
/* BEFORE */
className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-surface transition-colors"
/* AFTER */
className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-surface-strong transition-colors"
```

**Step 3: Fix StatBadge inner background**

Line 72:
```tsx
/* BEFORE */
<div className="flex flex-col items-center rounded-lg border border-black/10 bg-surface px-2 py-1 min-w-[2.75rem]">
/* AFTER */
<div className="flex flex-col items-center rounded-lg border border-black/10 bg-surface-strong px-2 py-1 min-w-[2.75rem]">
```

**Step 4: Fix AbilityBlock inner background**

Line 90:
```tsx
/* BEFORE */
<div className="flex flex-col items-center gap-1 rounded-2xl border border-black/10 bg-surface p-2 text-center">
/* AFTER */
<div className="flex flex-col items-center gap-1 rounded-2xl border border-black/10 bg-surface-strong p-2 text-center">
```

Note: the `input` inside AbilityBlock at line 101 already uses `bg-surface-strong` for its editable field — change that to `bg-surface` so the input appears lighter than its container:
```tsx
/* BEFORE */
className="w-12 rounded-lg border border-black/10 bg-surface-strong px-1 py-0.5 ..."
/* AFTER */
className="w-12 rounded-lg border border-black/10 bg-surface px-1 py-0.5 ..."
```

**Step 5: Fix Avatar background inside PcCard header**

Line 713:
```tsx
/* BEFORE (inside cn()) */
"h-11 w-11 shrink-0 rounded-full border border-black/10 bg-surface object-cover text-sm font-semibold text-muted",
/* AFTER */
"h-11 w-11 shrink-0 rounded-full border border-black/10 bg-surface-strong object-cover text-sm font-semibold text-muted",
```

**Step 6: Scan expanded content panels**

In the expanded tabs section, find any `bg-surface` used for sub-panels (passive perception, proficiency, initiative, spell slots panels). Replace each with `bg-surface-strong`.

Find any `bg-surface-strong` used for input fields within expanded tabs. Replace each with `bg-surface`.

Pattern to apply: panels/containers → `bg-surface-strong`; interactive inputs → `bg-surface`.

**Step 7: Verify**

```bash
npm run lint
```

**Step 8: Commit**

```bash
git add app/components/PcCard.tsx
git commit -m "fix: correct PcCard surface hierarchy (outer bg-surface, inner bg-surface-strong)"
```

---

## Task 5: Participant row layout — Grimoire 2-zone (Category K)

**Files:**
- Modify: `app/encounters/player/page.tsx` (lines ~861–946)

**Context:** Current layout is a 4-column grid: `md:grid-cols-[1.2fr_repeat(3,minmax(0,1fr))]` with separate columns for name/kind, INIT, AC, HP. Grimoire spec moves HP into the identity zone and merges INIT+AC into a right-side stat block.

**Step 1: Replace participant row inner grid**

The entire inner `<div className="grid gap-3 md:grid-cols-[1.2fr_repeat(3,minmax(0,1fr))] md:items-center">` and its 4 child divs should become:

```tsx
<div className="flex items-start gap-3">
  {/* Zone A — Identity */}
  <div className="flex min-w-0 flex-1 items-start gap-2">
    <ParticipantAvatar
      name={participant.name}
      visual={participant.visual}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border object-cover text-[0.65rem] font-semibold",
        index === activeIndex
          ? "border-accent text-accent bg-surface-strong"
          : "border-black/10 bg-surface-strong text-muted"
      )}
    />
    <div className="min-w-0 flex-1">
      {/* Name + kind inline */}
      <div className="flex min-w-0 items-baseline gap-2">
        <p className={cn(
          "truncate text-sm font-semibold leading-snug",
          index === activeIndex ? "text-accent" : "text-foreground"
        )}>
          {participant.name}
        </p>
        <span className="shrink-0 text-xs uppercase tracking-wide text-muted">
          {participant.kind}
        </span>
      </div>
      {/* HP bar + value */}
      {participant.maxHp != null && participant.currentHp != null && (
        <div className="mt-1 flex items-center gap-2">
          <HpBar
            current={participant.currentHp}
            max={participant.maxHp}
            className="h-1.5 w-20 shrink-0"
          />
          <span className="font-mono text-xs text-muted">
            {participant.currentHp} / {participant.maxHp}
            {participant.tempHp ? (
              <span className="text-accent"> +{participant.tempHp}</span>
            ) : null}
          </span>
        </div>
      )}
      {/* Conditions */}
      {participant.conditions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {participant.conditions.map((cond) => (
            <ConditionChip
              key={cond}
              label={cond}
              onRemove={() => {
                if (!selectedEncounter) return;
                dispatchEncounterEvent(selectedEncounter.id, {
                  t: "CONDITIONS_SET",
                  participantId: participant.id,
                  value: participant.conditions.filter((c) => c !== cond),
                });
              }}
            />
          ))}
        </div>
      )}
    </div>
  </div>
  {/* Zone B — Stats */}
  <div className="shrink-0 text-right">
    <p className="font-mono text-sm font-semibold">
      {participant.initiative ?? "—"}
    </p>
    <p className="font-mono text-xs text-muted">init</p>
    <p className="mt-1 font-mono text-sm font-semibold">
      {participant.ac ?? "—"}
    </p>
    <p className="font-mono text-xs text-muted">ac</p>
  </div>
</div>
```

**Step 2: Remove the redundant Active pill**

Find and delete:
```tsx
{index === activeIndex ? (
  <div className="mt-2">
    <Pill label="Active" tone="accent" />
  </div>
) : null}
```
The active row tint and avatar accent border now communicate active state.

**Step 3: Update participant row className for active state**

Change the active row from `border-l-4 border-accent bg-surface-strong ring-2 ring-[var(--ring)]` to:
```tsx
index === activeIndex
  ? "border-[var(--active-row-border)] bg-[var(--active-row-bg)] text-foreground"
  : "border-black/10 bg-surface text-foreground"
```

**Step 4: Add opacity to defeated participants**

After the row `className` computation, add an additional condition:
```tsx
const isDefeated = participant.currentHp !== null && participant.currentHp !== undefined && participant.currentHp <= 0;
```
Apply `opacity-70` to the row wrapper when `isDefeated && participant.kind !== "pc"` (PCs at 0 HP show death save UI, not faded).

**Step 5: Verify**

```bash
npm run lint
```

**Step 6: Commit**

```bash
git add app/encounters/player/page.tsx
git commit -m "feat: refactor participant rows to Grimoire 2-zone layout with active row tint"
```

---

## Task 6: Combat tracker — wrap participant list in container (Category B)

**Files:**
- Modify: `app/encounters/player/page.tsx` (line ~861)

**Step 1: Wrap participant list column**

Find the participant list column that starts with:
```tsx
<div className="space-y-2">
  {orderedParticipants.map((participant, index) => (
```

Wrap it with a Card-equivalent container:
```tsx
<div className="rounded-2xl border border-black/10 bg-surface p-4">
  <div className="space-y-2">
    {orderedParticipants.map((participant, index) => (
```
And close the outer wrapper `</div>` after the closing `</div>` of the map.

Note: This is the middle column in the `grid gap-4 xl:grid-cols-[0.65fr_1.1fr_0.9fr]` at line 651. The left column already has `rounded-2xl border border-black/10 bg-surface-strong p-4` and the right column (reference panel) has its own container. The middle column should match.

**Step 2: Verify**

```bash
npm run lint
```

**Step 3: Commit**

```bash
git add app/encounters/player/page.tsx
git commit -m "fix: wrap participant list column in surface container to fix layering"
```

---

## Task 7: Status bar segmentation (Category E)

**Files:**
- Modify: `app/encounters/player/page.tsx` (lines ~600–649)

**Context:** Currently one `flex-wrap` div with all three sections unseparated. Need visual dividers between Round | Active | Last.

**Step 1: Replace the status bar structure**

Current (simplified):
```tsx
<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border ...">
  <div className="flex flex-wrap items-center gap-2"> Round controls + Undo </div>
  <div className="flex flex-wrap items-center gap-2"> Active </div>
  <div className="flex flex-wrap items-center gap-2"> Last </div>
  {/* keyboard hint */}
  {/* requirements message */}
</div>
```

Replace with a layout that uses border separators between segments:
```tsx
<div className="flex items-stretch rounded-2xl border border-black/10 bg-surface-strong text-xs text-muted overflow-hidden">
  {/* Segment 1 — Round controls */}
  <div className="flex items-center gap-2 px-3 py-2">
    <span className="uppercase tracking-[0.25em]">Round</span>
    <Button variant="outline" className="px-3 py-1 text-xs" onClick={() => adjustRound(-1)}>-</Button>
    <span className="text-sm font-semibold text-foreground">{selectedEncounter.round}</span>
    <Button variant="outline" className="px-3 py-1 text-xs" onClick={() => adjustRound(1)}>+</Button>
    <Button
      variant="outline"
      className="px-3 py-1 text-xs"
      onClick={() => undoEncounterEvent(selectedEncounter.id)}
      disabled={!selectedEncounter.eventLog.length}
    >
      Undo
    </Button>
  </div>
  {/* Divider */}
  <div className="w-px self-stretch bg-black/10" />
  {/* Segment 2 — Active participant */}
  <div className="flex min-w-0 items-center gap-2 px-3 py-2">
    <span className="shrink-0 uppercase tracking-[0.25em]">Active</span>
    <span className="truncate text-sm text-foreground">
      {activeParticipant ? activeParticipant.name : "--"}
    </span>
  </div>
  {/* Divider */}
  <div className="w-px self-stretch bg-black/10" />
  {/* Segment 3 — Last action */}
  <div className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2">
    <span className="shrink-0 uppercase tracking-[0.25em]">Last</span>
    <span className="truncate max-w-[16rem] text-sm text-foreground">
      {formatEventSummary(lastEvent)}
    </span>
  </div>
  {/* Keyboard hint (right side) */}
  {selectedEncounter.isRunning ? (
    <div className="ml-auto flex items-center px-3 py-2 text-[0.65rem] uppercase tracking-[0.2em] text-muted">
      N / P
    </div>
  ) : null}
  {!selectedEncounter.isRunning && !combatRequirementsMet ? (
    <div className="flex items-center px-3 py-2">
      <p className="text-xs text-muted">{combatRequirementsMessage}</p>
    </div>
  ) : null}
</div>
```

**Step 2: Verify**

```bash
npm run lint
```

**Step 3: Commit**

```bash
git add app/encounters/player/page.tsx
git commit -m "fix: segment status bar into three visually separated zones with dividers"
```

---

## Task 8: Reference panel stat grid (Category G)

**Files:**
- Modify: `app/encounters/player/page.tsx` (lines ~1028–1074)

**Context:** The reference panel currently shows ability scores and saves as prose text (`STR 15 · DEX 12 · CON 14`). Replace with a compact 6-cell stat grid using `font-mono`.

**Step 1: Replace the ability/saves prose with a stat grid**

For the `activePc` section, replace the current grid of 3 text paragraphs with:

```tsx
{/* Ability scores grid */}
<div>
  <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted">Ability Scores</p>
  <div className="grid grid-cols-6 gap-1">
    {(["str","dex","con","int","wis","cha"] as const).map((key) => (
      <div key={key} className="rounded-lg border border-black/10 bg-surface-strong p-1 text-center">
        <p className="text-[0.55rem] uppercase tracking-widest text-muted">{key}</p>
        <p className="font-mono text-sm font-bold text-foreground">{activePc.abilities[key]}</p>
      </div>
    ))}
  </div>
</div>
{/* Saves grid */}
<div>
  <p className="mb-1 text-xs uppercase tracking-[0.2em] text-muted">Saves</p>
  <div className="grid grid-cols-6 gap-1">
    {(["str","dex","con","int","wis","cha"] as const).map((key) => (
      <div key={key} className="rounded-lg border border-black/10 bg-surface-strong p-1 text-center">
        <p className="text-[0.55rem] uppercase tracking-widest text-muted">{key}</p>
        <p className="font-mono text-sm font-bold text-foreground">{getSaveValue(key)}</p>
      </div>
    ))}
  </div>
</div>
```

Keep the Skills, Resources, Notes, and SpellSlots sections as-is below.

**Step 2: Verify**

```bash
npm run lint
```

**Step 3: Commit**

```bash
git add app/encounters/player/page.tsx
git commit -m "fix: replace prose ability score text with structured stat grid in reference panel"
```

---

## Task 9: Campaign Pulse tile radius + overall cleanup (Category D)

**Files:**
- Modify: `app/page.tsx`

**Context:** Campaign Pulse stat tiles use `rounded-xl` inline instead of `rounded-2xl` from the Panel spec.

**Step 1: Fix stat tile radius**

In `app/page.tsx`, the 4 stat tiles inside Campaign Pulse Card look like:
```tsx
<div className="rounded-xl border border-black/10 bg-surface-strong p-4">
```
Change `rounded-xl` → `rounded-2xl` for each of the 4 tiles.

Note: these 4 tiles do inline `bg-surface-strong p-4` which matches `Panel` closely. You may either use the `Panel` component or just fix the radius. If `Panel` takes `className` for content override, prefer using it. If it hardcodes its content structure, just fix `rounded-xl` → `rounded-2xl`.

**Step 2: Verify**

```bash
npm run lint
```

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "fix: use rounded-2xl on Campaign Pulse tiles to match Panel spec"
```

---

## Task 10: Final lint + visual smoke check

**Step 1: Run full lint and tests**

```bash
npm run lint && npm test
```
Expected: zero errors, all tests pass.

**Step 2: Start dev server and verify visually**

```bash
npm run dev
```

Walk through these pages and verify no visual regressions:
- `/` — Campaign Pulse tiles have consistent `rounded-2xl` radius
- `/pcs` — Party page: PcCard outer is `bg-surface` (lighter), inner StatBadge/AbilityBlock are `bg-surface-strong` (darker). No undefined CSS var warnings in console.
- `/encounters` (player/DM view) — Participant list column is wrapped in a container. Active row shows subtle warm tint, not heavy border-l-4 + ring. No "Active" pill in rows. Status bar shows 3 separated segments.
- `/campaigns` — Party member rows use `border-black/10`.
- Nav borders are consistent at `border-black/10`.

**Step 3: Commit**

If any small fixes are needed from visual check, fix them and commit:
```bash
git add -p
git commit -m "fix: visual polish from smoke check"
```

---

## Summary of Files Changed

| File | Categories |
|---|---|
| `app/globals.css` | I, J |
| `app/components/Nav.tsx` | A |
| `app/components/PcCard.tsx` | A (divider), C (name wrap), H (surface inversion) |
| `app/components/ParticipantAvatar.tsx` | (no changes needed — used correctly via className) |
| `app/page.tsx` | D (tile radius) |
| `app/pcs/page.tsx` | A (undefined vars), missing SectionTitle |
| `app/notes/page.tsx` | A (redundant bg-surface) |
| `app/campaigns/page.tsx` | A (border-black/5) |
| `app/encounters/player/page.tsx` | A (status bar + reference panel borders), B (list container), C (name truncation, last action), E (status bar segments), F (active pill removal), G (stat grid), J (active row restyling), K (2-zone layout) |
