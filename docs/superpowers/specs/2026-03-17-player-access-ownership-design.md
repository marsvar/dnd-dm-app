# Player Access + Ownership — Design Spec

**Date:** 2026-03-17
**Status:** Approved
**Scope:** Player access flow, campaign membership, PC ownership/assignment, player home (My PCs) + campaign hub (Encounters, Party, My Sheet). No combat UI changes.

---

## Problem Statement

The current player access model relies on PIN-gated links and does not scale to broader usage or long-term ownership. Players need a clear, account-based way to access their PCs and campaigns, while DMs retain control over assignment and editing permissions. The experience must stay fast at the table, avoid spoilers (planned encounters), and support read-only party visibility.

---

## Design Goals

- Replace PIN-gated access with **account-based ownership** using Supabase Auth
- Keep onboarding low-friction via **magic link** sign-in
- Make **My PCs** the first player landing surface after login
- Allow players to **view all party PCs** but **edit only assigned PCs**
- Hide **planned encounters** from players to preserve table surprise
- Provide a **condensed, read-only view** when selecting non-owned PCs
- Keep DM control explicit and fast (assignment from Party list)

---

## Architecture Overview

**Per-campaign roles and membership** drive access. Users can be a DM in one campaign and a player in another. PCs belong to exactly one campaign. Users can own multiple PCs across campaigns.

### Core tables

- `campaign_members`
  - `campaign_id`, `user_id`, `role` (dm | player), `joined_at`
- `pc_assignments`
  - `pc_id`, `user_id`, `campaign_id`
  - **Constraint:** one owner per PC (`UNIQUE(pc_id)`), `campaign_id` must match the PC's campaign
- `campaign_invites`
  - `campaign_id`, `role`, `token`, `expires_at`, `created_by`

### Access rules (RLS intent)

- Any **campaign member** can read campaign metadata and PCs in that campaign
- Only **assigned players** (or DMs) can edit a PC
- Only **DMs** can create invites or assign PCs
- `campaign_invites` are readable only by DMs; invite consumption is validated server-side

---

## Auth + Invite Flow

**Supabase Auth** is retained as the auth provider. Magic link is enabled alongside email/password.

### Invite acceptance (campaign-based)

1. Player opens invite link
2. If not authenticated, prompt for email (magic link)
3. Redirect back to invite acceptance using `emailRedirectTo`
4. On success, add `campaign_members` record
5. Redirect to **My PCs** landing

**Note:** Invite links are campaign-based, not PC-based. PC assignment remains a DM action.

**Redirect safety:** `emailRedirectTo` must be restricted to an allowlisted domain/path to avoid open-redirects.

**Role conflicts:** if the user is already a campaign member with a different role, do not auto-upgrade/downgrade. Show a message and require the DM to resolve role changes explicitly.

---

## Player Experience

### Landing: My PCs

- First screen after login
- Shows **assigned PCs only**
- Card shows PC name, campaign name, level/class, and an Open button

**Empty state (no assigned PCs):**
- Show a campaign list the player belongs to
- Provide a "View Party" button to enter the campaign hub in read-only mode
- Message: "Waiting for assignment" with guidance to contact the DM

### Campaign Hub

Accessible from a PC card. Provides:

- **Encounters**: show Active + Completed only; Planned is hidden
- **Party**: show all PCs with ownership badge
- **My Sheet**: default tab for owned PC

**Navigation:** campaign switcher in the hub header so players can move between campaigns even if they have no assigned PC in that campaign.

### Condensed view for non-owned PCs

When a player clicks a Party PC they do not own, show a condensed read-only view:

- **Shown**: HP, AC, initiative, conditions, notes (read-only)
- **Hidden**: inventory, features, editable fields

All condensed view data is **read-only projection**; no live-combat mutation is permitted here.

Future: add player portraits for Party list and My PCs cards.

---

## DM Experience

- Party list includes an **assign PC** control
- Assignment sets `pc_assignments` and unlocks editing for that player
- Invite link management in Campaign Settings (create/revoke)

---

## Data Flow

- **My PCs** query: PCs where `pc_assignments.user_id = current_user`
- **Party tab** query: all PCs for campaign membership
- **PC edit permissions**: enabled only if assigned or DM
- **Condensed view**: read-only projection using limited fields
- **Encounters query**: server-side filter to exclude `status = planned` for player role

---

## Edge Cases

- Invite expired: show error + request new link
- Invite already accepted: redirect to campaign hub
- Invite role conflict: show message and require DM action
- PC unassigned: visible in Party only; opens condensed view
- Assignment removed: PC disappears from My PCs; still visible in Party
- Campaign removal: campaign and PCs vanish from player lists
- Member removal: assigned PCs become unassigned; former member loses access

---

## Testing

- RLS policy tests for:
  - membership read access
  - assignment-based edit permissions
  - DM-only invite/assignment actions
- UI tests for:
  - invite acceptance + magic link redirect
  - My PCs landing
  - Party condensed view
  - read-only vs editable PC sheet

---

## Definition of Done

- Supabase Auth supports magic link + email/password
- Campaign membership and assignment tables added with RLS policies
- My PCs landing is default after login
- Campaign hub shows Encounters, Party, My Sheet tabs
- Planned encounters hidden from players
- Condensed view for non-owned PCs implemented
- DM assignment flow available from Party list
- Invite links are campaign-based and require login
- Tests for RLS + UI pass

---

## Out of Scope

- Guest access / PIN-gated links
- Real-time encounter sync
- Player roll sharing
- PC portraits (planned follow-up)
- Multi-campaign PCs (PC belongs to one campaign only)
