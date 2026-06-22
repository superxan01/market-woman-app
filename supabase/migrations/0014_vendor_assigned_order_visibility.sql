-- Keep vendor order visibility explicit and independent of the operations policy.
create policy "vendors view assigned orders" on public.orders
  for select to authenticated
  using (vendor_id = auth.uid());
