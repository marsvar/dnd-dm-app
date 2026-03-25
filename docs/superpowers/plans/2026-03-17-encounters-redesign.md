# Encounters Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/app/encounters/player` to have two visually distinct phases — Prep (initiative staging) and Combat (live tracking) — connected by a deliberate "Launch Combat" gate, with inline damage interaction replacing the popover.

**Architecture:** The existing 1,457-line `page.tsx` is refactored into a thin routing shell that branches on `combatMode`. Sub-components are colocated in `app/encounters/player/`. Two new shared components go in `app/components/`. A new `participantHelpers.ts` pure module provides tested helpers for resolving `refId` lookups and calculating initiative modifiers. All combat interactions use existing engine events; prep-mode initiative changes use `updateEncounterParticipant` (consistent with existing prep-mode architecture).

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4, Radix UI (via `ui.tsx`), Zustand (`appStore`), Node.js built-in test runner (`node:test`), 21st.dev MCP for component variations, Context7 MCP for API verification.

---

## Key API Reference (verified from codebase)

```typescript
// ParticipantAvatar — props: { name: string, visual?: ParticipantVisual, className?: string, size?: "sm" | "md" | "lg" }
// ConditionChip — props: { label: string, description?: string, onRemove?: () => void }
// ConditionPicker — props: { active: string[], conditions: readonly string[], onChange: (next: string[]) => void }
// SRD_CONDITIONS — imported from "../../lib/data/srd.ts"
// Store actions: updateEncounterParticipant(encounterId, participantId, updates: Partial<EncounterParticipant>)
//                startEncounter(encounterId)          → dispatches COMBAT_STARTED
//                advanceEncounterTurn(encounterId, direction: 1 | -1)
//                undoEncounterEvent(encounterId)
//                dispatchEncounterEvent(encounterId, event)
```

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `app/lib/engine/participantHelpers.ts` | Pure: `resolveParticipantSource`, `getDexMod`, `getInitiativeMod` |
| `app/lib/engine/__tests__/participantHelpers.test.ts` | Unit tests for above |
| `app/components/TurnOrderPreview.tsx` | Stateless chip strip showing current initiative order |
| `app/components/CombatParticipantRow.tsx` | Single row: collapsed / expanded-damage states |
| `app/encounters/player/PrepPhase.tsx` | Initiative staging table, preview strip, launch footer |
| `app/encounters/player/CombatHeader.tsx` | Round display, Prev/Next Turn buttons, Undo, End Encounter |
| `app/encounters/player/CombatParticipantList.tsx` | Scrollable list, manages `expandedRowId` |
| `app/encounters/player/CombatInspector.tsx` | Right inspector panel, auto-follows active turn |

### Modified files
| File | What changes |
|------|-------------|
| `app/globals.css` | Add `--combat-*` CSS tokens (always-dark block) |
| `app/encounters/player/page.tsx` | Reduce to routing shell; branch on `combatMode` |

### Retired files
| File | When |
|------|------|
| `app/components/QuickActionPopover.tsx` | After Task 10 (page wiring confirmed working) |

---

## Chunk 1: Foundation

### Task 1: Add CSS tokens to globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Verify Tailwind v4 @theme inline syntax via Context7**

  ```
  Use mcp__context7__resolve-library-id with query "tailwindcss"
  Then mcp__context7__query-docs to confirm that CSS custom properties defined
  in a bare :root block outside @theme inline are accessible as var(--token-name)
  in Tailwind v4 utility classes and via style={{ color: "var(--token)" }}.
  ```

- [ ] **Step 2: Open `app/globals.css` and insert after the closing `}` of the first `:root` block (after line ~37, before `@theme inline`)**

  ```css
  /* Combat phase surfaces — always dark regardless of OS color scheme */
  :root {
    --combat-bg: #1a1814;
    --combat-surface: #13110e;
    --combat-surface-raised: #1e1c17;
    --combat-border: #2e2a22;
    --combat-border-raised: #3a3528;
    --combat-fg: #e8dfc8;
    --combat-fg-muted: #7a6a50;

    --combat-active-row-bg: #1e1a0e;
    --combat-active-border: #c8a020;
    --combat-active-name: #f0e090;
    --combat-active-avatar-ring: #c8a020;

    --combat-live-bg: #7f1d1d;
    --combat-live-fg: #fca5a5;
    --combat-live-dot: #f87171;

    --combat-round-number: #e8d080;
  }
  ```

- [ ] **Step 3: Inside the existing `@theme inline` block, add mappings for the new tokens**

  ```css
  --color-combat-bg: var(--combat-bg);
  --color-combat-surface: var(--combat-surface);
  --color-combat-surface-raised: var(--combat-surface-raised);
  --color-combat-border: var(--combat-border);
  --color-combat-border-raised: var(--combat-border-raised);
  --color-combat-fg: var(--combat-fg);
  --color-combat-fg-muted: var(--combat-fg-muted);
  --color-combat-active-row-bg: var(--combat-active-row-bg);
  --color-combat-active-border: var(--combat-active-border);
  --color-combat-active-name: var(--combat-active-name);
  --color-combat-active-avatar-ring: var(--combat-active-avatar-ring);
  --color-combat-live-bg: var(--combat-live-bg);
  --color-combat-live-fg: var(--combat-live-fg);
  --color-combat-live-dot: var(--combat-live-dot);
  --color-combat-round-number: var(--combat-round-number);
  ```

- [ ] **Step 4: Run lint**

  ```bash
  npm run lint
  ```
  Expected: zero errors.

- [ ] **Step 5: Commit**

  ```bash
  git add app/globals.css
  git commit -m "feat(encounters): add --combat-* CSS tokens for always-dark combat view"
  ```

---

### Task 2: Create participantHelpers.ts

**Files:**
- Create: `app/lib/engine/participantHelpers.ts`

- [ ] **Step 1: Create the file**

  ```typescript
  // app/lib/engine/participantHelpers.ts
  import type { EncounterParticipant, Pc, Monster } from "../models/types.ts";

  /**
   * Look up the source record (Pc or Monster) for a participant via refId.
   * Returns null for NPCs or when refId is absent/unmatched.
   */
  export function resolveParticipantSource(
    participant: EncounterParticipant,
    pcs: Pc[],
    monsters: Monster[]
  ): Pc | Monster | null {
    if (!participant.refId) return null;
    if (participant.kind === "pc") {
      return pcs.find((p) => p.id === participant.refId) ?? null;
    }
    if (participant.kind === "monster") {
      return monsters.find((m) => m.id === participant.refId) ?? null;
    }
    return null;
  }

  /** Convert an ability score to its modifier: floor((score - 10) / 2). */
  export function getDexMod(dexScore: number): number {
    return Math.floor((dexScore - 10) / 2);
  }

  /**
   * Get the initiative modifier for a participant.
   * Returns the DEX mod from the source Pc or Monster record, or 0 if unavailable.
   */
  export function getInitiativeMod(
    participant: EncounterParticipant,
    pcs: Pc[],
    monsters: Monster[]
  ): number {
    const source = resolveParticipantSource(participant, pcs, monsters);
    if (!source) return 0;
    return getDexMod(source.abilities.dex);
  }
  ```

- [ ] **Step 2: Verify it compiles**

  ```bash
  npm run build
  ```
  Expected: build exits with code 0. No TypeScript errors.

---

### Task 3: Test participantHelpers.ts

**Files:**
- Create: `app/lib/engine/__tests__/participantHelpers.test.ts`

