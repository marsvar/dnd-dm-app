# Encounter Runner UI Polish — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish the DM encounter runner so that at a noisy table with 6 players, the three most critical actions (whose turn, advance turn, apply damage) are instant and unambiguous.

**Architecture:** All changes are confined to `app/encounters/player/page.tsx` and `app/globals.css`. No new event types are needed — all interactions already have event coverage. The work is visual hierarchy, auto-scroll behaviour, and adding a missing quick-note field.

**Tech Stack:** Next.js App Router, React hooks (`useRef`, `useEffect`), Tailwind CSS via design tokens, `cn()` from `ui.tsx`, `lucide-react` icons.

---

## Findings from audit

### What already exists (no new code needed)
- Active turn highlight: `border-l-4 border-accent bg-surface-strong ring-2 ring-[var(--ring)]` on the active row ✓
- Round counter + manual adjustment (+ / −) ✓
- Undo button + last-action summary text ✓
- Next / Prev turn buttons ✓
- Quick damage/heal input + ConditionPicker ✓
- Keyboard shortcuts N/P/Arrow ✓
- "Current" sidebar panel with active + up-next ✓

### Gaps — what the plan fixes

| # | Problem | Impact |
|---|---------|--------|
| 1 | "Next Turn" button is one of six buttons in a busy top row | DM hunts for the most-used button every time |
| 2 | Active participant may scroll off-screen in large encounters | DM loses context mid-combat |
| 3 | No quick-note input in quick actions panel | DM must scroll to the row to add a note; breaks flow |
| 4 | Combat status bar (Round / Active / Last) wraps unpredictably | Glance-readability degrades at mid widths |
| 5 | "Click row to target" discovery is low | Label text exists but is easy to miss |

---

## Task 1 — Prominent "Next Turn" button

**Goal:** Make "Next Turn" the visually dominant action in combat mode. DM should never hunt for it.

**Files:**
- Modify: `app/encounters/player/page.tsx` (lines ~534–565, the combat-mode controls row)

**Step 1: Locate the current Next button**

In `page.tsx`, the combat-mode buttons are rendered in this block (around line 534):
```tsx
<Button onClick={() => advanceEncounterTurn(selectedEncounter.id, 1)} ...>
  Next
</Button>
```
It is one of four buttons: `Back to prep`, `Start/Stop`, `Prev`, `Next`.

**Step 2: Replace the controls row with a two-tier layout**

Replace the existing `<div className="flex flex-wrap gap-2">` controls section with:

```tsx
{/* Combat controls — two-tier layout */}
<div className="flex flex-col gap-2">
  {/* Primary row: Prev | [NEXT TURN] | Stop */}
  <div className="flex items-center gap-2">
    <Button
      variant="outline"
      className="px-4 py-2 text-sm"
      onClick={() => advanceEncounterTurn(selectedEncounter.id, -1)}
      disabled={!selectedEncounter.isRunning || !orderedParticipants.length}
      aria-label="Previous turn"
    >
      ← Prev
    </Button>
    <Button
      className="flex-1 py-3 text-base font-bold tracking-wide"
      onClick={() => advanceEncounterTurn(selectedEncounter.id, 1)}
      disabled={!selectedEncounter.isRunning || !orderedParticipants.length}
      aria-label="Next turn (N)"
    >
      Next Turn ↵
    </Button>
    {selectedEncounter.isRunning ? (
      <Button
        variant="outline"
        className="px-4 py-2 text-sm"
        onClick={() => stopEncounter(selectedEncounter.id)}
      >
        Stop
      </Button>
    ) : (
      <Button
        variant="outline"
        className="px-4 py-2 text-sm"
        onClick={() => startEncounter(selectedEncounter.id)}
        disabled={!combatRequirementsMet}
      >
        Start
      </Button>
    )}
  </div>
  {/* Secondary row: Back to prep | End Encounter */}
  <div className="flex items-center gap-2">
    <Button
      variant="ghost"
      className="px-3 py-1 text-xs"
      onClick={() =>
        dispatchEncounterEvent(selectedEncounter.id, {
          t: "COMBAT_MODE_SET",
          mode: "prep",
        })
      }
    >
      ← Back to prep
    </Button>
    <Button
      variant="ghost"
      className="ml-auto px-3 py-1 text-xs"
      onClick={() => {
        setEndEncounterNotes("");
        setIsEndEncounterOpen(true);
      }}
      disabled={selectedEncounter.isRunning}
    >
      End Encounter
    </Button>
  </div>
</div>
```

**Step 3: Verify layout renders correctly**

Run `npm run dev` and open `/encounters/player`. In combat mode you should see a large "Next Turn ↵" button flanked by Prev / Stop, with Back to prep and End Encounter as secondary ghost actions below.

