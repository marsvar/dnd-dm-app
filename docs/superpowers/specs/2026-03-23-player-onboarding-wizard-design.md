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
- Show campaign name + description on the welcome step after auth (pre-auth shows generic copy).
- Support Create PC and Import from DnDBeyond.
- Auto-assign the created/imported PC to the authenticated player.
- Preserve existing “My PCs” landing and list behavior.
- Use 21st.dev to source the stepper, choice cards, and error banner patterns.
- UX Pro Max checklist: clear step hierarchy, large primary CTA, balanced spacing, visible focus states, and empty-state messaging.

---

## Architecture + Route Flow

### Token + auth guard

- Invite token is passed as a query param (`?token=`) only on the first `/player/welcome` hit.
- Set `Cache-Control: no-store` on `/player/welcome` and `/invite/exchange` responses.
- Apply `no-store` and analytics suppression on `/player/onboarding` and `/player/import` when invite-gated.
- Server exchanges token for a short-lived invite context ID (stored server-side) to avoid token leakage in history/referrer.
- Token exchange happens via a POST-only endpoint (no querystring logging). It is single-use and rate-limited; raw tokens are never logged in server logs or analytics.
- Analytics are disabled on invite wizard routes while `?token=` or `?context=` is present; re-enable only after cookie is set and URL is scrubbed.
- If `?context=` fallback is used, keep analytics disabled for the full wizard.
- Apply `Referrer-Policy: no-referrer` on all invite wizard routes and avoid external assets until URL scrubbed; use same-origin fonts/images.
- Reverse-proxy logs must omit query strings for `/player/welcome`.
- If query strings cannot be suppressed, render a minimal same-origin shell and immediately POST the token exchange (no third-party assets/scripts before scrub).
- If `?context=` is used, redact query strings on all `/player/*` routes in server logs.
- Canonical flow: initial GET returns minimal HTML (no shared layout) → client POSTs `/invite/exchange` → server returns context + summary + sets HttpOnly cookie → client renders summary with full wizard layout and strips token from URL.
- Logged-out flow: token is stored server-side via opaque auth `state`, and context is created only after successful auth callback.
- After exchange, store context in an HttpOnly cookie (`Secure`, `SameSite=Lax`, `Path=/`, short `Max-Age` matching TTL).
- If cookies are unavailable, fall back to `?context=` with log redaction; fallback context TTL is 10 minutes and single-use.
- When using `?context=`, keep it in the URL for the wizard flow and rely on log/analytics scrubbing; do not attempt to remove it mid-flow.
- Treat `context` as a bearer secret: high-entropy, unguessable, and excluded from logs/analytics/referrers.
- Scrub query strings from server/client error reporting on all invite wizard routes.
- Invite context TTL: 30 minutes. Contexts are stored server-side and extended on each valid step load.
- Extend TTL on form autosave/heartbeat while the user is on Create/Import; allow a grace window on final submit.
- Absolute max TTL: 4 hours; extensions cannot exceed this cap.
- Cleanup policy: expire-only with a background sweep (do not delete active contexts).
- Storage model: `invite_contexts` table with `id`, `invite_id`, `user_id`, `target_email`, `expires_at`, `created_at`, `last_seen_at`; index on `expires_at` for sweeps.
- `invite_contexts` also stores a non-secret `public_id` returned from exchange (including fallback responses) for UI state keying; it is not accepted for auth.
- `public_id` is only delivered in the exchange response body, never via URL params.
- Sweep cadence: every 30–60 minutes; log count of expired contexts for observability.
- On first `/player/welcome?token=...` render, immediately replace URL to strip the token from history/referrer after exchange.
- If a user already has an invite context cookie and opens a new invite link, the new token replaces the old context (old context is invalidated) and the older tab shows a “Invite changed” banner with a restart CTA.
- Context binds to the invite ID and (when present) the invite target email; reuse from a different user/email is rejected.
- After auth, bind context to the authenticated user ID to prevent cross-account reuse.
- Context binding race: the first authenticated session wins; later sessions receive “context already bound” and must restart with a new invite link.
- Reservation timing (single rule):
  - If target email exists: pre-auth exchange creates a 2-minute provisional hold, finalized into reservation post-auth.
  - If no target email: no pre-auth hold; reserve after auth only.
