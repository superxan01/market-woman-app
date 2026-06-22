create table public.order_feedback (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid not null references public.profiles(id), rating smallint not null check (rating between 1 and 5), comment text,
  created_at timestamptz not null default now(), unique(order_id, customer_id)
);
alter table public.order_feedback enable row level security;
create policy "customers submit feedback for delivered orders" on public.order_feedback for insert to authenticated with check (customer_id = auth.uid() and exists (select 1 from public.orders where orders.id = order_id and orders.customer_id = auth.uid() and orders.status = 'delivered'));
create policy "customers and operations view feedback" on public.order_feedback for select to authenticated using (customer_id = auth.uid() or public.can_assign_orders());
create policy "customers update their feedback" on public.order_feedback for update to authenticated using (customer_id = auth.uid()) with check (customer_id = auth.uid());
