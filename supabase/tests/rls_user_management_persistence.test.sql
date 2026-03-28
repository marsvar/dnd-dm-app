begin;

create extension if not exists pgtap;

create schema if not exists tests;

grant usage on schema tests to authenticated, anon;

select plan(13);

create temp table test_results (
  name text not null,
  success boolean not null
) on commit preserve rows;

grant select, insert on table test_results to authenticated, anon;

select set_config('tests.dm_id', gen_random_uuid()::text, true);
select set_config('tests.player_id', gen_random_uuid()::text, true);
select set_config('tests.other_id', gen_random_uuid()::text, true);
select set_config('tests.campaign_id', gen_random_uuid()::text, true);
select set_config('tests.other_campaign_id', gen_random_uuid()::text, true);
select set_config('tests.pc_id', gen_random_uuid()::text, true);
select set_config('tests.dm_pc_id', gen_random_uuid()::text, true);
select set_config('tests.encounter_planned_id', gen_random_uuid()::text, true);
select set_config('tests.encounter_active_id', gen_random_uuid()::text, true);

select set_config('request.jwt.claim.sub', current_setting('tests.dm_id'), true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

insert into public.campaigns (id, dm_user_id, name)
values (current_setting('tests.campaign_id')::uuid, current_setting('tests.dm_id')::uuid, 'Test Campaign');

insert into public.campaigns (id, dm_user_id, name)
values (current_setting('tests.other_campaign_id')::uuid, current_setting('tests.dm_id')::uuid, 'Other Campaign');

insert into public.campaign_members (campaign_id, user_id, role)
values
  (current_setting('tests.campaign_id')::uuid, current_setting('tests.dm_id')::uuid, 'dm'),
  (current_setting('tests.campaign_id')::uuid, current_setting('tests.player_id')::uuid, 'player');

insert into public.encounters (id, campaign_id, name, status)
values
  (current_setting('tests.encounter_planned_id')::uuid, current_setting('tests.campaign_id')::uuid, 'Planned', 'planned'),
  (current_setting('tests.encounter_active_id')::uuid, current_setting('tests.campaign_id')::uuid, 'Active', 'active');

insert into public.pcs (id, campaign_id, name, data, created_by)
values
  (current_setting('tests.dm_pc_id')::uuid, current_setting('tests.campaign_id')::uuid, 'DM PC', '{}'::jsonb, current_setting('tests.dm_id')::uuid);

select set_config('request.jwt.claim.sub', current_setting('tests.player_id'), true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

insert into test_results
select 'player_can_read_campaign',
  (select count(*) from public.campaigns where id = current_setting('tests.campaign_id')::uuid) = 1;

do $$
begin
  insert into public.encounters (campaign_id, name, status)
  values (current_setting('tests.campaign_id')::uuid, 'Nope', 'planned');
  insert into test_results values ('player_insert_encounter_denied', false);
exception when others then
  insert into test_results values ('player_insert_encounter_denied', sqlstate = '42501');
end$$;

do $$
begin
  insert into public.encounter_events (encounter_id, event)
  values (current_setting('tests.encounter_active_id')::uuid, '{"v":1,"type":"TEST"}'::jsonb);
  insert into test_results values ('player_insert_event_denied', false);
exception when others then
  insert into test_results values ('player_insert_event_denied', sqlstate = '42501');
end$$;

do $$
begin
  insert into public.notes (campaign_id, title, body, tags)
  values (current_setting('tests.campaign_id')::uuid, 'Note', 'Body', array['test']);
  insert into test_results values ('player_insert_note_denied', false);
exception when others then
  insert into test_results values ('player_insert_note_denied', sqlstate = '42501');
end$$;

do $$
begin
  insert into public.log_entries (campaign_id, encounter_id, text, source)
  values (current_setting('tests.campaign_id')::uuid, current_setting('tests.encounter_active_id')::uuid, 'Log', 'manual');
  insert into test_results values ('player_insert_log_denied', false);
exception when others then
  insert into test_results values ('player_insert_log_denied', sqlstate = '42501');
end$$;

insert into public.pcs (id, campaign_id, name, data, created_by)
values (current_setting('tests.pc_id')::uuid, current_setting('tests.campaign_id')::uuid, 'Player PC', '{}'::jsonb, current_setting('tests.player_id')::uuid);

insert into test_results
select 'player_can_insert_pc',
  (select count(*) from public.pcs where id = current_setting('tests.pc_id')::uuid) = 1;

do $$
begin
  insert into public.pcs (campaign_id, name, data, created_by)
  values (current_setting('tests.campaign_id')::uuid, 'Bad PC', '{}'::jsonb, current_setting('tests.dm_id')::uuid);
  insert into test_results values ('player_insert_other_pc_denied', false);
exception when others then
  insert into test_results values ('player_insert_other_pc_denied', sqlstate = '42501');
end$$;

do $$
begin
  insert into public.pcs (campaign_id, name, data, created_by)
  values (current_setting('tests.other_campaign_id')::uuid, 'Other PC', '{}'::jsonb, current_setting('tests.player_id')::uuid);
  insert into test_results values ('player_insert_other_campaign_denied', false);
exception when others then
  insert into test_results values ('player_insert_other_campaign_denied', sqlstate = '42501');
end$$;

insert into public.pc_assignments (pc_id, user_id, campaign_id)
values (current_setting('tests.pc_id')::uuid, current_setting('tests.player_id')::uuid, current_setting('tests.campaign_id')::uuid);

insert into test_results
select 'player_can_self_assign',
  (select count(*) from public.pc_assignments where pc_id = current_setting('tests.pc_id')::uuid) = 1;

do $$
begin
  insert into public.pc_assignments (pc_id, user_id, campaign_id)
  values (current_setting('tests.dm_pc_id')::uuid, current_setting('tests.player_id')::uuid, current_setting('tests.campaign_id')::uuid);
  insert into test_results values ('player_self_assign_dm_pc_denied', false);
exception when others then
  insert into test_results values ('player_self_assign_dm_pc_denied', sqlstate = '42501');
end$$;

insert into test_results
select 'planned_hidden',
  (select count(*) from public.encounters where campaign_id = current_setting('tests.campaign_id')::uuid) = 1;

update public.campaign_members
set role = 'dm'
where campaign_id = current_setting('tests.campaign_id')::uuid
  and user_id = current_setting('tests.player_id')::uuid;

insert into test_results
select 'player_role_update_denied',
  (select role from public.campaign_members where campaign_id = current_setting('tests.campaign_id')::uuid and user_id = current_setting('tests.player_id')::uuid) = 'player';

select set_config('request.jwt.claim.sub', current_setting('tests.dm_id'), true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

delete from public.campaign_members
where campaign_id = current_setting('tests.campaign_id')::uuid
  and user_id = current_setting('tests.player_id')::uuid;

insert into test_results
select 'member_removal_deletes_assignments',
  (select count(*) from public.pc_assignments where campaign_id = current_setting('tests.campaign_id')::uuid and user_id = current_setting('tests.player_id')::uuid) = 0;

reset role;

select ok(success, name)
from test_results
order by name;

select * from finish();
rollback;