- If provisional hold expires mid-auth, show an “Invite expired” error and restart flow.
- Once reserved for a user, other users cannot accept until expiry or explicit release.
- Server enforces unique acceptance for `invite_id + user_id`; first successful acceptance wins, subsequent attempts return "already used".
- If token/context is missing or invalid at any step, show inline error on `/player/welcome` with a login/request-invite CTA.
- Campaign summary is shown after auth; pre-auth view shows only a generic “You’ve been invited” message.
- Auth gate: if user is not signed in, prompt login, create context server-side, then return to `/player/welcome` after auth.
- Pre-auth reservation: reserve only after auth; if target email exists, pre-auth exchange uses a 2-minute provisional hold with strict rate limiting and abuse monitoring.
- CSRF: require a token for `/invite/exchange` and use Origin/Referer checks for create/import RPCs. If double-submit is used, it must be a separate non-HttpOnly CSRF cookie. If cookies are blocked, fall back to a signed one-time token in the POST body or show a blocking error.
- Cookie-blocked fallback: GET returns a short-lived nonce embedded in the HTML; POST exchanges include nonce and rotate it per request.
- OAuth state uses an opaque token; context is stored server-side and bound on callback.
- Pre-auth CSRF: GET `/player/welcome` issues a non-HttpOnly CSRF cookie used for POST `/invite/exchange`.
- Auth state verification is required; bind context to the authenticated session on first post-auth request.
- If the invite specifies a target email, enforce that `auth.user.email` matches (normalized; verified primary email only).
- If no target email, reserve the invite only after auth to avoid pre-auth blocking.
- If the user signs in with a non-matching email, show a mismatch message and require a fresh invite.
- Release the reservation immediately on email mismatch or explicit “Switch account.”
- If the auth provider returns no verified email, block and prompt email verification before proceeding.
- If the user signs out mid-flow, clear invite context and require re-entry.
- If the current user is not eligible for the invite (revoked, expired, or wrong campaign), show a clear error and a “Request new invite” CTA.

### Wizard steps

1. **Welcome** (`/player/welcome?token=...`)
   - Campaign name + description.
   - Short intro text.
   - Continue button.
2. **Choose** (`/player/welcome?step=choose`)
   - Choice cards: Create PC / Import from DnDBeyond.
   - Continue button (enabled after selection). Cards do not auto-advance.
3. **Execute**
   - Create: `/player/onboarding` (wizard chrome retained as step 3)
   - Import: `/player/import` (wizard chrome retained as step 3)
   - On success, redirect to `/player` (My PCs).
- Wizard chrome is provided by a shared layout wrapper for invite-gated flows to avoid duplicate headers.

### Invite vs normal access

- `/player/onboarding` and `/player/import` support two modes:
  - Invite-gated (requires invite context; assigns PC to invite campaign).
  - Normal (no invite; requires explicit campaign selection before submit; no step indicator).
- Direct navigation without valid context in invite-gated mode redirects to `/player/welcome` with an error.
- Invite-gated mode is enabled only when a valid context is present and the invite is pending or accepted for the current user.
- Normal mode rejects campaigns where the user is not already a member.

### Data sources

- Welcome step uses invite context (cookie or fallback query param) to fetch campaign summary after exchange.
- If summary fetch fails, show a retry action and keep the user on Welcome.
- Create/Import writes PC + assignment for `auth.uid()` in a single transaction or RPC to avoid orphan PCs.

---

## UI Layout + Interactions

- Step indicator (1/3, 2/3, 3/3) and back button.
- Welcome shows campaign name + description and a “You’ve been invited” line.
- Campaign description is sanitized (plain text or safe markdown) before render.
- Description fallback: “No description provided.” Long text truncates with a “Show more” affordance.
- Choose step uses two large cards with short descriptions.
- Choice cards use radio-group semantics with arrow-key navigation and `aria-checked`.
- Selection toggles the chosen card; user confirms with Continue.
- Back button returns to previous step and preserves selection.
- Success state: “PC ready” + “Go to My PCs.”
- If the player already has a PC in the campaign, show a “Continue to My PCs” primary action and a secondary “Create another PC.”
- “Create another PC” routes to normal mode with the campaign preselected.
- Ensure `campaign_members` exists before switching to normal mode.
- If membership insert fails (revoked/invalid campaign), show an error and return to `/player`.

