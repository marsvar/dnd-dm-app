-- User management + persistence normalization

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'encounter_status') then
    create type encounter_status as enum ('planned', 'active', 'completed');
  end if;
end$$;

-- Reset legacy tables (text IDs) since no prod data is retained.
drop table if exists public.campaign_members cascade;
drop table if exists public.pcs cascade;
drop table if exists public.campaigns cascade;

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  dm_user_id uuid not null,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.campaign_members (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('dm', 'player')),
  joined_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

create table public.campaign_invites (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  role text not null check (role in ('dm', 'player')),
  token text not null,
  expires_at timestamptz not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (campaign_id, token)
);

create table public.pcs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (id, campaign_id)
);

create table public.pc_assignments (
  pc_id uuid not null references public.pcs(id) on delete cascade,
  user_id uuid not null,
  campaign_id uuid not null,
  assigned_at timestamptz not null default now(),
  primary key (pc_id),
  foreign key (pc_id, campaign_id)
    references public.pcs(id, campaign_id)
    on delete cascade,
  foreign key (campaign_id, user_id)
    references public.campaign_members(campaign_id, user_id)
    on delete cascade
);

create table public.encounters (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  location text,
  status encounter_status not null default 'planned',
  baseline jsonb,
  created_at timestamptz not null default now()
);

create table public.encounter_participants (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  kind text not null check (kind in ('pc', 'monster', 'npc')),
  ref_id uuid,
  name text not null,
  visual jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.encounter_events (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  event jsonb not null,
  created_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null,
  body text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.log_entries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  encounter_id uuid references public.encounters(id) on delete set null,
  text text not null,
  timestamp timestamptz,
  created_at timestamptz not null default now(),
  source text not null default 'manual' check (source in ('auto', 'manual'))
);

alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.campaign_invites enable row level security;
alter table public.pcs enable row level security;
alter table public.pc_assignments enable row level security;
alter table public.encounters enable row level security;
alter table public.encounter_participants enable row level security;
alter table public.encounter_events enable row level security;
alter table public.notes enable row level security;
alter table public.log_entries enable row level security;

create or replace function public.prevent_pc_identity_change()
returns trigger
language plpgsql
as $$
begin
  if new.campaign_id <> old.campaign_id then
    raise exception 'cannot change campaign_id' using errcode = '42501';
  end if;
  if new.created_by <> old.created_by then
    raise exception 'cannot change created_by' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger pcs_prevent_identity_change
before update on public.pcs
for each row execute function public.prevent_pc_identity_change();

create or replace function public.is_campaign_dm(target_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1 from public.campaigns c
    where c.id = target_campaign_id
      and c.dm_user_id = auth.uid()
  );
$$;

-- campaigns: members can read
create policy campaigns_read_members
  on public.campaigns
  for select
  using (
    exists (
      select 1 from public.campaign_members m
      where m.campaign_id = campaigns.id
        and m.user_id = auth.uid()
    )
  );

-- campaigns: dm only write
create policy campaigns_write_dm
  on public.campaigns
  for all
  using (dm_user_id = auth.uid())
  with check (dm_user_id = auth.uid());

-- campaign_members: members can read (self or dm)
create policy campaign_members_read_members
  on public.campaign_members
  for select
  using (
    user_id = auth.uid()
    or public.is_campaign_dm(campaign_members.campaign_id)
  );

-- campaign_members: dm only write (including role changes)
create policy campaign_members_write_dm
  on public.campaign_members
  for all
  using (public.is_campaign_dm(campaign_members.campaign_id))
  with check (public.is_campaign_dm(campaign_members.campaign_id));

-- campaign_invites: dm only
create policy campaign_invites_dm_only
  on public.campaign_invites
  for all
  using (public.is_campaign_dm(campaign_invites.campaign_id))
  with check (public.is_campaign_dm(campaign_invites.campaign_id));

-- pcs: members can read
create policy pcs_read_members
  on public.pcs
  for select
  using (
    exists (
      select 1 from public.campaign_members m
      where m.campaign_id = pcs.campaign_id
        and m.user_id = auth.uid()
    )
  );

-- pcs: members can insert for self
create policy pcs_insert_member_self
  on public.pcs
  for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.campaign_members m
      where m.campaign_id = pcs.campaign_id
        and m.user_id = auth.uid()
    )
  );

-- pcs: assigned player or dm can update
create policy pcs_update_assigned_or_dm
  on public.pcs
  for update
  using (
    exists (
      select 1 from public.pc_assignments a
      where a.pc_id = pcs.id and a.user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaign_members m
      where m.campaign_id = pcs.campaign_id
        and m.user_id = auth.uid()
        and m.role = 'dm'
    )
  )
  with check (
    created_by = pcs.created_by
  );

-- pcs: dm can delete
create policy pcs_delete_dm
  on public.pcs
  for delete
  using (
    exists (
      select 1 from public.campaign_members m
      where m.campaign_id = pcs.campaign_id
        and m.user_id = auth.uid()
        and m.role = 'dm'
    )
  );

-- pc_assignments: members can read
create policy pc_assignments_read_members
  on public.pc_assignments
  for select
  using (
    exists (
      select 1 from public.campaign_members m
      where m.campaign_id = pc_assignments.campaign_id
        and m.user_id = auth.uid()
    )
  );

