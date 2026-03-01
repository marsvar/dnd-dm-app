# D&D DM App – Claude Instructions

## What this is

DM-first Next.js/React app for running D&D 5e sessions (theatre-of-the-mind).
Primary loop: build encounter → run combat (initiative, HP, conditions) → log notes.
Optimize for speed and clarity during live play: low click count, keyboard-friendly.

Content policy: D&D 5e 2014 ruleset. SRD-safe — do not embed copyrighted text from books.

## Commands

```bash
npm run dev      # start dev server
npm run build    # production build
npm run lint     # ESLint
npm test         # Node native test runner (no Jest)
```

## Architecture

```
app/
├── components/          # Reusable UI components
├── lib/
│   ├── models/types.ts  # ALL domain types live here
│   ├── data/srd.ts      # SRD seed data (monsters, conditions)
│   ├── engine/          # Pure reducers & event logic
│   │   └── __tests__/   # Reducer unit tests
│   └── store/
│       ├── appStore.tsx  # Primary client state (Context + localStorage)
│       └── roleStore.tsx # DM/Player role + PIN
└── pages/               # Next.js App Router routes
```

No backend API routes. This is a **client-side, local-first** app. State persists to `localStorage`.

## Live combat state — NON-NEGOTIABLE

All changes during **Run Combat** must be represented as append-only events.

- Define new `EncounterEvent` types when needed.
- Dispatch changes via `dispatchEvent(event)` only — never mutate combatants directly.
- Encounter state is a projection: `applyEvent(state, event) → nextState`.
- No component may directly mutate combatants during live mode.
- If a behavior cannot be expressed as an event, it is not allowed in live mode.

**Undo:** Live mode must always support undo. Remove last event or append a compensating event. Prefer boring, predictable undo over clever partial rollback.

**Rolls:** Support digital, manual entry, and DM entry modes. Store results as events (e.g. `ROLL_RECORDED`). Never infer rolls after the fact.

## Code conventions

- Domain types → `/lib/models/types.ts`
- SRD/seed data → `/lib/data/srd.ts`
- State logic → `/lib/store/appStore.tsx` (avoid scattered state)
- UI components → `/app/components/` (keep components small)
- Class names → always via `cn()` exported from `app/components/ui.tsx` (`clsx` + `tailwind-merge`)
- Overlays → use `Dialog`/`DialogContent`/`DialogTitle`/`DialogClose` from `ui.tsx` — never hand-roll `fixed inset-0` overlays
- Icons → `lucide-react` only
- No `any` types unless explicitly justified
- No new packages without clear justification

## Testing

Uses Node.js native test runner. Run with `npm test`.

Test files live in `app/lib/engine/__tests__/`.

Any PR touching combat logic must include:
- At least 1 reducer test
- Keyboard path for the feature
- Undo behavior explicitly stated

## Advisor

For UX, architecture, or D&D rules decisions, consult `ADVISOR_DND_FRONTEND.md`.
That advisor's guidance overrides generic frontend advice in any conflict.

Also see:
- `docs/DOMAIN.md` — domain model reference
- `docs/ENGINE.md` — event system details
- `docs/UI_GOVERNANCE.md` — UI component rules
- `docs/ROADMAP.md` — planned features

## Improvement priorities

1. DM flow speed (encounters/combat)
2. State correctness (initiative, conditions, HP)
3. Performance (avoid unnecessary rerenders)
4. Accessibility (keyboard, focus states)
5. Session safety (resumable live encounters)

## What to avoid

- Large refactors without tests or clear benefits
- New packages without justification
- Mutations during live combat (use events)
- Hand-rolled overlay components (use Radix Dialog from `ui.tsx`)
- Copyrighted D&D text (SRD-safe content only)
