# Live Encounter Engine (Spec)

## Goal
Make live combat predictable, recoverable, and testable under time pressure.

## Rule
All runtime changes are events.
State is a projection of events.

## Contract
- UI emits `EncounterEvent`
- Engine reduces: `applyEvent(prevState, event) -> nextState`
- Persistence stores: initial snapshot + event log

## Undo
Undo removes the last event or appends a compensating event.
No partial hidden rollbacks.

## Testing
Every new event type must have reducer tests:
- applies correctly
- clamps invariants
- does not reorder combatants unexpectedly

✅ Every live-combat UI action dispatches an EncounterEvent
✅ applyEvent is a pure function (no I/O, no random)
✅ No direct mutation of combatants in live mode
✅ Undo implemented by popping last event (MVP) or compensating event (later)
✅ Reducer tests exist for each new event type

ROLL_RECORDED stores:
mode: digital | manual | dm
rawRolls: number[]
total: number
context (attack/check/save/damage + labels)