# Player Onboarding Wizard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a secure invite-gated onboarding wizard that exchanges invite tokens for short-lived contexts, guides players through create/import, and auto-assigns PCs with recovery paths.

**Architecture:** Add invite_contexts + invite_action_attempts service-role tables, expand campaign_invites to track reservation/acceptance, and implement transactional RPCs for create+assign with idempotency. The wizard lives across /player/welcome (welcome + choose) and execute routes (/player/onboarding, /player/import) wrapped by shared chrome; security headers, log redaction, and analytics suppression protect tokens. Recovery is handled via a needs-assignment banner and /player/recover route.

**Tech Stack:** Next.js App Router, Supabase Postgres + RLS + RPC, Supabase Auth, TypeScript, Tailwind + `cn()` utility, 21st.dev components, UX Pro Max checklist.

---

## File Structure (planned changes)

- Create: `supabase/migrations/20260327_invite_contexts.sql`
- Create: `supabase/tests/rls_invite_contexts.test.sql`
- Create: `app/lib/invites/contextService.ts`
- Create: `app/lib/invites/__tests__/contextService.test.ts`
- Create: `app/invite/exchange/route.ts`
- Create: `app/api/invites/exchange/route.ts`
- Create: `app/api/invites/heartbeat/route.ts`
- Create: `app/api/invites/cleanup/route.ts`
- Create: `middleware.ts`
- Modify: `app/layout.tsx`
- Create: `app/player/welcome/page.tsx`
- Create: `app/player/welcome/WizardLayout.tsx`
- Create: `app/player/welcome/InviteChangedBanner.tsx`
- Create: `app/player/onboarding/page.tsx`
- Create: `app/player/import/page.tsx`
- Create: `app/player/recover/page.tsx`
- Modify: `app/player/page.tsx`
- Modify: `app/api/import-dndbeyond/route.ts`
- Create: `app/api/invites/create-pc/route.ts`
- Create: `app/api/invites/recover/route.ts`
- Create: `app/lib/invites/__tests__/inviteRpc.test.ts`
- Create: `app/player/__tests__/playerOnboarding.test.ts`
- Modify: `README.md`
- Modify: `docs/ROADMAP.md`

---

### Task 1: Database schema + RLS + RPCs

**Files:**
- Create: `supabase/migrations/20260327_invite_contexts.sql`
- Create: `supabase/tests/rls_invite_contexts.test.sql`

- [ ] **Step 1: Write failing SQL tests for new tables + RLS**

```sql
-- invite_contexts: service-role only, public_id unique, expires_at indexed
-- invite_action_attempts: unique(context_id, action_id), status values
-- player_action_attempts: normal-mode idempotency (user_id + campaign_id + action_id)
-- campaign_invites: status + reservation columns enforce lifecycle
-- RPC: create_invite_pc enforces idempotency + needs_assignment handling
```

- [ ] **Step 2: Run SQL tests (expect FAIL)**

Run: `psql $SUPABASE_DB_URL -f supabase/tests/rls_invite_contexts.test.sql`
Expected: FAIL with missing relations/columns or policy errors.

- [ ] **Step 3: Implement migration**

