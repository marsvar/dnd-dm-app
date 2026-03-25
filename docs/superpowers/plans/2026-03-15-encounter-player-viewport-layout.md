# Encounter Player Viewport Layout Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the encounter player page from a document-scroll layout into a fixed-height viewport dashboard for combat mode, with prep mode unchanged.

**Architecture:** When `combatMode === true` the page returns a `position: fixed` overlay (inset below the nav) with three columns — left panel (controls, no scroll), initiative list (scrolls internally), reference panel (desktop only, scrolls internally). Prep mode continues to use `PageShell` and document scroll. The Nav becomes `fixed` at `h-16 (64px)`, and the global CSS exposes `--nav-height: 64px` as a positioning anchor.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS v4 (CSS token classes only, no `dark:` variants), React hooks.

**Spec:** `docs/superpowers/specs/2026-03-14-encounter-player-viewport-layout-design.md`

---

## Chunk 1: Foundation — Nav, layout offset, CSS tokens

### Task 1: Make the Nav fixed and `h-16`; move campaign name inline; add CSS anchor

**Files:**
- Modify: `app/components/Nav.tsx`
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

> **Context:** Nav currently uses `sticky top-0` with `py-4` on the inner div, giving a variable height. The campaign name is a third stacked line in the wordmark link. We need it fixed at exactly 64px so `--nav-height` is a reliable anchor.

- [ ] **Step 1: Update `<header>` in Nav.tsx — change `sticky` to `fixed`, add `h-16`, add `w-full`**

  In `app/components/Nav.tsx`, line 87, change:
  ```tsx
  <header className="sticky top-0 z-10 border-b border-black/5 bg-surface/80 backdrop-blur">
  ```
  to:
  ```tsx
  <header className="fixed top-0 z-10 w-full h-16 border-b border-black/5 bg-surface/80 backdrop-blur">
  ```

- [ ] **Step 2: Remove `py-4` from the inner div; ensure height fits**

  On the same inner div (line 88), change:
  ```tsx
  <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 sm:px-8">
  ```
  to:
  ```tsx
  <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-6 sm:px-8">
  ```

- [ ] **Step 3: Move campaign name inline — replace the stacked third line with an inline badge**

  The wordmark `<Link>` block currently shows campaign name as a third child:
  ```tsx
  {activeCampaign && activeRole === "dm" && (
    <span className="text-xs text-accent truncate max-w-[14rem]">
      {activeCampaign.name}
    </span>
  )}
  ```
  Replace the entire wordmark `<Link>` block (lines 91–103) with:
  ```tsx
  <Link href={activeRole === "dm" ? "/" : activeRole === "player" ? "/player" : "/select-role"} className="flex flex-col">
    <span className="text-xs uppercase tracking-[0.3em] text-muted">
      {activeRole === "dm" ? "DM Toolkit" : activeRole === "player" ? "Player View" : "D&D 5e Assistant"}
    </span>
    <span className="flex items-center gap-2">
      <span className="text-xl font-semibold text-foreground" style={{ fontFamily: "var(--font-display), serif", letterSpacing: "0.01em" }}>
        Vault of Encounters
      </span>
      {activeCampaign && activeRole === "dm" && (
        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[0.65rem] font-medium text-accent truncate max-w-[10rem]">
          {activeCampaign.name}
        </span>
      )}
    </span>
  </Link>
  ```

- [ ] **Step 4: Add `--nav-height` to `globals.css` `:root`**

  In `app/globals.css`, after the `--ring` line (line 11), add:
  ```css
  --nav-height: 64px;
  ```

- [ ] **Step 5: Remove `.targeted-outline` from `globals.css`**

  Delete lines 228–231:
  ```css
  .targeted-outline {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
  ```

- [ ] **Step 6: Update `pt-10` → `pt-16` in `layout.tsx`**

  In `app/layout.tsx` line 49, change:
  ```tsx
  <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10 sm:px-8">
  ```
  to:
  ```tsx
  <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-16 sm:px-8">
  ```

- [ ] **Step 7: Verify the app renders with no TypeScript or lint errors**

  ```bash
  npm run lint && npm run build
  ```
  Expected: 0 errors, build succeeds. The Nav should now be fixed at the top. All pages will have their content shifted down by 64px (pt-16).

- [ ] **Step 8: Commit**

  ```bash
  git add app/components/Nav.tsx app/globals.css app/layout.tsx
  git commit -m "feat(layout): fix nav to h-16, add --nav-height token, pt-16 main offset"
  ```

---

## Chunk 2: page.tsx — state cleanup and new derived state

### Task 2: Remove `damageTargetId` targeting model; add `referencePinnedId` and `combatListParticipants`

