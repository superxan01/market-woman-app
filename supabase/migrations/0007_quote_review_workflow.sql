-- Atomically accept one vendor quote, decline its alternatives, and confirm the order.
create or replace function public.accept_vendor_quote(quote_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_quote public.vendor_quotes%rowtype;
begin
  if not public.can_assign_orders() then
    raise exception 'Only the operations team can accept a vendor quote';
  end if;

  select * into selected_quote
  from public.vendor_quotes
  where id = quote_id and status = 'pending'
  for update;

  if not found then
    raise exception 'Pending quote not found';
  end if;

  update public.vendor_quotes
  set status = case when id = quote_id then 'accepted' else 'declined' end
  where order_id = selected_quote.order_id and status = 'pending';

  update public.orders
  set vendor_id = selected_quote.vendor_id,
      total = selected_quote.amount,
      status = 'confirmed',
      updated_at = now()
  where id = selected_quote.order_id;

  return selected_quote.order_id;
end;
$$;

grant execute on function public.accept_vendor_quote(uuid) to authenticated;
