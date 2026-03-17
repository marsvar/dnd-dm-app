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

---

## Now
*Why this order: the core combat loop is the primary trust surface. DMs will not rely on the app at the table until combat tracking is reliable, fast, and forgiving. UI polish, quick actions, and undo visibility must come before any new features.*

### Live encounter improvements
- Improve the encounter runner UI for focus and speed.
  - Clearer active turn highlight and round controls.
  - Quick actions for damage/heal, conditions, and notes.
  - Visible undo and last action summary.

### Small DM quality-of-life
- **HP roll on monster add** — optional dice roll when adding a monster to an encounter instead of using average HP. Low effort, DMs expect it.
- **Inspiration tracking in encounters** — `Pc.inspiration` already exists; surface it on combatant rows during combat.

---

## Next
*Why this order: player features and character sheet are only valuable once the DM core is stable and has been used in real sessions. Tactical features (death saves, concentration) are frequent enough in actual play to block real-session use.*

### Combat completeness
- **Death save tracking** — 3-success/3-failure UI on downed PCs; low effort, high impact.
- **Concentration tracking** — flag on combatant + visible nudge when a concentrating caster takes damage.
- **Encounter CR/XP summary** — difficulty indicator in the encounter builder; pure calculation, no new data model.
- **Short/long rest** — resource reset mechanics between encounters.

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

### Accounts and sharing
- User login and profile management.
  - Multiple campaigns and saved settings.
- Player/DM collaboration features.
  - Read-only player view during live combat.
  - Real-time updates and shared rolls.
- **Before building this:** define what data is stored, where, and under what terms. GDPR applies to Norwegian users.

### Campaign depth
- Campaign timeline and session summaries.
  - Searchable notes and tagged highlights.
- Encounter templates and reuse.
  - Save, clone, and version encounters.

### Technical debt
- **Schema migration chain** — replace current reset-to-seed strategy with a proper `migrate(raw) → current` function. Only urgent once real campaign data is persisted across schema changes.

---

## Open questions
- Best minimal auth approach without harming local-first workflows.
- What data should be shareable to players during combat.