- [ ] **Step 1: Write the tests**

  ```typescript
  // app/lib/engine/__tests__/participantHelpers.test.ts
  import { describe, it } from "node:test";
  import assert from "node:assert/strict";
  import {
    resolveParticipantSource,
    getDexMod,
    getInitiativeMod,
  } from "../participantHelpers.ts";
  import type { EncounterParticipant, Pc, Monster } from "../../models/types.ts";

  // Cast as unknown first — Pc has many required fields not needed for these tests.
  // saveProficiencies/saveBonuses are the correct field names (not saves).
  const basePc = {
    id: "pc-1", name: "Atrynn", playerName: "Alex", className: "Rogue",
    race: "Elf", level: 5, ac: 16, maxHp: 42, currentHp: 42, tempHp: 0,
    abilities: { str: 10, dex: 18, con: 14, int: 12, wis: 13, cha: 16 },
    skills: {}, saveProficiencies: {}, saveBonuses: {},
    resources: [], notes: "", inspiration: false, conditions: [],
  } as unknown as Pc;

  // alignment is required on Monster — include it.
  const baseMonster = {
    id: "mon-1", name: "Goblin", size: "Small", type: "humanoid",
    alignment: "neutral evil",
    ac: 13, hp: 7, speed: "30 ft.", challenge: "1/4",
    abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
    source: "SRD",
  } as unknown as Monster;

  const makeParticipant = (overrides: Partial<EncounterParticipant> = {}): EncounterParticipant => ({
    id: "p-1", name: "Test", kind: "pc", refId: undefined,
    initiative: null, ac: 10, maxHp: 10, currentHp: 10, tempHp: 0,
    conditions: [], deathSaves: null,
    ...overrides,
  });

  describe("resolveParticipantSource", () => {
    it("returns Pc when kind is pc and refId matches", () => {
      const result = resolveParticipantSource(
        makeParticipant({ kind: "pc", refId: "pc-1" }), [basePc], []
      );
      assert.equal(result, basePc);
    });

    it("returns Monster when kind is monster and refId matches", () => {
      const result = resolveParticipantSource(
        makeParticipant({ kind: "monster", refId: "mon-1" }), [], [baseMonster]
      );
      assert.equal(result, baseMonster);
    });

    it("returns null when refId is absent", () => {
      assert.equal(
        resolveParticipantSource(makeParticipant({ kind: "pc" }), [basePc], []),
        null
      );
    });

    it("returns null when refId does not match any record", () => {
      assert.equal(
        resolveParticipantSource(makeParticipant({ kind: "pc", refId: "pc-999" }), [basePc], []),
        null
      );
    });

    it("returns null for npc kind even with refId", () => {
      assert.equal(
        resolveParticipantSource(makeParticipant({ kind: "npc", refId: "pc-1" }), [basePc], []),
        null
      );
    });
  });

  describe("getDexMod", () => {
    it("returns 0 for score 10", () => assert.equal(getDexMod(10), 0));
    it("returns +4 for score 18", () => assert.equal(getDexMod(18), 4));
    it("returns -1 for score 8", () => assert.equal(getDexMod(8), -1));
    it("returns +5 for score 20", () => assert.equal(getDexMod(20), 5));
    it("rounds down: +2 for score 15", () => assert.equal(getDexMod(15), 2));
  });

  describe("getInitiativeMod", () => {
    it("returns DEX mod from Pc (dex 18 → +4)", () => {
      assert.equal(
        getInitiativeMod(makeParticipant({ kind: "pc", refId: "pc-1" }), [basePc], []),
        4
      );
    });

    it("returns DEX mod from Monster (dex 14 → +2)", () => {
      assert.equal(
        getInitiativeMod(makeParticipant({ kind: "monster", refId: "mon-1" }), [], [baseMonster]),
        2
      );
    });

    it("returns 0 when refId is absent", () => {
      assert.equal(
        getInitiativeMod(makeParticipant({ kind: "pc" }), [basePc], []),
        0
      );
    });
  });
  ```

- [ ] **Step 2: Run tests — confirm pass**

  ```bash
  npm test
  ```
  Expected: all tests pass including the new `participantHelpers.test.ts` suite.

- [ ] **Step 3: Commit**

  ```bash
  git add app/lib/engine/participantHelpers.ts app/lib/engine/__tests__/participantHelpers.test.ts
  git commit -m "feat(encounters): add participantHelpers — resolveParticipantSource, getInitiativeMod (tested)"
  ```

---

## Chunk 2: PrepPhase

### Task 4: TurnOrderPreview component

**Files:**
- Create: `app/components/TurnOrderPreview.tsx`

- [ ] **Step 1: Generate component variations via 21st.dev**

  ```
  Use mcp__magic__21st_magic_component_builder with this prompt:
  "A horizontal chip strip showing D&D initiative turn order. Each chip shows
  [initiative number] participant name. Chips for participants with no initiative
  set show [?] with dashed border and 50% opacity. Chips are ordered by initiative
  descending (highest first). Uses CSS variables for theming: --surface,
  --surface-strong, --foreground, --muted, --accent. Tailwind CSS v4."

  Generate 2 variations. Use mcp__magic__21st_magic_component_refiner to refine
  toward minimal, dense, linear strip — no cards, no hover states needed.
  ```

- [ ] **Step 2: Create TurnOrderPreview.tsx using the design tokens**

  ```typescript
  // app/components/TurnOrderPreview.tsx
  "use client";
  import { cn } from "./ui";
  import type { EncounterParticipant } from "../lib/models/types";

  interface Props {
    participants: EncounterParticipant[];
  }

  function sortByInitiative(participants: EncounterParticipant[]): EncounterParticipant[] {
    return [...participants].sort((a, b) => {
      if (a.initiative === null && b.initiative === null) return a.name.localeCompare(b.name);
      if (a.initiative === null) return 1;
      if (b.initiative === null) return -1;
      if (b.initiative !== a.initiative) return b.initiative - a.initiative;
      return a.name.localeCompare(b.name);
    });
  }

  export function TurnOrderPreview({ participants }: Props) {
    if (participants.length === 0) return null;
    const sorted = sortByInitiative(participants);

    return (
      <div className="flex items-center gap-2 flex-wrap rounded-xl border border-black/10 bg-surface px-4 py-2.5">
        <span className="text-[0.6rem] font-bold uppercase tracking-widest text-muted shrink-0 mr-1">
          Turn order
        </span>
        {sorted.map((p, i) => (
          <span key={p.id} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-muted text-xs">›</span>}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                p.initiative !== null
                  ? "border-black/10 bg-surface-strong text-foreground"
                  : "border-dashed border-black/10 text-muted opacity-50"
              )}
            >
              <span className="font-mono font-bold text-xs">
                {p.initiative !== null ? p.initiative : "?"}
              </span>
              <span className="truncate max-w-[80px]">{p.name}</span>
            </span>
          </span>
        ))}
      </div>
    );
  }
  ```

- [ ] **Step 3: Run lint**

  ```bash
  npm run lint
  ```
  Expected: zero errors.

- [ ] **Step 4: Commit**

  ```bash
  git add app/components/TurnOrderPreview.tsx
  git commit -m "feat(encounters): add TurnOrderPreview chip strip component"
  ```

---

### Task 5: PrepPhase component

> **Pre-condition:** Chunk 1 (Tasks 1–3) must be complete. `app/lib/engine/participantHelpers.ts` must exist before this task begins. Verify with `ls app/lib/engine/participantHelpers.ts` before starting.

> **Note on `updateEncounterParticipant` guard:** The store implementation skips participant updates when `encounter.isRunning === true`. In prep mode, `isRunning` is `false`, so all initiative writes via `updateEncounterParticipant` succeed. If the encounter somehow has `isRunning: true` during prep (edge case), initiative changes will silently no-op. This is acceptable — the guard is a safety net preventing accidental direct mutations during live combat.

**Files:**
- Create: `app/encounters/player/PrepPhase.tsx`

- [ ] **Step 1: Verify controlled input pattern via Context7**

  ```
  Use mcp__context7__resolve-library-id with query "react"
  Use mcp__context7__query-docs to confirm the recommended pattern for
  controlled number inputs with local draft state and onBlur commit in React 19.
  ```