-- pc_assignments: self-assign only for own pcs, dm for any
create policy pc_assignments_insert_self_or_dm
  on public.pc_assignments
  for insert
  with check (
    (
      user_id = auth.uid()
      and exists (
        select 1 from public.pcs p
        where p.id = pc_assignments.pc_id
          and p.created_by = auth.uid()
      )
    )
    or exists (
      select 1 from public.campaign_members m
      where m.campaign_id = pc_assignments.campaign_id
        and m.user_id = auth.uid()
        and m.role = 'dm'
    )
  );

-- pc_assignments: dm only update/delete
create policy pc_assignments_update_dm
  on public.pc_assignments
  for update
  using (
    exists (
      select 1 from public.campaign_members m
      where m.campaign_id = pc_assignments.campaign_id
        and m.user_id = auth.uid()
        and m.role = 'dm'
    )
  )
  with check (
    exists (
      select 1 from public.campaign_members m
      where m.campaign_id = pc_assignments.campaign_id
        and m.user_id = auth.uid()
        and m.role = 'dm'
    )
  );

create policy pc_assignments_delete_dm
  on public.pc_assignments
  for delete
  using (
    exists (
      select 1 from public.campaign_members m
      where m.campaign_id = pc_assignments.campaign_id
        and m.user_id = auth.uid()
        and m.role = 'dm'
    )
  );

-- encounters: members can read, players cannot see planned
create policy encounters_read_members
  on public.encounters
  for select
  using (
    exists (
      select 1 from public.campaign_members m
      where m.campaign_id = encounters.campaign_id
        and m.user_id = auth.uid()
        and (m.role = 'dm' or encounters.status <> 'planned')
    )
  );

-- encounters: dm only write
create policy encounters_write_dm
  on public.encounters
  for all
  using (
    exists (
      select 1 from public.campaign_members m
      where m.campaign_id = encounters.campaign_id
        and m.user_id = auth.uid()
        and m.role = 'dm'
    )
  )
  with check (
    exists (
      select 1 from public.campaign_members m
      where m.campaign_id = encounters.campaign_id
        and m.user_id = auth.uid()
        and m.role = 'dm'
    )
  );

-- encounter_participants: members can read, dm only write
create policy encounter_participants_read_members
  on public.encounter_participants
  for select
  using (
    exists (
      select 1 from public.encounters e
      join public.campaign_members m on m.campaign_id = e.campaign_id
      where e.id = encounter_participants.encounter_id
        and m.user_id = auth.uid()
    )
  );

create policy encounter_participants_write_dm
  on public.encounter_participants
  for all
  using (
    exists (
      select 1 from public.encounters e
      join public.campaign_members m on m.campaign_id = e.campaign_id
      where e.id = encounter_participants.encounter_id
        and m.user_id = auth.uid()
        and m.role = 'dm'
    )
  )
  with check (
    exists (
      select 1 from public.encounters e
      join public.campaign_members m on m.campaign_id = e.campaign_id
      where e.id = encounter_participants.encounter_id
        and m.user_id = auth.uid()
        and m.role = 'dm'
    )
  );

-- encounter_events: members can read, dm only write
create policy encounter_events_read_members
  on public.encounter_events
  for select
  using (
    exists (
      select 1 from public.encounters e
      join public.campaign_members m on m.campaign_id = e.campaign_id
      where e.id = encounter_events.encounter_id
        and m.user_id = auth.uid()
    )
  );

create policy encounter_events_write_dm
  on public.encounter_events
  for all
  using (
    exists (
      select 1 from public.encounters e
      join public.campaign_members m on m.campaign_id = e.campaign_id
      where e.id = encounter_events.encounter_id
        and m.user_id = auth.uid()
        and m.role = 'dm'
    )
  )
  with check (
    exists (
      select 1 from public.encounters e
      join public.campaign_members m on m.campaign_id = e.campaign_id
      where e.id = encounter_events.encounter_id
        and m.user_id = auth.uid()
        and m.role = 'dm'
    )
  );

-- notes: members can read, dm only write
create policy notes_read_members
  on public.notes
  for select
  using (
    exists (
      select 1 from public.campaign_members m
      where m.campaign_id = notes.campaign_id
        and m.user_id = auth.uid()
    )
  );

create policy notes_write_dm
  on public.notes
  for all
  using (
    exists (
      select 1 from public.campaign_members m
      where m.campaign_id = notes.campaign_id
        and m.user_id = auth.uid()
        and m.role = 'dm'
    )
  )
  with check (
    exists (
      select 1 from public.campaign_members m
      where m.campaign_id = notes.campaign_id
        and m.user_id = auth.uid()
        and m.role = 'dm'
    )
  );

-- log_entries: members can read, dm only write
create policy log_entries_read_members
  on public.log_entries
  for select
  using (
    exists (
      select 1 from public.campaign_members m
      where m.campaign_id = log_entries.campaign_id
        and m.user_id = auth.uid()
    )
  );

create policy log_entries_write_dm
  on public.log_entries
  for all
  using (
    exists (
      select 1 from public.campaign_members m
      where m.campaign_id = log_entries.campaign_id
        and m.user_id = auth.uid()
        and m.role = 'dm'
    )
  )
  with check (
    exists (
      select 1 from public.campaign_members m
      where m.campaign_id = log_entries.campaign_id
        and m.user_id = auth.uid()
        and m.role = 'dm'
    )
  );