```sql
-- Add lifecycle columns to campaign_invites
alter table public.campaign_invites
  add column if not exists target_email text,
  add column if not exists status text not null default 'pending'
    check (status in ('pending','accepted_pending_assignment','accepted','revoked')),
  add column if not exists reserved_for_user_id uuid,
  add column if not exists accepted_by_user_id uuid,
  add column if not exists accepted_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- Invite contexts (service-role only)
create table public.invite_contexts (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  invite_id uuid not null references public.campaign_invites(id) on delete cascade,
  user_id uuid,
  target_email text,
  reserved_for_user_id uuid,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index invite_contexts_expires_idx on public.invite_contexts (expires_at);

-- Invite action attempts (idempotency + recovery)
create table public.invite_action_attempts (
  id uuid primary key default gen_random_uuid(),
  context_id uuid not null references public.invite_contexts(id) on delete cascade,
  action_id uuid not null,
  user_id uuid,
  pc_id uuid,
  status text not null check (status in ('pending','completed','needs_assignment')),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (context_id, action_id)
);
create index invite_action_attempts_user_idx on public.invite_action_attempts (user_id, accepted_at);

-- Normal mode idempotency
create table public.player_action_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  action_id uuid not null,
  pc_id uuid,
  status text not null check (status in ('pending','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, campaign_id, action_id)
);
alter table public.player_action_attempts enable row level security;
create policy player_action_attempts_service_only on public.player_action_attempts
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- RLS: service-role only
alter table public.invite_contexts enable row level security;
alter table public.invite_action_attempts enable row level security;
create policy invite_contexts_service_only on public.invite_contexts
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy invite_action_attempts_service_only on public.invite_action_attempts
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- RPC: create_invite_pc (transactional insert + assignment + membership)
-- Inputs: context_id, action_id, payload jsonb, mode ('invite'|'normal')
-- Behavior: idempotent on (context_id, action_id) or (user_id, campaign_id, action_id)
-- Rejects older attempts if newer action exists (conflict before writes)
-- Creates pcs + pc_assignments + campaign_members in a single transaction
-- Sets invite status to accepted_pending_assignment/accepted and records needs_assignment
-- Clears reservation on email mismatch or explicit switch account
-- Helper: has_unassigned_pcs(user_id) boolean to gate onboarding until backfill
```

- [ ] **Step 4: Run SQL tests (expect PASS)**

Run: `psql $SUPABASE_DB_URL -f supabase/tests/rls_invite_contexts.test.sql`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260327_invite_contexts.sql supabase/tests/rls_invite_contexts.test.sql
git commit -m "feat(db): add invite context tables and RPC"
```

---

### Task 2: Invite context service (TTL, reservation, binding)

**Files:**
- Create: `app/lib/invites/contextService.ts`
- Create: `app/lib/invites/__tests__/contextService.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { strict as assert } from "node:assert";

assert.equal(isExpired("2000-01-01"), true);
assert.equal(canExtendTtl("2026-03-27T00:00:00Z", "2026-03-27T03:00:00Z"), false);
```

- [ ] **Step 2: Implement contextService**

```ts
// Constants: INVITE_TTL_MINUTES = 30, INVITE_TTL_MAX_HOURS = 4, FALLBACK_TTL_MINUTES = 10
// exchangeToken(token, csrf, authSession) -> { contextId, publicId, summary }
// bindContextToUser(contextId, userId, email) (first-session-wins)
// extendContextTtl(contextId, now) (cap at 4h, update last_seen_at)
// reserveInvite(invite, user) with provisional hold (2 min) when target_email present
// If no target_email, do not reserve pre-auth; reserve after auth only
// When PC creation starts, set reserved_for_user_id to block others until completion/expiry
// enforce email match (verified primary email only)
// block when auth provider returns no verified primary email
// provisional hold expiry mid-auth -> "Invite expired" error and restart
// public_id is returned for UI only; never accepted for auth or exposed via URL params
// If a new token is exchanged, invalidate prior invite context for that user
// context ids must be high-entropy bearer secrets
// no raw token logging; redact token in errors
```

- [ ] **Step 3: Run tests**

Run: `npm test -- app/lib/invites/__tests__/contextService.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/lib/invites/contextService.ts app/lib/invites/__tests__/contextService.test.ts
git commit -m "feat(invites): add context service"
```

---

### Task 3: Exchange endpoints + CSRF/nonce fallback

**Files:**
- Create: `app/invite/exchange/route.ts`
- Create: `app/api/invites/exchange/route.ts`
- Modify: `app/player/welcome/page.tsx`

- [ ] **Step 1: Implement CSRF + nonce helpers**

```ts
// Double-submit CSRF cookie: non-HttpOnly
// Cookie-blocked fallback: nonce embedded in HTML, rotated per request
// Origin/Referer validation for POST
// OAuth state: opaque token stored server-side, bound on auth callback
// If cookies are blocked, accept signed one-time token in POST body or return blocking error
```

- [ ] **Step 2: Implement POST /invite/exchange**

```ts
// Accepts { token, csrf, nonce? }
// Uses contextService.exchangeToken
// Sets HttpOnly cookie: Secure, SameSite=Lax, Path=/, Max-Age=TTL
// Returns { publicId, summary, contextFallback? }
// Single-use token; rate limit and no raw token logs
// If logged out: create auth state, redirect to auth, bind context on callback
// Logged-out flow: store token in opaque auth state; create context only after auth callback; return to /player/welcome
// Fallback ?context: single-use with 10-minute TTL
// Log provisional hold creation for abuse monitoring
```

- [ ] **Step 3: Alias /api/invites/exchange**

```ts
// Forward to /invite/exchange to preserve older API shape
```

- [ ] **Step 4: Ensure GET /player/welcome issues CSRF cookie + nonce**

```tsx
// Server component sets CSRF cookie and embeds nonce into the minimal shell
// Logged-out: renders login CTA that preserves auth state
```

- [ ] **Step 5: Run tests**

Run: `npm test -- app/lib/invites/__tests__/contextService.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/invite/exchange app/api/invites/exchange app/player/welcome/page.tsx
git commit -m "feat(invites): add exchange endpoint + csrf"
```

---

### Task 4: Security headers + analytics suppression + log redaction

**Files:**
- Create: `middleware.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Implement middleware headers**

