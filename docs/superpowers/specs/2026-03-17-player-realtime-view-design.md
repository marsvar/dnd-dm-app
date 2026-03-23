# Player Realtime View — Design Spec

**Date:** 2026-03-17
**Status:** Approved
**Scope:** Player Encounter + Party screens update live for connected players with visual cues. No DM workflow change; combat remains event-driven.

---

## Problem Statement

The player encounter screen does not reflect DM changes (damage, conditions, turn changes) in real time. This breaks the live table experience and forces players to refresh or reconnect. We need low-latency updates for Encounter and Party views without exposing DM-only data or expanding scope to full campaign sync.

---

## Design Goals

- Live updates for **Encounter** and **Party** screens only
- Preserve DM event-driven combat model
- Avoid exposing DM-only data to players
- Provide brief visual cues when values change
- Keep payloads small and rerenders minimal

---

## Architecture Overview

Introduce a **player-safe snapshot table** in Supabase: `campaign_player_view`.

- DM side derives a player-facing snapshot after state changes
- Player clients subscribe to realtime updates for their campaign
- Player UI merges snapshot and highlights changes

### Table: `campaign_player_view`

Fields (shape may be JSONB as needed):

- `campaign_id` (uuid, PK)
- `updated_at` (timestamptz)
- `payload` (jsonb)
  - `active_encounter`: **null** when no active encounter, otherwise:
    - `id`, `name`, `round`, `active_participant_id`
  - `participants`: **always included** (empty when no active encounter)
    - PC participant fields:
      - `id`, `name`, `kind: "pc"`, `initiative`
      - `current_hp`, `max_hp`, `temp_hp`
      - `conditions` (PC-only)
    - Monster/NPC participant fields:
      - `id`, `name`, `kind: "monster" | "npc"`, `initiative`
      - `hp_tier` only (Healthy/Bloodied/Critical/Down), **no numeric HP**
      - `conditions` **not included**
  - `party`: **always included**
    - `pc_id`, `name`, `class_name`, `level`
    - `current_hp`, `max_hp`, `temp_hp`
    - `conditions` (PC-only)

RLS intent:

- Campaign members can **read** their campaign snapshot
- Only DM can **write** their campaign snapshot
- All policies filter by `campaign_id`

---

## Data Flow

1. DM updates encounter/party state (combat events, initiative changes, undo, or party edits)
2. Snapshot derived from **projected state after applyEvent** (including undo)
3. Snapshot is upserted to `campaign_player_view`
4. Player Encounter + Party screens subscribe to realtime updates
5. On update, player UI merges snapshot and triggers visual cue

Notes:

- Snapshot derivation **filters** DM-only data and planned encounters
- No PC private notes or DM-only tags are included in the snapshot
- No changes to existing encounter event types

---

## Player UI Behavior

### Encounter Screen

- Live updates for round, active participant, HP/conditions (PCs)
- Monster/NPC HP remains masked (tier labels only); no monster/NPC conditions shown
- Visual cue: highlight changed combatant row for ~1.5s

### Party Screen

- Live updates for party HP/conditions
- No DM notes or private fields displayed
- Visual cue: highlight changed PC card + HP bar for ~1.5s

Cue style:

- Warm accent glow + subtle background tint
- Non-blocking, auto-clears

---

## Error Handling

- Realtime disconnect: show "Live updates paused" badge; auto-retry and refetch on reconnect
- Stale snapshot (>30s old): compare `updated_at` to local clock; if stale, show "May be outdated" hint
- No campaign context: remain static without errors

---

## Snapshot Merge Rules

- Player client **replaces the full payload** on each realtime update
- No partial merges; removals are handled by full replacement
- If `active_encounter` is null, the UI clears encounter data immediately

---

## Testing

- Unit: snapshot derivation from encounter state
- UI: cue appears on change and clears
- RLS: members can read; non-members cannot; DM can write
- No combat reducer changes required

---

## Definition of Done

- `campaign_player_view` table and RLS policies added
- Snapshot derivation filters to player-safe data
- Player Encounter + Party subscribe to realtime updates
- Visual cues on updated rows/cards
- Realtime disconnect/stale states handled gracefully
- Tests pass

---

## Out of Scope

- Full campaign state sync
- Player write access to party state
- Planned encounters visible to players
