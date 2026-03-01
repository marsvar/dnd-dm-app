# DnD DM App – Claude Instructions

> Place this file in your repo root. Claude Code auto-loads it at the start of every session.
> Update `## Session status` before each working session to give Claude live context.

---

## Session status

> **Update this section before each working session.** This is the most important section for consistent results.

```
Last worked on: 2026-03-01
Current focus:  PC PIN gate + player rolls
Recently completed: PIN per PC (set/clear via DM, PIN-gated player selection), player roll input in encounter view + character sheet Rolls tab; actorId added to ROLL_RECORDED event
Blocked on / open questions: —
Next task: Encounter runner UI polish (active turn highlight, round controls, undo button)
```

### Implementation status (as of 2026-03-01)

| Area | Status | Notes |
|---|---|---|
| Persistence (localStorage) | ✅ Done | Every state change persisted; cross-tab sync via `storage` event |
| Campaign CRUD | ✅ Done | Full CRUD, party membership, `/campaigns` page |
| CI/CD pipeline | ✅ Done | `.github/workflows/ci.yml`: lint + test + build |
| Event-driven combat | ✅ Done | All live edits go through events; undo implemented |
| Conditions / notes / tempHP | ✅ Done | `CONDITIONS_SET`, `NOTES_SET`, `TEMP_HP_SET` events |
| Reducer tests | ✅ Done | `engine/__tests__/` covering all core event types |
| Schema versioning | 🚧 Partial | Version field exists; mismatch resets to seed (no migrate path yet) |
| Error boundaries | 📋 Planned | No try/catch around reducer; silent failures possible |
| Player view | ✅ Done | PIN-gated PC selection; full character sheet edit; roll input in encounter + character sheet |
| Character sheet UI | ✅ Done | Full pen-and-paper style sheet: Overview, Skills, Combat, Bio, Rolls tabs |
| Death save tracking | 📋 Planned | `isDead` flag conceptual only; no 3-success/3-failure in types |
| Inspiration (combat) | 📋 Planned | `Pc.inspiration` exists; not tracked per combatant in encounters |
| Export / session log | 📋 Planned | Log entries exist; no export UI |

---

## Advisor role (consult before every architectural or UX decision)

You are also acting as an expert **D&D Dungeon Master** and **senior frontend / product designer**.

Evaluate all decisions through two lenses:
1. How DMs actually run games at the table
2. How to design fast, resilient, low-friction frontend systems

**Key question to always ask:** *"Would I trust this app while running combat for 6 players at a noisy table?"* If no — the design needs revision.

You are expected to:
- Say *no* when a feature harms DM flow
- Prefer boring, reliable solutions over clever abstractions
- Flag UX decisions that would fail under stress
- Identify missing features DMs subconsciously expect

You are **not** expected to:
- Write large amounts of code
- Optimise prematurely
- Add dependencies without justification

---

## Product vision

**This is a DM tool with an interactive player companion.** The DM view is primary. The player view gives each player PIN-gated access to their own character: full PC sheet editing, self-recorded rolls (digital d20 or manual entry), and a live encounter view during combat. Full real-time multi-device collaboration is deferred to a future phase (requires backend sync).

A **DM-first** app for running live D&D sessions (theatre-of-the-mind).

Primary loop: **Build encounter → Run combat → Track outcomes → Take notes → Continue play**

Must be:
- Usable during active play (time pressure, distractions)
- Cognitive-load reducing, not adding
- Speed and clarity over feature completeness
- SRD-compatible only — no copyrighted text

### v1 definition

v1 is complete when a DM can: create a campaign, add a party of PCs, build an encounter from the bestiary, run that encounter to completion with full combat tracking (initiative, HP, conditions, undo), take notes during play, and resume the session after a browser refresh — without losing any state.

Most of this is already built. The remaining gaps are UI polish (encounter runner UX, quick actions) and a few quality-of-life features (HP roll on add, inspiration tracking).

---

## Commands

```bash
npm run dev     # local dev
npm run build   # production build
npm run lint    # lint check
npm test        # run tests
```

Conventional commit messages preferred (e.g. `feat:`, `fix:`, `chore:`, `docs:`).

---

## Architecture