```ts
// Cache-Control: no-store for /player/welcome, /invite/exchange, and invite-gated /player/onboarding + /player/import
// Referrer-Policy: no-referrer for invite wizard routes
// If ?token or ?context present, set x-invite-suppress-analytics: true
// If ?context present, keep suppression for all /player/* routes
// If invite-gated via context cookie, suppress analytics on /player/onboarding and /player/import
// Scrub query strings for error reporting (set x-redact-query: true)
// If querystrings cannot be suppressed, render a same-origin minimal shell (no third-party assets)
// Scrub query strings in client + server error reporting for invite routes
// Ensure server logs omit query strings for /player/welcome (and /player/* when ?context fallback is used)
// Use same-origin fonts/images until URL scrubbed
// If querystrings cannot be suppressed, immediately POST exchange before any third-party scripts
```

- [ ] **Step 2: Conditionally disable analytics + shared layout**

```tsx
// app/layout.tsx: read headers().get("x-invite-suppress-analytics")
// When true, skip Analytics/SpeedInsights and render a minimal shell
// (no Nav, no DmLayoutGuard) to satisfy token-scrub flow
// Avoid external assets before URL scrub
```

- [ ] **Step 3: Run tests**

Run: `npm test -- app/player/__tests__/playerOnboarding.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add middleware.ts app/layout.tsx
git commit -m "feat(player): add invite security headers"
```

---

### Task 5: Heartbeat + TTL extension + cleanup

**Files:**
- Create: `app/api/invites/heartbeat/route.ts`
- Create: `app/api/invites/cleanup/route.ts`

- [ ] **Step 1: Implement heartbeat**

```ts
// POST extends context TTL and updates last_seen_at
// Enforce 4h max TTL and 30m rolling TTL
// Extend TTL on step load and autosave/heartbeat while on Create/Import
```

- [ ] **Step 2: Implement cleanup sweep**

```ts
// Expires contexts based on expires_at (do not delete active contexts)
// Log count of expired contexts for observability
// Schedule every 30-60 minutes (document ops if no cron)
```

- [ ] **Step 3: Run tests**

Run: `npm test -- app/lib/invites/__tests__/contextService.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/api/invites/heartbeat app/api/invites/cleanup
git commit -m "feat(invites): add heartbeat + cleanup"
```

---

### Task 6: Wizard UI (Welcome + Choose) using 21st.dev

**Files:**
- Create: `app/player/welcome/WizardLayout.tsx`
- Create: `app/player/welcome/InviteChangedBanner.tsx`
- Modify: `app/player/welcome/page.tsx`

- [ ] **Step 1: Fetch 21st.dev components**

Use 21st.dev MCP to source a stepper, choice cards, and error banner patterns.

- [ ] **Step 2: Implement WizardLayout**

```tsx
// Stepper (1/3, 2/3, 3/3) with aria-current
// Back button (keyboard reachable)
// Focus moves to step heading on transition
// Tab order: header -> step content -> primary action
// cn() for class composition
```

- [ ] **Step 3: Implement Welcome + Choose steps**

