-- =============================================================================
-- DnD DM App — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

-- ---------------------------------------------------------------------------
-- campaigns
-- ---------------------------------------------------------------------------
create table if not exists public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- campaign_states
-- One row per campaign; holds the full serialised AppState JSON.
-- Using a single JSONB document keeps the existing reducer/engine untouched.
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_states (
  campaign_id uuid primary key references public.campaigns(id) on delete cascade,
  state       jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
alter table public.campaigns       enable row level security;
alter table public.campaign_states enable row level security;

-- DM: full access to own campaigns
create policy "DM: own campaigns"
  on public.campaigns for all
  using  (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- DM: full access to own campaign states
create policy "DM: own campaign states"
  on public.campaign_states for all
  using  (exists (select 1 from public.campaigns where id = campaign_id and owner_id = auth.uid()))
  with check (exists (select 1 from public.campaigns where id = campaign_id and owner_id = auth.uid()));

-- Players: anonymous read on campaign states (enables cross-device player view)
create policy "Public: read campaign states"
  on public.campaign_states for select
  using (true);

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger campaigns_updated_at
  before update on public.campaigns
  for each row execute procedure public.set_updated_at();

create trigger campaign_states_updated_at
  before update on public.campaign_states
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Realtime publication
-- Players subscribe to changes on campaign_states.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.campaign_states;