```
/app                  Next.js App Router
/app/lib/models/types.ts     Domain types (source of truth)
/app/lib/data/srd.ts         SRD seed data
/app/lib/engine/             Event engine (pure reducers, selectors)
/app/lib/store/appStore.tsx  Client state (single source of truth)
/app/lib/store/roleStore.tsx DM/player role and PIN
/app/lib/store/usePlayerSession.ts Player-selected PC and campaign
/app/components/             Shared UI primitives
/docs/                       Reference docs (DOMAIN.md, ENGINE.md, etc.)
```

### State ownership

| Store | Owns | Storage |
|---|---|---|
| `appStore.tsx` | All persistent game data: campaigns, PCs, monsters, encounters, notes, log | `localStorage` |
| `roleStore.tsx` | Who is at the screen: DM/player role, DM PIN | `localStorage` (PIN), `sessionStorage` (role) |
| `usePlayerSession.ts` | Player-specific session: selected PC and campaign | `localStorage` |
| Engine (`/engine/`) | Pure functions only — no I/O, no state | — |

**Rule:** Engine functions are pure; stores call engine functions; components call stores. No component may call engine functions directly.

---

## Domain model

### Actual types (source of truth: `app/lib/models/types.ts`)

**Campaign** — id, name, description?, createdAt

**CampaignMember** — id, campaignId, pcId (join entity for party membership)

**Pc** — id, name, playerName, className, race, level, ac, maxHp, currentHp, tempHp, abilities, skills, saves, resources, notes, inspiration, conditions, visual?

**Monster** — id, name, size, type, ac, hp, speed, challenge, abilities, traits?, actions?, source (SRD|Custom), visual?

**EncounterParticipant** — id, name, kind (pc|monster|npc), refId?, initiative, ac, maxHp, currentHp, tempHp, conditions (string[]), notes?, visual?

**Encounter** — extends EncounterBaseline with eventLog[], eventLogBase?. EncounterBaseline: id, name, location?, campaignId?, round, isRunning, combatMode (prep|live)?, status (idle|running|completed)?, activeParticipantId, participants[]

**Note** — id, title, body, tags[], createdAt, campaignId?

**LogEntry** — id, timestamp, text, encounterId?, campaignId?, source (auto|manual)?

**AppState** — version, monsters[], pcs[], encounters[], notes[], log[], campaigns[], campaignMembers[], activeCampaignId

> **Note:** `isDead`/`isHidden` flags are NOT on `EncounterParticipant` — use conditions or notes. Condition instances are `string[]` (name only), not objects with id/source/duration.

### Invariants
- `currentHp` clamped: `0..maxHp`
- Initiative order is stable; ties resolved deterministically (initiative desc, then name asc)
- Participant IDs are stable and used as React keys
- Encounter runtime is reproducible from: `eventLogBase` snapshot + `eventLog`

---

## Live encounter engine (NON-NEGOTIABLE)

All runtime changes during **Run Combat** must be expressed as events.

```
UI dispatches EncounterEvent
→ applyEncounterEvent(encounter, event) → nextEncounter
→ Persistence: eventLogBase snapshot + eventLog array
```

### Rules
- `applyEncounterEvent` is a pure function — no I/O, no random
- No component may directly mutate participants during live mode
- If a behaviour cannot be expressed as an event, it is not allowed in live mode

### Implemented event types (source of truth: `app/lib/engine/encounterEvents.ts`)
```
COMBAT_STARTED
COMBAT_STOPPED
PARTICIPANT_ADDED      (participant data)
PARTICIPANT_REMOVED    (participantId)
ROUND_SET              (value)
TURN_ADVANCED          (direction: 1 | -1)
INITIATIVE_SET         (participantId, value)
DAMAGE_APPLIED         (participantId, amount)
HEAL_APPLIED           (participantId, amount)
TEMP_HP_SET            (participantId, value)
CONDITIONS_SET         (participantId, value: string[])  ← replaces whole array
NOTES_SET              (participantId, value: string)
COMBAT_MODE_SET        (mode: "prep" | "live")
ENCOUNTER_COMPLETED    (notes?)
ROLL_RECORDED          (mode, context, formula, rawRolls, total)
```

### Undo
- Undo pops the last event from the log and rebuilds from base snapshot
- No partial hidden rollbacks
- Prefer boring, predictable undo over clever partial rollback

### Roll handling
- Support roll modes: digital, manual entry, DM entry
- Store roll results as events (`ROLL_RECORDED`)
- Never infer rolls after the fact

### Testing (required for every new event type)
- [ ] Applies correctly
- [ ] Clamps invariants
- [ ] Does not reorder participants unexpectedly
- [ ] Undo (event pop) restores prior state

