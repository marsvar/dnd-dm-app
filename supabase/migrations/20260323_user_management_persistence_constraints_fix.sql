-- Fix constraints + immutability for normalized persistence

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pcs_id_campaign_unique'
  ) then
    alter table public.pcs
      add constraint pcs_id_campaign_unique unique (id, campaign_id);
  end if;
end$$;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'pc_assignments_pc_id_fkey'
  ) then
    alter table public.pc_assignments drop constraint pc_assignments_pc_id_fkey;
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pc_assignments_pc_id_campaign_id_fkey'
  ) then
    alter table public.pc_assignments
      add constraint pc_assignments_pc_id_campaign_id_fkey
      foreign key (pc_id, campaign_id)
      references public.pcs(id, campaign_id)
      on delete cascade;
  end if;
end$$;

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

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'pcs_prevent_identity_change'
  ) then
    create trigger pcs_prevent_identity_change
    before update on public.pcs
    for each row execute function public.prevent_pc_identity_change();
  end if;
end$$;