**Files:**
- Modify: `app/encounters/player/page.tsx`

> **Context:** The old combat UI used `damageTargetId` to let the DM click any participant row to target it. The new design targets `activeParticipant.id` exclusively from the left panel, while per-row `QuickActionPopover` handles all others. This task removes the old targeting state and wires up the new state needed for the viewport layout.

- [ ] **Step 1: Remove `damageTargetId` state declaration (line 34)**

  Delete:
  ```tsx
  const [damageTargetId, setDamageTargetId] = useState<string | null>(null);
  ```

- [ ] **Step 2: Remove `defaultTargetId`, `selectedTargetId`, `effectiveTargetId` derivations (lines 141–146)**

  Delete:
  ```tsx
  const defaultTargetId = activeParticipant?.id ?? selectedEncounter?.participants[0]?.id ?? "";
  const selectedTargetId = damageTargetId === null ? defaultTargetId : damageTargetId;
  const effectiveTargetId =
    selectedEncounter?.participants.some((participant) => participant.id === selectedTargetId)
      ? selectedTargetId
      : "";
  ```

- [ ] **Step 3: Remove `applyDamageToTarget` and `removeTargetFromCombat` functions (lines 371–393)**

  Delete:
  ```tsx
  const applyDamageToTarget = (direction: 1 | -1) => { ... };
  const removeTargetFromCombat = () => { ... };
  ```

- [ ] **Step 4: Add `referencePinnedId` state after the existing state declarations**

  After `const [statBlockMonsterId, setStatBlockMonsterId] = useState<string | null>(null);`, add:
  ```tsx
  const [referencePinnedId, setReferencePinnedId] = useState<string | null>(null);
  ```

- [ ] **Step 5: Add `combatListParticipants` memo after the existing `defeatedParticipants` memo**

  After the `defeatedParticipants` useMemo block (after line ~95), add:
  ```tsx
  // For the combat initiative list: living participants first, defeated at the bottom.
  // orderedParticipants (living only) is preserved for activeIndex/nextParticipant/activeParticipant.
  const combatListParticipants = useMemo(
    () => [...orderedParticipants, ...defeatedParticipants],
    [orderedParticipants, defeatedParticipants]
  );
  ```

- [ ] **Step 6: Update `localNotes` useEffect — change dependency and source**

  The current `localNotes` useEffect (lines 235–240) reads from `effectiveTargetId`. Replace it with:
  ```tsx
  // Sync local notes textarea when the active participant changes.
  useEffect(() => {
    setLocalNotes(activeParticipant?.notes ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeParticipant?.id]);
  ```

- [ ] **Step 7: Add scroll-lock useEffect after the `localNotes` effect**

  ```tsx
  // Lock page scroll in combat mode — prevents the document from scrolling behind the fixed overlay.
  // Uses "clip" (not "hidden") to avoid scrollbar-width layout shifts.
  useEffect(() => {
    if (!combatMode) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "clip";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [combatMode]);
  ```

- [ ] **Step 8: Add `referencePinnedId` clear-on-turn-advance useEffect**

  ```tsx
  // Clear the pinned reference panel target whenever the active participant changes.
  useEffect(() => {
    setReferencePinnedId(null);
  }, [selectedEncounter?.activeParticipantId]);
  ```

- [ ] **Step 9: Verify TypeScript compiles — `effectiveTargetId` usages will now be broken**

  ```bash
  npx tsc --noEmit 2>&1 | head -40
  ```
  Expected: errors on `effectiveTargetId`, `applyDamageToTarget`, `removeTargetFromCombat` — these will be fixed in the next task when the combat JSX is rewritten. Note the line numbers for context.

  > **Do not commit after this step.** The file intentionally has broken references that are resolved in Task 3.

---

## Chunk 3: Combat view JSX — left panel + initiative list + reference panel

### Task 3: Add `combatMode` early return with the fixed three-column overlay

**Files:**
- Modify: `app/encounters/player/page.tsx`

> **Context:** When `combatMode === true`, the page now returns a `position: fixed` overlay instead of rendering inside `PageShell`. This early return is inserted just before the existing `return (<PageShell>…</PageShell>)`. The prep-mode JSX inside `PageShell` is left entirely unchanged.

- [ ] **Step 1: Locate the `return (<PageShell …` statement**

  It is the final return in `EncounterPlayerPage`. It starts around line 515 (after all the hooks and handlers). The line reads approximately:
  ```tsx
  return (
    <PageShell>
  ```

