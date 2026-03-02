# Architecture Decision Records

Decisions made about this project. Record a new entry whenever a significant architectural or product decision is made.

---

## Event-driven encounter engine

**Date:** Pre-2026-03-01 (at project inception)

**Decision:** All runtime changes during live combat are expressed as events. The encounter state is a pure projection of a base snapshot + event log. No component may mutate participant state directly in live mode.

**Reasoning:** An append-only event log makes the app testable (pure functions), undoable (pop or compensate the last event), debuggable (inspect the log), and persistable (serialize base + log). The alternative — direct mutation — produces correct state but makes undo, recovery, and testing significantly harder. The cost is a slightly more verbose dispatch pattern, which is worth it.

**Alternatives considered:** Direct state mutation with explicit undo stack (rejected: undo stack is a second source of truth and can diverge); CQRS with separate read/write models (rejected: over-engineering for a local-first app).

**Consequences:** Every new live-mode behaviour requires an event type and a reducer case. Discipline required to keep components from bypassing events.

---

## SRD-only content

**Date:** Pre-2026-03-01 (at project inception)

**Decision:** All seed data (monsters, spells, conditions) must be sourced from the D&D SRD (Systems Reference Document). No copyrighted text from core rulebooks.

**Reasoning:** Distributing or displaying copyrighted D&D content (Monster Manual, PHB) without a license would be a legal risk. The SRD covers the most common monsters and rules needed for a functional combat tracker. DMs can add custom monsters.

**Alternatives considered:** Include full copyrighted content and keep the app private (rejected: fragile, limits future sharing); license content through DMs Guild (rejected: cost and complexity for a personal tool).

**Consequences:** Some well-known monsters are absent or incomplete. DMs must add custom entries for non-SRD content.

---

## Local-first, no auth in v1

**Date:** Pre-2026-03-01 (at project inception)

**Decision:** All data lives in `localStorage`. No backend, no user accounts, no network required in v1.

**Reasoning:** Adding auth before the DM core loop is proven creates unnecessary complexity. A local-first app is fast, works offline, and has no privacy/GDPR concerns until data leaves the browser. The event-driven architecture makes a future sync layer straightforward to add.

**Alternatives considered:** Supabase from day one (rejected: unnecessary complexity before core loop is stable; disabled Supabase config is in `_disabled/`); file-based persistence (rejected: localStorage is simpler and universally available in browsers).

**Consequences:** No multi-device sync. Data is lost if localStorage is cleared. Multi-player collaboration is deferred to a later phase.

---

## No new packages without justification

**Date:** Pre-2026-03-01 (at project inception)

**Decision:** The approved dependency set is: `lucide-react` (icons), `clsx` + `tailwind-merge` (class composition via `cn()`), `@radix-ui/react-dialog` (accessible dialogs). Any new package requires explicit justification in the PR or commit.

**Reasoning:** Dependency creep in a fast-moving project leads to bundle bloat, security surface area, and future upgrade friction. The current set covers the vast majority of UI needs. The constraint forces simpler solutions first.

**Alternatives considered:** Shadcn/ui (deferred: would be a good later choice but adds many components at once); Zustand (deferred: React Context is sufficient for current scale).

**Consequences:** Occasionally more verbose code. The constraint is intentional.

---

## Conditions as string[] (not rich objects)

**Date:** 2026-03-01 (clarified during audit)

**Decision:** `EncounterParticipant.conditions` is `string[]` (condition names only), not an array of rich objects with id, source, duration.

**Reasoning:** Rich condition objects were in the original design spec but would add significant complexity: stable IDs for removal, duration tracking per condition, source tracking. For a combat tracker, the most common operations are "add condition" and "remove condition." A string array with `CONDITIONS_SET` (replacing the whole array) is simple, fast, and reversible via undo. Duration tracking is DM judgment anyway.

**Alternatives considered:** Rich condition objects with stable IDs (deferred: higher complexity, unclear benefit for current use case); per-condition events CONDITION_ADDED/CONDITION_REMOVED (replaced by: `CONDITIONS_SET` which atomically replaces the array, simpler reducer logic).

**Consequences:** No per-condition duration tracking. No condition source attribution. Both can be added to `notes` fields instead.

---

## DM tool with interactive player companion

**Date:** 2026-03-01 (initially "read-only companion"; revised 2026-03-01 to "interactive")

**Decision:** This is a DM tool with an interactive player companion. The DM view is primary. Each player gets PIN-gated access to their own character. Players can edit their PC sheet, record rolls (digital d20 or manual entry) during and outside of combat, and follow the encounter view. Full real-time multi-device collaboration is still deferred (requires backend sync).

**Reasoning:** Player PC editing was already functional (same `updatePc` path the DM uses). Adding PIN gating and roll recording is low complexity and high table value. The "read-only" framing was premature — local-first apps can safely give each player write access to their own PC without multi-device sync. Rolls recorded to the `ROLL_RECORDED` event log give the DM visibility without extra coordination.

**PIN design:** Each `Pc` has an optional `pin?: string | null` field. The DM sets it (plain-text, consistent with DM PIN pattern). Players enter it once per session. No hashing needed at this scale (local-first, same-table, no real auth threat model).

**Alternatives considered:** OAuth/real auth from day one (rejected: vastly over-engineered for a local-first tool used by one group); PIN-per-device (rejected: unnecessary complexity); no player input (rejected: player edit of their own PC is low risk and expected).

**Consequences:** Player view reads and writes DM-owned data via shared `appStore`. In the future, a separate read/write path per device will be needed for multi-device sync (Supabase RLS per PC, PINs become Supabase auth tokens).
