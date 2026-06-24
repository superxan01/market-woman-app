create table public.support_availability (user_id uuid primary key references public.profiles(id) on delete cascade, status text not null default 'busy' check(status in ('available','busy')), updated_at timestamptz not null default now());
alter table public.support_availability enable row level security;
create policy "support read availability" on public.support_availability for select to authenticated using (public.can_assign_orders());
create policy "support set own availability" on public.support_availability for insert to authenticated with check (user_id=auth.uid() and public.can_assign_orders());
create policy "support update own availability" on public.support_availability for update to authenticated using (user_id=auth.uid() and public.can_assign_orders()) with check (user_id=auth.uid() and public.can_assign_orders());
create or replace function public.set_support_availability(next_status text) returns void language plpgsql security definer set search_path=public as $$ begin if not public.can_assign_orders() or next_status not in ('available','busy') then raise exception 'Availability update denied'; end if; insert into public.support_availability(user_id,status,updated_at) values(auth.uid(),next_status,now()) on conflict(user_id) do update set status=excluded.status,updated_at=excluded.updated_at; end $$;
revoke all on function public.set_support_availability(text) from public; grant execute on function public.set_support_availability(text) to authenticated;
alter publication supabase_realtime add table public.support_availability;