**Step 4: Run lint and tests**

```bash
npm run lint && npm test
```
Expected: zero lint errors, all tests pass (no logic changed).

**Step 5: Commit**

```bash
git add app/encounters/player/page.tsx
git commit -m "feat(encounter): promote Next Turn to primary CTA in combat controls"
```

---

## Task 2 — Auto-scroll active participant into view

**Goal:** When the active turn changes, the active participant row scrolls into view automatically.

**Files:**
- Modify: `app/encounters/player/page.tsx` (participant list section, ~lines 861–968)

**Step 1: Add a ref map for participant rows**

Near the top of the component (after the existing `useState` declarations, around line 46), add:

```tsx
const participantRowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
```

**Step 2: Attach refs to participant rows**

On the participant `<div key={participant.id} ...>` element (around line 863), add a `ref` callback:

```tsx
ref={(el) => {
  if (el) {
    participantRowRefs.current.set(participant.id, el);
  } else {
    participantRowRefs.current.delete(participant.id);
  }
}}
```

**Step 3: Add a scroll effect**

After the existing `useEffect` for keyboard shortcuts (~line 209), add:

```tsx
useEffect(() => {
  if (!selectedEncounter?.activeParticipantId) return;
  const el = participantRowRefs.current.get(selectedEncounter.activeParticipantId);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}, [selectedEncounter?.activeParticipantId]);
```

**Step 4: Test manually**

- Add 10+ participants to an encounter
- Start combat
- Press N repeatedly — the active row should stay visible even when it scrolls past the viewport

**Step 5: Run lint and tests**

```bash
npm run lint && npm test
```

**Step 6: Commit**

```bash
git add app/encounters/player/page.tsx
git commit -m "feat(encounter): auto-scroll active participant into view on turn advance"
```

---

## Task 3 — Quick note field in quick actions panel

**Goal:** Add an inline note textarea for the targeted participant in the quick actions panel, so DMs can jot combat notes without scrolling.

**Files:**
- Modify: `app/encounters/player/page.tsx` (quick actions panel, ~lines 696–803)

**Step 1: Find where to insert**

The quick actions panel ends with the ConditionPicker (around line 784) followed by "Add participant". Insert the note section between the ConditionPicker and the "Add participant" divider.

**Step 2: Add the note field**

```tsx
{/* Quick note for targeted participant */}
{effectiveTargetId && (
  <div className="mt-3 border-t border-black/10 pt-3">
    <p className="text-[0.65rem] uppercase tracking-[0.25em] text-muted">
      Notes
    </p>
    <Textarea
      className="mt-1 min-h-[3rem] resize-none text-xs"
      placeholder="Add a note for this participant…"
      value={
        selectedEncounter.participants.find(
          (p) => p.id === effectiveTargetId
        )?.notes ?? ""
      }
      onChange={(e) => {
        setNotes(effectiveTargetId, e.target.value);
      }}
    />
  </div>
)}
```

`Textarea` is already imported from `../../components/ui`. The `setNotes` helper already exists at line 277 — it dispatches a `NOTES_SET` event.

**Step 3: Verify `Textarea` is exported from ui.tsx**

```bash
grep -n "export.*Textarea" app/components/ui.tsx
```
Expected: a line like `export const Textarea = ...`

If it's not there, add it to `ui.tsx`:
```tsx
export const Textarea = ({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={cn(
      "w-full rounded-xl border border-black/10 bg-surface-strong px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--ring)]",
      className
    )}
    {...props}
  />
);
```

**Step 4: Test manually**

- Target a participant by clicking their row
- Quick actions panel should now show a "Notes" section
- Type in the box — the note should persist via event dispatch (Undo reverses it)

**Step 5: Run lint and tests**

```bash
npm run lint && npm test
```

**Step 6: Commit**

```bash
git add app/encounters/player/page.tsx app/components/ui.tsx
git commit -m "feat(encounter): add quick note field for targeted participant in combat panel"
```

---

## Task 4 — Combat status bar cleanup

**Goal:** Make Round / Active / Last action scannable at a glance. Fix the wrapping behaviour at mid-widths.

**Files:**
- Modify: `app/encounters/player/page.tsx` (status bar, ~lines 600–649)

**Step 1: Understand the current layout**

The status bar is one `flex-wrap` row containing: Round label + − + count + Undo | Active label + name | Last label + text | Keys hint. At ~900px viewport this collapses unpredictably.

**Step 2: Replace with a two-row structure**

Replace the current status bar div with:

```tsx
<div className="rounded-2xl border border-black/5 bg-surface-strong px-4 py-3 text-xs text-muted">
  {/* Row 1: Round controls + Undo */}
  <div className="flex flex-wrap items-center gap-3">
    <div className="flex items-center gap-2">
      <span className="text-[0.6rem] uppercase tracking-[0.2em]">Round</span>
      <Button
        variant="outline"
        className="h-6 w-6 p-0 text-xs"
        onClick={() => adjustRound(-1)}
        aria-label="Previous round"
      >
        −
      </Button>
      <span className="min-w-[1.5rem] text-center font-mono text-sm font-bold text-foreground">
        {selectedEncounter.round}
      </span>
      <Button
        variant="outline"
        className="h-6 w-6 p-0 text-xs"
        onClick={() => adjustRound(1)}
        aria-label="Next round"
      >
        +
      </Button>
    </div>
    <div className="mx-2 h-4 w-px bg-black/10" />
    <Button
      variant="outline"
      className="h-7 px-3 text-xs"
      onClick={() => undoEncounterEvent(selectedEncounter.id)}
      disabled={!selectedEncounter.eventLog.length}
    >
      Undo
    </Button>
    {lastEvent && (
      <span className="truncate text-xs text-muted">
        ↩ {formatEventSummary(lastEvent)}
      </span>
    )}
    {selectedEncounter.isRunning ? (
      <span className="ml-auto text-[0.6rem] uppercase tracking-[0.2em] text-muted">
        N / ← →
      </span>
    ) : null}
  </div>
  {/* Row 2: Active participant */}
  {activeParticipant && (
    <div className="mt-2 flex items-center gap-2">
      <span className="text-[0.6rem] uppercase tracking-[0.2em]">Active</span>
      <ParticipantAvatar
        name={activeParticipant.name}
        visual={activeParticipant.visual}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-black/10 bg-surface text-[0.5rem] font-semibold text-muted"
      />
      <span className="font-semibold text-foreground">{activeParticipant.name}</span>
      <Pill label={activeParticipant.kind.toUpperCase()} tone="neutral" />
    </div>
  )}
  {!selectedEncounter.isRunning && !combatRequirementsMet ? (
    <p className="mt-2 text-xs text-muted">{combatRequirementsMessage}</p>
  ) : null}
</div>
```

**Step 3: Test at multiple widths**

Check the status bar at 375px (mobile), 768px (tablet), 1280px (desktop). All rows should be legible and non-wrapping at useful widths.

**Step 4: Run lint and tests**

```bash
npm run lint && npm test
```

**Step 5: Commit**

```bash
git add app/encounters/player/page.tsx
git commit -m "feat(encounter): clean up combat status bar into two-row scannable layout"
```

---

## Task 5 — Target row discovery hint

**Goal:** Make it unambiguous that participants are clickable targets in combat mode.

**Files:**
- Modify: `app/encounters/player/page.tsx` (participant list header, ~line 861)

**Step 1: Add a header above the participant list**

Before the `orderedParticipants.map(...)` loop, add:

```tsx
{combatMode && selectedEncounter.isRunning && (
  <p className="text-[0.6rem] uppercase tracking-[0.2em] text-muted">
    Initiative order — click to target
  </p>
)}
```

**Step 2: Verify the targeted row gets a distinct border**

The current targeted-row class is `targeted-outline` (set in globals.css). Verify it applies a visible border:

```bash
grep -n "targeted-outline" app/globals.css
```

If the rule is missing or too subtle, add/update in `app/globals.css`:

```css
.targeted-outline {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}
```

**Step 3: Test manually**

- Enter combat mode
- Click a participant row → accent outline appears on that row + target name shows in quick actions
- Clicking Clear in quick actions → outline disappears

**Step 4: Run lint and tests**

```bash
npm run lint && npm test
```

**Step 5: Commit**

```bash
git add app/encounters/player/page.tsx app/globals.css
git commit -m "feat(encounter): add target discovery hint and strengthen targeted-outline style"
```

---

## Final verification

After all tasks are committed:

```bash
npm run build && npm test
```

Expected: clean build, no TypeScript errors, all tests pass.

Manual smoke test checklist:
- [ ] Start combat with 6 participants
- [ ] "Next Turn ↵" button is visually dominant
- [ ] Pressing N advances turn; active row scrolls into view
- [ ] Clicking a row targets it; damage, heal, condition, note all work
- [ ] Undo reverses last action; status bar updates immediately
- [ ] Status bar shows Round, Active participant, and last action cleanly
- [ ] "Click to target" hint is visible above initiative order

---

## Execution options

**1. Subagent-Driven (this session)** — fresh subagent per task, code review between tasks
**2. Parallel Session (separate)** — open new session with `superpowers:executing-plans`