- [ ] **Step 2: Create PrepPhase.tsx**

  ```typescript
  // app/encounters/player/PrepPhase.tsx
  "use client";
  import { useState, useCallback, useEffect } from "react";
  import {
    Button, Input, PageShell, SectionTitle, Card, Pill, cn,
  } from "../../components/ui";
  import { ParticipantAvatar } from "../../components/ParticipantAvatar";
  import { TurnOrderPreview } from "../../components/TurnOrderPreview";
  import { useAppStore } from "../../lib/store/appStore";
  import { getInitiativeMod } from "../../lib/engine/participantHelpers";
  import type { Encounter } from "../../lib/models/types";

  interface Props {
    encounter: Encounter;
  }

  export function PrepPhase({ encounter }: Props) {
    const { updateEncounterParticipant, dispatchEncounterEvent, startEncounter } = useAppStore();
    const pcs = useAppStore((s) => s.pcs);
    const monsters = useAppStore((s) => s.monsters);

    // Local draft values for initiative inputs (before committing on blur/enter)
    const [initDrafts, setInitDrafts] = useState<Record<string, string>>({});

    const rolledCount = encounter.participants.filter((p) => p.initiative !== null).length;
    const totalCount = encounter.participants.length;

    // Sort: initiative desc, name asc; nulls at bottom
    const sorted = [...encounter.participants].sort((a, b) => {
      if (a.initiative === null && b.initiative === null) return a.name.localeCompare(b.name);
      if (a.initiative === null) return 1;
      if (b.initiative === null) return -1;
      if (b.initiative !== a.initiative) return b.initiative - a.initiative;
      return a.name.localeCompare(b.name);
    });

    const rollOne = useCallback(
      (participantId: string) => {
        const p = encounter.participants.find((x) => x.id === participantId);
        if (!p) return;
        const mod = getInitiativeMod(p, pcs, monsters);
        const d20 = Math.ceil(Math.random() * 20);
        updateEncounterParticipant(encounter.id, participantId, { initiative: d20 + mod });
      },
      [encounter, pcs, monsters, updateEncounterParticipant]
    );

    const rollAll = useCallback(() => {
      for (const p of encounter.participants) {
        if (p.initiative === null) {
          const mod = getInitiativeMod(p, pcs, monsters);
          const d20 = Math.ceil(Math.random() * 20);
          updateEncounterParticipant(encounter.id, p.id, { initiative: d20 + mod });
        }
      }
    }, [encounter, pcs, monsters, updateEncounterParticipant]);

    const commitInitiative = useCallback(
      (participantId: string) => {
        const draft = initDrafts[participantId];
        if (draft === undefined) return;
        const parsed = parseInt(draft, 10);
        if (!isNaN(parsed)) {
          updateEncounterParticipant(encounter.id, participantId, { initiative: parsed });
        }
        setInitDrafts((prev) => {
          const next = { ...prev };
          delete next[participantId];
          return next;
        });
      },
      [initDrafts, encounter.id, updateEncounterParticipant]
    );

    const handleLaunch = useCallback(() => {
      dispatchEncounterEvent(encounter.id, { t: "COMBAT_MODE_SET", mode: "live" });
      startEncounter(encounter.id);
    }, [encounter.id, dispatchEncounterEvent, startEncounter]);

    // ⌘↵ keyboard shortcut to launch combat
    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          handleLaunch();
        }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }, [handleLaunch]);

    return (
      <PageShell>
        {/* Encounter header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <SectionTitle>{encounter.name}</SectionTitle>
            {encounter.location && (
              <div className="mt-1">
                <Pill tone="neutral">{encounter.location}</Pill>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 rounded-lg border border-black/10 bg-surface px-3 py-1.5">
            <span className="size-2 rounded-full bg-muted/30" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted">
              PREP — Roll Initiative
            </span>
          </div>
        </div>

        {/* Initiative table */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-muted">
              Initiative Order
            </span>
            <Button variant="outline" onClick={rollAll}>
              Roll All
            </Button>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[28px_1fr_100px_52px_80px] gap-3 items-center px-2 pb-2 border-b border-black/10">
            <div />
            <span className="text-[0.62rem] font-bold uppercase tracking-widest text-muted">Participant</span>
            <span className="text-[0.62rem] font-bold uppercase tracking-widest text-muted text-center">Initiative</span>
            <span className="text-[0.62rem] font-bold uppercase tracking-widest text-muted text-center">AC</span>
            <span className="text-[0.62rem] font-bold uppercase tracking-widest text-muted text-center">HP</span>
          </div>

          {/* Participant rows */}
          <div className="divide-y divide-black/5">
            {sorted.map((p) => {
              const hasInit = p.initiative !== null;
              const draft = initDrafts[p.id];
              const displayVal = draft !== undefined
                ? draft
                : p.initiative !== null ? String(p.initiative) : "";

              return (
                <div
                  key={p.id}
                  className={cn(
                    "grid grid-cols-[28px_1fr_100px_52px_80px] gap-3 items-center py-2.5 px-2 transition-opacity",
                    hasInit ? "opacity-100" : "opacity-65"
                  )}
                >
                  <ParticipantAvatar name={p.name} visual={p.visual} size="sm" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{p.name}</div>
                    <div className="text-[0.6rem] font-bold uppercase tracking-wide text-muted">{p.kind}</div>
                  </div>

                  {/* Initiative: inline input + optional d20 button */}
                  <div className="flex items-center justify-center gap-1.5">
                    <Input
                      type="number"
                      value={displayVal}
                      placeholder="—"
                      className="w-12 text-center font-mono font-bold text-sm"
                      onChange={(e) =>
                        setInitDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                      onBlur={() => commitInitiative(p.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitInitiative(p.id);
                      }}
                    />
                    {!hasInit && (
                      <Button
                        variant="ghost"
                        onClick={() => rollOne(p.id)}
                        aria-label={`Roll initiative for ${p.name}`}
                      >
                        d20
                      </Button>
                    )}
                  </div>

                  <div className="text-center font-mono font-bold text-sm">{p.ac ?? "—"}</div>
                  <div className="text-center font-mono text-sm">
                    {p.currentHp !== null && p.maxHp !== null
                      ? `${p.currentHp}/${p.maxHp}` : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Live turn order preview — pass pre-sorted array to avoid duplicating sort logic */}
        <TurnOrderPreview participants={sorted} />

        {/* Spacer for fixed footer */}
        <div className="h-20" />
      </PageShell>
    );
  }
  ```

- [ ] **Step 3: Add the fixed launch footer as a separate exported sub-component at the bottom of the file**

  ```typescript
  // Add below the PrepPhase function in the same file:

  export function PrepLaunchFooter({
    encounter,
    onLaunch,
  }: {
    encounter: Encounter;
    onLaunch: () => void;
  }) {
    const rolledCount = encounter.participants.filter((p) => p.initiative !== null).length;
    const totalCount = encounter.participants.length;
    const pending = totalCount - rolledCount;

    return (
      <div className="fixed bottom-0 left-0 right-0 z-10 flex items-center justify-between gap-4 border-t border-black/10 bg-background/90 px-6 py-3 backdrop-blur-sm">
        <span className="text-sm text-muted">
          <strong className="text-foreground">{rolledCount} of {totalCount}</strong>{" "}
          initiatives rolled{pending > 0 && ` · ${pending} pending`}
        </span>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onLaunch}>
            Skip unrolled →
          </Button>
          <Button variant="primary" onClick={onLaunch} aria-label="Launch Combat (⌘Enter)">
            ⚔ Launch Combat
            <span className="ml-2 font-mono text-[0.65rem] opacity-50">⌘↵</span>
          </Button>
        </div>
      </div>
    );
  }
  ```

  In `PrepPhase`, insert `<PrepLaunchFooter encounter={encounter} onLaunch={handleLaunch} />` **before** the spacer `<div className="h-20" />` and before the closing `</PageShell>` tag. The spacer must remain the last child inside `PageShell` so it creates clearance for the fixed footer. Final order: `... <PrepLaunchFooter .../> <div className="h-20" /> </PageShell>`.

- [ ] **Step 4: Run lint**

  ```bash
  npm run lint
  ```
  Expected: zero errors.

- [ ] **Step 5: Commit**

  ```bash
  git add app/encounters/player/PrepPhase.tsx
  git commit -m "feat(encounters): add PrepPhase — initiative staging, roll controls, launch footer"
  ```

---

## Chunk 3: Combat List + Header

### Task 6: CombatParticipantRow component

**Files:**
- Create: `app/components/CombatParticipantRow.tsx`

- [ ] **Step 1: Generate component variations via 21st.dev**

  ```
  Use mcp__magic__21st_magic_component_builder with this prompt:
  "A D&D combat tracker row for a participant. Two states:
  COLLAPSED: shows avatar (click = pin, does NOT expand row), name, kind label,
  initiative, condition chips, HP (color-coded), HP mini bar, AC.
  EXPANDED: same avatar/name, but HP cluster replaced by number input + Dmg + Heal buttons.
  Always-dark background. Active row has gold left border. HP colors: green/amber/red/grey.
  CSS vars: --combat-bg, --combat-fg, --combat-active-border, --combat-active-row-bg,
  --hp-full, --hp-mid, --hp-low, --hp-zero, --btn-damage-bg, --btn-damage-fg,
  --btn-heal-bg, --btn-heal-fg."

  Evaluate 2 variations. Refine with mcp__magic__21st_magic_component_refiner
  toward: maximum density, immediate legibility, clear active state.
  ```

