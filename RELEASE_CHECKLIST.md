# MarketApp RC1 Release Checklist

Use this checklist before promoting the current build to production. Do not release until every required item is checked or explicitly accepted as a known limitation.

## Release blockers

- [ ] Apply `supabase/migrations/0020_call_acceptance_hardening.sql` in Supabase SQL Editor.
- [ ] Verify password recovery/reset flow on the production domain.
- [ ] Complete live two-account QA for chat and calls.
- [ ] Confirm Vercel production deployment uses the intended `main` branch commit.
- [ ] Confirm no secrets are committed and LiveKit/Supabase service credentials are server-only.

## Build validation

- [x] `npm run lint` completes with no errors.
- [x] `npm run build` completes successfully.
- [x] TypeScript validation passes during production build.
- [ ] Review deployed browser console for hydration/runtime warnings.
- [ ] Review Vercel deployment logs for warnings/errors.

## Authentication

- [ ] Customer registration works with email confirmation.
- [ ] Login works for every role.
- [ ] Logout clears session and returns user to login.
- [ ] Session persists after refresh.
- [ ] Password recovery page exists and sends reset email.
- [ ] Password reset link returns to the correct production domain.
- [ ] Expired or already-used recovery links show a safe retry message.

## Role workspaces

- [ ] Customer workspace loads only customer-facing data.
- [ ] Vendor workspace loads only assigned vendor orders and quote actions.
- [ ] Rider workspace loads only assigned rider deliveries.
- [ ] Support workspace can operate assigned order workflows but cannot manage roles.
- [ ] Super Admin can manage roles and all operational functions.

## Marketplace workflows

- [ ] Customer creates order with text list.
- [ ] Customer creates order with optional image attachment.
- [ ] Support/Super Admin assigns vendor.
- [ ] Vendor sees assigned order.
- [ ] Vendor submits quote.
- [ ] Support/Super Admin accepts quote.
- [ ] Support/Super Admin assigns rider.
- [ ] Rider marks picked up.
- [ ] Cancellation is prevented after pickup.
- [ ] Rider marks delivered.
- [ ] Rider uploads delivery proof.
- [ ] Customer sees delivery tracking.
- [ ] Customer rates completed delivery.

## Communications workflows

- [ ] `/messages` is reachable from every workspace.
- [ ] Support/Super Admin can search customers, vendors, and riders.
- [ ] Search result opens an existing conversation or creates one safely.
- [ ] External users only see `MarketApp Support`.
- [ ] Support users see real customer/vendor/rider names.
- [ ] Conversation switching loads the correct thread.
- [ ] Unread counts clear after opening a conversation.
- [ ] Attachments upload and open through signed URLs.
- [ ] Voice notes record, upload, and play back.
- [ ] Outgoing call rings the recipient.
- [ ] Incoming call appears for the correct recipient.
- [ ] Accept call connects both participants.
- [ ] Reject call closes the incoming call screen.
- [ ] End call terminates the session.
- [ ] Mute actually disables the microphone.

## Security release gate

- [ ] Customers cannot access operational routes/actions.
- [ ] Vendors cannot access rider/support/super-admin-only actions.
- [ ] Riders cannot access vendor/support/super-admin-only actions.
- [ ] Support reps cannot update roles.
- [ ] Conversation access follows the approved support-only matrix.
- [ ] LiveKit tokens are denied for non-participants.
- [ ] LiveKit tokens are denied before a call becomes active.
- [ ] Storage signed URLs are only returned to authorized participants.

## Release decision

- [ ] All blockers resolved.
- [ ] QA checklist completed.
- [ ] Deployment checklist completed.
- [ ] Production smoke test completed after deployment.
- [ ] Release approved by project owner.
