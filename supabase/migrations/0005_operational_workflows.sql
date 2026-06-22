-- Super admins may promote existing signed-up accounts into marketplace roles.
create policy "super admins update operational profiles" on public.profiles
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- A vendor can quote only for an order assigned to that vendor.
drop policy if exists "vendors create quotes" on public.vendor_quotes;
create policy "vendors create quotes" on public.vendor_quotes
  for insert to authenticated
  with check (
    vendor_id = auth.uid()
    and exists (
      select 1 from public.orders
      where orders.id = order_id and orders.vendor_id = auth.uid()
    )
  );
