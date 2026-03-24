# Player Onboarding Wizard — Design Spec

**Date:** 2026-03-23
**Status:** Draft
**Scope:** Player invite welcome + create/import PC wizard and assignment flow.

---

## Problem Statement

Players need a clear, guided onboarding experience after accepting a campaign invite. The flow must show campaign context, let players create or import a PC, and ensure the resulting PC is automatically assigned to the authenticated player. The existing player landing (“My PCs”) should then show only assigned characters.

---

## Design Goals

- Provide a wizard flow with context and clear next steps.
- Show campaign name + description on the welcome step.
- Support Create PC and Import from DnDBeyond.
- Auto-assign the created/imported PC to the authenticated player.
- Preserve existing “My PCs” landing and list behavior.
- Use UI UX Pro Max and 21st.dev for new UI components.

---

## Architecture + Route Flow

### Wizard steps

1. **Welcome** (`/player/welcome`)
   - Campaign name + description.
   - Short intro text.
   - Continue button.
2. **Choose** (`/player/welcome?step=choose`)
   - Choice cards: Create PC / Import from DnDBeyond.
   - Continue button (enabled after selection).
3. **Execute**
   - Create: `/player/onboarding`
   - Import: `/player/import`
   - On success, redirect to `/player` (My PCs).

### Data sources

- Welcome step uses invite token to fetch campaign summary.
- Create/Import writes PC + assignment for `auth.uid()`.

---

## UI Layout + Interactions

- Step indicator (1/3, 2/3, 3/3) and back button.
- Welcome shows campaign name + description and a “You’ve been invited” line.
- Choose step uses two large cards with short descriptions.
- Selection click either toggles selection or advances directly (with a confirm button).
- Success state: “PC ready” + “Go to My PCs.”

---

## Data Flow + Error Handling

### Data flow

- Fetch campaign summary with invite token on welcome step.
- Create/import:
  - Insert PC row.
  - Insert `pc_assignments` for `user_id = auth.uid()` and `campaign_id`.
- Redirect to `/player`.

### Error handling

- Invalid/expired invite: inline error + request new invite.
- Create/import failure: show error toast + keep form state.
- Assignment failure: “PC created, assignment failed” with retry.

---

## Testing + Acceptance Criteria

### Tests

- Wizard step navigation tests.
- Invite → welcome → create/import → assignment → My PCs integration test.
- RLS validation: player can create PC + self-assign only for own user.

### Acceptance

- Welcome shows campaign name + description.
- Create/import yields a PC assigned to the player.
- My PCs shows the new character.
- All error states are actionable and recoverable.

---

## Out of Scope

- DM-side reassignment UI.
- Realtime encounter sync.
- Multi-campaign player dashboard.
