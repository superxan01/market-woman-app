alter type public.user_role add value if not exists 'super_admin';
alter type public.user_role add value if not exists 'support_rep';

-- Preserve the existing administrator account while moving to the explicit super-admin role.
update public.profiles set role = 'super_admin' where role = 'admin';

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin');
$$;

create or replace function public.can_assign_orders()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('super_admin', 'support_rep'));
$$;

drop policy if exists "admins view all profiles" on public.profiles;
drop policy if exists "admins update marketplace orders" on public.orders;
drop policy if exists "admins create rider profiles" on public.profiles;

create policy "operations team view profiles" on public.profiles
  for select to authenticated using (public.can_assign_orders());

create policy "operations team assign orders" on public.orders
  for update to authenticated using (public.can_assign_orders()) with check (public.can_assign_orders());

create policy "super admins create operational profiles" on public.profiles
  for insert to authenticated with check (public.is_super_admin());

create policy "vendors create quotes" on public.vendor_quotes
  for insert to authenticated with check (vendor_id = auth.uid());

create policy "vendors view their quotes" on public.vendor_quotes
  for select to authenticated using (vendor_id = auth.uid() or public.can_assign_orders());

create policy "riders update their deliveries" on public.orders
  for update to authenticated using (rider_id = auth.uid()) with check (rider_id = auth.uid());
