## Advisory roles

### Expert D&D + Frontend Advisor
When evaluating UX, architecture, or rules-related changes, agents MUST consult:
- `ADVISOR_DND_FRONTEND.md`

This advisor represents an expert Dungeon Master and senior frontend/product designer.
Their guidance overrides generic frontend/framework advice in conflicts.

---

# DnD DM App – Agent Instructions

## Product intent
This is a DM-first Next.js/React app for running D&D sessions (theatre-of-the-mind).
Primary loop: build encounter → run combat (initiative, HP, conditions) → log notes.
Optimize for speed and clarity during play (low clicks, keyboard-friendly).

## Content policy
- D&D 5e 2014 ruleset
- SRD-safe: do not embed copyrighted text from books

## Architecture (current)
- Next.js App Router in `/app`
- Domain types in `/lib/models/types.ts`
- SRD data in `/lib/data/srd.ts`
- Licensed data in `/lib/data/5e.ts`
- Client state in `/lib/store/appStore.tsx`
- UI components in `/components`

## Live encounter state (NON-NEGOTIABLE)
All changes during **Run Combat** must be represented as events.

- Define `EncounterEvent` types (append-only log).
- UI must only perform live-combat changes by dispatching events:
  - `dispatchEvent(event)`
- Encounter runtime state is a projection:
  - `applyEvent(state, event) -> nextState`
- No component may directly mutate combatants during live mode.
- If a behavior cannot be expressed as an event, it is not allowed in live mode.

### Undo / Recovery
- Live mode must support undo:
  - remove last event OR append a compensating event
- Prefer boring, predictable undo over clever partial rollback.

### Roll handling
- Support roll modes: digital, manual entry, DM entry.
- Store roll results as events (e.g. `ROLL_RECORDED`).
- Never infer rolls after the fact.

## Quality bar (Definition of done)
- Types are correct; no `any` unless justified
- Add tests for reducers/state transitions when changing combat logic
- Prefer small PRs with clear commit messages
- `lucide-react` is the approved icon library; use it freely
- `clsx` + `tailwind-merge` are approved; compose all class names via `cn()` exported from `app/components/ui.tsx`
- `@radix-ui/react-dialog` is approved; use `Dialog`/`DialogContent`/`DialogTitle`/`DialogClose` from `ui.tsx` for all overlays — never hand-roll `fixed inset-0` overlays
- Prefer no new packages beyond these; justify any additional dependencies clearly

## Focus areas for improvements
1) DM flow speed (encounters/combat)
2) State correctness (initiative, conditions, HP)
3) Performance (avoid unnecessary rerenders)
4) Accessibility (keyboard, focus states)
5) Session safety (resumable live encounters)

Any PR touching /run-combat must include:
- at least 1 reducer test
- keyboard path for the feature
- undo behavior (explicitly stated)