---

## D&D domain principles (non-negotiable)

1. **DM is always final authority** — never force a rule outcome; overrides must be fast and visible
2. **Ambiguity is normal** — conditions and rulings are contextual; allow notes, overrides, DM judgment; no rigid validation
3. **Speed beats precision** — good enough now > perfect later; defaults cover 80% of cases; no multi-step flows

---

## Frontend design principles (non-negotiable)

1. **One screen, one mental model** — Builder, Player View, Combat View must be clearly distinct
2. **Keyboard-first, mouse-optional** — core actions keyboard-accessible; focus states obvious; tab order follows DM intent
3. **Stability over cleverness** — stable IDs, predictable ordering, no surprise reflows; no animations that obscure state
4. **Explicit state** — HP, initiative, conditions are explicit values; avoid deeply derived state; favour simple reducers

---

## UI governance

### Approved dependencies
- `lucide-react` — icons (use freely)
- `clsx` + `tailwind-merge` — always compose class names via `cn()` from `app/components/ui.tsx`
- `@radix-ui/react-dialog` — use `Dialog`/`DialogContent`/`DialogTitle`/`DialogClose` from `ui.tsx` for **all** overlays; never hand-roll `fixed inset-0` overlays
- No new packages without explicit justification

### Design tokens
All color, font, and effect values must reference CSS custom properties from `app/globals.css`. Never hardcode hex/RGB in component files.

| Token | Use |
|---|---|
| `--background` | Page background |
| `--foreground` | Body text, high-contrast labels |
| `--surface` | Card and panel backgrounds |
| `--surface-strong` | Input fields, nested surfaces |
| `--accent` | Interactive elements, CTAs |
| `--muted` | Secondary text, placeholders |
| `--ring` | Focus rings |

**Forbidden:** `bg-black/5`, `bg-black/10`, `bg-white/60`, `bg-white/80` — these don't adapt to dark mode. Use `bg-surface` or `bg-surface-strong` instead. `border-black/10` is the only permitted `black/*` value.

**Dark mode:** handled automatically via `prefers-color-scheme: dark`. Do **not** use Tailwind `dark:` variants — use CSS token references only.

### Typography

| Token | Font | Use |
|---|---|---|
| `--font-body` | Alegreya Sans | All body text, labels, UI copy |
| `--font-display` | Marcellus | All h1–h4 headings |
| `--font-mono` | JetBrains Mono | Numbers, stats, roll results |

### Shared UI primitives (source of truth: `app/components/ui.tsx`)

Never create one-off border/radius/shadow/padding combinations in page files.

- **`PageShell`** — required outermost wrapper on every page (`space-y-10`)
- **`SectionTitle`** — first visible element on every feature page
- **`Card`** — grouped feature area (`rounded-2xl border border-black/10 bg-surface p-5`)
- **`Button`** — variants: `primary` (main CTA), `outline` (secondary/destructive-adjacent), `ghost` (tertiary)
- **`Input`** / **`Textarea`** — always use these; never raw `<input>`
- **`Pill`** — tones: `stat` (numeric values), `accent` (status), `neutral` (category tags)
- **`HpBar`** — owns all HP-state color logic; always accompany HP numbers with this
- **`ConditionChip`** — always render conditions as chips, never comma-joined text
- **`ParticipantAvatar`** — every participant identity surface must use this component

### Page structure hierarchy
```
PageShell
└── SectionTitle
    └── Card
        └── [controls, lists, forms]
```
Do not nest `Card` inside `Card`.

### Participant rows (required anatomy, in order)
1. `ParticipantAvatar` — identity anchor
2. Name — truncated (`truncate min-w-0`)
3. Kind pill — `PC` / `MONSTER` / `NPC` (`text-xs uppercase text-muted`)
4. Stat grid — INIT, AC, HP in `font-mono` via `Pill`

### Overlays / modals
- Backdrop: `bg-black/15 backdrop-blur-[1px]` (never darker)
- Clicking backdrop closes the overlay
- Visible close button always present
- Default panel width: `max-w-2xl`; document any deviation

### Interaction rules
- Primary DM action must be **one click**
- Search/filter inputs trigger on every keystroke — no submit button
- Do not hide required state behind hover-only interactions
- Destructive actions (`remove`, `delete`) use `outline` variant, not `ghost`
- Icon-only buttons are **forbidden** — always pair with visible text label or `aria-label`

---

## Definition of done