- [ ] **Step 2: Create CombatParticipantRow.tsx**

  ```typescript
  // app/components/CombatParticipantRow.tsx
  "use client";
  import { useRef, useEffect } from "react";
  import { cn, Input } from "./ui";
  import { ParticipantAvatar } from "./ParticipantAvatar";
  import { ConditionChip } from "./ui";
  import type { EncounterParticipant } from "../lib/models/types";

  function hpColor(current: number | null, max: number | null): string {
    if (current === null || max === null || max === 0 || current <= 0) return "var(--hp-zero)";
    const pct = current / max;
    if (pct <= 0.25) return "var(--hp-low)";
    if (pct <= 0.5) return "var(--hp-mid)";
    return "var(--hp-full)";
  }

  interface Props {
    participant: EncounterParticipant;
    isActive: boolean;
    isExpanded: boolean;
    onExpand: (id: string) => void;   // row click (non-avatar area)
    onCollapse: () => void;
    onPin: (id: string) => void;      // avatar click — stopPropagation inside
    onDamage: (id: string, amount: number) => void;
    onHeal: (id: string, amount: number) => void;
  }

  export function CombatParticipantRow({
    participant: p, isActive, isExpanded,
    onExpand, onCollapse, onPin, onDamage, onHeal,
  }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (isExpanded) {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }, [isExpanded]);

    const handleAvatarClick = (e: React.MouseEvent) => {
      e.stopPropagation(); // critical: prevent row expansion
      onPin(p.id);
    };

    const handleRowClick = (e: React.MouseEvent) => {
      // stopPropagation prevents the list container's handleListClick from
      // immediately collapsing the row we just expanded.
      e.stopPropagation();
      if (!isExpanded) onExpand(p.id);
    };

    const commitDamage = () => {
      const amount = parseInt(inputRef.current?.value ?? "", 10);
      if (!isNaN(amount) && amount > 0) { onDamage(p.id, amount); onCollapse(); }
    };

    const commitHeal = () => {
      const amount = parseInt(inputRef.current?.value ?? "", 10);
      if (!isNaN(amount) && amount > 0) { onHeal(p.id, amount); onCollapse(); }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") { onCollapse(); return; }
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitDamage(); }
      else if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); commitHeal(); }
    };

    const color = hpColor(p.currentHp, p.maxHp);
    const hpPct = p.maxHp && p.maxHp > 0
      ? Math.max(0, Math.min(1, (p.currentHp ?? 0) / p.maxHp)) : 0;
    const visibleConditions = p.conditions.slice(0, 2);
    const overflow = p.conditions.length - 2;

    return (
      <div
        onClick={handleRowClick}
        className={cn(
          "relative flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-[3px] cursor-pointer select-none transition-colors",
          isActive
            ? "border-l-[var(--combat-active-border)] bg-[var(--combat-active-row-bg)]"
            : "border-l-transparent hover:bg-[var(--combat-surface-raised)]"
        )}
      >
        {/* Avatar — click pins inspector, does NOT expand row */}
        <div onClick={handleAvatarClick} className="shrink-0 cursor-pointer">
          <ParticipantAvatar
            name={p.name}
            visual={p.visual}
            size="sm"
            className={cn(isActive && "ring-2 ring-offset-1")}
            style={isActive ? {
              "--tw-ring-color": "var(--combat-active-avatar-ring)",
              "--tw-ring-offset-color": "var(--combat-bg)",
            } as React.CSSProperties : undefined}
          />
        </div>

        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <div
            className="truncate text-sm font-semibold"
            style={{ color: isActive ? "var(--combat-active-name)" : "var(--combat-fg)" }}
          >
            {p.name}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[0.58rem] font-bold uppercase tracking-wide" style={{ color: "var(--combat-fg-muted)" }}>
              {p.kind}
            </span>
            {p.initiative !== null && (
              <span className="font-mono text-[0.68rem]" style={{ color: "var(--combat-fg-muted)" }}>
                init {p.initiative}
              </span>
            )}
            {visibleConditions.map((c) => (
              <ConditionChip key={c} label={c} />
            ))}
            {overflow > 0 && (
              <span className="text-[0.6rem]" style={{ color: "var(--combat-fg-muted)" }}>+{overflow}</span>
            )}
          </div>
        </div>

        {/* COLLAPSED: stat cluster */}
        {!isExpanded && (
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[0.55rem] font-bold uppercase" style={{ color: "var(--combat-fg-muted)" }}>HP</span>
              <span className="font-mono text-sm font-bold" style={{ color }}>
                {p.currentHp ?? "—"}/{p.maxHp ?? "—"}
              </span>
            </div>
            {p.maxHp !== null && p.currentHp !== null && (
              <div className="w-12 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--combat-border)" }}>
                <div className="h-full rounded-full" style={{ width: `${hpPct * 100}%`, backgroundColor: color }} />
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-[0.55rem] font-bold uppercase" style={{ color: "var(--combat-fg-muted)" }}>AC</span>
              <span className="font-mono text-sm font-bold" style={{ color: "var(--combat-fg)" }}>{p.ac ?? "—"}</span>
            </div>
          </div>
        )}

        {/* EXPANDED: inline damage input.
            Governance note: Input primitive is used for the number field.
            Before writing this, verify that ui.tsx Input uses React.forwardRef so the ref prop works.
            If Input does not forward refs, add React.forwardRef to Input in ui.tsx first.
            Dmg/Heal buttons use raw <button> with --combat-* token colors — justified exception:
            the always-dark combat surface requires token-based colors not available in Button variants. */}
        {isExpanded && (
          <div
            className="flex items-center gap-2 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Input
              ref={inputRef}
              type="number"
              min={1}
              placeholder="0"
              onKeyDown={handleKeyDown}
              className="w-14 text-center font-mono font-bold text-sm"
              style={{
                backgroundColor: "var(--combat-surface-raised)",
                border: "1.5px solid var(--combat-active-border)",
                color: "var(--combat-fg)",
              }}
            />
            <button
              onClick={commitDamage}
              className="text-[0.68rem] font-bold px-2.5 py-1 rounded-md hover:opacity-80"
              style={{ backgroundColor: "var(--btn-damage-bg)", color: "var(--btn-damage-fg)" }}
              aria-label={`Apply damage to ${p.name}`}
            >
              Dmg
            </button>
            <button
              onClick={commitHeal}
              className="text-[0.68rem] font-bold px-2.5 py-1 rounded-md hover:opacity-80"
              style={{ backgroundColor: "var(--btn-heal-bg)", color: "var(--btn-heal-fg)" }}
              aria-label={`Heal ${p.name}`}
            >
              Heal
            </button>
          </div>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 3: Run lint**

  ```bash
  npm run lint
  ```
  Expected: zero errors.

- [ ] **Step 4: Commit**

  ```bash
  git add app/components/CombatParticipantRow.tsx
  git commit -m "feat(encounters): add CombatParticipantRow with inline damage and avatar-pin disambiguation"
  ```

---

### Task 7: CombatParticipantList component

**Files:**
- Create: `app/encounters/player/CombatParticipantList.tsx`

- [ ] **Step 1: Create CombatParticipantList.tsx**

  ```typescript
  // app/encounters/player/CombatParticipantList.tsx
  "use client";
  import { useState, useCallback } from "react";
  import { CombatParticipantRow } from "../../components/CombatParticipantRow";
  import { useAppStore } from "../../lib/store/appStore";
  import type { Encounter } from "../../lib/models/types";

  interface Props {
    encounter: Encounter;
    pinnedInspectorId: string | null;
    onPin: (id: string | null) => void;
  }

  export function CombatParticipantList({ encounter, pinnedInspectorId, onPin }: Props) {
    const { dispatchEncounterEvent } = useAppStore();
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

    // Collapse expanded row when clicking on empty list area (outside any row)
    const handleListClick = () => setExpandedRowId(null);

    const handlePin = useCallback((id: string) => {
      // Toggle: pin if not already pinned, unpin if same id
      onPin(pinnedInspectorId === id ? null : id);
    }, [pinnedInspectorId, onPin]);

    const handleDamage = useCallback((participantId: string, amount: number) => {
      dispatchEncounterEvent(encounter.id, { t: "DAMAGE_APPLIED", participantId, amount });
    }, [encounter.id, dispatchEncounterEvent]);

    const handleHeal = useCallback((participantId: string, amount: number) => {
      dispatchEncounterEvent(encounter.id, { t: "HEAL_APPLIED", participantId, amount });
    }, [encounter.id, dispatchEncounterEvent]);

    // "Active" = currentHp > 0; "Downed" = currentHp <= 0.
    // Design decision: PCs at 0 HP are DOWNED (not defeated) — they remain interactive
    // so the DM can apply healing, track death saves via avatar pin, etc.
    // Downed rows are NOT pointer-events-none.
    const active = [...encounter.participants]
      .filter((p) => (p.currentHp ?? 1) > 0)
      .sort((a, b) => {
        if (a.initiative === null && b.initiative === null) return a.name.localeCompare(b.name);
        if (a.initiative === null) return 1;
        if (b.initiative === null) return -1;
        if (b.initiative !== a.initiative) return b.initiative - a.initiative;
        return a.name.localeCompare(b.name);
      });

    const downed = encounter.participants.filter((p) => (p.currentHp ?? 1) <= 0);

    return (
      // handleListClick collapses expanded row when user clicks empty list area
      <div className="overflow-y-auto flex flex-col gap-1 p-2" onClick={handleListClick}>
        <div
          className="text-[0.6rem] font-bold uppercase tracking-widest px-1 pt-1 pb-0.5"
          style={{ color: "var(--combat-fg-muted)" }}
        >
          Active Combatants
        </div>

        {active.map((p) => (
          <CombatParticipantRow
            key={p.id}
            participant={p}
            isActive={p.id === encounter.activeParticipantId}
            isExpanded={expandedRowId === p.id}
            onExpand={(id) => setExpandedRowId(id)}
            onCollapse={() => setExpandedRowId(null)}
            onPin={handlePin}
            onDamage={handleDamage}
            onHeal={handleHeal}
          />
        ))}

        {downed.length > 0 && (
          <>
            <div
              className="text-[0.6rem] font-bold uppercase tracking-widest px-1 pt-3 pb-0.5 border-t mt-2"
              style={{ color: "var(--combat-fg-muted)", borderColor: "var(--combat-border)" }}
            >
              Downed
            </div>
            {/* Downed rows remain interactive — DM can heal them or pin to inspector for death saves */}
            {downed.map((p) => (
              <div key={p.id} className="opacity-50">
                <CombatParticipantRow
                  participant={p}
                  isActive={false} isExpanded={expandedRowId === p.id}
                  onExpand={(id) => setExpandedRowId(id)}
                  onCollapse={() => setExpandedRowId(null)}
                  onPin={handlePin} onDamage={handleDamage} onHeal={handleHeal}
                />
              </div>
            ))}
          </>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 2: Run lint**

  ```bash
  npm run lint
  ```
  Expected: zero errors.

- [ ] **Step 3: Commit**

  ```bash
  git add app/encounters/player/CombatParticipantList.tsx
  git commit -m "feat(encounters): add CombatParticipantList with expandedRowId management"
  ```

---

### Task 8: CombatHeader component

**Files:**
- Create: `app/encounters/player/CombatHeader.tsx`

- [ ] **Step 1: Create CombatHeader.tsx**

  > **Governance note:** CombatHeader uses raw `<button>` elements with `--combat-*` token inline styles. This is a justified exception: the always-dark combat surface requires custom token colors not available in the shared `Button` primitive variants. Document this clearly if a future code review flags it.

  ```typescript
  // app/encounters/player/CombatHeader.tsx
  "use client";
  import { useCallback, useEffect } from "react";
  import { useAppStore } from "../../lib/store/appStore";
  import type { Encounter, EncounterParticipant } from "../../lib/models/types";
  import type { EncounterEvent } from "../../lib/engine/encounterEvents";

  function describeLastEvent(
    event: EncounterEvent | undefined,
    participants: EncounterParticipant[]
  ): string {
    if (!event) return "";
    const name = (id: string) => participants.find((p) => p.id === id)?.name ?? "?";
    switch (event.t) {
      case "DAMAGE_APPLIED": return `HP –${event.amount} on ${name(event.participantId)}`;
      case "HEAL_APPLIED": return `HP +${event.amount} on ${name(event.participantId)}`;
      case "CONDITIONS_SET": return `Conditions · ${name(event.participantId)}`;
      case "NOTES_SET": return `Notes · ${name(event.participantId)}`;
      case "TEMP_HP_SET": return `Temp HP · ${name(event.participantId)}`;
      case "DEATH_SAVES_SET": return `Death saves · ${name(event.participantId)}`;
      case "TURN_ADVANCED": return event.direction === 1 ? "Turn advanced" : "Turn reversed";
      case "INITIATIVE_SET": return `Initiative · ${name(event.participantId)}`;
      default: return event.t.replace(/_/g, " ").toLowerCase();
    }
  }

  interface Props {
    encounter: Encounter;
    onEndEncounter: () => void;
  }

  export function CombatHeader({ encounter, onEndEncounter }: Props) {
    const { advanceEncounterTurn, undoEncounterEvent } = useAppStore();

    const lastEvent = encounter.eventLog[encounter.eventLog.length - 1];
    const lastEventText = describeLastEvent(lastEvent, encounter.participants);

    const handlePrev = useCallback(() => advanceEncounterTurn(encounter.id, -1), [encounter.id, advanceEncounterTurn]);
    const handleNext = useCallback(() => advanceEncounterTurn(encounter.id, 1), [encounter.id, advanceEncounterTurn]);
    const handleUndo = useCallback(() => undoEncounterEvent(encounter.id), [encounter.id, undoEncounterEvent]);

    // Keyboard shortcuts: →/] next turn, ←/[ prev turn, ⌘Z undo
    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        const el = document.activeElement as HTMLElement | null;
        if (
          el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el?.isContentEditable
        ) return;
        if (e.key === "ArrowRight" || e.key === "]") { e.preventDefault(); handleNext(); }
        else if (e.key === "ArrowLeft" || e.key === "[") { e.preventDefault(); handlePrev(); }
        else if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); handleUndo(); }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }, [handleNext, handlePrev, handleUndo]);

    return (
      <header
        className="h-14 flex items-center justify-between px-4 shrink-0 border-b"
        style={{ backgroundColor: "var(--combat-surface)", borderBottomColor: "var(--combat-border)" }}
      >
        {/* Left: brand + name + LIVE badge */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tracking-widest" style={{ color: "var(--combat-active-border)" }}>
            ⚔ DM
          </span>
          <span className="text-sm font-semibold truncate max-w-[180px]" style={{ color: "var(--combat-fg)" }}>
            {encounter.name}
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-widest shrink-0"
            style={{ backgroundColor: "var(--combat-live-bg)", color: "var(--combat-live-fg)" }}
          >
            <span className="size-1.5 rounded-full animate-pulse" style={{ backgroundColor: "var(--combat-live-dot)" }} />
            LIVE
          </span>
        </div>

        {/* Centre: Round display + Turn controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors"
            style={{
              backgroundColor: "var(--combat-surface-raised)",
              borderColor: "var(--combat-border-raised)",
              color: "var(--combat-fg-muted)",
            }}
            aria-label="Previous turn"
          >
            ← Prev Turn
          </button>

          <div className="flex flex-col items-center min-w-[52px]">
            <span className="text-[0.55rem] font-bold uppercase tracking-widest" style={{ color: "var(--combat-fg-muted)" }}>
              Round
            </span>
            <span className="font-mono text-2xl font-extrabold leading-none" style={{ color: "var(--combat-round-number)" }}>
              {encounter.round}
            </span>
          </div>

          <button
            onClick={handleNext}
            className="text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors"
            style={{
              backgroundColor: "var(--combat-surface-raised)",
              borderColor: "var(--combat-border-raised)",
              color: "var(--combat-fg-muted)",
            }}
            aria-label="Next turn"
          >
            Next Turn →
          </button>
        </div>

        {/* Right: Undo + End Encounter */}
        <div className="flex items-center gap-2">
          {lastEvent && (
            <button
              onClick={handleUndo}
              aria-label="Undo last action"
              title="Undo last action"
              className="text-xs px-3 py-1.5 rounded-md border truncate max-w-[200px] transition-colors"
              style={{
                backgroundColor: "var(--combat-surface-raised)",
                borderColor: "var(--combat-border)",
                color: "var(--combat-fg-muted)",
              }}
            >
              ↩ {lastEventText}
            </button>
          )}
          <button
            onClick={onEndEncounter}
            className="text-xs font-semibold px-3 py-1.5 rounded-md shrink-0"
            style={{ backgroundColor: "var(--combat-live-bg)", color: "var(--combat-live-fg)" }}
          >
            End Encounter
          </button>
        </div>
      </header>
    );
  }
  ```

- [ ] **Step 2: Run lint**

  ```bash
  npm run lint
  ```
  Expected: zero errors.

- [ ] **Step 3: Commit**

  ```bash
  git add app/encounters/player/CombatHeader.tsx
  git commit -m "feat(encounters): add CombatHeader — round display, turn controls, undo, keyboard shortcuts"
  ```

---

## Chunk 4: CombatInspector

### Task 9: CombatInspector component

**Files:**
- Create: `app/encounters/player/CombatInspector.tsx`

- [ ] **Step 1: Generate inspector variations via 21st.dev**

  ```
  Use mcp__magic__21st_magic_component_builder with this prompt:
  "A Figma/Linear-style inspector panel for a D&D combat tracker. Always-dark.
  Sections (top to bottom): sticky header (avatar, name, kind/class, Active Turn badge),
  Hit Points (large number + HP bar + amount input + Dmg/Heal buttons),
  Quick Stats (3x2 tile grid: AC, Speed, Init mod, etc.),
  Ability Scores (6-tile row: STR DEX CON INT WIS CHA + modifier),
  Conditions (chips + Add button),
  Notes (textarea),
  Death Saves (3 success circles + 3 failure circles, only when HP = 0).
  CSS vars: --combat-surface, --combat-surface-raised, --combat-border, --combat-fg,
  --combat-fg-muted, --combat-active-name, --hp-full, --hp-mid, --hp-low, --hp-zero,
  --btn-damage-bg, --btn-damage-fg, --btn-heal-bg, --btn-heal-fg."

  Refine toward maximum information density — Figma inspector aesthetic.
  ```

- [ ] **Step 2: Verify ConditionPicker API is correct before using it**

  Open `app/components/ui.tsx` and read the `ConditionPicker` signature (around line 321):
  - Props: `{ active: string[], conditions: readonly string[], onChange: (next: string[]) => void }`
  - `conditions` = the full list of known conditions to display (use `SRD_CONDITIONS` from `app/lib/data/srd.ts`)
  - `active` = currently active conditions on the participant

- [ ] **Step 3: Create CombatInspector.tsx**

  > **Before writing:** Pin-release on turn advance is NOT implemented in this component — it is a controlled component that receives `pinnedId` as a prop. The `useEffect` that resets pin when `activeParticipantId` changes lives in `page.tsx` (Task 10, Step 2). Do not add pin-release logic here.

  > **HP bar:** Use the `HpBar` shared primitive for the HP progress bar. Before use, check that `HpBar` in `app/components/ui.tsx` accepts a `className` prop for height overrides. If it does, use `<HpBar current={p.currentHp ?? 0} max={p.maxHp ?? 0} className="h-1.5 mb-3" />` and remove the local `hpBarColor` variable. If `HpBar` does not accept `className`, add a `className` prop to it first.

  > **ConditionPicker:** Rendered always-visible below condition chips (no disclosure popover). The spec wording `+ Add condition` was shorthand — always-visible is acceptable and simpler. This is a deliberate simplification.

  > **Death saves:** Clicking a filled circle toggles it off (decrement). This avoids needing global undo for accidental taps.

  ```typescript
  // app/encounters/player/CombatInspector.tsx
  "use client";
  import { useState, useCallback, useRef } from "react";
  import { ConditionChip, ConditionPicker, Textarea, HpBar } from "../../components/ui";
  import { ParticipantAvatar } from "../../components/ParticipantAvatar";
  import { useAppStore } from "../../lib/store/appStore";
  import { resolveParticipantSource } from "../../lib/engine/participantHelpers";
  import { SRD_CONDITIONS } from "../../lib/data/srd";
  import type { Encounter, Pc, Monster } from "../../lib/models/types";

  interface Props {
    encounter: Encounter;
    pinnedId: string | null;
    onUnpin: () => void;
  }

  function StatTile({ label, value }: { label: string; value: string | number }) {
    return (
      <div className="flex flex-col items-center rounded-md py-2" style={{ backgroundColor: "var(--combat-surface-raised)" }}>
        <span className="font-mono text-sm font-bold" style={{ color: "var(--combat-fg)" }}>{value}</span>
        <span className="text-[0.55rem] font-bold uppercase tracking-widest mt-0.5" style={{ color: "var(--combat-fg-muted)" }}>{label}</span>
      </div>
    );
  }

  function AbilityTile({ abbr, score }: { abbr: string; score: number }) {
    const mod = Math.floor((score - 10) / 2);
    return (
      <div className="flex flex-col items-center rounded-md py-1.5" style={{ backgroundColor: "var(--combat-surface-raised)" }}>
        <span className="font-mono text-sm font-bold" style={{ color: "var(--combat-fg)" }}>{score}</span>
        <span className="font-mono text-xs" style={{ color: "var(--combat-fg-muted)" }}>{mod >= 0 ? `+${mod}` : mod}</span>
        <span className="text-[0.5rem] font-bold uppercase tracking-widest" style={{ color: "var(--combat-fg-muted)" }}>{abbr}</span>
      </div>
    );
  }

  function HpControls({ onDamage, onHeal }: { onDamage: (n: number) => void; onHeal: (n: number) => void }) {
    const [amount, setAmount] = useState("");
    const parsed = parseInt(amount, 10);
    const valid = !isNaN(parsed) && parsed > 0;
    const commit = (fn: (n: number) => void) => { if (valid) { fn(parsed); setAmount(""); } };

    return (
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-md px-3 py-1.5 border"
          style={{ backgroundColor: "var(--combat-surface-raised)", borderColor: "var(--combat-border-raised)" }}>
          <span className="text-[0.6rem] font-bold uppercase tracking-widest shrink-0" style={{ color: "var(--combat-fg-muted)" }}>AMT</span>
          <input
            type="number" min={1} value={amount} placeholder="0"
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none font-mono font-bold text-sm text-center"
            style={{ color: "var(--combat-fg)" }}
          />
        </div>
        <button disabled={!valid} onClick={() => commit(onDamage)}
          className="text-xs font-bold px-3 py-1.5 rounded-md disabled:opacity-40"
          style={{ backgroundColor: "var(--btn-damage-bg)", color: "var(--btn-damage-fg)" }}>Dmg</button>
        <button disabled={!valid} onClick={() => commit(onHeal)}
          className="text-xs font-bold px-3 py-1.5 rounded-md disabled:opacity-40"
          style={{ backgroundColor: "var(--btn-heal-bg)", color: "var(--btn-heal-fg)" }}>Heal</button>
      </div>
    );
  }

  export function CombatInspector({ encounter, pinnedId, onUnpin }: Props) {
    const { dispatchEncounterEvent } = useAppStore();
    const pcs = useAppStore((s) => s.pcs);
    const monsters = useAppStore((s) => s.monsters);
    const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const participantId = pinnedId ?? encounter.activeParticipantId;
    const p = encounter.participants.find((x) => x.id === participantId) ?? null;
    const isPinned = pinnedId !== null;
    const isActive = p?.id === encounter.activeParticipantId;

    const source = p ? resolveParticipantSource(p, pcs, monsters) : null;
    const pcSrc = source && p?.kind === "pc" ? (source as Pc) : null;
    const monSrc = source && p?.kind === "monster" ? (source as Monster) : null;

    const dispatch = useCallback((event: Parameters<typeof dispatchEncounterEvent>[1]) => {
      dispatchEncounterEvent(encounter.id, event);
    }, [encounter.id, dispatchEncounterEvent]);

    const handleDamage = useCallback((amount: number) => {
      if (!p) return;
      dispatch({ t: "DAMAGE_APPLIED", participantId: p.id, amount });
    }, [p, dispatch]);

    const handleHeal = useCallback((amount: number) => {
      if (!p) return;
      dispatch({ t: "HEAL_APPLIED", participantId: p.id, amount });
    }, [p, dispatch]);

    const handleConditions = useCallback((conditions: string[]) => {
      if (!p) return;
      dispatch({ t: "CONDITIONS_SET", participantId: p.id, value: conditions });
    }, [p, dispatch]);

    const handleNotes = useCallback((value: string) => {
      if (!p) return;
      if (notesTimer.current) clearTimeout(notesTimer.current);
      notesTimer.current = setTimeout(() => {
        dispatch({ t: "NOTES_SET", participantId: p.id, value });
      }, 500);
    }, [p, dispatch]);

    // toggleDeathSave: clicking an already-filled circle decrements it (toggle).
    // This allows the DM to correct accidental taps without needing global undo.
    const toggleDeathSave = useCallback((type: "success" | "failure", index: number) => {
      if (!p || p.kind !== "pc" || !p.refId) return;
      const cur = p.deathSaves ?? { successes: 0, failures: 0, stable: false };
      const field = type === "success" ? "successes" : "failures";
      const current = cur[field];
      // If clicking circle i: fill if i >= current (increment), clear if i < current (decrement)
      const next = index < current ? index : Math.min(3, index + 1);
      dispatch({
        t: "DEATH_SAVES_SET",
        participantId: p.id,
        pcId: p.refId,
        value: { ...cur, [field]: next },
      });
    }, [p, dispatch]);

    if (!p) {
      return (
        <div className="flex items-center justify-center h-full" style={{ backgroundColor: "var(--combat-surface)" }}>
          <p className="text-sm" style={{ color: "var(--combat-fg-muted)" }}>No active participant</p>
        </div>
      );
    }

    // HpBar owns HP-state color logic — do not duplicate it here.
    const showDeathSaves = p.kind === "pc" && (p.currentHp ?? 1) <= 0;

    // Quick stats: always AC, then source-dependent fields (max 6 tiles)
    const quickStats: { label: string; value: string | number }[] = [
      { label: "AC", value: p.ac ?? "—" },
      ...(pcSrc ? [
        { label: "Init", value: `+${Math.floor((pcSrc.abilities.dex - 10) / 2)}` },
        // Surface two highest skill bonuses from pcSrc.skills if available
        ...Object.entries(pcSrc.skills ?? {})
          .map(([k, v]) => ({ label: k.slice(0, 4).toUpperCase(), value: v >= 0 ? `+${v}` : String(v) }))
          .sort((a, b) => parseFloat(String(b.value)) - parseFloat(String(a.value)))
          .slice(0, 2),
      ] : monSrc ? [
        { label: "CR", value: monSrc.challenge ?? "—" },
        { label: "Speed", value: monSrc.speed ?? "—" },
      ] : []),
    ].slice(0, 6);

    const sectionStyle = { borderBottomColor: "var(--combat-border)" };
    const sectionLabelStyle = { color: "var(--combat-fg-muted)" };

    return (
      <div className="flex flex-col overflow-y-auto h-full" style={{ backgroundColor: "var(--combat-surface)" }}>

        {/* Sticky header */}
        <div className="sticky top-0 flex items-center gap-3 px-4 py-3 border-b z-10"
          style={{ backgroundColor: "var(--combat-surface)", ...sectionStyle }}>
          <ParticipantAvatar name={p.name} visual={p.visual} size="md" />
          <div className="min-w-0 flex-1">
            <div className="font-bold text-base truncate"
              style={{ color: isActive ? "var(--combat-active-name)" : "var(--combat-fg)" }}>
              {p.name}
            </div>
            <div className="text-[0.68rem]" style={{ color: "var(--combat-fg-muted)" }}>
              {p.kind.toUpperCase()}
              {pcSrc && ` · ${pcSrc.className} ${pcSrc.level}`}
              {monSrc && ` · CR ${monSrc.challenge}`}
              {isActive && " · ✦ Active Turn"}
            </div>
          </div>
          {isPinned && (
            <button onClick={onUnpin} className="text-[0.65rem] font-bold px-2 py-1 rounded border shrink-0"
              style={{ borderColor: "var(--combat-border-raised)", color: "var(--combat-fg-muted)" }}>
              📌 Pinned
            </button>
          )}
        </div>

        {/* HP */}
        <div className="px-4 py-3 border-b" style={sectionStyle}>
          <div className="text-[0.6rem] font-bold uppercase tracking-widest mb-2" style={sectionLabelStyle}>Hit Points</div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-mono text-3xl font-extrabold" style={{ color: "var(--combat-fg)" }}>{p.currentHp ?? "—"}</span>
            <span style={{ color: "var(--combat-fg-muted)" }}>/</span>
            <span className="font-mono text-lg" style={{ color: "var(--combat-fg-muted)" }}>{p.maxHp ?? "—"}</span>
            {(p.tempHp ?? 0) > 0 && (
              <span className="text-xs" style={{ color: "var(--combat-active-border)" }}>+{p.tempHp} temp</span>
            )}
          </div>
          {/* HpBar owns HP-state color logic */}
          <HpBar current={p.currentHp ?? 0} max={p.maxHp ?? 0} className="h-1.5 mb-3" />
          <HpControls onDamage={handleDamage} onHeal={handleHeal} />
        </div>

        {/* Quick stats */}
        {quickStats.length > 0 && (
          <div className="px-4 py-3 border-b" style={sectionStyle}>
            <div className="text-[0.6rem] font-bold uppercase tracking-widest mb-2" style={sectionLabelStyle}>Stats</div>
            <div className="grid grid-cols-3 gap-1.5">
              {quickStats.map((s) => <StatTile key={s.label} label={s.label} value={s.value} />)}
            </div>
          </div>
        )}

        {/* Abilities */}
        {source?.abilities && (
          <div className="px-4 py-3 border-b" style={sectionStyle}>
            <div className="text-[0.6rem] font-bold uppercase tracking-widest mb-2" style={sectionLabelStyle}>Abilities</div>
            <div className="grid grid-cols-6 gap-1">
              {(["str", "dex", "con", "int", "wis", "cha"] as const).map((stat) => (
                <AbilityTile key={stat} abbr={stat.toUpperCase()} score={source.abilities[stat]} />
              ))}
            </div>
          </div>
        )}

        {/* Conditions */}
        <div className="px-4 py-3 border-b" style={sectionStyle}>
          <div className="text-[0.6rem] font-bold uppercase tracking-widest mb-2" style={sectionLabelStyle}>Conditions</div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {p.conditions.map((c) => (
              <ConditionChip
                key={c}
                label={c}
                onRemove={() => handleConditions(p.conditions.filter((x) => x !== c))}
              />
            ))}
          </div>
          <ConditionPicker
            active={p.conditions}
            conditions={SRD_CONDITIONS}
            onChange={handleConditions}
          />
        </div>

        {/* Notes */}
        <div className="px-4 py-3 border-b" style={sectionStyle}>
          <div className="text-[0.6rem] font-bold uppercase tracking-widest mb-2" style={sectionLabelStyle}>Notes</div>
          <Textarea
            defaultValue={p.notes ?? ""}
            placeholder="Notes for this turn…"
            onChange={(e) => handleNotes(e.target.value)}
            rows={3}
            className="text-sm w-full"
          />
        </div>

        {/* Death saves — visible only for PCs at 0 HP */}
        {showDeathSaves && (
          <div className="px-4 py-3">
            <div className="text-[0.6rem] font-bold uppercase tracking-widest mb-3" style={sectionLabelStyle}>Death Saves</div>
            {(["success", "failure"] as const).map((type) => {
              const count = type === "success"
                ? (p.deathSaves?.successes ?? 0)
                : (p.deathSaves?.failures ?? 0);
              const fillColor = type === "success" ? "var(--hp-full)" : "var(--hp-low)";
              return (
                <div key={type} className="flex items-center gap-2 mb-2">
                  <span className="text-xs w-16 capitalize" style={{ color: "var(--combat-fg-muted)" }}>{type}s</span>
                  {[0, 1, 2].map((i) => (
                    <button
                      key={i}
                      onClick={() => toggleDeathSave(type, i)}
                      className="size-5 rounded-full border-2 transition-colors"
                      style={{
                        backgroundColor: count > i ? fillColor : "transparent",
                        borderColor: count > i ? fillColor : "var(--combat-border-raised)",
                      }}
                      aria-label={`${type} ${i + 1} — click to toggle`}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 4: Run lint**

  ```bash
  npm run lint
  ```
  Expected: zero errors.

- [ ] **Step 5: Commit**

  ```bash
  git add app/encounters/player/CombatInspector.tsx
  git commit -m "feat(encounters): add CombatInspector — HP, stats, abilities, conditions, notes, death saves"
  ```

---

## Chunk 5: Integration + Cleanup

### Task 10: Refactor page.tsx to routing shell

**Files:**
- Modify: `app/encounters/player/page.tsx`

> **Before touching this file:** Read `app/encounters/player/page.tsx` in full. Note:
> - Where `selectedEncounter` is derived (look for `combatMode`, `isRunning`)
> - The exact state setter name for `EncounterCompleteDialog` — it is `setIsEndEncounterOpen` (NOT `setIsCompleteDialogOpen`). Use whatever name is actually in the file.
> - Where `EncounterCompleteDialog` is rendered — **critical:** after the refactor introduces an early `return` for the combat branch, the `EncounterCompleteDialog` must be rendered **before** the conditional split so it remains in the tree during live combat. Move its render site above the `{selectedEncounter && (combatMode !== "live" ? ...)}` block.
> - What state vars power the old prep/combat UI (likely `openPopoverId`, `expandedPrepIds`, `referencePinnedId`, `participantRowRefs`) — these are deleted in Step 4.
> - The `const combatMode = selectedEncounter?.combatMode === "live"` boolean derivation — delete this in Step 4, as the new branch uses `selectedEncounter.combatMode !== "live"` directly on the encounter object.
> - The scroll-lock `useEffect` (locks `document.body` overflow during combat) — update it to use `selectedEncounter?.combatMode === "live"` instead of the old `combatMode` boolean.
> - The `participantRowRefs` scroll-to-active `useEffect` — delete it in Step 4 (ownership moves to `CombatParticipantList`).
> - The encounter-selection list logic (keep this untouched)

- [ ] **Step 1: Add new state and imports at the top of the component**

  In the component body, add:
  ```typescript
  const [pinnedInspectorId, setPinnedInspectorId] = useState<string | null>(null);
  ```

  At the top of the file, add:
  ```typescript
  import { PrepPhase } from "./PrepPhase";
  import { CombatHeader } from "./CombatHeader";
  import { CombatParticipantList } from "./CombatParticipantList";
  import { CombatInspector } from "./CombatInspector";
  ```

- [ ] **Step 2: Release pin on turn advance**

  Add a `useEffect` that resets `pinnedInspectorId` whenever the active participant changes:
  ```typescript
  useEffect(() => {
    setPinnedInspectorId(null);
  }, [selectedEncounter?.activeParticipantId]);
  ```

- [ ] **Step 3: Replace the prep/combat render block**

  Find the JSX section that renders the existing prep/combat UI (the large block containing the initiative table and the combat participant list). Replace it entirely with:

  ```tsx
  {selectedEncounter && (
    selectedEncounter.combatMode !== "live" ? (
      <PrepPhase encounter={selectedEncounter} />
    ) : (
      <div
        className="flex flex-col overflow-hidden"
        style={{
          backgroundColor: "var(--combat-bg)",
          height: "calc(100vh - var(--nav-height))",
        }}
      >
        <CombatHeader
          encounter={selectedEncounter}
          onEndEncounter={() => setIsEndEncounterOpen(true)}
        />
        <div className="grid flex-1 min-h-0" style={{ gridTemplateColumns: "1fr 320px" }}>
          <CombatParticipantList
            encounter={selectedEncounter}
            pinnedInspectorId={pinnedInspectorId}
            onPin={setPinnedInspectorId}
          />
          <div style={{ borderLeft: "1px solid var(--combat-border)" }}>
            <CombatInspector
              encounter={selectedEncounter}
              pinnedId={pinnedInspectorId}
              onUnpin={() => setPinnedInspectorId(null)}
            />
          </div>
        </div>
      </div>
    )
  )}
  ```

  > **State setter name:** The code above uses `setIsEndEncounterOpen` — verify this matches the actual variable name in `page.tsx` before committing.
  > **EncounterCompleteDialog:** Before this block, ensure `EncounterCompleteDialog` is rendered in a location that is NOT inside this `{selectedEncounter && ...}` conditional — it must render regardless of combatMode so it's available when "End Encounter" fires from within the combat early-return path.

- [ ] **Step 4: Remove now-unused state variables and effects**

  Delete all of the following that are no longer referenced after Step 3:
  - State: `openPopoverId`, `expandedPrepIds`, `referencePinnedId`, `participantRowRefs`
  - The `const combatMode = selectedEncounter?.combatMode === "live"` boolean derivation — the new branch uses the raw field directly
  - The `useEffect` that locked `document.body` overflow using the old `combatMode` boolean — update it to `selectedEncounter?.combatMode === "live"`, or if no longer needed, delete it
  - The `useEffect` that scrolled `participantRowRefs` to the active participant — owned by `CombatParticipantList` after this refactor
  - The old `useEffect` for `referencePinnedId` — replaced by the `pinnedInspectorId` effect from Step 2

  Do NOT remove: encounter-selection state, `isEndEncounterOpen` / `setIsEndEncounterOpen`, any state still referenced by the encounter list UI.

- [ ] **Step 5: Run lint**

  ```bash
  npm run lint
  ```
  Expected: zero errors.

- [ ] **Step 6: Run dev server and manually verify**

  ```bash
  npm run dev
  ```

  Open http://localhost:3000/encounters/player. Verify:
  - [ ] Selecting an encounter shows PrepPhase (light background, initiative table, phase badge)
  - [ ] Per-row d20 button rolls and fills initiative
  - [ ] Roll All fills all unset initiatives
  - [ ] Manual initiative input commits on blur/Enter
  - [ ] Turn order preview strip updates in real-time
  - [ ] ⌘↵ and Launch Combat button both transition to combat view
  - [ ] Combat view is dark with LIVE badge
  - [ ] Round counter visible (read-only number), Prev/Next Turn buttons work
  - [ ] Clicking a participant row (non-avatar) expands inline damage input
  - [ ] Avatar click pins inspector without expanding row
  - [ ] Enter applies damage; Shift+Enter heals; Esc collapses row
  - [ ] Inspector auto-follows active participant; pin releases on turn advance
  - [ ] HP colours correct (green/amber/red/grey)
  - [ ] Death saves section visible for PCs at 0 HP; circles tappable
  - [ ] Conditions picker works; conditions dismissible from inspector
  - [ ] Notes save on blur (500ms debounce)
  - [ ] Undo button shows last event text; click undoes
  - [ ] → / ] advance turn; ← / [ go back; ⌘Z undoes

- [ ] **Step 7: Commit**

  ```bash
  git add app/encounters/player/page.tsx
  git commit -m "feat(encounters): wire PrepPhase + CombatPhase into player page"
  ```

---

### Task 11: Retire QuickActionPopover

**Files:**
- Modify: `app/encounters/player/page.tsx` (confirm no remaining import)
- Delete: `app/components/QuickActionPopover.tsx`

- [ ] **Step 1: Confirm no remaining references**

  ```bash
  grep -r "QuickActionPopover" app/
  ```
  Expected: only `app/components/QuickActionPopover.tsx` itself (no imports elsewhere).

- [ ] **Step 2: Delete the file**

  ```bash
  rm app/components/QuickActionPopover.tsx
  ```

- [ ] **Step 3: Run lint to confirm no broken imports**

  ```bash
  npm run lint
  ```
  Expected: zero errors.

- [ ] **Step 4: Commit**

  ```bash
  git add app/components/QuickActionPopover.tsx app/encounters/player/page.tsx
  git commit -m "chore(encounters): retire QuickActionPopover — replaced by inline row damage"
  ```

---

### Task 12: Final verification

- [ ] **Step 1: Run full suite**

  ```bash
  npm run lint && npm test && npm run build
  ```
  Expected: lint clean, all tests pass, build succeeds with no TypeScript errors.

- [ ] **Step 2: Check spec Definition of Done**

  Read `docs/superpowers/specs/2026-03-17-encounters-redesign.md` and verify every DoD checkbox against the implementation. Specifically confirm:
  - No hardcoded hex/rgb values — all colours reference `--combat-*` or existing tokens
  - No `dark:` Tailwind variants anywhere in the new files

- [ ] **Step 3: Verify persistence across refresh**

  With the dev server running, start an encounter, launch combat, advance two turns, apply damage. Then hard-reload the page. Verify:
  - [ ] Combat view re-renders (not prep phase)
  - [ ] Round counter, HP values, and active participant are correct
  - [ ] This confirms `combatMode` survives refresh via the event log (spec invariant)

- [ ] **Step 4: Verify keyboard shortcuts match spec**

  The spec defines `→` or `]` for next turn, `←` or `[` for prev turn. The old `page.tsx` used `n`/`right` and `p`/`left` via `react-hotkeys-hook`. Confirm the new `CombatHeader` shortcuts (`ArrowRight`/`]` and `ArrowLeft`/`[`) are active and the old ones are no longer firing.

- [ ] **Step 5: Final commit if any cleanup needed**

  ```bash
  git add app/encounters/player/page.tsx app/encounters/player/PrepPhase.tsx app/encounters/player/CombatHeader.tsx app/encounters/player/CombatParticipantList.tsx app/encounters/player/CombatInspector.tsx app/components/TurnOrderPreview.tsx app/components/CombatParticipantRow.tsx
  git commit -m "chore(encounters): final DoD verification and cleanup"
  ```
