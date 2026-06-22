# Market Woman App

A responsive marketplace MVP for Nigerian customers, vendors, riders, and administrators. The current build uses a mock repository so the complete role-aware workflow can be reviewed before a backend is connected.

## Run locally

1. Install Node.js 20+.
2. Run `npm install`.
3. Run `npm run dev` and open `http://localhost:3000`.
4. Run `npm run test` and `npm run build` before release.

## Current MVP

- Demo role selection and client-side role guards
- Admin order overview, status progression, and rider assignment
- Vendor request view, rider delivery view, and customer tracking view
- Typed order lifecycle with mock data
- Supabase-ready repository boundary and initial SQL migration

## Supabase handoff

Create a Supabase project, copy `.env.example` to `.env.local`, add its URL and anon key, then apply `supabase/migrations/0001_initial_schema.sql`. Implement the Supabase repository in `lib/repositories.ts` and replace the mock export only after the migration and RLS policies are verified.

## Vercel deployment

1. Create a GitHub repository and push this project.
2. Import it in Vercel as a Next.js project.
3. Vercel creates preview deployments for pull requests and deploys the production site from `main`.
4. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel for both Preview and Production before enabling the real Supabase repository.

No secrets are committed to the repository.
