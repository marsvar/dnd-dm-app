-- Replace UUIDs below with real values from your project.
-- Example DM user id: 11111111-1111-1111-1111-111111111111
-- DM user id: <dm-user-uuid>
-- Example member user id: 22222222-2222-2222-2222-222222222222
-- Member user id: <member-user-uuid>
-- Example non-member user id: 33333333-3333-3333-3333-333333333333
-- Non-member user id: <nonmember-user-uuid>
-- Example campaign id: 44444444-4444-4444-4444-444444444444
-- Campaign id: <campaign-uuid>

-- Single transaction so cleanup is automatic on failure.
BEGIN;
SET LOCAL role authenticated;

-- ---------------------------------------------------------------------------
-- Seed snapshot as DM
SET LOCAL request.jwt.claim.sub = '<dm-user-uuid>';
INSERT INTO public.campaign_player_view (campaign_id, payload)
VALUES ('<campaign-uuid>', '{"active_encounter":null,"participants":[],"party":[]}')
ON CONFLICT (campaign_id) DO UPDATE SET payload = EXCLUDED.payload;

-- ---------------------------------------------------------------------------
-- Member: read succeeds, write fails
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
  IF SQLSTATE = 'P0001' AND SQLERRM LIKE 'Expected member write to fail%' THEN
    RAISE;
  END IF;
  IF SQLSTATE IN ('42501', '28000') THEN
    RAISE NOTICE 'Member write failed as expected: %', SQLERRM;
  ELSE
    RAISE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Non-member: read fails (must not see the seeded row)
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
