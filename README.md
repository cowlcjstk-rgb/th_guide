# Bangkok Place MVP (Zero-cost Start)

## Included pages

- `/` Home
- `/places` Place list with search/filter
- `/place/[slug]` Place detail
- `/map` Map explorer
- `/admin/places` Admin place create form

## Local run

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_WRITE_TOKEN=
NEXT_PUBLIC_MAPTILER_KEY=
```

Run:

```bash
npm run dev
```

## Supabase setup

Run SQL in Supabase SQL editor:

- `supabase/schema.sql`

## MonkeyTravel Excel scrape (place_id 1~700)

This requires your authenticated cookie for monkeytravel.com.

```bash
$env:MONKEY_COOKIE="paste_cookie_header_here"
$env:START_ID="1"
$env:END_ID="700"
npm run scrape:monkey
```

Output file example:

- `monkey_places_1_700.xlsx`

Sheets:

- `places`: parsed rows
- `blocked_or_login`: ids blocked by login/access

## Hydration warning note

If browser extensions inject attributes into `<body>`, React may show hydration mismatch warnings in dev mode.
We enabled `suppressHydrationWarning` at layout body level to avoid noisy false positives.
