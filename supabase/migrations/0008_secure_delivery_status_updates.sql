-- Riders may progress only their own assigned delivery in the correct order.
drop policy if exists "riders update their deliveries" on public.orders;

create or replace function public.update_delivery_status(order_id uuid, next_status public.order_status)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  delivery public.orders%rowtype;
begin
  select * into delivery
  from public.orders
  where id = order_id and rider_id = auth.uid()
  for update;

  if not found then
    raise exception 'Delivery not found for this rider';
  end if;

  if (delivery.status = 'assigned' and next_status = 'picked_up')
    or (delivery.status = 'picked_up' and next_status = 'delivered') then
    update public.orders
    set status = next_status, updated_at = now()
    where id = order_id;
    return order_id;
  end if;

  raise exception 'Invalid delivery status transition';
end;
$$;

grant execute on function public.update_delivery_status(uuid, public.order_status) to authenticated;
