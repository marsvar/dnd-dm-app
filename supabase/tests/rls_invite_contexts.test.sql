begin;

create extension if not exists pgtap;

create schema if not exists tests;

grant usage on schema tests to authenticated, anon;

select plan(10);

create temp table test_results (
  name text not null,
  success boolean not null
) on commit preserve rows;

grant select, insert on table test_results to authenticated, anon;

select set_config('tests.invite_id', gen_random_uuid()::text, true);
select set_config('tests.context_id', gen_random_uuid()::text, true);
select set_config('tests.action_id', gen_random_uuid()::text, true);
select set_config('tests.user_id', gen_random_uuid()::text, true);
select set_config('tests.campaign_id', gen_random_uuid()::text, true);

-- Authenticated role should be denied
select set_config('request.jwt.claim.sub', current_setting('tests.user_id'), true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $$
begin
  insert into public.invite_contexts (id, public_id, invite_id, expires_at)
  values (current_setting('tests.context_id')::uuid, 'public-test', current_setting('tests.invite_id')::uuid, now() + interval '30 minutes');
  insert into test_results values ('authenticated_insert_invite_context_denied', false);
exception when others then
  insert into test_results values ('authenticated_insert_invite_context_denied', sqlstate = '42501');
end$$;

do $$
begin
  select count(*) from public.invite_contexts;
  insert into test_results values ('authenticated_select_invite_context_denied', false);
exception when others then
  insert into test_results values ('authenticated_select_invite_context_denied', sqlstate = '42501');
end$$;

do $$
begin
  insert into public.invite_action_attempts (context_id, action_id, status)
  values (current_setting('tests.context_id')::uuid, current_setting('tests.action_id')::uuid, 'pending');
  insert into test_results values ('authenticated_insert_action_attempt_denied', false);
exception when others then
  insert into test_results values ('authenticated_insert_action_attempt_denied', sqlstate = '42501');
end$$;

do $$
begin
  select count(*) from public.invite_action_attempts;
  insert into test_results values ('authenticated_select_action_attempt_denied', false);
exception when others then
  insert into test_results values ('authenticated_select_action_attempt_denied', sqlstate = '42501');
end$$;

-- Service role should be allowed
select set_config('request.jwt.claim.role', 'service_role', true);
set local role authenticated;

insert into public.campaigns (id, dm_user_id, name)
values (current_setting('tests.campaign_id')::uuid, gen_random_uuid(), 'Invite Campaign');

insert into public.campaign_invites (id, campaign_id, role, token, expires_at, created_by)
values (current_setting('tests.invite_id')::uuid, current_setting('tests.campaign_id')::uuid, 'player', 'token-test', now() + interval '7 days', gen_random_uuid());

insert into public.invite_contexts (id, public_id, invite_id, expires_at)
values (current_setting('tests.context_id')::uuid, 'public-test', current_setting('tests.invite_id')::uuid, now() + interval '30 minutes');

insert into public.invite_action_attempts (context_id, action_id, status)
values (current_setting('tests.context_id')::uuid, current_setting('tests.action_id')::uuid, 'pending');

insert into test_results
select 'service_role_can_read_invite_contexts',
  (select count(*) from public.invite_contexts where id = current_setting('tests.context_id')::uuid) = 1;

insert into test_results
select 'service_role_can_read_action_attempts',
  (select count(*) from public.invite_action_attempts where context_id = current_setting('tests.context_id')::uuid) = 1;

reset role;

select ok(success, name)
from test_results
order by name;

select * from finish();
rollback;
