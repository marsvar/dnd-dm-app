-- Replace UUIDs below with real values from your project.
-- Example DM user id: 11111111-1111-1111-1111-111111111111
-- DM user id: <dm-user-uuid>
-- Example member user id: 22222222-2222-2222-2222-222222222222
-- Member user id: <member-user-uuid>
-- Example non-member user id: 33333333-3333-3333-3333-333333333333
-- Non-member user id: <nonmember-user-uuid>
-- Example campaign id: 44444444-4444-4444-4444-444444444444
-- Campaign id: <campaign-uuid>

-- ---------------------------------------------------------------------------
-- DM: write succeeds
BEGIN;
set local role authenticated;
set local request.jwt.claim.sub = '<dm-user-uuid>';
insert into public.campaign_player_view (campaign_id, payload)
values ('<campaign-uuid>', '{"active_encounter":null,"participants":[],"party":[]}')
on conflict (campaign_id) do update set payload = excluded.payload;
ROLLBACK;

-- ---------------------------------------------------------------------------
-- Member: read succeeds, write fails
BEGIN;
set local role authenticated;
set local request.jwt.claim.sub = '<member-user-uuid>';
select payload from public.campaign_player_view where campaign_id = '<campaign-uuid>';
insert into public.campaign_player_view (campaign_id, payload)
values ('<campaign-uuid>', '{"active_encounter":null,"participants":[],"party":[]}');
ROLLBACK;

-- ---------------------------------------------------------------------------
-- Non-member: read fails
BEGIN;
set local role authenticated;
set local request.jwt.claim.sub = '<nonmember-user-uuid>';
select payload from public.campaign_player_view where campaign_id = '<campaign-uuid>';
ROLLBACK;
