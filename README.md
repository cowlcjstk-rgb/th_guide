# Bangkok Place MVP (Zero-cost Start)

## Included pages

- `/` Home
- `/places` Place list with search/filter
- `/place/[slug]` Place detail
- `/map` Map explorer
- `/products` Redirects to external nightlife domain
- `/community` Community home
- `/community/top-rated`
- `/community/latest-reviews`
- `/community/route-shares`
- `/community/guide`
- `/community/faq`
- `/signup` Member sign-up
- `/submit/place` User place submission
- `/auth/login` Login
- `/auth/find-id` Find ID
- `/auth/reset-password` Reset password
- `/me` My member info
- `/admin/places` Admin place create form
- `/admin/review` Admin approve/reject queue
- `/admin/community` Admin create/delete community section items
- `/admin/members` Admin member search
- `/admin/products` Redirects to external nightlife admin domain

## Local run

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_WRITE_TOKEN=
NEXT_PUBLIC_MAPTILER_KEY=
AUTH_SECRET=
NIGHTLIFE_PLATFORM_URL=
NEXT_PUBLIC_NIGHTLIFE_PLATFORM_URL=
```

Run:

```bash
npm run dev
```

## Login

- Admin quick account:
  - ID: `admin`
  - Password: `admin`

## Supabase setup

Run SQL in Supabase SQL editor:

- `supabase/schema.sql`
- If the DB already exists, run additional migration:
  - `supabase/upgrade_pending_workflow.sql`

## Hydration warning note

If browser extensions inject attributes into `<body>`, React may show hydration mismatch warnings in dev mode.
We enabled `suppressHydrationWarning` at layout body level to avoid noisy false positives.