---

## Data Flow + Error Handling

### Data flow

- Fetch campaign summary with invite context (cookie or fallback query param) on welcome step.
- Create/import:
  - Insert PC row.
  - Insert `pc_assignments` for `user_id = auth.uid()` and `campaign_id`.
  - Insert `campaign_members` for `user_id = auth.uid()` and `campaign_id` if missing.
  - Use `ON CONFLICT DO NOTHING` (or equivalent) for membership/assignment inserts.
- Use a transactional RPC for create + assign in both invite and normal modes to avoid orphans; no partial writes outside the transaction.
  - Idempotency: RPC uses `context_id + action_id` so “Create another PC” can mint a new `action_id`.
  - `action_id` is generated per submit (UUID), stored for the attempt, and invalidated after success.
  - One active `action_id` per context; replays return the same PC until user explicitly chooses “Create another PC.” Auto-refresh never mints a new `action_id`.
  - Store mapping in `invite_action_attempts` (`context_id`, `action_id`, `pc_id`, `status`) so retries return the same PC.
  - Server enforces one active action per context unless “Create another PC” is explicitly selected.
  - Concurrency: disable primary action while request is in-flight; RPC safe for retries.
  - Multi-tab: duplicate submits should return the same assignment without creating extra PCs.
- Multi-tab conflicts: if a newer `action_id` is started, earlier attempts return a conflict prompting refresh.
- Cancel behavior: navigating back from execute invalidates the active `action_id`.
- Server behavior: older attempt receives a deterministic conflict response before any writes if a newer action is active.
- Conflict UX: “Newer attempt detected. Reload to continue.” with a single “Reload” CTA; older attempt is canceled server-side.
  - Extend context TTL on each valid API call; allow a short grace window on final RPC.
- Revalidate invite + campaign on each step load and on the final RPC.
- Multiple PCs per user per campaign are allowed; if a user already has an assigned PC, they can continue or create another.
- Redirect to `/player`.
- Legacy PCs without assignments require a backfill before enabling player onboarding; My PCs lists only assigned PCs.
- Normal mode idempotency: store `action_id` server-side keyed by `user_id + campaign_id + action_id` to allow multiple PCs with explicit new action IDs.

### Error handling

- Invalid/expired/revoked invite: inline error + request new invite.
- Context already bound: show “Use existing session” and “Request new invite” CTAs.
- Auth mismatch: show “Sign out and switch account” CTA.
- Create/import failure: show error toast + keep form state.
- Assignment failure: “PC created, assignment failed” with retry. Cleanup only if the PC was created in this transaction and has no assignments; otherwise mark `needs_assignment` and allow retry later.
- Invite state: `accepted_pending_assignment` while `needs_assignment` exists; retries reuse the same context idempotency key.
- `needs_assignment` lives on the invite acceptance record (`invite_action_attempts.status`) and is indexed by `user_id` for recovery banners.
- If invite was consumed but assignment missing, show a recovery screen that retries assignment.
- Recovery entry point: show a banner on `/player` when `needs_assignment` is present with a “Retry assignment” action.
- Recovery route: `/player/recover` uses context/cookie to complete assignment before returning to `/player`.
- Pending visibility: include character name + campaign in the banner; optionally show an “Unassigned (pending)” grouping for `needs_assignment` only.
- Error messages move focus to an error summary and announce via `aria-live`.
- If context expires mid-flow, show an “Invite expired” message and require a new invite link.
- If the campaign is deleted or the invite is revoked between steps, show a clear error and exit the wizard.
- If invite is accepted and `needs_assignment` exists, allow recovery without context by selecting the most recent `accepted_at` invite (tie-break by `updated_at`) or prompt the user to choose.

### Invite lifecycle

