# Market Woman App

Responsive marketplace workflow for Nigerian customers, vendors, riders, support reps, and super-admins.

## Live workflow

1. Customer signs up, creates an order, and can attach a shopping-list image.
2. Operations assigns a vendor; the vendor submits a quote.
3. Operations accepts a quote, assigns a rider, and follows delivery progress.
4. Rider uploads delivery proof, marks pickup and delivery in sequence.
5. Customer views tracking, delivery proof, and leaves a rating.
6. Operations reviews delivery feedback in the Service feedback workspace.

## Roles

- `super_admin`: full operational and access-management control.
- `support_rep`: reads marketplace records and assigns vendors/riders; cannot manage account roles.
- `vendor`: sees assigned requests and submits quotes.
- `rider`: sees assigned deliveries, uploads proof, and progresses delivery status.
- `customer`: creates, tracks, cancels unprocessed orders, and rates delivered orders.

## Local development

1. Install Node.js 20 or newer.
2. Create `.env.local` with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
3. Run `npm install` and `npm run dev`.
4. Before release, run `npm run test` and `npm run build`.

## Supabase

Apply the SQL migrations in numerical order from `supabase/migrations/`. They create the role model, row-level-security policies, private attachment/proof buckets, controlled delivery actions, cancellations, and feedback.

Do not commit database credentials or service-role keys. The browser-safe public URL/key are the only values required by this Next.js client.

## Deployment

Vercel deploys the `main` branch to production and creates previews for pull requests. Configure the two public Supabase variables in both Preview and Production environments.

## Production acceptance checklist

- Customer can create, track, and cancel an unprocessed order.
- Operations can see all incoming orders, accept a quote, and assign a rider.
- Vendor can quote assigned work only.
- Rider can upload proof and move only `assigned → picked_up → delivered`.
- Customer can open delivery proof and submit feedback only after delivery.
- Super-admin can manage roles; support reps cannot.
