# MarketApp Environment Variables

This document lists required environment variables for local development and Vercel deployment.

## Public browser variables

These are safe to expose to the browser and must use the `NEXT_PUBLIC_` prefix.

| Variable | Required | Used by | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Browser and API route | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser and API route | Supabase anon/publishable key. Protected by RLS, not a service secret. |

## Server-only variables

These must never use the `NEXT_PUBLIC_` prefix.

| Variable | Required | Used by | Notes |
| --- | --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | `/api/livekit/token` | Server-only. Bypasses RLS. Never expose to client. |
| `LIVEKIT_URL` | Yes | `/api/livekit/token` | LiveKit Cloud websocket URL. Server returns it only with valid call token response. |
| `LIVEKIT_API_KEY` | Yes | `/api/livekit/token` | Server-only LiveKit credential. |
| `LIVEKIT_API_SECRET` | Yes | `/api/livekit/token` | Server-only LiveKit credential. Rotate immediately if exposed. |

## Local development

Create `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```

Do not commit `.env.local`.

## Vercel environments

Configure values separately for:

- Production
- Preview
- Development, if used

Recommended:

- Production should point to the production Supabase project and production LiveKit project.
- Preview can point to the same Supabase project only if test data and role access are carefully controlled.

## Supabase Auth URLs

Confirm these in Supabase Auth settings:

- Site URL:
  - `https://market-woman-app.vercel.app`
  - or the final custom production domain.
- Redirect URLs:
  - production domain
  - Vercel preview domain pattern, if preview auth is required
  - local development URL, if local auth testing is required

Password recovery will also require the reset URL to be included after the recovery page is implemented.

## Storage buckets

Required buckets:

| Bucket | Public? | Purpose |
| --- | --- | --- |
| `order-attachments` | No | Customer order images/files. |
| `delivery-proofs` | No | Rider delivery proof images. |
| `chat-media` | No | Chat files, images, and voice notes. |

Access should remain controlled by RLS and signed URLs.

## Secret handling rules

- Never paste service-role keys, LiveKit API secret, or database passwords into chat, docs, screenshots, or committed files.
- Never prefix server secrets with `NEXT_PUBLIC_`.
- Rotate secrets immediately if exposed.
- Keep Supabase direct database connection strings out of Vercel unless a server-only feature explicitly needs direct database access.
