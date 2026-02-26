# Product Roadmap

This roadmap keeps the app DM-first and table-ready. It favors speed, clarity, and recoverable state over rules enforcement.

## Guiding principles
- DM remains final authority; manual overrides must be fast and obvious.
- Live combat must be event-driven and undoable.
- Keyboard-first interactions; predictable ordering and minimal modal friction.
- SRD-safe data only; avoid copyrighted text.

## Now
### Live encounter improvements
- Improve the encounter runner UI for focus and speed.
  - Clearer active turn highlight and round controls.
  - Quick actions for damage/heal, conditions, and notes.
  - Visible undo and last action summary.
- Continue event-driven runtime coverage.
  - Move remaining live edits (conditions, notes, temp HP) to events.
  - Add lightweight event log view for quick recovery.

### DM workflow polish
- Faster encounter prep.
  - Quick-add rows for monsters and PCs.
  - Bulk initiative tools and sorting controls.
- Encounter builder clarity.
  - Clear prep vs run states.
  - Reduce friction between builder and runner.
- UI governance baseline.
  - Enforce shared participant visual system across Builder, Player, PCs, and Bestiary.
  - Require shared avatar component and fallback behavior for all participant surfaces.

## Next
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

## Later
### Accounts and sharing
- User login and profile management.
  - Multiple campaigns and saved settings.
- Player/DM collaboration features.
  - Read-only player view during live combat.
  - Real-time updates and shared rolls.

### Campaign depth
- Campaign timeline and session summaries.
  - Searchable notes and tagged highlights.
- Encounter templates and reuse.
  - Save, clone, and version encounters.

## Open questions
- Best minimal auth approach without harming local-first workflows.
- What data should be shareable to players during combat.
