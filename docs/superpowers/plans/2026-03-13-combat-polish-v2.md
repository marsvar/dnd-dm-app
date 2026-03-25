# Combat Polish v2 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver three independent tracks of DM-experience improvements: app shell polish (nav, combat pill, resume card), encounter builder enhancements (initiative roller, completion ceremony), and combat runtime improvements (row redesign, quick damage/heal, stat block reference, condition tooltips, keyboard shortcuts).

**Architecture:** Three independent tracks executed sequentially; each track has zero dependencies on the others except for shared CSS tokens defined in pre-work. All combat mutations continue to use the existing event engine — no new event types needed. Three new Radix UI primitives (Tooltip, Popover) and `react-hotkeys-hook` are added following the established Radix pattern in `ui.tsx`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS v4, Radix UI, Zustand-like custom store (`appStore.tsx`), `react-hotkeys-hook@^4`, `@radix-ui/react-tooltip`, `@radix-ui/react-popover`

**Spec:** `docs/superpowers/specs/2026-03-13-combat-polish-v2-design.md`

**Run commands with:** `/Users/msvarlia/.volta/bin/npm` (standard `npm` may not be in PATH)

---

## File Map

### Modified
| File | What changes |
|---|---|
| `app/globals.css` | Add 6 new CSS tokens + dark-mode variants |
| `app/components/Nav.tsx` | Two-tier DM nav links, active states |
| `app/layout.tsx` | Render `<CombatActivePill>` inside the DM layout |
| `app/page.tsx` | Resume last session card in Command Deck |
| `app/encounters/builder/page.tsx` | "Roll Monster Initiative" button |
| `app/encounters/player/page.tsx` | Completion ceremony trigger, row redesign, QuickActionPopover, keyboard shortcuts |
| `app/lib/store/appStore.tsx` | Wrap return with `<TooltipProvider>` |
| `app/lib/data/srd.ts` | Add `SRD_CONDITION_DESCRIPTIONS` record |
| `app/components/ui.tsx` | Add `Tooltip*` and `Popover*` exports; update `ConditionChip` |

### Created
| File | What it is |
|---|---|
| `app/components/CombatActivePill.tsx` | Fixed floating pill shown when encounter is running |
| `app/components/EncounterCompleteDialog.tsx` | Post-encounter summary modal |
| `app/components/MonsterStatBlockDialog.tsx` | Read-only monster stat block overlay |
| `app/components/QuickActionPopover.tsx` | Damage / heal number input popover |

---

## Chunk 1: Pre-work + Track 1 (App Shell)

### Task 1: Install packages and add CSS tokens

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Install the three new packages**

```bash
/Users/msvarlia/.volta/bin/npm install @radix-ui/react-tooltip @radix-ui/react-popover react-hotkeys-hook@^4
```

Expected: packages added to `node_modules` and `package.json`. No peer dependency errors.

- [ ] **Step 2: Add combat-active tokens to `globals.css`**

In the `:root` block (after the `--condition-fg` line), add:

```css
  /* Combat active state */
  --combat-active-bg: #7b1d1d;
  --combat-active-fg: #ffffff;

  /* Quick action buttons */
  --btn-damage-bg: #fcd8d8;
  --btn-damage-fg: #7b1d1d;
  --btn-heal-bg: #d4f0da;
  --btn-heal-fg: #2d7a3a;
```

- [ ] **Step 3: Add dark-mode overrides to `globals.css`**

Inside the existing `@media (prefers-color-scheme: dark) { :root { ... } }` block (after `--condition-fg`), add:

```css
    /* Combat active state (dark) */
    --combat-active-bg: #991b1b;
    --combat-active-fg: #fef2f2;

    /* Quick action buttons (dark) */
    --btn-damage-bg: #3a1515;
    --btn-damage-fg: #e87070;
    --btn-heal-bg: #1a3d23;
    --btn-heal-fg: #6fcf8a;
```

- [ ] **Step 4: Verify lint passes**

```bash
/Users/msvarlia/.volta/bin/npm run lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css package.json package-lock.json
git commit -m "feat: install new deps and add CSS tokens for combat polish v2"
```

---

### Task 2: Nav restructure

**Files:**
- Modify: `app/components/Nav.tsx`

The current nav has a flat `dmLinks` array with 9 items. We split it into `primaryLinks` (Encounters, Party — filled pill treatment) and `secondaryLinks` (Bestiary, Campaigns, Notes, Log — plain muted text). Dashboard, Builder, and Run Combat are removed from the top-level links: Dashboard is accessible via the wordmark; Builder and Run Combat are sub-pages of Encounters (the `isActivePath("/encounters")` check already covers them since their paths start with `/encounters/`).

- [ ] **Step 1: Replace `dmLinks` with two arrays**

At the top of `Nav.tsx`, replace the existing `dmLinks` array:

```ts
const primaryLinks = [
  { href: "/encounters", label: "Encounters" },
  { href: "/pcs", label: "Party" },
];

const secondaryLinks = [
  { href: "/bestiary", label: "Bestiary" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/notes", label: "Notes" },
  { href: "/log", label: "Log" },
];
```

- [ ] **Step 2: Replace the desktop DM nav JSX**

Find the block `{/* Desktop nav — DM only */}` and replace the inner `<nav>` contents with:

```tsx
{activeRole === "dm" && (
  <nav className="hidden items-center gap-2 text-sm md:flex">
    {/* Primary links — filled pill */}
    {primaryLinks.map((link) => (
      <Link
        key={link.href}
        href={link.href}
        aria-current={isActivePath(link.href) ? "page" : undefined}
        className={cn(
          "rounded-full px-3.5 py-1.5 font-semibold transition-colors",
          isActivePath(link.href)
            ? "bg-foreground text-background ring-2 ring-accent/40"
            : "bg-foreground/10 text-foreground hover:bg-foreground/15"
        )}
      >
        {link.label}
      </Link>
    ))}
    {/* Divider */}
    <span className="mx-1 h-5 w-px bg-black/10" aria-hidden />
    {/* Secondary links — plain text */}
    {secondaryLinks.map((link) => (
      <Link
        key={link.href}
        href={link.href}
        aria-current={isActivePath(link.href) ? "page" : undefined}
        className={cn(
          "px-2 py-1 text-xs transition-colors hover:text-accent",
          isActivePath(link.href)
            ? "text-accent underline underline-offset-4 decoration-accent/50"
            : "text-muted"
        )}
      >
        {link.label}
      </Link>
    ))}
    {/* Player link + auth buttons */}
    {dmUserId && (
      <button
        type="button"
        onClick={handleCopyPlayerLink}
        className="ml-1 flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
        title="Copy player join link"
      >
        <Link2 size={13} />
        {playerLinkCopied ? "Copied!" : "Player Link"}
      </button>
    )}
    <button
      type="button"
      onClick={handleSwitchRole}
      className="flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
    >
      <LogOut size={13} />
      Switch Role
    </button>
    <button
      type="button"
      onClick={handleSignOut}
      className="flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
    >
      <LogOut size={13} />
      {displayName ?? "Sign out"}
    </button>
  </nav>
)}
```

- [ ] **Step 3: Update mobile dropdown**

Find the `{/* Mobile dropdown — DM only */}` block. Replace the `{dmLinks.map(...)}` inside it with two separate sections:

```tsx
{open && activeRole === "dm" && (
  <nav className="border-t border-black/5 bg-surface px-6 pb-4 pt-3 md:hidden">
    <ul className="flex flex-col gap-1">
      {/* Primary links */}
      {primaryLinks.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            onClick={() => setOpen(false)}
            aria-current={isActivePath(link.href) ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-strong hover:text-foreground",
              isActivePath(link.href)
                ? "bg-surface-strong text-accent"
                : "text-foreground"
            )}
          >
            {link.label}
          </Link>
        </li>
      ))}
      {/* Visual separator */}
      <li className="my-1 border-t border-black/5" aria-hidden />
      {/* Secondary links */}
      {secondaryLinks.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            onClick={() => setOpen(false)}
            aria-current={isActivePath(link.href) ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-surface-strong hover:text-foreground",
              isActivePath(link.href)
                ? "bg-surface-strong text-accent font-semibold"
                : "text-muted"
            )}
          >
            {link.label}
          </Link>
        </li>
      ))}
      <li className="mt-2 border-t border-black/5 pt-2">
        {dmUserId && (
          <button
            type="button"
            onClick={() => { setOpen(false); handleCopyPlayerLink(); }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-strong hover:text-foreground"
          >
            <Link2 size={15} />
            {playerLinkCopied ? "Copied!" : "Copy Player Link"}
          </button>
        )}
        <button
          type="button"
          onClick={() => { setOpen(false); handleSwitchRole(); }}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-surface-strong hover:text-foreground"
        >
          <Swords size={15} />
          Switch Role
        </button>
      </li>
    </ul>
  </nav>
)}
```

- [ ] **Step 4: Verify lint passes**

```bash
/Users/msvarlia/.volta/bin/npm run lint
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add app/components/Nav.tsx
git commit -m "feat(nav): two-tier DM nav with primary/secondary link groups"
```

---

### Task 3: CombatActivePill

**Files:**
- Create: `app/components/CombatActivePill.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `CombatActivePill.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useAppStore } from "../lib/store/appStore";

export const CombatActivePill = () => {
  const { state } = useAppStore();

  const runningEncounter = state.encounters.find((e) => e.isRunning) ?? null;
  if (!runningEncounter) return null;

  const activeParticipant = runningEncounter.participants.find(
    (p) => p.id === runningEncounter.activeParticipantId
  );

  return (
    <Link
      href="/encounters/builder"
      className="fixed bottom-20 right-6 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg transition-opacity hover:opacity-90 sm:bottom-6"
      style={{
        backgroundColor: "var(--combat-active-bg)",
        color: "var(--combat-active-fg)",
      }}
      aria-label="Return to active combat"
    >
      <span
        className="h-2 w-2 animate-pulse rounded-full"
        style={{ backgroundColor: "var(--combat-active-fg)", opacity: 0.8 }}
        aria-hidden
      />
      <span>
        ⚔ Round {runningEncounter.round}
        {activeParticipant ? ` · ${activeParticipant.name}` : ""}
      </span>
    </Link>
  );
};
```

- [ ] **Step 2: Render `CombatActivePill` in `app/layout.tsx`**

Add the import at the top of `layout.tsx`:

```ts
import { CombatActivePill } from "./components/CombatActivePill";
```

Inside the `<AppStoreProvider>` block, add `<CombatActivePill />` as a sibling after `<main>`:

```tsx
<AppStoreProvider>
  <RoleStoreProvider>
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10 sm:px-8">
        <DmLayoutGuard>{children}</DmLayoutGuard>
      </main>
    </div>
    <CombatActivePill />
  </RoleStoreProvider>