```tsx
// Pre-auth: generic invite copy
// Post-auth: campaign name + description (sanitized, fallback text, show-more)
// Choice cards: radio-group semantics, arrow keys, Space toggles
// Continue enabled only after selection
// step param contract: step=welcome|choose
// Persist selection in URL (e.g., choice=create|import) so refresh restores state
// Session storage: selection keyed by context_public_id (convenience/back nav)
// Token scrub: history.replaceState after exchange (skip if ?context fallback)
// If ?context fallback is used, keep it in the URL for the full wizard flow
// If ?context fallback is used, keep it in the URL for the full wizard flow (do not remove mid-flow)
// Invite changed banner if context replaced in another tab
// Error summary + aria-live announcement for inline errors
// Summary fetch failure -> retry CTA, stay on Welcome
// Revalidate invite + campaign on each step load; invite must be pending or accepted for current user
// Extend context TTL on each valid step load
// Guard: /player/welcome?step=choose requires auth + valid context or redirect with error
// If legacy PCs without assignments exist, block onboarding and surface backfill required message
// If session storage cleared mid-flow, route back to Choose
// Browser Back invalid step transitions redirect to nearest valid step
// Enter triggers primary action when focus not in text input
// Clear wizard session storage on sign-out or context change
// Sign-out clears invite context cookie and server-side binding
// Context already bound: show "Use existing session" + "Request new invite" CTAs
// Auth mismatch: show "Sign out and switch account" CTA
// Invalid/missing token/context -> inline error + "Request new invite" CTA
// Welcome includes "You’ve been invited" line
```

- [ ] **Step 4: Run tests**

Run: `npm test -- app/player/__tests__/playerOnboarding.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/player/welcome
git commit -m "feat(player): add invite welcome + choose wizard"
```

---

### Task 7: Execute step (Create + Import) and idempotent RPC

**Files:**
- Create: `app/api/invites/create-pc/route.ts`
- Create: `app/player/onboarding/page.tsx`
- Create: `app/player/import/page.tsx`
- Create: `app/lib/invites/__tests__/inviteRpc.test.ts`

- [ ] **Step 1: Implement create-pc API**

```ts
// POST { contextId, actionId, mode, payload }
// Origin/Referer checks
// Calls create_invite_pc RPC
// Returns { pcId, status, conflict? }
// Enforces one active action per context (newer action invalidates older)
// Normal mode idempotency uses player_action_attempts
// Cancels older attempts when a newer action starts
// Allow grace window for final submit when TTL just expired
// Membership/assignment inserts use ON CONFLICT DO NOTHING
// Normal mode rejects campaigns where user is not a member
// Enforce unique acceptance for invite_id + user_id
// Invite already accepted by current user -> redirect to /player with toast
// Invite accepted by other user -> invalid/expired error
// If assignment already exists, mark invite accepted and show Continue
// Acceptance occurs only after assignment unless assignment already exists
// If campaign deleted or invite revoked mid-flow, show clear error and exit wizard
// Conflict UX: "Newer attempt detected. Reload to continue." single CTA
// Assignment failure: if PC created here with no assignments, delete it; otherwise set needs_assignment and allow retry
// Multiple pending invites for same user+campaign: accept most recent, invalidate older on acceptance
// If older invite accepted, invalidate newer pending invites as already used
// Membership insert failure -> show error and return to /player
// Invalidate action_id after successful create/import (no reuse; auto-refresh does not mint new action_id)
```

- [ ] **Step 2: Build /player/onboarding (Create PC)**

```tsx
// Invite mode: wizard chrome retained (step 3/3) via shared WizardLayout
// Normal mode: explicit campaign selection, no stepper
// Cancel/back returns to /player/welcome?step=choose
// Action ID generated per submit, stored in session storage
// Disable CTA while request in-flight
// Cancel/back invalidates active action_id
// If user already has PC assignment, show Continue + Create another PC
// Create another PC routes to normal mode with campaign preselected
// If context expires but invite accepted, allow normal mode with preselected campaign
// Direct navigation without valid context in invite-gated mode redirects to /player/welcome with inline error
// Success state: "PC ready" + "Go to My PCs"
// Ensure campaign_members exists before switching to normal mode
// Extend context TTL on execute-step load
```

- [ ] **Step 3: Build /player/import (Import PC)**