- [ ] **Step 2: Insert a guard just before the prep-mode return — early return when no encounter selected**

  Just before the `return (<PageShell…>`, confirm there is already a guard like:
  ```tsx
  if (!selectedEncounter) {
    return <PageShell>…</PageShell>;
  }
  ```
  If not, add one. The existing code renders a "no encounter selected" message inside PageShell — keep that.

- [ ] **Step 3: Add the `combatMode` early return block immediately before the prep-mode `return`**

  Find the line `const combatMode = selectedEncounter?.combatMode === "live";` (around line 151). This must be above the new early return.

  After all hook/handler declarations and before `return (<PageShell`, insert:

  ```tsx
  // -------------------------------------------------------------------------
  // COMBAT MODE — fixed viewport overlay, no PageShell, no document scroll
  // -------------------------------------------------------------------------
  if (combatMode && selectedEncounter) {
    const applyDamage = (amount: number) => {
      if (!activeParticipant || !selectedEncounter) return;
      dispatchEncounterEvent(selectedEncounter.id, {
        t: "DAMAGE_APPLIED",
        participantId: activeParticipant.id,
        amount,
      });
      setDamageAmount("");
    };

    const applyHeal = (amount: number) => {
      if (!activeParticipant || !selectedEncounter) return;
      dispatchEncounterEvent(selectedEncounter.id, {
        t: "HEAL_APPLIED",
        participantId: activeParticipant.id,
        amount,
      });
      setDamageAmount("");
    };

    // Reference panel resolution
    const refPanelParticipantId = referencePinnedId ?? selectedEncounter.activeParticipantId;
    const refParticipant = refPanelParticipantId
      ? selectedEncounter.participants.find((p) => p.id === refPanelParticipantId) ?? null
      : null;
    const refPc =
      refParticipant?.kind === "pc" && refParticipant.refId
        ? pcsById.get(refParticipant.refId) ?? null
        : null;
    const refMonster =
      refParticipant?.kind === "monster" && refParticipant.refId
        ? monstersById.get(refParticipant.refId) ?? null
        : null;

    const hpInputDisabled = !activeParticipant || activeParticipant.maxHp === null;
    const hpAmount = Number(damageAmount);
    const hpActionDisabled = hpInputDisabled || !damageAmount || !Number.isFinite(hpAmount) || hpAmount <= 0;

    return (
      <>
        {/* ------------------------------------------------------------------ */}
        {/* Three-column fixed overlay                                          */}
        {/* ------------------------------------------------------------------ */}
        <div className="fixed inset-x-0 bottom-0 top-[var(--nav-height)] flex overflow-hidden bg-background">

          {/* ================================================================ */}
          {/* LEFT PANEL — 280px, no scroll, targets activeParticipant.id      */}
          {/* ================================================================ */}
          <div className="flex w-[280px] shrink-0 flex-col gap-3 overflow-hidden border-r border-black/10 p-4">

            {activeParticipant === null ? (
              /* Null state */
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
                <p className="text-sm text-muted">End of round — advance turn or stop combat.</p>
                <Button
                  onClick={() => advanceEncounterTurn(selectedEncounter.id, 1)}
                  disabled={!isRunning}
                >
                  Next Turn →
                </Button>
                <Button
                  variant="outline"
                  onClick={() => stopEncounter(selectedEncounter.id)}
                >
                  Stop combat
                </Button>
              </div>
            ) : (
              <>
                {/* 1. Encounter name */}
                <p className="truncate text-xs text-muted">{selectedEncounter.name}</p>

                {/* 2. Round N + Prev / Next Turn */}
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    className="h-8 px-2 text-xs"
                    onClick={() => advanceEncounterTurn(selectedEncounter.id, -1)}
                    disabled={!isRunning || !orderedParticipants.length}
                    aria-label="Previous turn"
                  >
                    ← Prev
                  </Button>
                  <span className="min-w-[2rem] text-center font-mono text-2xl font-bold text-foreground">
                    {selectedEncounter.round}
                  </span>
                  <Button
                    className="flex-1 py-2 text-sm font-bold"
                    onClick={() => advanceEncounterTurn(selectedEncounter.id, 1)}
                    disabled={!isRunning || !orderedParticipants.length}
                    aria-label="Next turn (N)"
                  >
                    Next Turn →
                  </Button>
                </div>

                {/* 3. Current participant card */}
                <div className="rounded-xl bg-surface-strong p-3 space-y-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ParticipantAvatar
                      name={activeParticipant.name}
                      visual={activeParticipant.visual}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/10 bg-surface object-cover text-[0.7rem] font-semibold text-muted"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">{activeParticipant.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Pill label={activeParticipant.kind.toUpperCase()} tone="neutral" />
                        <span className="font-mono text-xs text-muted">
                          Init {activeParticipant.initiative ?? "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                  {activeParticipant.maxHp !== null && activeParticipant.currentHp !== null ? (
                    <>
                      <p className="font-mono text-sm">
                        {activeParticipant.currentHp} / {activeParticipant.maxHp}
                      </p>
                      <HpBar
                        current={activeParticipant.currentHp}
                        max={activeParticipant.maxHp}
                      />
                    </>
                  ) : (
                    <p className="text-xs text-muted">HP not tracked</p>
                  )}
                </div>

                {/* 4. Next up preview */}
                {nextParticipant && (
                  <p className="text-xs text-muted truncate">
                    Next: <span className="font-semibold text-foreground">{nextParticipant.name}</span>
                  </p>
                )}

                {/* 5. Damage / Heal */}
                <div className="space-y-1.5">
                  <Input
                    type="number"
                    min={1}
                    className="w-full"
                    placeholder="Amount"
                    value={damageAmount}
                    onChange={(e) => setDamageAmount(e.target.value.replace(/[^0-9]/g, ""))}
                    disabled={hpInputDisabled}
                  />
                  <div className="flex gap-1.5">
                    <Button
                      className="flex-1 text-xs py-1.5"
                      style={{
                        backgroundColor: "var(--btn-damage-bg)",
                        color: "var(--btn-damage-fg)",
                      }}
                      onClick={() => applyDamage(hpAmount)}
                      disabled={hpActionDisabled}
                    >
                      − Damage
                    </Button>
                    <Button
                      className="flex-1 text-xs py-1.5"
                      style={{
                        backgroundColor: "var(--btn-heal-bg)",
                        color: "var(--btn-heal-fg)",
                      }}
                      onClick={() => applyHeal(hpAmount)}
                      disabled={hpActionDisabled}
                    >
                      + Heal
                    </Button>
                  </div>
                </div>

                {/* 6. Condition picker */}
                <ConditionPicker
                  conditions={SRD_CONDITIONS}
                  active={activeParticipant.conditions}
                  onChange={(next) => {
                    dispatchEncounterEvent(selectedEncounter.id, {
                      t: "CONDITIONS_SET",
                      participantId: activeParticipant.id,
                      value: next,
                    });
                  }}
                />

                {/* 7. Tablet stat row (lg:hidden) */}
                <div className="lg:hidden font-mono text-xs text-muted">
                  {(activePc || activeMonster) ? (
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                      {(["str", "dex", "con", "int", "wis", "cha"] as const).map((k) => (
                        <span key={k}>
                          {k.toUpperCase()} {(activePc ?? activeMonster)!.abilities[k]}
                        </span>
                      ))}
                      <span>AC {activeParticipant.ac ?? "—"}</span>
                    </div>
                  ) : (
                    <span>AC {activeParticipant.ac ?? "—"}</span>
                  )}
                </div>

                {/* 8. Last action + Undo */}
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex min-w-0 flex-1 items-center rounded-xl px-2.5 py-1.5 text-xs",
                      lastEvent?.t === "DAMAGE_APPLIED"
                        ? "bg-[var(--hp-low-bg)] text-[var(--hp-low)]"
                        : lastEvent?.t === "HEAL_APPLIED"
                          ? "bg-[var(--hp-full-bg)] text-[var(--hp-full)]"
                          : lastEvent?.t === "TURN_ADVANCED"
                            ? "bg-accent/10 text-accent"
                            : "bg-surface text-muted"
                    )}
                  >
                    <span className="truncate">
                      {lastEvent ? formatEventSummary(lastEvent) : "No actions yet"}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold"
                    onClick={() => undoEncounterEvent(selectedEncounter.id)}
                    disabled={!selectedEncounter.eventLog.length}
                  >
                    ↩ Undo
                  </Button>
                </div>

                {/* 9. Stop / End — mt-auto pushes to bottom */}
                <div className="mt-auto border-t border-black/10 pt-3 flex flex-wrap gap-2">
                  {isRunning ? (
                    <Button
                      variant="outline"
                      className="text-xs px-3 py-1.5"
                      onClick={() => stopEncounter(selectedEncounter.id)}
                    >
                      Stop
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="text-xs px-3 py-1.5"
                      onClick={() => startEncounter(selectedEncounter.id)}
                      disabled={!combatRequirementsMet}
                    >
                      Start
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="text-xs px-3 py-1.5"
                    onClick={() =>
                      dispatchEncounterEvent(selectedEncounter.id, {
                        t: "COMBAT_MODE_SET",
                        mode: "prep",
                      })
                    }
                  >
                    ← Prep
                  </Button>
                  <Button
                    variant="outline"
                    className="ml-auto text-xs px-3 py-1.5"
                    onClick={() => setIsEndEncounterOpen(true)}
                    disabled={isRunning}
                  >
                    End
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* ================================================================ */}
          {/* INITIATIVE LIST — flex-1, scrolls internally                     */}
          {/* ================================================================ */}
          <div className="flex flex-1 flex-col overflow-y-auto p-3 gap-1.5">
            {combatListParticipants.map((participant) => {
              const isActive = participant.id === selectedEncounter.activeParticipantId;
              const isDefeatedRow = isDefeated(participant.currentHp);
              const visibleConds = participant.conditions.slice(0, 2);
              const overflowCount = participant.conditions.length - 2;

              return (
                <div
                  key={participant.id}
                  ref={(el) => {
                    if (el) participantRowRefs.current.set(participant.id, el);
                    else participantRowRefs.current.delete(participant.id);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
                    isActive
                      ? "border-accent bg-surface-strong ring-2 ring-[var(--ring)]"
                      : "border-black/10 bg-surface",
                    isDefeatedRow ? "opacity-60" : "",
                    participant.kind === "monster" && !isDefeatedRow
                      ? "hidden lg:flex cursor-pointer hover:border-accent/50"
                      : "flex"
                  )}
                  onClick={() => {
                    if (participant.kind === "monster" && !isDefeatedRow) {
                      setReferencePinnedId(participant.id);
                    }
                  }}
                >
                  <ParticipantAvatar
                    name={participant.name}
                    visual={participant.visual}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/10 bg-surface-strong object-cover text-[0.6rem] font-semibold text-muted"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="truncate text-sm font-semibold">{participant.name}</p>
                      <Pill label={participant.kind.toUpperCase()} tone="neutral" />
                    </div>
                    {participant.conditions.length > 0 && (
                      <div className="flex items-center gap-1 mt-0.5 flex-nowrap overflow-hidden">
                        {visibleConds.map((cond) => (
                          <ConditionChip
                            key={cond}
                            label={cond}
                            description={SRD_CONDITION_DESCRIPTIONS[cond]}
                          />
                        ))}
                        {overflowCount > 0 && (
                          <span className="text-xs text-muted shrink-0">+{overflowCount}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right font-mono text-xs text-muted space-y-0.5">
                    <div>
                      {participant.initiative ?? "—"} · {participant.ac ?? "—"} ·{" "}
                      {participant.maxHp !== null && participant.currentHp !== null
                        ? `${participant.currentHp}/${participant.maxHp}`
                        : "—"}
                    </div>
                    {participant.maxHp !== null && participant.currentHp !== null && (
                      <HpBar
                        current={participant.currentHp}
                        max={participant.maxHp}
                        className="w-16"
                      />
                    )}
                  </div>
                  <div
                    className="shrink-0 flex gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <QuickActionPopover
                      participantName={participant.name}
                      open={openPopoverId === participant.id}
                      onOpenChange={(o) => setOpenPopoverId(o ? participant.id : null)}
                      onDamage={(amount) => {
                        dispatchEncounterEvent(selectedEncounter.id, {
                          t: "DAMAGE_APPLIED",
                          participantId: participant.id,
                          amount,
                        });
                      }}
                      onHeal={(amount) => {
                        dispatchEncounterEvent(selectedEncounter.id, {
                          t: "HEAL_APPLIED",
                          participantId: participant.id,
                          amount,
                        });
                      }}
                    >
                      <Button variant="outline" className="h-7 px-2.5 text-xs">
                        ± HP
                      </Button>
                    </QuickActionPopover>
                    {/* Tablet stat block button — hidden on desktop (reference panel handles it) */}
                    {participant.kind === "monster" && participant.refId && (
                      <Button
                        variant="outline"
                        className="h-7 px-2.5 text-xs lg:hidden"
                        onClick={() => showStatBlock(participant)}
                        aria-label={`View stat block for ${participant.name}`}
                      >
                        Stat Block
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {combatListParticipants.length === 0 && (
              <p className="text-sm text-muted p-3">No participants in this encounter.</p>
            )}
          </div>

          {/* ================================================================ */}
          {/* REFERENCE PANEL — 300px, desktop only (hidden lg:flex)           */}
          {/* ================================================================ */}
          <div className="hidden lg:flex w-[300px] shrink-0 flex-col overflow-y-auto border-l border-black/10 p-4 gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Reference</p>

            {!refParticipant ? (
              <p className="text-sm text-muted">Click a monster row to pin its stat block here.</p>
            ) : refPc ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <ParticipantAvatar
                    name={refPc.name}
                    visual={refPc.visual}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-surface-strong object-cover text-[0.65rem] font-semibold text-muted"
                  />
                  <div>
                    <p className="font-semibold">{refPc.name}</p>
                    <p className="text-xs text-muted">{refPc.className} {refPc.level} · AC {refPc.ac}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 font-mono text-xs">
                  {(["str", "dex", "con", "int", "wis", "cha"] as const).map((k) => (
                    <div key={k} className="rounded bg-surface-strong p-1.5 text-center">
                      <p className="text-muted uppercase">{k}</p>
                      <p className="font-semibold">{refPc.abilities[k]}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs text-muted uppercase tracking-[0.2em]">Saves</p>
                  <p className="font-mono text-xs">
                    {(["str", "dex", "con", "int", "wis", "cha"] as const).map((k) => {
                      const mod = getAbilityMod(refPc.abilities[k]);
                      const prof = refPc.saveProficiencies[k] ? refPc.proficiencyBonus : 0;
                      const bonus = refPc.saveBonuses[k] ?? 0;
                      const total = mod + prof + bonus;
                      return `${k.toUpperCase()} ${total >= 0 ? "+" : ""}${total}`;
                    }).join(" · ")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted uppercase tracking-[0.2em]">Passive Perception</p>
                  <p className="font-mono text-xs">{getPassivePerception(refPc)}</p>
                </div>
                {(refPc.spellcasting?.spellSlots?.length ?? 0) > 0 && (
                  <SpellSlotsReadout pc={refPc} />
                )}
                {refPc.notes && (
                  <div>
                    <p className="text-xs text-muted uppercase tracking-[0.2em]">Notes</p>
                    <p className="text-xs">{refPc.notes}</p>
                  </div>
                )}
              </div>
            ) : refMonster ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold">{refMonster.name}</p>
                  <p className="text-xs text-muted">
                    {refMonster.size} {refMonster.type} · CR {refMonster.challenge} · AC {refMonster.ac} · HP {refMonster.hp}
                  </p>
                  <p className="text-xs text-muted">Speed {refMonster.speed}</p>
                </div>
                <div className="grid grid-cols-3 gap-1 font-mono text-xs">
                  {(["str", "dex", "con", "int", "wis", "cha"] as const).map((k) => (
                    <div key={k} className="rounded bg-surface-strong p-1.5 text-center">
                      <p className="text-muted uppercase">{k}</p>
                      <p className="font-semibold">{refMonster.abilities[k]}</p>
                    </div>
                  ))}
                </div>
                {refMonster.senses && (
                  <p className="text-xs text-muted">Senses {refMonster.senses}</p>
                )}
                {(refMonster.traits?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs text-muted uppercase tracking-[0.2em]">Traits</p>
                    <p className="text-xs">{refMonster.traits?.join(" ")}</p>
                  </div>
                )}
                {(refMonster.actions?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs text-muted uppercase tracking-[0.2em]">Actions</p>
                    <p className="text-xs">{refMonster.actions?.join(" ")}</p>
                  </div>
                )}
              </div>
            ) : (
              /* Custom NPC — no refId */
              <div className="space-y-2 text-sm">
                <p className="font-semibold">{refParticipant.name}</p>
                <p className="text-xs text-muted">{refParticipant.kind.toUpperCase()} · AC {refParticipant.ac ?? "—"} · Init {refParticipant.initiative ?? "—"}</p>
                {refParticipant.conditions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {refParticipant.conditions.map((c) => (
                      <ConditionChip key={c} label={c} description={SRD_CONDITION_DESCRIPTIONS[c]} />
                    ))}
                  </div>
                )}
                {refParticipant.notes && (
                  <p className="text-xs text-muted">{refParticipant.notes}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Dialogs (rendered outside the fixed overlay so they stack above it) */}
        {/* ------------------------------------------------------------------ */}
        {completedEncounterSnapshot && (
          <EncounterCompleteDialog
            encounter={completedEncounterSnapshot}
            monstersById={monstersById}
            open={!!completedEncounterSnapshot}
            onClose={() => setCompletedEncounterSnapshot(null)}
          />
        )}

        <MonsterStatBlockDialog
          monster={statBlockMonsterId ? monstersById.get(statBlockMonsterId) ?? null : null}
          open={!!statBlockMonsterId}
          onClose={() => setStatBlockMonsterId(null)}
        />

        {/* End encounter dialog */}
        <Dialog
          open={isEndEncounterOpen}
          onOpenChange={(open) => {
            if (!open) setIsEndEncounterOpen(false);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogTitle>End encounter?</DialogTitle>
            <p className="text-sm text-muted">
              This will complete the encounter and move it out of the active list.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={() => {
                  setCompletedEncounterSnapshot(selectedEncounter);
                  dispatchEncounterEvent(selectedEncounter.id, { t: "ENCOUNTER_COMPLETED" });
                  setIsEndEncounterOpen(false);
                }}
              >
                Complete Encounter
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
  ```