</AppStoreProvider>
```

- [ ] **Step 3: Verify lint passes**

```bash
/Users/msvarlia/.volta/bin/npm run lint
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/components/CombatActivePill.tsx app/layout.tsx
git commit -m "feat: add CombatActivePill floating indicator for active encounters"
```

---

### Task 4: Resume last session card on home page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add resume card logic to `app/page.tsx`**

Add the import for `LinkButton` (already imported) and add the resume card. At the top of the `Home` component body, add:

```tsx
const activeEncounter = useMemo(
  () => state.encounters.find((e) => e.status !== "completed") ?? null,
  [state.encounters]
);
```

Add `useMemo` to the existing import from `react`:
```ts
import { useMemo } from "react";
```

- [ ] **Step 2: Insert the resume card into the Command Deck grid**

Find the Command Deck `<div className="grid gap-4 md:grid-cols-2">` block. Add the resume card as the **first child**, conditionally rendered:

```tsx
<div className="grid gap-4 md:grid-cols-2">
  {activeEncounter && (
    <div
      className="md:col-span-2 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
      style={{
        backgroundColor: "var(--combat-active-bg)",
        color: "var(--combat-active-fg)",
      }}
    >
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.2em] opacity-70 mb-1">
          {activeEncounter.isRunning ? "Combat in progress" : "Encounter paused"}
        </p>
        <p className="text-lg font-semibold truncate">{activeEncounter.name}</p>
        <p className="text-sm opacity-75 mt-0.5">
          Round {activeEncounter.round}
          {activeEncounter.participants.length > 0
            ? ` · ${activeEncounter.participants.length} combatants`
            : ""}
        </p>
      </div>
      <LinkButton
        href="/encounters/builder"
        variant="outline"
        className="shrink-0 border-white/30 text-white hover:border-white hover:text-white"
      >
        Resume →
      </LinkButton>
    </div>
  )}
  {/* Keep all existing Command Deck <Card> children below — do not remove them */}
```

- [ ] **Step 3: Verify lint passes**

```bash
/Users/msvarlia/.volta/bin/npm run lint
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat(home): add resume last session card to Command Deck"
```

---

## Chunk 2: Track 2 (Encounter Builder)

### Task 5: Roll Monster Initiative

**Files:**
- Modify: `app/encounters/builder/page.tsx`

The encounter builder already has a `dispatchEncounterEvent` call pattern. The initiative roll button goes in the encounter controls bar alongside "Start Combat". We dispatch `INITIATIVE_SET` events in a loop — React 18 batches them automatically.

- [ ] **Step 1: Add the roll initiative handler inside `EncounterBuilderPage`**

Find where `dispatchEncounterEvent` is called in the file and add this handler alongside the existing ones:

```ts
const handleRollMonsterInitiative = useCallback(() => {
  if (!selectedEncounter) return;
  selectedEncounter.participants.forEach((participant) => {
    if (participant.kind === "pc") return;
    const monster = participant.refId ? monstersById.get(participant.refId) : undefined;
    const dex = monster?.abilities?.dex ?? 10;
    const dexMod = Math.floor((dex - 10) / 2);
    const roll = Math.floor(Math.random() * 20) + 1 + dexMod;
    dispatchEncounterEvent(selectedEncounter.id, {
      t: "INITIATIVE_SET",
      participantId: participant.id,
      value: roll,
    });
  });
}, [selectedEncounter, monstersById, dispatchEncounterEvent]);
```

Make sure `useCallback` is in the imports from `react` (it already is).

- [ ] **Step 2: Add the "Roll Monster Initiative" button to the controls bar**

Find the "Start Combat" button area. Add the roll button alongside it (only visible in prep mode with participants):

```tsx
{selectedEncounter && !builderLocked && selectedEncounter.participants.length > 0 && (
  <Button variant="outline" onClick={handleRollMonsterInitiative}>
    Roll Monster Initiative
  </Button>
)}
```

Place this directly before or after the existing "Start Combat" button, inside the same flex container.

- [ ] **Step 3: Verify lint passes**

```bash
/Users/msvarlia/.volta/bin/npm run lint
```

Expected: 0 errors.

- [ ] **Step 4: Run existing tests to confirm nothing broken**

```bash
/Users/msvarlia/.volta/bin/npm test -- --passWithNoTests
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/encounters/builder/page.tsx
git commit -m "feat(builder): add Roll Monster Initiative button"
```

---

### Task 6: EncounterCompleteDialog component

**Files:**
- Create: `app/components/EncounterCompleteDialog.tsx`

This is a self-contained dialog. It receives an `Encounter` snapshot and the `monstersById` map as props so it can compute XP without touching live state.

- [ ] **Step 1: Create `EncounterCompleteDialog.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  Textarea,
} from "./ui";
import { ParticipantAvatar } from "./ParticipantAvatar";
import { getChallengeXp } from "../lib/engine/selectors";
import type { Encounter, Monster } from "../lib/models/types";
import { useAppStore } from "../lib/store/appStore";

interface Props {
  encounter: Encounter;
  monstersById: Map<string, Monster>;
  open: boolean;
  onClose: () => void;
}

