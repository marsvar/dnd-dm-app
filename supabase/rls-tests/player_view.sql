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
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = '<dm-user-uuid>';
insert into public.campaign_player_view (campaign_id, payload)
values ('<campaign-uuid>', '{"active_encounter":null,"participants":[],"party":[]}')
on conflict (campaign_id) do update set payload = excluded.payload;
ROLLBACK;

-- ---------------------------------------------------------------------------
-- Member: read succeeds, write fails
BEGIN;
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = '<member-user-uuid>';
DO $$
BEGIN
  PERFORM payload from public.campaign_player_view where campaign_id = '<campaign-uuid>';
EXCEPTION WHEN others THEN
  RAISE EXCEPTION 'Expected member read to succeed: %', SQLERRM;
END $$;

DO $$
BEGIN
  INSERT into public.campaign_player_view (campaign_id, payload)
  VALUES ('<campaign-uuid>', '{"active_encounter":null,"participants":[],"party":[]}');
  RAISE EXCEPTION 'Expected member write to fail';
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Member write failed as expected: %', SQLERRM;
END $$;
ROLLBACK;

-- ---------------------------------------------------------------------------
-- Non-member: read fails
BEGIN;
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = '<nonmember-user-uuid>';
DO $$
BEGIN
  PERFORM payload from public.campaign_player_view where campaign_id = '<campaign-uuid>';
  RAISE EXCEPTION 'Expected non-member read to fail';
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Non-member read failed as expected: %', SQLERRM;
END $$;
ROLLBACK;
