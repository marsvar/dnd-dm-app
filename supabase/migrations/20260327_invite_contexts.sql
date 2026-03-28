-- Invite contexts + onboarding RPCs

create extension if not exists pgcrypto;

alter table public.campaign_invites
  add column if not exists target_email text,
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'accepted_pending_assignment', 'accepted', 'revoked')),
  add column if not exists reserved_for_user_id uuid,
  add column if not exists accepted_by_user_id uuid,
  add column if not exists accepted_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists campaign_invites_status_idx
  on public.campaign_invites (campaign_id, status);

create table if not exists public.invite_contexts (
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

create index if not exists invite_contexts_expires_idx
  on public.invite_contexts (expires_at);
create index if not exists invite_contexts_invite_idx
  on public.invite_contexts (invite_id);
create index if not exists invite_contexts_user_idx
  on public.invite_contexts (user_id);

create table if not exists public.invite_action_attempts (
  id uuid primary key default gen_random_uuid(),
  context_id uuid not null references public.invite_contexts(id) on delete cascade,
  action_id uuid not null,
  user_id uuid,
  pc_id uuid references public.pcs(id) on delete set null,
  status text not null check (status in ('pending', 'completed', 'needs_assignment')),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (context_id, action_id)
);

create index if not exists invite_action_attempts_user_idx
  on public.invite_action_attempts (user_id, accepted_at);
create index if not exists invite_action_attempts_status_idx
  on public.invite_action_attempts (status, accepted_at);

create table if not exists public.player_action_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  action_id uuid not null,
  pc_id uuid references public.pcs(id) on delete set null,
  status text not null check (status in ('pending', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, campaign_id, action_id)
);

create index if not exists player_action_attempts_user_idx
  on public.player_action_attempts (user_id, campaign_id);

alter table public.invite_contexts enable row level security;
alter table public.invite_action_attempts enable row level security;
alter table public.player_action_attempts enable row level security;

create policy invite_contexts_service_only
  on public.invite_contexts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy invite_action_attempts_service_only
  on public.invite_action_attempts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy player_action_attempts_service_only
  on public.player_action_attempts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function public.has_unassigned_pcs(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists(
    select 1
    from public.pcs p
    where p.created_by = target_user_id
      and not exists (
        select 1 from public.pc_assignments a where a.pc_id = p.id
      )
  );
$$;

create or replace function public.create_invite_pc(
  p_mode text,
  p_action_id uuid,
  p_payload jsonb,
  p_user_id uuid,
  p_context_id uuid default null,
  p_campaign_id uuid default null,
  p_allow_new boolean default false
)
returns table (
  pc_id uuid,
  status text,
  conflict boolean,
  invite_id uuid
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_now timestamptz := now();
  v_context invite_contexts%rowtype;
  v_invite campaign_invites%rowtype;
  v_existing invite_action_attempts%rowtype;
  v_latest invite_action_attempts%rowtype;
  v_existing_player player_action_attempts%rowtype;
  v_latest_player player_action_attempts%rowtype;
  v_pc_id uuid;
  v_campaign_id uuid;
begin
  if p_mode not in ('invite', 'normal') then
    raise exception 'invalid mode' using errcode = '22023';
  end if;
  if p_user_id is null then
    raise exception 'missing user_id' using errcode = '22023';
  end if;

  if p_mode = 'invite' then
    if p_context_id is null then
      raise exception 'missing context_id' using errcode = '22023';
    end if;

    select * into v_context
    from public.invite_contexts
    where id = p_context_id
    for update;

    if not found then
      return query select null::uuid, 'invalid_context', false, null::uuid;
      return;
    end if;

    if v_context.user_id is not null and v_context.user_id <> p_user_id then
      return query select null::uuid, 'context_bound', true, v_context.invite_id;
      return;
    end if;

    select * into v_invite
    from public.campaign_invites
    where id = v_context.invite_id
    for update;

    if not found then
      return query select null::uuid, 'invite_missing', false, null::uuid;
      return;
    end if;

    if v_invite.status = 'revoked' then
      return query select null::uuid, 'invite_revoked', false, v_invite.id;
      return;
    end if;

    v_campaign_id := v_invite.campaign_id;

    select * into v_existing
    from public.invite_action_attempts
    where context_id = p_context_id and action_id = p_action_id;

    if found then
      return query select v_existing.pc_id, v_existing.status, false, v_context.invite_id;
      return;
    end if;

    if not p_allow_new then
      select * into v_latest
      from public.invite_action_attempts
      where context_id = p_context_id
      order by created_at desc
      limit 1;

      if found then
        return query select v_latest.pc_id, 'conflict', true, v_context.invite_id;
        return;
      end if;
    end if;

    if v_invite.reserved_for_user_id is null then
      update public.campaign_invites
      set reserved_for_user_id = p_user_id, updated_at = v_now
      where id = v_invite.id;
    elsif v_invite.reserved_for_user_id <> p_user_id then
      return query select null::uuid, 'invite_reserved', true, v_invite.id;
      return;
    end if;

    insert into public.invite_action_attempts (context_id, action_id, user_id, status, created_at, updated_at)
    values (p_context_id, p_action_id, p_user_id, 'pending', v_now, v_now)
    on conflict (context_id, action_id)
    do update set updated_at = excluded.updated_at
    returning * into v_existing;

    insert into public.pcs (campaign_id, name, data, created_by)
    values (v_campaign_id, coalesce(p_payload->>'name', 'Unnamed PC'), p_payload, p_user_id)
    returning id into v_pc_id;

    insert into public.campaign_members (campaign_id, user_id, role)
    values (v_campaign_id, p_user_id, 'player')
    on conflict (campaign_id, user_id) do nothing;

    begin
      insert into public.pc_assignments (pc_id, user_id, campaign_id)
      values (v_pc_id, p_user_id, v_campaign_id)
      on conflict (pc_id) do nothing;
    exception when others then
      -- handled below
    end;

    if not exists (select 1 from public.pc_assignments where pc_id = v_pc_id) then
      delete from public.pcs
      where id = v_pc_id
        and not exists (select 1 from public.pc_assignments where pc_id = v_pc_id);

      update public.invite_action_attempts
      set status = 'needs_assignment', pc_id = v_pc_id, accepted_at = v_now, updated_at = v_now
      where context_id = p_context_id and action_id = p_action_id;

      update public.campaign_invites
      set status = 'accepted_pending_assignment', accepted_by_user_id = p_user_id, accepted_at = v_now, updated_at = v_now
      where id = v_invite.id;

      return query select v_pc_id, 'needs_assignment', false, v_invite.id;
      return;
    end if;

    update public.invite_action_attempts
    set status = 'completed', pc_id = v_pc_id, accepted_at = v_now, updated_at = v_now
    where context_id = p_context_id and action_id = p_action_id;

    update public.campaign_invites
    set status = 'accepted', accepted_by_user_id = p_user_id, accepted_at = v_now, updated_at = v_now
    where id = v_invite.id;

    return query select v_pc_id, 'completed', false, v_invite.id;
    return;
  end if;

  if p_campaign_id is null then
    raise exception 'missing campaign_id' using errcode = '22023';
  end if;

  v_campaign_id := p_campaign_id;

  select * into v_existing_player
  from public.player_action_attempts
  where user_id = p_user_id and campaign_id = v_campaign_id and action_id = p_action_id;

  if found then
    return query select v_existing_player.pc_id, v_existing_player.status, false, null::uuid;
    return;
  end if;

  if not p_allow_new then
    select * into v_latest_player
    from public.player_action_attempts
    where user_id = p_user_id and campaign_id = v_campaign_id
    order by created_at desc
    limit 1;

    if found then
      return query select v_latest_player.pc_id, 'conflict', true, null::uuid;
      return;
    end if;
  end if;

  if not exists (
    select 1 from public.campaign_members
    where campaign_id = v_campaign_id and user_id = p_user_id
  ) then
    raise exception 'not a campaign member' using errcode = '42501';
  end if;

  insert into public.player_action_attempts (user_id, campaign_id, action_id, status, created_at, updated_at)
  values (p_user_id, v_campaign_id, p_action_id, 'pending', v_now, v_now)
  on conflict (user_id, campaign_id, action_id)
  do update set updated_at = excluded.updated_at
  returning * into v_existing_player;

  insert into public.pcs (campaign_id, name, data, created_by)
  values (v_campaign_id, coalesce(p_payload->>'name', 'Unnamed PC'), p_payload, p_user_id)
  returning id into v_pc_id;

  insert into public.pc_assignments (pc_id, user_id, campaign_id)
  values (v_pc_id, p_user_id, v_campaign_id)
  on conflict (pc_id) do nothing;

  if not exists (select 1 from public.pc_assignments where pc_id = v_pc_id) then
    delete from public.pcs
    where id = v_pc_id
      and not exists (select 1 from public.pc_assignments where pc_id = v_pc_id);

    update public.player_action_attempts
    set status = 'pending', pc_id = v_pc_id, updated_at = v_now
    where user_id = p_user_id and campaign_id = v_campaign_id and action_id = p_action_id;

    return query select v_pc_id, 'needs_assignment', false, null::uuid;
    return;
  end if;

  update public.player_action_attempts
  set status = 'completed', pc_id = v_pc_id, updated_at = v_now
  where user_id = p_user_id and campaign_id = v_campaign_id and action_id = p_action_id;

  return query select v_pc_id, 'completed', false, null::uuid;
  return;
end;
$$;