- [ ] **Step 4: Remove the old combat-mode JSX block from the prep-mode return**

  Inside the existing `return (<PageShell…>`, there is a large `{combatMode ? (<>…</>) : (…)}` block that renders the old three-column grid. Since combat mode now returns early above, this entire conditional becomes dead code.

  First, locate the exact line boundaries:
  ```bash
  grep -n "combatMode ?" app/encounters/player/page.tsx
  ```
  This will show the line where `{combatMode ? (` begins. The block closes with `)}` after the prep-branch content.

  Replace the entire `{combatMode ? (<>…</>) : (prep block)}` section with just the prep block contents (unwrapped from the conditional) — i.e., remove the `combatMode ? (<>…</>) :` wrapper and keep only the `(else/prep branch)` content.

  Specifically: delete everything from `{combatMode ? (` through `)}` at the end of the old combat branch, keeping the prep mode JSX that was the `else` branch.

  Also: remove the old `<EncounterCompleteDialog>` and `<MonsterStatBlockDialog>` renders at the bottom of the PageShell return (they now live in the combatMode early return above). But you must keep the end-encounter `<Dialog>` in the prep mode return since it's triggered from prep mode too — OR verify the `isEndEncounterOpen` dialog is accessible from prep mode as well. If the dialog is already rendered at the bottom of `PageShell`, leave it there for prep mode. Only remove the duplicate renders if they exist.

  > **Note:** This step requires careful reading of the existing JSX structure. The key invariant: after this edit, prep mode should render identically to how it did before this sprint.

