# MarketApp RC1 QA Checklist

This checklist is designed for manual and semi-automated RC validation. Use at least two browsers or profiles for real-time tests.

## Test accounts required

- [ ] Customer account
- [ ] Vendor account
- [ ] Rider account
- [ ] Support Rep account
- [ ] Super Admin account

## Customer journey

- [ ] Register a new customer account.
- [ ] Confirm the customer email.
- [ ] Log in as customer.
- [ ] Request a password reset from `/forgot-password`.
- [ ] Confirm reset request shows the same safe message whether the email exists or not.
- [ ] Open the recovery email and land on `/reset-password`.
- [ ] Confirm weak password validation.
- [ ] Confirm mismatched password validation.
- [ ] Update password successfully.
- [ ] Log in with the new password.
- [ ] Confirm expired or reused recovery link shows a safe retry message.
- [ ] Confirm session survives refresh.
- [ ] Open customer dashboard.
- [ ] Create an order with multiple shopping-list lines.
- [ ] Add optional order image attachment.
- [ ] Confirm order appears in customer history.
- [ ] Confirm order appears in Support/Super Admin order queue.
- [ ] Receive quote after vendor submits one.
- [ ] Track order through requested, quoted, confirmed, assigned, picked up, delivered.
- [ ] Confirm cancellation is unavailable after rider pickup.
- [ ] View delivery proof after rider uploads it.
- [ ] Rate delivered order.
- [ ] Open Communications.
- [ ] Start or open MarketApp Support conversation.
- [ ] Send text message.
- [ ] Send image/file attachment.
- [ ] Send voice note.
- [ ] Receive reply from Support.
- [ ] Place call to Support.
- [ ] Receive call from Support.

## Vendor journey

- [ ] Log in as vendor.
- [ ] Confirm only assigned vendor orders appear.
- [ ] Open assigned order.
- [ ] Submit valid quote.
- [ ] Confirm quote appears for Support/Super Admin.
- [ ] Confirm vendor cannot assign rider.
- [ ] Open Communications.
- [ ] Confirm vendor sees `MarketApp Support`, not customer/support staff names.
- [ ] Send and receive support messages.
- [ ] Receive support call.

## Rider journey

- [ ] Log in as rider.
- [ ] Confirm only assigned rider deliveries appear.
- [ ] Mark assigned order as picked up.
- [ ] Upload delivery proof image.
- [ ] Mark order as delivered.
- [ ] Confirm rider cannot cancel after pickup.
- [ ] Open Communications.
- [ ] Confirm rider sees `MarketApp Support`.
- [ ] Send and receive support messages.
- [ ] Receive support call.

## Support Rep journey

- [ ] Log in as support rep.
- [ ] Confirm order queue is visible.
- [ ] Confirm vendors/riders lists are visible.
- [ ] Confirm support team role editor is read-only.
- [ ] Assign vendor to order.
- [ ] Accept quote.
- [ ] Assign rider.
- [ ] Open Communications.
- [ ] Search customer by partial name.
- [ ] Search vendor by partial name.
- [ ] Search rider by partial name.
- [ ] Open/create conversation from search result.
- [ ] Reply to customer/vendor/rider.
- [ ] Set availability to available if UI is present.
- [ ] Receive incoming call.
- [ ] Accept incoming call.
- [ ] Reject incoming call.
- [ ] Start outgoing call.

## Super Admin journey

- [ ] Log in as super admin.
- [ ] Confirm all operational tabs are visible.
- [ ] Promote/demote a test user role.
- [ ] Assign vendors and riders.
- [ ] View customer feedback.
- [ ] Open Communications shared inbox.
- [ ] Search and message customers, vendors, and riders.
- [ ] Confirm super admin can accept/initiate calls.

## Permission validation

- [ ] Customer cannot open `/super_admin`.
- [ ] Customer cannot perform vendor/rider/support-only actions.
- [ ] Vendor cannot open support-only routes/actions.
- [ ] Rider cannot open vendor-only routes/actions.
- [ ] Support Rep cannot update user roles.
- [ ] Unauthenticated user cannot use `/api/livekit/token`.
- [ ] Non-call participant cannot get LiveKit token.
- [ ] Call participant cannot get token while call is only ringing.
- [ ] Unauthorized conversation access is denied by Supabase RLS/RPC.
- [ ] Unauthorized storage object access is denied.

## Real-time validation

- [ ] New message appears without refresh.
- [ ] Conversation preview updates without refresh.
- [ ] Unread badge increments for recipient.
- [ ] Unread badge clears after opening conversation.
- [ ] Conversation switching loads correct thread.
- [ ] Refresh restores selected conversation when URL contains `?conversation=`.
- [ ] Incoming call appears to the intended recipient.
- [ ] First accepted support call wins.
- [ ] Other support users no longer see claimable call after acceptance.
- [ ] Call rejection closes ringing state.
- [ ] Call termination closes active call state.
- [ ] Temporary network interruption reconnects or fails gracefully.

## Responsive QA

- [ ] Desktop dashboard has no horizontal overflow.
- [ ] Tablet dashboard remains usable.
- [ ] Mobile dashboard forms are reachable and scroll naturally.
- [ ] Mobile Communications list opens first.
- [ ] Mobile active chat opens after selecting conversation.
- [ ] Mobile Back returns to conversation list.
- [ ] Mobile keyboard does not hide message input permanently.
- [ ] Call overlay fits mobile viewport.

## Accessibility QA

- [ ] Login form fields have labels.
- [ ] Order forms have labels.
- [ ] Communications search has label.
- [ ] Buttons have visible names or ARIA labels.
- [ ] Keyboard can reach primary actions.
- [ ] Focus states are visible.
- [ ] Incoming-call controls are keyboard reachable.
- [ ] Color contrast is readable in normal and error states.

## Regression checks

- [ ] Existing order attachments still work.
- [ ] Existing delivery proofs still work.
- [ ] Existing customer ratings still work.
- [ ] Existing dashboard navigation still works.
- [ ] Existing auth redirect URLs work in production.
