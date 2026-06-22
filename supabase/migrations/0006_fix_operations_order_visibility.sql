-- Replace the legacy admin-only order visibility policy with the current operations roles.
drop policy if exists "people see orders they participate in" on public.orders;

create policy "participants and operations team view orders" on public.orders
  for select to authenticated
  using (
    customer_id = auth.uid()
    or vendor_id = auth.uid()
    or rider_id = auth.uid()
    or public.can_assign_orders()
  );
