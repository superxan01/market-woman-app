create or replace function public.cancel_market_order(order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare target public.orders%rowtype;
begin
  select * into target from public.orders where id = order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if not (public.can_assign_orders() or (target.customer_id = auth.uid() and target.status = 'requested')) then raise exception 'This order cannot be cancelled by this account'; end if;
  if target.status in ('picked_up', 'delivered', 'cancelled') then raise exception 'This order can no longer be cancelled'; end if;
  update public.orders set status = 'cancelled', updated_at = now() where id = order_id;
  return order_id;
end;
$$;
