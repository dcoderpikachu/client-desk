# Client Desk

Internal client management for Script Commerce: client health, call cadence, action items,
direct (Wise) invoices, Upwork earnings and payouts, and agency revenue. Single user.

- Next.js 16 (App Router) on Vercel, region `bom1` (Mumbai)
- Supabase Postgres + Auth (Google sign-in) in `ap-south-1`
- All money shown in US dollars, with the rupee equivalent beneath

## How the numbers work

| Thing | Rule |
| --- | --- |
| Revenue | Direct invoices by issue date, converted at that day's rate. Upwork earnings after the service fee, by the end of the work period. |
| Collected | Direct invoices by paid date. Upwork earnings by the payout they were withdrawn in. Rupees use what actually landed when you've entered it. |
| Outstanding | Unpaid direct invoices at today's rate, plus Upwork earnings not yet withdrawn. |
| Health | Worst of: payment (direct), billing trend (Upwork hourly), contact (vs cadence), your rating. |
| Exchange rates | ECB reference rates, fetched by the database every evening (`private.sync_fx`, pg_cron). |

## Database

Migrations live in `supabase/migrations` and have already been applied to the `client-desk` project.
Every table is owner-only through row level security: the signed-in email must be in `public.owners`.

`supabase/seed.sql` loads fictional sample clients that mirror the designs.
Run `supabase/reset_sample_data.sql` in the Supabase SQL editor to clear them before importing real data.

## Local development

```bash
npm install
npm run dev
```

The Supabase URL and publishable key have safe public defaults in `src/lib/env.ts`; override with
`CLIENT_DESK_SUPABASE_URL` and `CLIENT_DESK_SUPABASE_KEY`. `ALLOWED_EMAIL` sets who can sign in (comma-separated for more than one); add the same address to `public.owners`.

## Google sign-in setup

1. Google Cloud Console → APIs & Services → Credentials → Create credentials → OAuth client ID → Web application.
   Authorized redirect URI: `https://jupojqcseesuglwabomj.supabase.co/auth/v1/callback`.
2. Supabase → Authentication → Sign In / Providers → Google: enable, paste the client ID and secret.
3. Supabase → Authentication → URL Configuration: Site URL = the Vercel URL; add `https://<vercel-url>/**` to Redirect URLs.

Only emails in `ALLOWED_EMAIL` (and `public.owners`) get in; anyone else is signed straight back out.