### Any change
- [ ] Types correct; no `any` unless justified
- [ ] Lint passes with zero new errors
- [ ] Tests pass

### Combat logic change (new event type)
- [ ] Event type added to `encounterEvents.ts`
- [ ] `applyEncounterEvent` case implemented
- [ ] At least 1 reducer test: applies correctly, clamps invariants
- [ ] Undo behaviour stated (pop vs compensate)
- [ ] Keyboard path implemented

### Domain model change
- [ ] `types.ts` updated
- [ ] `loadState()` migration updated — either handle old shape or bump version with explicit reset note

### Participant surface change
- [ ] `ParticipantAvatar` used for all identity rendering
- [ ] `visual` propagated correctly or defaulted to `{ fallback: "initials" }`
- [ ] Name truncation applied
- [ ] Stats rendered in `font-mono` via `Pill`
- [ ] Backward compatibility confirmed for persisted state without `visual` field

### Page or section change
- [ ] `PageShell` as outermost wrapper
- [ ] `SectionTitle` present
- [ ] Content in `Card` sections
- [ ] All interactive elements use shared primitives
- [ ] No hardcoded hex/rgb values
- [ ] No `dark:` Tailwind variants

---

## Testing strategy

Three tiers. Each change type requires the tiers marked below.

| Tier | What | Required for |
|---|---|---|
| Unit | Pure reducer/engine functions (`engine/__tests__/`) | Every new event type, every engine function |
| Integration | Store action → state projection → correct output (no UI) | Complex multi-step flows, persistence round-trips |
| Smoke | Critical user paths end-to-end (start combat → damage → undo → reversed) | Major new features |

Current coverage: unit tests exist and are well-structured. Integration and smoke tiers are not yet written.

---

## Known shortcuts & debt

- **Schema migration is "reset to seed"** — `loadState()` resets to seed data if `version` mismatches. Fine for now; will cause data loss when schema changes once the app is used seriously in real sessions. Needs a proper `migrate(raw) → current` chain before any campaign data matters.
- **No error boundary in combat reducer** — if `applyEncounterEvent` throws (e.g. unexpected event shape), the state update silently fails. Should add try/catch with a visible error state.
- **`conditions` is `string[]` not rich objects** — CLAUDE.md previously specified conditions as objects with id/source/duration. Current implementation uses `string[]`. Richer condition tracking is possible but deferred.
- **Player view reads DM data directly** — the player view uses `useAppStore()` (same data as DM). In a true shared-table future, this needs a separate read path. Architecturally isolated via `usePlayerSession` but the data model isn't separated yet.
- **`hydrated` is hardcoded to `true` in appStore** — `const hydrated = true` at line 175. The hydration flash prevention is incomplete (roleStore has it properly; appStore does not).
- **Button has icon-only usage in some pages** — `campaigns/page.tsx` uses `<Trash2>` in a Button without a text label (aria-label only). Revisit for consistency.

---

## Current roadmap

See `docs/ROADMAP.md` for the full roadmap with sequencing rationale.

### Now (active focus)
- Encounter runner UI polish — active turn highlight, round controls, quick damage/heal/condition/note actions, visible undo + last-action summary
- HP roll on monster add — optional roll when adding monsters to encounters
- Inspiration tracking in encounters — surface `Pc.inspiration` on combatant rows
- UI governance baseline — enforce `ParticipantAvatar` across all participant surfaces

### Next
- Death save tracking — 3-success/3-failure UI on downed PCs
- Concentration tracking — flag + nudge when concentrating caster takes damage
- Encounter CR/XP summary — difficulty indicator in builder (pure calculation)
- Short/long rest — resource reset mechanics
- Player section — party dashboard, character access, controlled DM note sharing
- Character sheet UI — pen-and-paper style, stats block, skills, saves

### Later
- Legendary actions / lair actions — reminder system for boss monsters
- Accounts and sharing — multi-campaign, player/DM collaboration, real-time updates
- Campaign depth — timeline, session summaries, encounter templates
- Schema migration chain — replace reset-to-seed with proper migrate() function

### Open questions
- Best minimal auth approach without harming local-first workflows
- What data should be shareable to players during live combat
- Before implementing auth/sync: define what data is stored, where, and under what terms (GDPR applies)

---

## Deferred (do not implement yet)
- Color scheme enforcement / dark-mode audit
- `SectionCardHeader` shared primitive
- Mobile nav (hamburger / drawer)
- Avatar upload / local file support
