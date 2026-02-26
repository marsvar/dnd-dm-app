# Domain model (DnD DM App)

## Core entities

### Campaign
- id, name
- encounters[]
- party/players[]
- notes (optional)

### PlayerCharacter (PC Template)
- id, name, class, level
- stats, skills, saves
- maxHP (or derived from class/level), resources (optional)
- rollMode (digital | manual | dm)

### Monster (Template)
- id, name
- AC, maxHP (or default HP), attacks/abilities (SRD-safe summary)
- tags (type, environment, CR)

### Encounter (Runtime Container)
- id, name
- combatants[] (instances used in live combat)
- eventLog[] (append-only)
- status: preparing | active | completed
- round, activeCombatantId (or activeIndex)

### Combatant (Instance)
A combatant is an instance for a specific encounter run.

- id (stable)
- sourceType: PC | Monster | NPC
- sourceId (links back to template)
- label (display name)
- maxHP
- currentHP
- tempHP (optional)
- initiative (optional until set)
- conditions[] (instances)
- notes (optional)
- flags (e.g., isDead, isHidden) — avoid rules enforcement

### Condition (Instance)
- id (stable)
- name
- source? (optional: “spell”, “feature”, “monster”)
- duration? (optional: rounds, until end of next turn, etc.)
- notes? (optional)

---

## Invariants
- `currentHP` is clamped: `0..maxHP`
- initiative order is stable; ties resolved deterministically unless DM reorders manually
- combatant IDs are stable and used as React keys
- condition instances are id-based and removable without ambiguity
- encounter runtime is reproducible from: (base encounter snapshot + eventLog)

---

## Live Encounter Engine (Required)
Live combat is driven by an append-only event log.

### Source of truth
- The single source of truth during live mode is `eventLog[]`.
- Encounter state shown in UI is a projection of `applyEvent(...)`.

### Reducer rule
- All live changes must be expressible as an `EncounterEvent`.
- Components dispatch events; they do not mutate state directly.

### Minimum event types (starter set)
- COMBAT_STARTED
- INITIATIVE_SET (combatantId, value)
- TURN_ADVANCED
- DAMAGE_APPLIED (targetId, amount, damageType?)
- HEAL_APPLIED (targetId, amount)
- TEMP_HP_SET (targetId, value)
- CONDITION_ADDED (targetId, condition)
- CONDITION_REMOVED (targetId, conditionId)
- ROLL_RECORDED (actorId?, context, formula, mode, rawRolls, total)
- NOTE_ADDED (scope: encounter|combatant, text)

---

## Key flows

### Encounter builder
- add combatants quickly
- duplicate templates
- save encounter setup as reusable template
- minimal friction: defaults and quick-add

### Party / roster
- manage PCs
- attach PC templates to encounter combatants
- roll mode per character

### Combat loop
start → set/roll initiative → advance turn → apply damage/heal → add/remove conditions → round counter

### Recovery
- undo last action
- resume after reload from persisted log