- [ ] **Step 5: Also remove the `.targeted-outline` class usage from init list rows**

  Search for `targeted-outline` in `page.tsx` and delete its usage (it was on participant rows, line ~1010). The class itself was removed from globals.css in Task 1.

  ```bash
  grep -n "targeted-outline" app/encounters/player/page.tsx
  ```
  Expected: 0 matches (already gone if the old combat JSX was removed in Step 4).

- [ ] **Step 6: Run TypeScript check**

  ```bash
  npx tsc --noEmit 2>&1 | head -60
  ```
  Expected: 0 errors. Fix any remaining references to `effectiveTargetId`, `damageTargetId`, `applyDamageToTarget`, `removeTargetFromCombat`.

- [ ] **Step 7: Run lint**

  ```bash
  npm run lint
  ```
  Expected: 0 new errors.

- [ ] **Step 8: Run tests**

  ```bash
  npm test
  ```
  Expected: all pass (no engine changes were made).

- [ ] **Step 9: Smoke test — prep mode**

  Start `npm run dev`. Navigate to `/encounters/player`. Verify:
  - Prep mode renders with `PageShell` (normal document scroll)
  - Can add participants, set initiative
  - Can click "Go to combat mode" — switches to combat mode (viewport overlay appears)
  - Can click "← Prep" — returns to prep mode (document scroll returns)

