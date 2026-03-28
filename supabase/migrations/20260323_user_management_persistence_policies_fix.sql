-- Fix campaign_members and campaign_invites policies to avoid recursion

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

drop policy if exists campaign_members_read_members on public.campaign_members;
drop policy if exists campaign_members_write_dm on public.campaign_members;
drop policy if exists campaign_invites_dm_only on public.campaign_invites;

create policy campaign_members_read_members
  on public.campaign_members
  for select
  using (
    user_id = auth.uid()
    or public.is_campaign_dm(campaign_members.campaign_id)
  );

create policy campaign_members_write_dm
  on public.campaign_members
  for all
  using (public.is_campaign_dm(campaign_members.campaign_id))
  with check (public.is_campaign_dm(campaign_members.campaign_id));

create policy campaign_invites_dm_only
  on public.campaign_invites
  for all
  using (public.is_campaign_dm(campaign_invites.campaign_id))
  with check (public.is_campaign_dm(campaign_invites.campaign_id));
