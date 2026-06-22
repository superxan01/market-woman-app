-- Apply in the Supabase SQL editor after creating the project.
create type public.user_role as enum ('admin', 'vendor', 'rider', 'customer');
create type public.order_status as enum ('requested', 'quoted', 'confirmed', 'assigned', 'picked_up', 'delivered', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now()
);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  vendor_id uuid references public.profiles(id),
  rider_id uuid references public.profiles(id),
  status public.order_status not null default 'requested',
  area text not null,
  shopping_list jsonb not null default '[]'::jsonb,
  note text,
  total numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.vendor_quotes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  vendor_id uuid not null references public.profiles(id),
  amount numeric(12,2) not null check (amount > 0),
  note text,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.vendor_quotes enable row level security;
create policy "profiles are visible to signed in users" on public.profiles for select to authenticated using (true);
create policy "customers create their orders" on public.orders for insert to authenticated with check (customer_id = auth.uid());
create policy "people see orders they participate in" on public.orders for select to authenticated using (customer_id = auth.uid() or vendor_id = auth.uid() or rider_id = auth.uid() or (select role from public.profiles where id = auth.uid()) = 'admin');