- [ ] **Step 10: Smoke test — combat mode layout**

  In combat mode, verify:
  - Page does not scroll (body overflow clipped)
  - Left panel visible (280px, fixed, never scrolls)
  - Initiative list scrolls independently when long
  - Reference panel visible on desktop (300px), hidden on tablet
  - "Next Turn →" advances turn; "← Prev" goes back
  - Round counter increments correctly
  - `N`/`→` keyboard shortcut advances turn; `P`/`←` goes back

- [ ] **Step 11: Smoke test — left panel actions**

  - Enter an amount and click "− Damage" → participant HP decreases, HpBar updates
  - Click "+ Heal" → HP increases
  - Buttons disabled when HP is null or no amount entered
  - Condition picker toggles conditions on `activeParticipant`
  - "↩ Undo" reverses last action
  - "Stop" button stops combat; "← Prep" returns to prep mode
  - When all living participants are defeated, `activeParticipant` is null → null state message appears

- [ ] **Step 12: Smoke test — initiative list**

  - All living participants appear first, defeated at bottom with 60% opacity
  - Rows are approximately 48px tall, compact
  - `± HP` button opens `QuickActionPopover` for that participant
  - Monster row click (desktop) → sets reference panel to that monster
  - Monster row on tablet → "Stat Block" button opens `MonsterStatBlockDialog`
  - Active participant row has accent border + ring highlight
  - Active participant row auto-scrolls into view on turn advance

