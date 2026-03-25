# Encounter Builder — Cards + Inline Picker Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace minimal encounter cards with info-dense cards (difficulty pill, XP, CR, combatant count, Launch button) and embed the MonsterPicker inline in Create and Edit dialogs, eliminating the nested dialog anti-pattern.

**Architecture:** All changes confined to `app/encounters/builder/page.tsx` and `app/globals.css`. No new components, no new dependencies. Difficulty computation inline in `.map()`. Picker embed reuses existing `MonsterPicker` component. Collapse behaviour is pure React state + CSS transition.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, existing `app/components/ui.tsx` primitives, existing `MonsterPicker`, `useRouter` from `next/navigation` (new import).

---

## Files

- **Modify:** `app/globals.css` — add `--surface-raised` and `--diff-*` tokens (light + dark)
- **Modify:** `app/encounters/builder/page.tsx` — card redesign, inline picker, state cleanup

---

## Task 1: CSS tokens

**Files:**
- Modify: `app/globals.css` (`:root` block, lines 3–44; dark media query, lines 113–148)

- [ ] **Step 1.1: Add light-mode tokens to `:root`**

  In `app/globals.css`, inside the first `:root { ... }` block (after `--coin-pp: #aaaaaa;`), add:

  ```css
  /* Difficulty tokens */
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

- [ ] **Step 1.2: Add dark-mode tokens**

  In `app/globals.css`, inside the `@media (prefers-color-scheme: dark) { :root { ... } }` block (after `--btn-heal-fg: #6fcf8a;`), add:

  ```css
  /* Difficulty tokens (dark) */
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

- [ ] **Step 1.3: Verify build passes**

  ```bash
  npm run build 2>&1 | tail -20
  ```

  Expected: build succeeds, no CSS errors.

- [ ] **Step 1.4: Commit**

  ```bash
  git add app/globals.css
  git commit -m "feat(tokens): add --surface-raised and --diff-* light/dark CSS tokens"
  ```

---

## Task 2: Active encounter card redesign

**Files:**
- Modify: `app/encounters/builder/page.tsx`

This task replaces the `activeEncounters.map()` render block (lines 611–662) with the new card design.

- [ ] **Step 2.1: Add `useRouter` import**

  At line 3, change:
  ```ts
  import { useCallback, useEffect, useMemo, useState } from "react";
  ```
  to:
  ```ts
  import { useCallback, useEffect, useMemo, useState } from "react";
  import { useRouter } from "next/navigation";
  ```

- [ ] **Step 2.2: Instantiate router**

  After line 66 (`} = useAppStore();`), add:
  ```ts
  const router = useRouter();
  ```

- [ ] **Step 2.3: Add `difficultyPillClasses` helper**

  After the `formatMultiplier` const (line 53), add this helper before the component:

  ```ts
  const difficultyPillClasses = (difficulty: string): string => {
    switch (difficulty) {
      case "Easy":
        return "bg-[var(--diff-easy-bg)] text-[var(--diff-easy)] border border-[var(--diff-easy)]/25";
      case "Medium":
        return "bg-[var(--diff-medium-bg)] text-[var(--diff-medium)] border border-[var(--diff-medium)]/25";
      case "Hard":
        return "bg-[var(--diff-hard-bg)] text-[var(--diff-hard)] border border-[var(--diff-hard)]/25";
      case "Deadly":
        return "bg-[var(--diff-deadly-bg)] text-[var(--diff-deadly)] border border-[var(--diff-deadly)]/25";
      default:
        return "bg-surface-strong text-muted border border-black/10";
    }
  };
  ```

- [ ] **Step 2.4: Replace `activeEncounters.map()` render block**

  Replace the existing `<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">` and its children (lines 610–671) with:

  ```tsx
  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
    {activeEncounters.map((encounter) => {
      const challenges = encounter.participants
        .map((p) => getParticipantChallenge(p, monsterChallengeById))
        .filter((c): c is string => c !== null);

      const partyLevels = encounter.participants
        .filter((p) => p.kind === "pc" && p.refId)
        .map((p) => pcsById.get(p.refId!)?.level ?? null)
        .filter((l): l is number => l !== null);

      const difficulty = evaluateEncounterDifficulty(challenges, partyLevels);
      const breakdown = getEncounterDifficultyBreakdown(challenges, partyLevels);
      const totalCr = formatTotalChallenge(getTotalChallenge(challenges));
      const noParty = partyLevels.length === 0;

      const previewParticipants = encounter.participants.slice(0, 6);
      const overflowCount = Math.max(0, encounter.participants.length - previewParticipants.length);

      return (
        <div key={encounter.id} className="flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-surface shadow-sm">
          {/* Card body */}
          <div className="flex-1 p-4">
            {/* Top row: name/location + status/difficulty pills */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{encounter.name}</p>
                <p className="text-xs text-muted">{encounter.location || "—"}</p>
              </div>
              <div className="flex flex-shrink-0 flex-col items-end gap-1">
                <Pill
                  label={encounter.isRunning ? "LIVE" : "PREP"}
                  tone={encounter.isRunning ? "accent" : "neutral"}
                />
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.12em] ${difficultyPillClasses(difficulty)}`}>
                  {difficulty === "No Party" ? "—" : difficulty}
                </span>
              </div>
            </div>

            {/* Meta row: combatants · CR · XP */}
            <div className="mt-2 flex flex-wrap items-center gap-1 font-mono text-xs text-muted">
              <span>{encounter.participants.length} combatants</span>
              {challenges.length > 0 && (
                <>
                  <span>·</span>
                  <span>CR {totalCr}</span>
                </>
              )}
              {!noParty && breakdown.adjustedXp > 0 ? (
                <>
                  <span>·</span>
                  <span>{breakdown.adjustedXp.toLocaleString()} XP</span>
                </>
              ) : noParty && challenges.length > 0 ? (
                <>
                  <span>·</span>
                  <span>no party</span>
                </>
              ) : null}
            </div>

            {/* Avatar strip */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {previewParticipants.map((participant) => (
                <ParticipantAvatar
                  key={participant.id}
                  name={participant.name}
                  visual={participant.visual}
                  size="sm"
                />
              ))}
              {overflowCount > 0 && (
                <span className="text-xs text-muted">+{overflowCount}</span>
              )}
              {!encounter.participants.length && (
                <span className="text-xs italic text-muted">No participants yet</span>
              )}
            </div>
          </div>

          {/* Footer toolbar */}
          <div className="flex items-center gap-2 border-t border-black/10 bg-surface-strong px-3 py-2">
            <Button
              variant="ghost"
              onClick={() => removeEncounter(encounter.id)}
              disabled={encounter.isRunning}
              className={`text-[var(--diff-hard)] hover:text-[var(--diff-deadly)] ${encounter.isRunning ? "opacity-40" : ""}`}
            >
              Remove
            </Button>
            <div className="flex-1" />
            <Button
              variant="outline"
              onClick={() => openEditOverlay(encounter.id)}
              disabled={encounter.isRunning}
            >
              Edit
            </Button>
            <Button
              variant="primary"
              onClick={() => router.push("/encounters/player")}
              disabled={encounter.participants.length === 0}
              className={encounter.participants.length === 0 ? "opacity-40" : ""}
            >
              {encounter.isRunning ? "Resume ⚔" : "Launch ⚔"}
            </Button>
          </div>
        </div>
      );
    })}
    {!activeEncounters.length && (
      <p className="text-sm text-muted">
        {state.activeCampaignId
          ? "No encounters in this campaign yet. Add one to start building."
          : "No encounters yet. Add one to start building."}
      </p>
    )}
  </div>
  ```

- [ ] **Step 2.5: Lint check**

  ```bash
  npm run lint 2>&1 | tail -20
  ```

  Expected: 0 new errors.

- [ ] **Step 2.6: Commit**

  ```bash
  git add app/encounters/builder/page.tsx
  git commit -m "feat(builder): info-dense active encounter cards with difficulty pill and launch button"
  ```

---

## Task 3: Completed encounter card updates

**Files:**
- Modify: `app/encounters/builder/page.tsx`

Same layout as active cards but `opacity-75`, no Launch button, Remove enabled, Review kept.

- [ ] **Step 3.1: Replace `completedEncounters.map()` render block**

  Replace the `{completedEncounters.map((encounter) => {` block (lines 678–724) with:

  ```tsx
  {completedEncounters.map((encounter) => {
    const challenges = encounter.participants
      .map((p) => getParticipantChallenge(p, monsterChallengeById))
      .filter((c): c is string => c !== null);

    const partyLevels = encounter.participants
      .filter((p) => p.kind === "pc" && p.refId)
      .map((p) => pcsById.get(p.refId!)?.level ?? null)
      .filter((l): l is number => l !== null);

    const difficulty = evaluateEncounterDifficulty(challenges, partyLevels);
    const breakdown = getEncounterDifficultyBreakdown(challenges, partyLevels);
    const totalCr = formatTotalChallenge(getTotalChallenge(challenges));
    const noParty = partyLevels.length === 0;

    const previewParticipants = encounter.participants.slice(0, 6);
    const overflowCount = Math.max(0, encounter.participants.length - previewParticipants.length);

    return (
      <div key={encounter.id} className="flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-surface opacity-75 shadow-sm">
        {/* Card body */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{encounter.name}</p>
              <p className="text-xs text-muted">{encounter.location || "—"}</p>
            </div>
            <div className="flex flex-shrink-0 flex-col items-end gap-1">
              <Pill label="DONE" tone="neutral" />
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.12em] ${difficultyPillClasses(difficulty)}`}>
                {difficulty === "No Party" ? "—" : difficulty}
              </span>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1 font-mono text-xs text-muted">
            <span>{encounter.participants.length} combatants</span>
            {challenges.length > 0 && (
              <>
                <span>·</span>
                <span>CR {totalCr}</span>
              </>
            )}
            {!noParty && breakdown.adjustedXp > 0 ? (
              <>
                <span>·</span>
                <span>{breakdown.adjustedXp.toLocaleString()} XP</span>
              </>
            ) : noParty && challenges.length > 0 ? (
              <>
                <span>·</span>
                <span>no party</span>
              </>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {previewParticipants.map((participant) => (
              <ParticipantAvatar
                key={participant.id}
                name={participant.name}
                visual={participant.visual}
                size="sm"
              />
            ))}
            {overflowCount > 0 && (
              <span className="text-xs text-muted">+{overflowCount}</span>
            )}
            {!encounter.participants.length && (
              <span className="text-xs italic text-muted">No participants yet</span>
            )}
          </div>
        </div>

        {/* Footer toolbar — no Launch button for completed */}
        <div className="flex items-center gap-2 border-t border-black/10 bg-surface-strong px-3 py-2">
          <Button
            variant="ghost"
            onClick={() => removeEncounter(encounter.id)}
            className="text-[var(--diff-hard)] hover:text-[var(--diff-deadly)]"
          >
            Remove
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            onClick={() => openEditOverlay(encounter.id)}
          >
            Review
          </Button>
        </div>
      </div>
    );
  })}
  ```

- [ ] **Step 3.2: Lint check**

  ```bash
  npm run lint 2>&1 | tail -20
  ```

  Expected: 0 new errors.

- [ ] **Step 3.3: Commit**

  ```bash
  git add app/encounters/builder/page.tsx
  git commit -m "feat(builder): completed encounter cards with same info-dense layout, no launch button"
  ```

---

## Task 4: Create dialog — inline MonsterPicker (always-visible 2-col)

**Files:**
- Modify: `app/encounters/builder/page.tsx` (lines 729–858, the Create Dialog)

The new layout:
- Full-width 2-col row at top: Name + Location inputs
- Below: `grid grid-cols-2 gap-4`
  - Left: `MonsterPicker` inline + party toggles + party pills
  - Right: Draft roster (existing)
- Remove the "Open monster picker" button section from the left panel

- [ ] **Step 4.1: Replace the Create Dialog body**

  Replace everything between `<DialogContent maxWidth="6xl">` and `</DialogContent>` (i.e., lines 731–857) with:

  ```tsx
  <div className="flex items-center justify-between gap-2">
    <DialogTitle>Create Encounter</DialogTitle>
    <DialogClose asChild>
      <Button variant="outline">Close</Button>
    </DialogClose>
  </div>

  {/* Name + Location — full-width top row */}
  <div className="mt-4 grid grid-cols-2 gap-4">
    <div>
      <FieldLabel>Encounter Name</FieldLabel>
      <Input
        value={createForm.name}
        onChange={(event) =>
          setCreateForm((prev) => ({ ...prev, name: event.target.value }))
        }
      />
    </div>
    <div>
      <FieldLabel>Location</FieldLabel>
      <Input
        value={createForm.location}
        onChange={(event) =>
          setCreateForm((prev) => ({ ...prev, location: event.target.value }))
        }
      />
    </div>
  </div>

  {/* Two-column: picker left, roster right */}
  <div className="mt-4 grid grid-cols-2 gap-4">
    {/* Left: MonsterPicker + party toggles */}
    <div className="space-y-3 rounded-2xl border border-black/10 bg-surface-strong p-4">
      <MonsterPicker
        monsters={state.monsters}
        onPickMonster={(monster) => addMonsterToCreateDraft(monster.id)}
        listClassName="max-h-[12rem]"
      />

      <div className="rounded-xl border border-black/10 bg-surface px-3 py-3 text-xs text-muted">
        <p className="uppercase tracking-[0.2em]">Party</p>
        <p className="mt-1">Add party for difficulty rating based on size and level.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setCreatePartyIds(new Set(state.pcs.map((pc) => pc.id)))}
          >
            Add entire party
          </Button>
          <Button variant="outline" onClick={() => setCreatePartyIds(new Set())}>
            Clear party
          </Button>
        </div>
        {createPartyMembers.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {createPartyMembers.map((pc) => (
              <Pill key={pc.id} label={`${pc.name} Lv ${pc.level}`} tone="neutral" />
            ))}
          </div>
        ) : null}
      </div>
    </div>

    {/* Right: Draft roster */}
    <div className="space-y-3 rounded-2xl border border-black/10 bg-surface p-4">
      <div>
        <h4 className="text-sm font-semibold text-foreground">Encounter overview</h4>
        <p className="text-xs text-muted">Click a drafted monster to remove it.</p>
      </div>
      <div className="max-h-[30rem] space-y-2 overflow-auto pr-1">
        {createDraftMonsters.map((monster) => {
          const sourceMonster = monstersById.get(monster.refId);
          return (
            <button
              key={monster.draftId}
              type="button"
              className="w-full rounded-xl border border-black/10 bg-surface-strong px-3 py-3 text-left"
              onClick={() => removeMonsterFromCreateDraft(monster.draftId)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ParticipantAvatar
                    name={monster.name}
                    visual={monster.visual}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{monster.name}</p>
                    <p className="text-xs text-muted">{sourceMonster?.type ?? "Monster"}</p>
                  </div>
                </div>
                <span className="rounded-full bg-surface-strong px-2 py-1 text-[0.65rem] font-semibold text-muted">
                  CR {sourceMonster?.challenge ?? "--"}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted">AC {monster.ac} · HP {monster.hp}</p>
            </button>
          );
        })}
        {!createDraftMonsters.length ? (
          <p className="text-sm text-muted">No monsters added yet.</p>
        ) : null}
      </div>
    </div>
  </div>

  <div className="mt-4 flex justify-end">
    <Button onClick={confirmCreateEncounter} disabled={!createForm.name.trim()}>
      Create
    </Button>
  </div>
  ```

- [ ] **Step 4.2: Lint check**

  ```bash
  npm run lint 2>&1 | tail -20
  ```

  Expected: 0 new errors.

- [ ] **Step 4.3: Commit**

  ```bash
  git add app/encounters/builder/page.tsx
  git commit -m "feat(builder): embed MonsterPicker inline in Create dialog — two-column layout, no nested dialog"
  ```

---

## Task 5: Edit dialog — collapsible inline MonsterPicker

**Files:**
- Modify: `app/encounters/builder/page.tsx`

Add `isPickerOpen` state. Replace "Open monster picker" button + existing description with a collapse trigger + animated panel containing `MonsterPicker`.

- [ ] **Step 5.1: Add `isPickerOpen` state**

  After `const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);` (line 86), add:

  ```ts
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  ```

- [ ] **Step 5.2: Reset `isPickerOpen` when edit overlay opens**

  In `openEditOverlay` (starting line 244), add `setIsPickerOpen(false);` at the top of the function body:

  ```ts
  const openEditOverlay = (encounterId: string) => {
    const encounter = state.encounters.find((entry) => entry.id === encounterId);
    if (!encounter || encounter.isRunning) {
      return;
    }
    setIsPickerOpen(false);
    setEditingEncounterId(encounter.id);
    setEncounterDraft({
      name: encounter.name,
      location: encounter.location ?? "",
    });
  };
  ```

- [ ] **Step 5.3: Replace "Open monster picker" section in Edit dialog**

  Find this block in the Edit dialog (around line 905–912):
  ```tsx
  <div>
    <p className="text-xs uppercase tracking-[0.25em] text-muted">Monster picker</p>
    <p className="mt-1 text-xs text-muted">Use popup picker to auto-add monsters to this encounter.</p>
  </div>
  <Button variant="outline" onClick={openEditMonsterPicker} disabled={builderLocked}>
    Open monster picker
  </Button>
  ```

  Replace with:
  ```tsx
  {/* Collapsible monster picker — 21st.dev Collapse pattern */}
  <button
    onClick={() => setIsPickerOpen((v) => !v)}
    className="flex w-full items-center justify-between rounded-lg border border-black/10 bg-surface-strong px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-muted transition-colors duration-150 hover:bg-[var(--surface-raised)]"
    disabled={builderLocked}
  >
    <span>Add Monsters</span>
    <span style={{ display: "inline-block", transition: "transform 0.22s cubic-bezier(0.4,0,0.2,1)", transform: isPickerOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
  </button>

  <div style={{
    overflow: "hidden",
    maxHeight: isPickerOpen ? "20rem" : "0",
    opacity: isPickerOpen ? 1 : 0,
    transition: "max-height 0.25s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease",
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

- [ ] **Step 5.4: Lint check**

  ```bash
  npm run lint 2>&1 | tail -20
  ```

  Expected: 0 new errors.

- [ ] **Step 5.5: Commit**

  ```bash
  git add app/encounters/builder/page.tsx
  git commit -m "feat(builder): collapsible inline MonsterPicker in Edit dialog with animated chevron"
  ```

---

## Task 6: State and function cleanup

**Files:**
- Modify: `app/encounters/builder/page.tsx`

Remove deleted state, functions, and Dialog. Update two functions. Clean up `useEffect` keydown handler.

- [ ] **Step 6.1: Remove deleted state declarations**

  Remove these two lines (around lines 89–90):
  ```ts
  const [isMonsterPickerModalOpen, setIsMonsterPickerModalOpen] = useState(false);
  const [monsterPickerMode, setMonsterPickerMode] = useState<"create" | "edit" | null>(null);
  ```

- [ ] **Step 6.2: Remove deleted functions**

  Remove the three functions entirely:
  - `openCreateMonsterPicker` (~lines 273–279)
  - `openEditMonsterPicker` (~lines 281–287)
  - `closeMonsterPicker` (~lines 289–292)

- [ ] **Step 6.3: Update `closeEditOverlay`**

  Remove the two deleted setter calls:
  ```ts
  setIsMonsterPickerModalOpen(false);
  setMonsterPickerMode(null);
  ```

  The updated function should be:
  ```ts
  const closeEditOverlay = useCallback(() => {
    setEditingEncounterId(null);
    setEncounterDraft({ name: "", location: "" });
    setActiveParticipantActionId(null);
  }, []);
  ```

- [ ] **Step 6.4: Update `openCreateOverlay`**

  Remove the two deleted setter calls:
  ```ts
  setIsMonsterPickerModalOpen(false);
  setMonsterPickerMode(null);
  ```

  The updated function should be:
  ```ts
  const openCreateOverlay = () => {
    setCreateForm({ name: "", location: "" });
    setCreateDraftMonsters([]);
    setCreatePartyIds(new Set());
    setIsCreateOpen(true);
  };
  ```

- [ ] **Step 6.5: Update `confirmCreateEncounter`**

  Remove the `closeMonsterPicker()` call and the `closeMonsterPicker` dep from the `useCallback` dependency array:
  ```ts
  const confirmCreateEncounter = useCallback(() => {
    const name = createForm.name.trim();
    if (!name) {
      return;
    }
    const encounterId = addEncounter(name, createForm.location.trim() || undefined, state.activeCampaignId ?? undefined);
    createDraftMonsters.forEach((monster) => {
      addEncounterParticipant(encounterId, {
        name: monster.name,
        kind: "monster",
        refId: monster.refId,
        initiative: null,
        ac: monster.ac,
        maxHp: monster.hp,
        currentHp: monster.hp,
        tempHp: 0,
        conditions: [],
        visual: monster.visual,
        deathSaves: null,
      });
    });
    createPartyMembers.forEach((pc) => {
      addEncounterParticipant(encounterId, {
        name: pc.name,
        kind: "pc",
        refId: pc.id,
        initiative: null,
        ac: pc.ac,
        maxHp: pc.maxHp,
        currentHp: pc.currentHp,
        tempHp: pc.tempHp,
        conditions: [...pc.conditions],
        visual: pc.visual,
        deathSaves: pc.deathSaves ?? null,
      });
    });
    setCreateForm({ name: "", location: "" });
    setCreateDraftMonsters([]);
    setCreatePartyIds(new Set());
    setIsCreateOpen(false);
  }, [addEncounter, addEncounterParticipant, createDraftMonsters, createForm.location, createForm.name, createPartyMembers, state.activeCampaignId]);
  ```

- [ ] **Step 6.6: Clean up `useEffect` keydown handler**

  Update the `useEffect` (around lines 503–595):

  1. Remove `isMonsterPickerModalOpen` from `isOverlayOpen` computation:
     ```ts
     const isOverlayOpen =
       isCreateOpen ||
       isPartyModalOpen ||
       isVariantModalOpen ||
       !!selectedEncounter;
     ```

  2. Remove the `if (isMonsterPickerModalOpen)` branch from the `Escape` handler.

  3. Remove `closeMonsterPicker` and `isMonsterPickerModalOpen` from the dependency array.

  The updated dep array:
  ```ts
  }, [
    builderLocked,
    closeEditOverlay,
    confirmAddParty,
    confirmCreateEncounter,
    confirmVariantAdd,
    createForm.name,
    isCreateOpen,
    isPartyModalOpen,
    isVariantModalOpen,
    selectedEncounter,
    partySelection.size,
    variantForm.ac,
    variantForm.hp,
    variantForm.name,
  ]);
  ```

- [ ] **Step 6.7: Remove the monster picker Dialog JSX block**

  Remove the entire `<Dialog open={isMonsterPickerModalOpen ...}>` block (lines 1117–1146):
  ```tsx
  <Dialog
    open={isMonsterPickerModalOpen && (monsterPickerMode === "create" || (monsterPickerMode === "edit" && !!selectedEncounter))}
    onOpenChange={(open) => { if (!open) closeMonsterPicker(); }}
  >
    <DialogContent maxWidth="2xl">
      ...
    </DialogContent>
  </Dialog>
  ```

- [ ] **Step 6.8: Final lint check**

  ```bash
  npm run lint 2>&1 | tail -20
  ```

  Expected: 0 errors. If any unused variable warnings appear for removed state/functions, confirm the deletions were complete.

- [ ] **Step 6.9: Run tests**

  ```bash
  npm test 2>&1 | tail -20
  ```

  Expected: all tests pass (no builder-page unit tests exist, so this verifies no regressions in engine tests).

- [ ] **Step 6.10: Run build**

  ```bash
  npm run build 2>&1 | tail -20
  ```

  Expected: build succeeds.

- [ ] **Step 6.11: Commit**

  ```bash
  git add app/encounters/builder/page.tsx
  git commit -m "refactor(builder): remove isMonsterPickerModalOpen state, picker functions, and nested Dialog"
  ```

---

## Definition of Done Verification

- [ ] Active encounter cards show difficulty pill (all 6 values handled), combatant count, adjusted XP, Launch/Resume button
- [ ] LIVE cards: Edit + Remove disabled/dimmed, button reads "Resume ⚔"
- [ ] 0-participant cards: Launch button disabled/dimmed (`opacity-40`)
- [ ] Completed cards: `opacity-75`, Review button kept, no Launch button, Remove enabled
- [ ] Create dialog: MonsterPicker inline (no nested dialog), party toggles inline, name/location above in 2-col row
- [ ] Edit dialog: "Add Monsters" collapse trigger with rotating chevron and animated slide panel
- [ ] `isMonsterPickerModalOpen`, `monsterPickerMode`, `openCreateMonsterPicker`, `openEditMonsterPicker`, `closeMonsterPicker` removed
- [ ] `closeEditOverlay` and `openCreateOverlay` updated to remove deleted state references
- [ ] `confirmCreateEncounter` updated to remove `closeMonsterPicker` call and dep
- [ ] `useEffect` keydown handler updated: removed branch + dep array cleaned
- [ ] Monster picker Dialog JSX block removed
- [ ] `--surface-raised` + `--diff-*` light tokens added to `:root` in `globals.css`
- [ ] `--surface-raised` + `--diff-*` dark tokens added to `@media (prefers-color-scheme: dark)` block in `globals.css`
- [ ] `useRouter` imported and used for Launch/Resume navigation
- [ ] Build passes, lint clean
