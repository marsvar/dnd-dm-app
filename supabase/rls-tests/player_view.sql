-- Replace UUIDs below with real values from your project.
-- DM user id: <dm-user-uuid>
-- Member user id: <member-user-uuid>
-- Non-member user id: <nonmember-user-uuid>
-- Campaign id: <campaign-uuid>

-- DM write succeeds
set local role authenticated;
set local request.jwt.claim.sub = '<dm-user-uuid>';
insert into public.campaign_player_view (campaign_id, payload)
values ('<campaign-uuid>', '{"active_encounter":null,"participants":[],"party":[]}')
on conflict (campaign_id) do update set payload = excluded.payload;

-- Member read succeeds, write fails
set local request.jwt.claim.sub = '<member-user-uuid>';
select payload from public.campaign_player_view where campaign_id = '<campaign-uuid>';
insert into public.campaign_player_view (campaign_id, payload)
values ('<campaign-uuid>', '{"active_encounter":null,"participants":[],"party":[]}');

-- Non-member read fails
set local request.jwt.claim.sub = '<nonmember-user-uuid>';
select payload from public.campaign_player_view where campaign_id = '<campaign-uuid>';