- [ ] **Step 13: Smoke test — reference panel (desktop only)**

  - Clicking a monster row shows monster stat block in right panel
  - Turn advance clears the pinned monster (reverts to active participant)
  - Active PC → shows PC stats (ability grid, saves, passive perception, spell slots if any)
  - Active monster (no click override) → shows monster stat block
  - Custom NPC (no refId) → shows name, kind, AC, conditions, notes

- [ ] **Step 14: Commit**

  ```bash
  git add app/encounters/player/page.tsx
  git commit -m "feat(encounter): viewport-locked combat dashboard — three-column fixed overlay"
  ```

---

## Chunk 4: Initiative list — fix monster row visibility on tablet

> **Note:** The monster row click-to-reference behavior was implemented with `hidden lg:flex cursor-pointer` in the initiative list row className. However, all other rows (PC, NPC, defeated) need to be visible on tablet too. This chunk ensures the className logic is correct for all participant kinds.

### Task 4: Verify and fix row visibility logic

**Files:**
- Modify: `app/encounters/player/page.tsx` (initiative list rows)

- [ ] **Step 1: Review the row className logic written in Task 3**

  The row div currently has:
  ```tsx
  className={cn(
    "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
    isActive ? "..." : "...",
    isDefeatedRow ? "opacity-60" : "",
    participant.kind === "monster" && !isDefeatedRow
      ? "hidden lg:flex cursor-pointer hover:border-accent/50"
      : "flex"
  )}
  ```

  This accidentally hides monster rows on tablet. Monster rows should be visible on tablet — they just don't have click-to-reference behavior (they have the Stat Block button instead).

