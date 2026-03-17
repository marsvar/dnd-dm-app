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
-- Seed snapshot as DM (committed so reads are meaningful)
BEGIN;
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = '<dm-user-uuid>';
INSERT INTO public.campaign_player_view (campaign_id, payload)
VALUES ('<campaign-uuid>', '{"active_encounter":null,"participants":[],"party":[]}')
ON CONFLICT (campaign_id) DO UPDATE SET payload = EXCLUDED.payload;
COMMIT;

-- ---------------------------------------------------------------------------
-- Member: read succeeds, write fails
BEGIN;
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = '<member-user-uuid>';

DO $$
DECLARE c integer;
BEGIN
  SELECT count(*) INTO c FROM public.campaign_player_view WHERE campaign_id = '<campaign-uuid>';
  IF c = 0 THEN
    RAISE EXCEPTION 'Expected member read to succeed but saw zero rows';
  END IF;
END $$;

DO $$
BEGIN
  INSERT INTO public.campaign_player_view (campaign_id, payload)
  VALUES ('<campaign-uuid>', '{"active_encounter":null,"participants":[],"party":[]}');
  RAISE EXCEPTION 'Expected member write to fail but it succeeded';
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Member write failed as expected: %', SQLERRM;
END $$;
ROLLBACK;

-- ---------------------------------------------------------------------------
-- Non-member: read fails (must not see the seeded row)
BEGIN;
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = '<nonmember-user-uuid>';

DO $$
DECLARE c integer;
BEGIN
  SELECT count(*) INTO c FROM public.campaign_player_view WHERE campaign_id = '<campaign-uuid>';
  IF c > 0 THEN
    RAISE EXCEPTION 'Expected non-member read to fail but saw % rows', c;
  END IF;
END $$;
ROLLBACK;

-- ---------------------------------------------------------------------------
-- Cleanup snapshot as DM
BEGIN;
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = '<dm-user-uuid>';
DELETE FROM public.campaign_player_view WHERE campaign_id = '<campaign-uuid>';
COMMIT;
