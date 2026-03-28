# Supabase SQL tests

These tests use pgTAP and assume Supabase roles (`authenticated`, `anon`) are present.

Run against a local Supabase/Postgres database:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
  -f supabase/migrations/20260323_user_management_persistence.sql \
  -f supabase/tests/rls_user_management_persistence.test.sql
```