```tsx
// Invite mode uses wizard chrome via shared WizardLayout
// Normal mode requires campaign selection
// Session storage persists import form state
// Cancel returns to Choose without losing selection
// If context expires but invite accepted, allow normal mode with preselected campaign
// Extend context TTL on execute-step load
```

- [ ] **Step 4: Run tests**

Run: `npm test -- app/lib/invites/__tests__/inviteRpc.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/invites/create-pc app/player/onboarding app/player/import app/lib/invites/__tests__/inviteRpc.test.ts
git commit -m "feat(player): add create/import execute step"
```

---

### Task 8: Recovery flow + needs-assignment banner

**Files:**
- Create: `app/api/invites/recover/route.ts`
- Create: `app/player/recover/page.tsx`
- Modify: `app/player/page.tsx`

- [ ] **Step 1: Implement recovery API**

```ts
// Finds latest invite_action_attempts.status = 'needs_assignment' for user
// If multiple, return list for chooser
// Recovery without context uses most recent accepted_at, tie-break by updated_at
// If invite accepted but needs_assignment exists, route to /player/recover before /player
```

- [ ] **Step 2: Add /player recovery UI + banner**

```tsx
// Banner on /player when needs_assignment exists
// Includes character name + campaign and a Retry action
// /player/recover completes assignment then returns to /player
// Preserve existing My PCs list grouping/behavior
```

- [ ] **Step 3: Run tests**

Run: `npm test -- app/player/__tests__/playerOnboarding.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/api/invites/recover app/player/recover app/player/page.tsx
git commit -m "feat(player): add assignment recovery"
```

---

### Task 9: DnDBeyond import preview + SRD-safe mapping

**Files:**
- Modify: `app/api/import-dndbeyond/route.ts`
- Modify: `app/player/import/page.tsx`

- [ ] **Step 1: Add preview/confirm flow**

```tsx
// Validate input -> preview -> confirm
// Minimum fields: name, class, level, race, abilities, saves, skills, HP, AC, passive perception
// Non-SRD class/race fallback: mark as custom and require manual edit before confirm
// Consent notice and no raw payload storage
// Error modes: invalid ID/URL, rate limit, private/locked sheet; show retry guidance
// Server-side fetch with rate limits and ToS compliance
// Non-SRD content stored as user-provided notes with warning, or excluded
// Show loading/progress states during import fetch and preview
```

- [ ] **Step 2: Add cancellation and manual fallback**

```tsx
// Cancel returns to Choose, preserves selection
// If fetch blocked, offer manual create with prefilled name
```

- [ ] **Step 3: Run tests**

Run: `npm test -- app/player/__tests__/playerOnboarding.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/api/import-dndbeyond/route.ts app/player/import/page.tsx
git commit -m "feat(player): add import preview + SRD mapping"
```

---

### Task 10: Wizard integration tests + docs

**Files:**
- Create: `app/player/__tests__/playerOnboarding.test.ts`
- Modify: `README.md`
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Add unit/integration tests**

```ts
// wizard step guard (choose requires auth + context)
// auth mismatch / email mismatch
// sign-out clears context
// verified email required
// expired context mid-flow
// idempotent retries + multi-tab conflict
// invite accepted by other user
// needs-assignment banner + recovery flow
// invite changed banner
// legacy PC assignment backfill requirement before enabling onboarding
// RLS: player can create PC + self-assign only for own user
// invite -> welcome -> create/import -> assignment -> My PCs integration test
```

- [ ] **Step 2: Update docs**

```md
## Player Onboarding Wizard
- Token exchange flow + security headers
- Context TTL + heartbeat + cleanup
- Recovery path for needs_assignment
```

- [ ] **Step 3: Commit**

```bash
git add app/player/__tests__/playerOnboarding.test.ts README.md docs/ROADMAP.md
git commit -m "test(player): cover onboarding edge cases"
```

---

## Manual Checks

- Confirm reverse-proxy logs omit query strings for `/player/welcome` and `?context` fallback.
- Verify analytics are suppressed until URL is scrubbed.
- Ensure invite context TTL extends on heartbeat and caps at 4 hours.
- Validate the wizard is keyboard operable end-to-end.
