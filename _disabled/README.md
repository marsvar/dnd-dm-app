# _disabled/

Contains code that is scaffolded but not yet active in the MVP build.
This folder is excluded from TypeScript compilation (`tsconfig.json` → `exclude`).

## Contents

| Path | What it is | Blocked by |
|---|---|---|
| `auth/api-route/[...nextauth]/` | NextAuth route handler | `next-auth` not in package.json |
| `auth/lib/` | `authOptions.ts` — NextAuth + Supabase credential strategy | same |
| `supabase/lib/` | Browser Supabase client (`@supabase/ssr`) | `@supabase/ssr`, `@supabase/supabase-js` not in package.json |

## To re-enable

1. `npm install next-auth @supabase/supabase-js @supabase/ssr`
2. Move files back: `auth/api-route` → `app/api/auth`, `auth/lib` → `app/lib/auth`, `supabase/lib` → `app/lib/supabase`
3. Remove `_disabled` from `tsconfig.json` exclude list
4. Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
5. Set `NEXT_PUBLIC_FEATURE_AUTH=true` in env
6. Add a `/login` page