- [ ] **Step 2: Fix the row className — all rows visible on all breakpoints**

  Replace the last condition in `cn(...)`:
  ```tsx
  participant.kind === "monster" && !isDefeatedRow
    ? "cursor-pointer lg:hover:border-accent/50"
    : ""
  ```

  Remove `hidden lg:flex` — all rows should be `flex` (the default). The Stat Block button's `lg:hidden` class already handles the desktop/tablet distinction for the button.

- [ ] **Step 3: Lint and TypeScript check**

  ```bash
  npm run lint && npx tsc --noEmit
  ```

- [ ] **Step 4: Smoke test — monster rows on tablet viewport (md)**

  Resize browser to tablet width (768px). Verify:
  - Monster rows are visible
  - "Stat Block" button appears on monster rows (it has `lg:hidden`)
  - Clicking "Stat Block" opens `MonsterStatBlockDialog`

- [ ] **Step 5: Commit**

  ```bash
  git add app/encounters/player/page.tsx
  git commit -m "fix(encounter): monster rows visible on all breakpoints in combat list"
  ```

---

## Final verification

- [ ] **Run full test suite**

  ```bash
  npm test
  ```
  Expected: all pass.

- [ ] **Run build**

  ```bash
  npm run build
  ```
  Expected: 0 errors, 0 warnings about `targeted-outline`.

- [ ] **Cross-check spec compliance**

  Review `docs/superpowers/specs/2026-03-14-encounter-player-viewport-layout-design.md` section by section:
  - [ ] Nav: `fixed h-16`, campaign inline, `--nav-height: 64px` ✓
  - [ ] layout.tsx: `pt-16` ✓
  - [ ] globals.css: `--nav-height` added, `.targeted-outline` deleted ✓
  - [ ] Combat mode: fixed overlay `inset-x-0 bottom-0 top-[var(--nav-height)]` ✓
  - [ ] Scroll lock: `body.overflow = "clip"` in useEffect, restored on cleanup ✓
  - [ ] PageShell only in prep mode ✓
  - [ ] Left panel: targets `activeParticipant.id` only ✓
  - [ ] `damageTargetId` / `effectiveTargetId` removed ✓
  - [ ] Remove participant button absent from left panel ✓
  - [ ] Null state for `activeParticipant` ✓
  - [ ] `localNotes` useEffect on `activeParticipant?.id` ✓
  - [ ] Initiative list: `combatListParticipants` (living first, defeated last) ✓
  - [ ] Compact rows with ± HP button ✓
  - [ ] `DmDeathSaveTracker` not rendered in rows ✓
  - [ ] Monster row click → `referencePinnedId` (desktop); Stat Block button (tablet) ✓
  - [ ] Reference panel: `hidden lg:flex`, 300px, `referencePinnedId ?? activeParticipantId` ✓
  - [ ] `referencePinnedId` cleared on turn advance ✓
  - [ ] Keyboard shortcuts preserved ✓