- Invite states: `pending -> accepted_pending_assignment -> accepted` (single-use).
- Acceptance occurs only after successful assignment, except when an assignment already exists.
- Early acceptance is allowed only when a valid assignment already exists.
- Eligibility checks (email match, campaign active) run before any acceptance or redirect.
- Reservation rules: if target email exists, reserve on exchange; otherwise reserve after auth.
- Email mismatch releases reservation and the invite remains pending for reuse with the same link.
- When PC creation starts, set `reserved_for_user_id` (and optionally `accepted_pending_assignment`) to block other users until completion or expiry.
- If multiple pending invites exist for the same user+campaign, use the most recent and expire older ones on acceptance.
- If an older invite is accepted, newer pending invites are invalidated as “already used.”
- If user is already a campaign member but has no PC assignment, allow create/import and accept on first assignment.
- If a user already has an assignment in the campaign, accept the invite immediately and default to “Continue to My PCs.”
- If invite is accepted but `needs_assignment` is true, route to the recovery screen instead of `/player`.
- If user abandons the flow, invite remains pending until expiry.
- If invite already accepted by the current user, redirect to `/player` with a toast “Invite already used for this account.”
- If invite accepted by a different user, show invalid/expired error.
- If context expires but invite is accepted for this user, allow normal mode with the campaign preselected.
- `invite_contexts` and `invite_action_attempts` are service-role only (no client read access); enforce via RLS.

### DnDBeyond import contract

- Input: shareable character URL or ID.
- Minimum imported fields: name, class, level, race, ability scores, saves, skills, HP, AC, passive perception.
- Only SRD-safe fields are persisted; non-SRD content is excluded or stored as user-provided notes with a warning.
- Failure modes: invalid URL/ID, rate limiting, private/locked sheet. Provide clear error and retry guidance.
- Async states: show loading/progress, allow cancel back to Choose without losing selection.
- Import form state is stored in session storage to support refresh/retry.
- Two-phase flow: validate/import preview → confirm → single RPC creates PC + assignment.
- Non-SRD class/race fallback: mark as "custom" and require manual edit before confirm.
- Consent + retention: show a notice before import; raw imported payload is not stored, only mapped SRD-safe fields and user notes persist.
- If remote fetch is blocked, offer a manual create path with a prefilled name only.
- Respect DnDBeyond ToS; server-side fetch with rate limits and a manual import fallback if blocked.

### Accessibility

- Step indicator announced to screen readers with `aria-current` on active step.
- Keyboard path: tab order flows from header → step content → primary action.
- Enter triggers primary action when focus is not in a text input; Space toggles selected card.
- Focus moves to the step heading on each step transition.

### Wizard state persistence

- Persist the current step and selection in URL params; refresh returns to same step.
- Step param contract: `step=welcome|choose` on `/player/welcome` after token scrub.
- Stepper source of truth: `/player/welcome` handles `welcome` + `choose`; `/player/onboarding` and `/player/import` are the execute step.
- Guard: `choose` requires auth + valid context; otherwise redirect to welcome/login with error.
- Back from execute returns to `/player/welcome?step=choose`.
- If step data is invalid (missing token), reset to Welcome with error.
- Wizard state uses invite context from HttpOnly cookie; selection is stored in session storage for back navigation.
- URL params are the source of truth within `/player/welcome`; session storage is only a convenience for default selection.
- Session storage keys are scoped by a non-secret `context_public_id` and cleared on context change or sign-out.
- If `?context=` fallback is used, it hydrates the wizard for the full flow and is stripped when possible.
- If session storage is cleared mid-flow, route back to Choose and require a new selection.
- Browser Back uses URL-driven step history; invalid step transitions redirect to the nearest valid step.
- Step validation: allow only `welcome`, `choose` on `/player/welcome`; missing required state redirects to Welcome with an error.

---

## Testing + Acceptance Criteria

### Tests

- Wizard step navigation tests.
- Invite → welcome → create/import → assignment → My PCs integration test.
- RLS validation: player can create PC + self-assign only for own user.
- Auth mismatch, expired context mid-step, and already-assigned invite reuse tests.
- Idempotent retries, multi-tab duplicate submits, and invite accepted-by-other-user tests.

### Acceptance

- Welcome shows campaign name + description.
- Create/import yields a PC assigned to the player.
- My PCs shows the new character.
- My PCs continues to list assigned PCs (no grouping changes in this scope).
- All error states are actionable and recoverable.

---

## Out of Scope

- DM-side reassignment UI.
- Realtime encounter sync.
- Multi-campaign player dashboard.