export const EncounterCompleteDialog = ({
  encounter,
  monstersById,
  open,
  onClose,
}: Props) => {
  const { addLogEntry } = useAppStore();
  const router = useRouter();
  const [note, setNote] = useState("");

  const defeatedMonsters = useMemo(
    () =>
      encounter.participants.filter(
        (p) => p.kind === "monster" && (p.currentHp ?? 1) <= 0
      ),
    [encounter.participants]
  );

  const totalXp = useMemo(
    () =>
      defeatedMonsters.reduce((sum, p) => {
        const monster = p.refId ? monstersById.get(p.refId) : undefined;
        const challenge = monster?.challenge;
        return sum + (challenge ? getChallengeXp(challenge) : 0);
      }, 0),
    [defeatedMonsters, monstersById]
  );

  const pcParticipants = useMemo(
    () => encounter.participants.filter((p) => p.kind === "pc"),
    [encounter.participants]
  );

  const xpPerPc = pcParticipants.length > 0
    ? Math.floor(totalXp / pcParticipants.length)
    : 0;

  const hpColor = (current: number, max: number): string => {
    if (max <= 0 || current <= 0) return "var(--hp-zero)";
    const pct = current / max;
    if (pct <= 0.25) return "var(--hp-low)";
    if (pct <= 0.74) return "var(--hp-mid)";
    return "var(--hp-full)";
  };

  const handleDone = () => {
    if (note.trim()) {
      addLogEntry({
        text: note.trim(),
        source: "manual",
        ...(encounter.campaignId ? { campaignId: encounter.campaignId } : {}),
      });
    }
    setNote("");
    onClose();
  };

  const handleViewLog = () => {
    handleDone();
    router.push("/log");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent maxWidth="md">
        <div className="flex items-start justify-between gap-4 mb-1">
          <DialogTitle className="text-xl">
            {encounter.name} — Complete
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" className="shrink-0 -mt-1">✕ Close</Button>
          </DialogClose>
        </div>
        <p className="text-sm text-muted mb-4">
          {encounter.round} round{encounter.round !== 1 ? "s" : ""} ·{" "}
          {defeatedMonsters.length} defeated
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Rounds", value: encounter.round },
            { label: "Defeated", value: defeatedMonsters.length },
            { label: "Total XP", value: totalXp.toLocaleString() },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl bg-surface-strong p-3 text-center"
            >
              <p className="font-mono text-2xl font-semibold text-foreground">
                {value}
              </p>
              <p className="text-xs uppercase tracking-[0.15em] text-muted mt-1">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Party table */}
        {pcParticipants.length > 0 && (
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted mb-3">
              Party summary
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.12em] text-muted px-1">
                <span className="w-7 flex-shrink-0" />
                <span className="flex-1">Name</span>
                <span className="w-16 text-left">Final HP</span>
                <span className="w-16 text-right">XP</span>
              </div>
              {pcParticipants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl bg-surface-strong px-3 py-2"
                >
                  <ParticipantAvatar participant={p} size="sm" />
                  <span className="flex-1 min-w-0 text-sm font-medium truncate">
                    {p.name}
                  </span>
                  <span
                    className="w-16 text-left font-mono text-sm font-semibold"
                    style={{ color: hpColor(p.currentHp ?? 0, p.maxHp ?? 0) }}
                  >
                    {p.currentHp} / {p.maxHp}
                  </span>
                  <span className="w-16 text-right font-mono text-sm font-semibold text-foreground">
                    +{xpPerPc} XP
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Note */}
        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted mb-2">
            Session note (optional)
          </p>
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note about this encounter…"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleViewLog}>
            View log
          </Button>
          <Button onClick={handleDone}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 2: Verify lint passes**

```bash
/Users/msvarlia/.volta/bin/npm run lint
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/EncounterCompleteDialog.tsx
git commit -m "feat: add EncounterCompleteDialog component"
```

---

### Task 7: Wire up completion ceremony in encounter runner

**Files:**
- Modify: `app/encounters/player/page.tsx`

The encounter runner already has an "End Encounter" / `ENCOUNTER_COMPLETED` dispatch. We intercept it: capture a snapshot first, then dispatch, then show the dialog.

- [ ] **Step 1: Add imports to `app/encounters/player/page.tsx`**

Add these imports near the top of the file:

```ts
import { EncounterCompleteDialog } from "../../components/EncounterCompleteDialog";
```

- [ ] **Step 2: Add local state for the completion snapshot**

Inside the component body, add:

```ts
const [completedEncounterSnapshot, setCompletedEncounterSnapshot] =
  useState<typeof selectedEncounter | null>(null);
```

Make sure `useState` is already imported (it is).

- [ ] **Step 3: Replace the existing "End Encounter" handler and remove the old notes UI**

The existing "End Encounter" button's `onClick` (around line 1624) dispatches `ENCOUNTER_COMPLETED` with a `notes` field drawn from `endEncounterNotes` state. The new `EncounterCompleteDialog` handles notes internally via `addLogEntry`, so the old mechanism is replaced entirely.

**3a.** Delete the `endEncounterNotes` state declaration (line ~48):
```ts
// DELETE this line:
const [endEncounterNotes, setEndEncounterNotes] = useState("");
```

**3b.** Inside the existing "End Encounter" dialog's "Complete Encounter" `onClick`, replace the full onClick with:
```ts
onClick={() => {
  setCompletedEncounterSnapshot(selectedEncounter);
  dispatchEncounterEvent(selectedEncounter.id, { t: "ENCOUNTER_COMPLETED" });
  setIsEndEncounterOpen(false);
}}
```

**3c.** Remove the notes `<textarea>` block from the existing End Encounter dialog — the entire `<div className="space-y-1">` that contains the `endEncounterNotes` textarea. The `EncounterCompleteDialog` handles session notes now.

**3d.** Remove `setEndEncounterNotes("")` call from anywhere it appears (it's safe to delete after removing the state).

- [ ] **Step 4: Render the dialog**

At the bottom of the component's JSX return (before the closing `</PageShell>` or equivalent), add:

```tsx
{completedEncounterSnapshot && (
  <EncounterCompleteDialog
    encounter={completedEncounterSnapshot}
    monstersById={monstersById}
    open={!!completedEncounterSnapshot}
    onClose={() => setCompletedEncounterSnapshot(null)}
  />
)}
```

The `monstersById` map is already computed in this file as a `useMemo`. If it isn't accessible at this level, compute it: `const monstersById = useMemo(() => new Map(state.monsters.map((m) => [m.id, m])), [state.monsters]);`

- [ ] **Step 5: Verify lint passes**

```bash
/Users/msvarlia/.volta/bin/npm run lint
```

Expected: 0 errors.

- [ ] **Step 6: Run existing tests**

```bash
/Users/msvarlia/.volta/bin/npm test -- --passWithNoTests
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add app/encounters/player/page.tsx
git commit -m "feat(encounter): wire up encounter completion ceremony dialog"
```

---

## Chunk 3: Track 3 (Combat Runtime)

### Task 8: Tooltip and Popover primitives in `ui.tsx` + `TooltipProvider` in `appStore.tsx`

**Files:**
- Modify: `app/components/ui.tsx`
- Modify: `app/lib/store/appStore.tsx`

- [ ] **Step 1: Add Radix Tooltip imports and exports to `ui.tsx`**

Add at the top of `ui.tsx` (alongside existing Radix imports):

```ts
import * as RadixTooltip from "@radix-ui/react-tooltip";
import * as RadixPopover from "@radix-ui/react-popover";
```

Then add the following exports at the bottom of `ui.tsx`:

```tsx
// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------
export const TooltipProvider = RadixTooltip.Provider;
export const Tooltip = RadixTooltip.Root;
export const TooltipTrigger = RadixTooltip.Trigger;

export const TooltipContent = ({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixTooltip.Content>) => (
  <RadixTooltip.Portal>
    <RadixTooltip.Content
      sideOffset={sideOffset}
      className={cn(
        "z-50 max-w-xs rounded-xl border border-black/10 bg-surface px-3 py-2 text-xs text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.1)]",
        className
      )}
      {...props}
    />
  </RadixTooltip.Portal>
);

// ---------------------------------------------------------------------------
// Popover
// ---------------------------------------------------------------------------
export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;
export const PopoverAnchor = RadixPopover.Anchor;

export const PopoverContent = ({
  className,
  align = "end",
  sideOffset = 6,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixPopover.Content>) => (
  <RadixPopover.Portal>
    <RadixPopover.Content
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-64 rounded-2xl border border-black/10 bg-surface p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)] outline-none",
        className
      )}
      {...props}
    />
  </RadixPopover.Portal>
);
```

Also add `React` to the imports if not already present — add `import React from "react";` or check for `ComponentPropsWithoutRef` in the existing import block. The file already imports `ComponentPropsWithoutRef` from `"react"`, so just add it to that import line.

- [ ] **Step 2: Wrap `AppStoreProvider` return with `TooltipProvider`**

In `app/lib/store/appStore.tsx`, find the return line of `AppStoreProvider`:

```tsx
return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
```

Change it to:

```tsx
return (
  <TooltipProvider delayDuration={300}>
    <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
  </TooltipProvider>
);
```

Add the import at the top of `appStore.tsx`:

```ts
import { TooltipProvider } from "../../components/ui";
```

- [ ] **Step 3: Verify lint passes**

```bash
/Users/msvarlia/.volta/bin/npm run lint
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/components/ui.tsx app/lib/store/appStore.tsx
git commit -m "feat(ui): add Tooltip and Popover primitives; wrap app with TooltipProvider"
```

---

### Task 9: SRD condition descriptions + ConditionChip tooltip

**Files:**
- Modify: `app/lib/data/srd.ts`
- Modify: `app/components/ui.tsx`

- [ ] **Step 1: Add `SRD_CONDITION_DESCRIPTIONS` to `srd.ts`**

In `app/lib/data/srd.ts`, add this record directly after the `SRD_CONDITIONS` array (line ~902):

```ts
export const SRD_CONDITION_DESCRIPTIONS: Record<string, string> = {
  Blinded: "A blinded creature can't see and automatically fails any ability check requiring sight. Attack rolls against it have advantage; its attack rolls have disadvantage.",
  Charmed: "A charmed creature can't attack the charmer or target them with harmful abilities. The charmer has advantage on social checks against the creature.",
  Deafened: "A deafened creature can't hear and automatically fails any ability check requiring hearing.",
  Exhaustion: "Exhaustion has six levels. Each level imposes cumulative penalties; at level 6 the creature dies.",
  Frightened: "A frightened creature has disadvantage on ability checks and attack rolls while it can see the source of its fear. It can't willingly move closer to the source.",
  Grappled: "A grappled creature's speed becomes 0. The condition ends if the grappler is incapacitated or the creature is moved out of reach.",
  Incapacitated: "An incapacitated creature can't take actions or reactions.",
  Invisible: "An invisible creature is impossible to see without special senses. It has advantage on attack rolls; attack rolls against it have disadvantage.",
  Paralyzed: "A paralyzed creature is incapacitated and can't move or speak. Attack rolls against it have advantage; hits within 5 ft. are critical hits.",
  Petrified: "A petrified creature is transformed into stone. It is incapacitated, has resistance to all damage, and is immune to poison and disease.",
  Poisoned: "A poisoned creature has disadvantage on attack rolls and ability checks.",
  Prone: "A prone creature can only crawl. It has disadvantage on attack rolls. Melee attacks against it have advantage; ranged attacks have disadvantage.",
  Restrained: "A restrained creature's speed is 0. It has disadvantage on attack rolls and Dex saves; attacks against it have advantage.",
  Stunned: "A stunned creature is incapacitated, can't move, and can only speak falteringly. Attack rolls against it have advantage.",
  Unconscious: "An unconscious creature is incapacitated, can't move or speak, and drops held items. Attack rolls against it have advantage; hits within 5 ft. are critical hits.",
};
```

- [ ] **Step 2: Update `ConditionChip` in `ui.tsx` to show tooltips**

Add the `SRD_CONDITION_DESCRIPTIONS` import at the top of `ui.tsx`:

```ts
import { SRD_CONDITION_DESCRIPTIONS } from "../lib/data/srd";
```

Replace the existing `ConditionChip` component with:

```tsx
export const ConditionChip = ({
  label,
  onRemove,
}: {
  label: string;
  onRemove?: () => void;
}) => {
  const description = SRD_CONDITION_DESCRIPTIONS[label];

  const chip = (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: "var(--condition-bg)", color: "var(--condition-fg)" }}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove condition ${label}`}
          className="-mr-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full opacity-60 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
        >
          <X size={10} strokeWidth={2.5} />
        </button>
      )}
    </span>
  );

  if (!description) return chip;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent>{description}</TooltipContent>
    </Tooltip>
  );
};
```

- [ ] **Step 3: Verify lint passes**

```bash
/Users/msvarlia/.volta/bin/npm run lint
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/lib/data/srd.ts app/components/ui.tsx
git commit -m "feat(conditions): add SRD condition descriptions with tooltip on ConditionChip"
```

---

### Task 10: MonsterStatBlockDialog

**Files:**
- Create: `app/components/MonsterStatBlockDialog.tsx`

- [ ] **Step 1: Create `MonsterStatBlockDialog.tsx`**

```tsx
"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  Button,
} from "./ui";
import type { Monster } from "../lib/models/types";

