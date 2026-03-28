# Product Roadmap

This roadmap keeps the app DM-first and table-ready. It favors speed, clarity, and recoverable state over rules enforcement.

## Guiding principles
- DM remains final authority; manual overrides must be fast and obvious.
- Live combat must be event-driven and undoable.
- Keyboard-first interactions; predictable ordering and minimal modal friction.
- SRD-safe data only; avoid copyrighted text.

---

## Done

### Encounter builder redesign (2026-03-17)
- Info-dense encounter cards: difficulty pill, adjusted XP, CR, combatant count, Launch/Resume button.
- Inline monster picker in Create dialog (always-visible two-column layout).
- Collapsible "Add Monsters" panel in Edit dialog (animated chevron, no nested dialog).
- Encounter CR/XP difficulty indicator (was in Next — pulled forward, done).

### Combat phase polish (2026-03-17)
- Replaced forced-dark combat color flip with theme-adaptive warm accent treatment.
- Active participant row uses amber tint (`--combat-active-row-bg`) instead of full dark surface inversion.

### UI governance + app-wide polish (2026-03-17)
- Encounter Builder, PCs, and Bestiary: collapsible add forms moved to top of page, grouped into Identity/Stats sections.
- Home page: Reset data moved to danger zone with confirmation dialog.
- Campaign Pulse stat boxes: added contextual icons.
- Card mount animation (`cardEnter` keyframe) and `hoverable` prop for lift on interactive cards.
- `ParticipantAvatar` className override removed from Bestiary (governance fix).
- `StatBadge` in PcCard replaced with shared `Pill tone="stat"`.
- Nav: sign-out separated with hairline divider; active primary pill changed from `bg-foreground` (black/white flash) to warm accent tint.

### Combat completeness — second pass (2026-03-17)
- **Concentration tracking** — Brain icon pip on combatant rows; toggle on/off per participant; "Concentration check!" nudge banner auto-appears for 2.5s when damage is applied to a concentrating participant.
- **Short/long rest** — Rest Party section in campaign party view; Short Rest recharges short-rest class features; Long Rest restores HP, clears death saves, resets all spell slots and features; confirm dialog before applying.

### Combat completeness — first pass (2026-03-17)
- Death save tracking — 3-success/3-failure circle UI on downed PCs in combat inspector; `DEATH_SAVES_SET` event + reducer; toggle to correct accidental taps.
- HP roll on monster add — dice icon in MonsterPicker adds with randomised HP (~±20% of average) instead of fixed average; works in both Create dialog and Edit builder.
- Inspiration tracking in encounters — `Zap` pip on PC combatant rows; DM can grant/remove inspiration with one tap; writes to persistent PC state.
- Pin emoji replaced with Lucide `Pin` icon in combat inspector (icon governance).

### Accounts + normalized persistence (2026-03-23)
- Campaign invites with per-campaign roles.
- Normalized Supabase schema (`campaigns`, `pcs`, `encounters`, `encounter_events`, `notes`, `log_entries`, `pc_assignments`).
- RLS policies for DM/player access boundaries.

### Player onboarding wizard (2026-03-27)
- Invite-gated welcome + choose flow with create/import.
- Context exchange, TTL heartbeat, and recovery banner.

---

## Now
*Why this order: player section and character sheet are the next gaps — the DM view is largely complete; the player-facing experience needs attention.*

### Player section
- Dedicated player area with party overview and character access.
  - Readable party dashboard and quick roll context.
  - Controlled sharing of DM notes and encounter status.

### Character sheet UI
- Player character screen styled like a pen-and-paper sheet.
  - Primary stats block, skills, saves, inventory, and features.
  - Sidebar with active conditions, resources, and quick actions.
  - Print-friendly layout and compact view for tablets.

### Data and quality
- Stronger audit trail for combat.
  - Session notes linked to encounter events.
  - Basic export of logs and notes.
- Performance hardening.
  - Reduce rerenders in live combat lists.
  - Stable keys and memoized selectors.

---

## Later
*Why this order: accounts require backend infrastructure and GDPR consideration. Legendary actions and deep campaign features are polish that won't unblock any current use case. Migration chain only matters once real campaign data exists.*

### Tactical DM features
- **Legendary actions / lair actions** — reminder system for boss monsters. Notes field covers this adequately for now.

### Realtime sharing
- Supabase Realtime for live encounter state sync across devices.
- Real-time updates and shared rolls.

### Campaign depth
- Campaign timeline and session summaries.
  - Searchable notes and tagged highlights.
- Encounter templates and reuse.
  - Save, clone, and version encounters.

### Technical debt
- **Schema migration chain** — replace current reset-to-seed strategy with a proper `migrate(raw) → current` function. Only urgent once real campaign data is persisted across schema changes.

---

## Open questions
- What data should be shareable to players during live combat (read-only encounter state, DM notes?).
