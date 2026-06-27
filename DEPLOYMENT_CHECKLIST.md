# MarketApp Deployment Checklist

Use this checklist for Vercel production deployment.

## Pre-deployment

- [ ] Confirm all intended code changes are reviewed.
- [ ] Confirm no unrelated local changes are included.
- [ ] Confirm `supabase/migrations/0020_call_acceptance_hardening.sql` has been applied to Supabase.
- [ ] Confirm all earlier migrations `0001` through `0019` are already applied.
- [ ] Confirm password recovery decision is made: implemented or officially deferred.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Complete QA checklist.
- [ ] Confirm no secrets appear in Git diff.

## Supabase validation

- [ ] Project URL matches production Vercel env.
- [ ] Auth email confirmations redirect to production domain.
- [ ] Password recovery redirect URL is configured when implemented.
- [ ] Site URL is `https://market-woman-app.vercel.app` or final custom production domain.
- [ ] Additional redirect URLs include Vercel preview URLs if previews are used.
- [ ] Storage buckets exist:
  - [ ] `order-attachments`
  - [ ] `delivery-proofs`
  - [ ] `chat-media`
- [ ] Storage buckets are private.
- [ ] RLS is enabled on production tables.
- [ ] RPC permissions are granted only as expected.
- [ ] Realtime is enabled for communication tables.

## Vercel validation

- [ ] Production branch is correct.
- [ ] Build command is `npm run build`.
- [ ] Install command is default or approved.
- [ ] Framework is detected as Next.js.
- [ ] Environment variables are configured for Production.
- [ ] Preview environment variables are configured separately if previews are used.
- [ ] No server secret is prefixed with `NEXT_PUBLIC_`.
- [ ] Latest production deployment uses the intended commit.

## LiveKit validation

- [ ] LiveKit project is active.
- [ ] API key is current.
- [ ] API secret was rotated after earlier exposure.
- [ ] Vercel has current LiveKit values.
- [ ] Test call can connect after `active` status.
- [ ] Token endpoint denies unauthorized/non-active calls.

## Deployment steps

1. Apply outstanding Supabase migrations.
2. Run local validation:
   - `npm run lint`
   - `npm run build`
3. Commit release candidate changes.
4. Push to GitHub.
5. Wait for Vercel deployment.
6. Review Vercel build logs.
7. Open production URL.
8. Run production smoke test:
   - login
   - create order
   - open Communications
   - send message
   - start/accept/end call
9. If smoke test passes, mark release complete.

## Rollback plan

- [ ] Identify last known-good Vercel deployment.
- [ ] Keep Supabase migrations backward-compatible where possible.
- [ ] If production deploy fails, rollback through Vercel deployments.
- [ ] If a database migration causes issues, apply corrective migration rather than editing applied migrations.
- [ ] Record incident notes before attempting another release.
