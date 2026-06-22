-- Avoid recursive RLS checks: policies on profiles must not directly query profiles.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

drop policy if exists "admins view all profiles" on public.profiles;
drop policy if exists "admins update marketplace orders" on public.orders;
drop policy if exists "admins create rider profiles" on public.profiles;

create policy "admins view all profiles" on public.profiles
  for select to authenticated using (public.is_admin());

create policy "admins update marketplace orders" on public.orders
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins create rider profiles" on public.profiles
  for insert to authenticated
  with check (public.is_admin());
