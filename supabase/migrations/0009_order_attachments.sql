create table public.order_attachments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  created_at timestamptz not null default now()
);

alter table public.order_attachments enable row level security;

create policy "participants and operations view order attachments" on public.order_attachments
  for select to authenticated using (
    exists (
      select 1 from public.orders
      where orders.id = order_id
        and (orders.customer_id = auth.uid() or orders.vendor_id = auth.uid() or orders.rider_id = auth.uid() or public.can_assign_orders())
    )
  );

create policy "customers attach files to their orders" on public.order_attachments
  for insert to authenticated with check (
    exists (select 1 from public.orders where orders.id = order_id and orders.customer_id = auth.uid())
  );

insert into storage.buckets (id, name, public) values ('order-attachments', 'order-attachments', false)
on conflict (id) do nothing;

create policy "customers upload order attachment files" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'order-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
