-- Customer accounts are created automatically whenever a user signs up through Supabase Auth.
-- Admin accounts are promoted manually by a trusted project owner; never expose admin self-registration publicly.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'Customer'),
    new.raw_user_meta_data ->> 'phone',
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create policy "users view their own profile" on public.profiles
  for select to authenticated using (id = auth.uid());

create policy "admins view all profiles" on public.profiles
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "admins update marketplace orders" on public.orders
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "admins create rider profiles" on public.profiles
  for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- After an admin signs up, promote them from the SQL editor with:
-- update public.profiles set role = 'admin' where id = '<auth-user-uuid>';