const abilityNames = ["str", "dex", "con", "int", "wis", "cha"] as const;
const abilityLabels: Record<typeof abilityNames[number], string> = {
  str: "STR", dex: "DEX", con: "CON", int: "INT", wis: "WIS", cha: "CHA",
};

const modifier = (score: number) => {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
};

interface Props {
  monster: Monster | null;
  open: boolean;
  onClose: () => void;
}

export const MonsterStatBlockDialog = ({ monster, open, onClose }: Props) => {
  if (!monster) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent maxWidth="2xl">
        <div className="flex items-start justify-between gap-4 mb-1">
          <DialogTitle className="text-2xl">{monster.name}</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" className="shrink-0 -mt-1">✕ Close</Button>
          </DialogClose>
        </div>

        <p className="text-sm text-muted mb-4 italic">
          {monster.size} {monster.type} · CR {monster.challenge}
        </p>

        {/* Core stats */}
        <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
          <div className="rounded-xl bg-surface-strong p-3">
            <p className="text-xs uppercase tracking-[0.15em] text-muted">AC</p>
            <p className="font-mono text-lg font-semibold">{monster.ac}</p>
          </div>
          <div className="rounded-xl bg-surface-strong p-3">
            <p className="text-xs uppercase tracking-[0.15em] text-muted">HP</p>
            <p className="font-mono text-lg font-semibold">{monster.hp}</p>
          </div>
          <div className="rounded-xl bg-surface-strong p-3">
            <p className="text-xs uppercase tracking-[0.15em] text-muted">Speed</p>
            <p className="font-mono text-lg font-semibold">{monster.speed}</p>
          </div>
        </div>

        {/* Ability scores */}
        <div className="grid grid-cols-6 gap-2 mb-4">
          {abilityNames.map((key) => (
            <div key={key} className="rounded-xl bg-surface-strong p-2 text-center">
              <p className="text-[0.6rem] uppercase tracking-[0.15em] text-muted">
                {abilityLabels[key]}
              </p>
              <p className="font-mono text-sm font-semibold text-foreground">
                {monster.abilities[key]}
              </p>
              <p className="font-mono text-xs text-muted">
                {modifier(monster.abilities[key])}
              </p>
            </div>
          ))}
        </div>

        {/* Senses / languages */}
        {(monster.senses || monster.languages) && (
          <div className="mb-4 text-sm text-muted space-y-1">
            {monster.senses && <p><span className="font-semibold text-foreground">Senses</span> {monster.senses}</p>}
            {monster.languages && <p><span className="font-semibold text-foreground">Languages</span> {monster.languages}</p>}
          </div>
        )}

        {/* Traits */}
        {monster.traits && monster.traits.length > 0 && (
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted mb-2">Traits</p>
            <div className="space-y-2">
              {monster.traits.map((trait, i) => (
                <p key={i} className="text-sm text-foreground whitespace-pre-line">{trait}</p>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {monster.actions && monster.actions.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted mb-2">Actions</p>
            <div className="space-y-2">
              {monster.actions.map((action, i) => (
                <p key={i} className="text-sm text-foreground whitespace-pre-line">{action}</p>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 2: Verify lint passes**

```bash
/Users/msvarlia/.volta/bin/npm run lint
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/MonsterStatBlockDialog.tsx
git commit -m "feat: add MonsterStatBlockDialog read-only stat block overlay"
```

---

### Task 11: QuickActionPopover component

**Files:**
- Create: `app/components/QuickActionPopover.tsx`

- [ ] **Step 1: Create `QuickActionPopover.tsx`**

```tsx
"use client";

import { useRef } from "react";
import { Button, Input, Popover, PopoverContent, PopoverTrigger } from "./ui";

interface Props {
  mode: "damage" | "heal";
  participantName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (value: number) => void;
  children: React.ReactNode; // the trigger button
}

export const QuickActionPopover = ({
  mode,
  participantName,
  open,
  onOpenChange,
  onApply,
  children,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleApply = () => {
    const raw = inputRef.current?.value ?? "0";
    const value = Math.max(0, parseInt(raw, 10) || 0);
    if (value === 0) return;
    onApply(value);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-56"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <p className="text-xs uppercase tracking-[0.2em] text-muted mb-3">
          {mode === "damage" ? "Apply damage to" : "Heal"} {participantName}
        </p>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            type="number"
            min="0"
            placeholder="0"
            className="text-center font-mono text-lg font-semibold"
            onKeyDown={handleKeyDown}
          />
          <Button onClick={handleApply} className="shrink-0 px-4">
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
```

- [ ] **Step 2: Verify lint passes**

```bash
/Users/msvarlia/.volta/bin/npm run lint
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/QuickActionPopover.tsx
git commit -m "feat: add QuickActionPopover for damage/heal input"
```

---

### Task 12: Participant row redesign + keyboard shortcuts

**Files:**
- Modify: `app/encounters/player/page.tsx`

This is the most complex task. We add `openPopoverId` state, import new components, redesign participant rows, and wire up keyboard shortcuts. Work through it in sub-steps.

- [ ] **Step 1: Add imports to `app/encounters/player/page.tsx`**

Add these at the top:

```ts
import { useHotkeys } from "react-hotkeys-hook";
import { MonsterStatBlockDialog } from "../../components/MonsterStatBlockDialog";
import { QuickActionPopover } from "../../components/QuickActionPopover";
```

- [ ] **Step 2: Add `openPopoverId` state and `statBlockMonsterId` state**

Inside the component body, add:

```ts
// "participantId:damage" | "participantId:heal" | null
const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
const [statBlockMonsterId, setStatBlockMonsterId] = useState<string | null>(null);
```

- [ ] **Step 3: Add `monstersById` map if not already present**

The file already has `state.monsters` available. Add:

```ts
const monstersById = useMemo(
  () => new Map(state.monsters.map((m) => [m.id, m])),
  [state.monsters]
);
```

If this already exists in the file, skip this step.

- [ ] **Step 4: Remove existing keyboard `useEffect` and replace with `useHotkeys`**

The file currently has a `useEffect` (around line 190) that listens for `ArrowRight` / `n` and `ArrowLeft` / `p` via `window.addEventListener("keydown", ...)`. **Delete this entire `useEffect` block** before adding the `useHotkeys` hooks below — otherwise `ArrowRight` and `ArrowLeft` will fire twice per keypress. The `n` / `p` shortcuts are not being preserved (DMs can use the new keyboard shortcuts instead).

Inside the component body, after the state declarations, add:

```ts
useHotkeys(
  "space",
  (e) => {
    e.preventDefault();
    if (selectedEncounter?.isRunning) {
      dispatchEncounterEvent(selectedEncounter.id, { t: "TURN_ADVANCED", direction: 1 });
    }
  },
  { enableOnFormTags: false }
);

useHotkeys(
  "arrowright",
  (e) => {
    e.preventDefault();
    if (selectedEncounter?.isRunning) {
      dispatchEncounterEvent(selectedEncounter.id, { t: "TURN_ADVANCED", direction: 1 });
    }
  },
  { enableOnFormTags: false }
);

useHotkeys(
  "arrowleft",
  (e) => {
    e.preventDefault();
    if (selectedEncounter?.isRunning && selectedEncounter.eventLog.length > 0) {
      dispatchEncounterEvent(selectedEncounter.id, { t: "TURN_ADVANCED", direction: -1 });
    }
  },
  { enableOnFormTags: false }
);

useHotkeys(
  "ctrl+z",
  (e) => {
    e.preventDefault();
    if (selectedEncounter && selectedEncounter.eventLog.length > 0) {
      undoEncounterEvent(selectedEncounter.id);
    }
  },
  { enableOnFormTags: false }
);
```

Note: `undoEncounterEvent` must be destructured from `useAppStore()`. Check that it's available (it is, based on codebase review). `dispatchEncounterEvent` is already used in this file.

- [ ] **Step 5: Add helper to determine if 📋 button should show**

Add `EncounterParticipant` to the import from `../../lib/models/types` (it should already be imported; just ensure it's included).

```ts
const showStatBlock = (participant: EncounterParticipant): boolean => {
  if (participant.kind === "monster") return true;
  if (participant.kind === "npc" && participant.refId && monstersById.has(participant.refId)) return true;
  return false;
};
```

- [ ] **Step 6: Redesign participant rows**

Find where participant rows are rendered (the `orderedParticipants.map(...)` block in the encounter runner). Replace the inner row JSX with the new layout. Each row:

```tsx
{orderedParticipants.map((participant) => {
  const isActive = participant.id === selectedEncounter.activeParticipantId;
  const popoverDamageKey = `${participant.id}:damage`;
  const popoverHealKey = `${participant.id}:heal`;
  const monster = participant.refId ? monstersById.get(participant.refId) : undefined;

  return (
    <div
      key={participant.id}
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-3 transition-shadow",
        isActive
          ? "border-2 border-foreground shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
          : "border border-black/10 bg-surface"
      )}
    >
      {/* Turn dot */}
      <span
        className={cn(
          "h-2 w-2 flex-shrink-0 rounded-full transition-colors",
          isActive ? "bg-foreground" : "bg-transparent"
        )}
        aria-hidden
      />

      {/* Avatar */}
      <ParticipantAvatar participant={participant} size="sm" />

      {/* Name + kind */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {participant.name}
        </p>
        <p className="text-xs uppercase tracking-[0.12em] text-muted">
          {participant.kind}
        </p>
      </div>

      {/* Stat chips */}
      <div className="hidden items-center gap-2 sm:flex">
        {[
          { label: "INIT", value: participant.initiative },
          { label: "AC", value: participant.ac },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-surface-strong px-2.5 py-1 text-center">
            <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted">{label}</p>
            <p className="font-mono text-sm font-semibold text-foreground">{value}</p>
          </div>
        ))}
        <div className="rounded-lg bg-surface-strong px-2.5 py-1 text-center min-w-[52px]">
          <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted">HP</p>
          <p
            className="font-mono text-sm font-semibold"
            style={{
              color: (() => {
                const cur = participant.currentHp ?? 0;
                const max = participant.maxHp ?? 0;
                if (cur <= 0 || max <= 0) return "var(--hp-zero)";
                const pct = cur / max;
                if (pct <= 0.25) return "var(--hp-low)";
                if (pct <= 0.74) return "var(--hp-mid)";
                return "var(--hp-full)";
              })(),
            }}
          >
            {participant.currentHp} / {participant.maxHp}
          </p>
        </div>
      </div>

      {/* HP bar */}
      <div className="hidden w-16 flex-shrink-0 sm:block">
        <HpBar current={participant.currentHp} max={participant.maxHp} showLabel />
      </div>

      {/* Action buttons */}
      <div className="flex flex-shrink-0 items-center gap-1.5">
        <QuickActionPopover
          mode="damage"
          participantName={participant.name}
          open={openPopoverId === popoverDamageKey}
          onOpenChange={(o) =>
            setOpenPopoverId(o ? popoverDamageKey : null)
          }
          onApply={(amount) => {
            dispatchEncounterEvent(selectedEncounter.id, {
              t: "DAMAGE_APPLIED",
              participantId: participant.id,
              amount,
            });
          }}
        >
          <button
            type="button"
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
            style={{
              backgroundColor: "var(--btn-damage-bg)",
              color: "var(--btn-damage-fg)",
            }}
          >
            ⚔ Hit
          </button>
        </QuickActionPopover>

        <QuickActionPopover
          mode="heal"
          participantName={participant.name}
          open={openPopoverId === popoverHealKey}
          onOpenChange={(o) =>
            setOpenPopoverId(o ? popoverHealKey : null)
          }
          onApply={(amount) => {
            dispatchEncounterEvent(selectedEncounter.id, {
              t: "HEAL_APPLIED",
              participantId: participant.id,
              amount,
            });
          }}
        >
          <button
            type="button"
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
            style={{
              backgroundColor: "var(--btn-heal-bg)",
              color: "var(--btn-heal-fg)",
            }}
          >
            + Heal
          </button>
        </QuickActionPopover>

        {showStatBlock(participant) ? (
          <button
            type="button"
            onClick={() => setStatBlockMonsterId(participant.refId ?? null)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-strong text-sm text-muted transition-colors hover:text-foreground"
            aria-label={`View ${participant.name} stat block`}
          >
            📋
          </button>
        ) : (
          <span className="w-7 flex-shrink-0" aria-hidden />
        )}
      </div>
    </div>
  );
})}
```

- [ ] **Step 7: Render `MonsterStatBlockDialog`**

At the bottom of the JSX, alongside the `EncounterCompleteDialog` (added in Task 7), add:

```tsx
<MonsterStatBlockDialog
  monster={statBlockMonsterId ? (monstersById.get(statBlockMonsterId) ?? null) : null}
  open={!!statBlockMonsterId}
  onClose={() => setStatBlockMonsterId(null)}
/>
```

- [ ] **Step 8: Verify lint passes**

```bash
/Users/msvarlia/.volta/bin/npm run lint
```

Expected: 0 errors.

- [ ] **Step 9: Run all tests**

```bash
/Users/msvarlia/.volta/bin/npm test -- --passWithNoTests
```

Expected: all pass.

- [ ] **Step 10: Commit**

```bash
git add app/encounters/player/page.tsx
git commit -m "feat(encounter): redesign participant rows, add quick actions, stat block, and keyboard shortcuts"
```

---

## Final verification

- [ ] **Run lint one final time**

```bash
/Users/msvarlia/.volta/bin/npm run lint
```

Expected: 0 errors.

- [ ] **Run full test suite**

```bash
/Users/msvarlia/.volta/bin/npm test -- --passWithNoTests
```

Expected: all pass.

- [ ] **Run build to confirm no type errors**

```bash
/Users/msvarlia/.volta/bin/npm run build
```

Expected: successful build, no TypeScript errors.
