create or replace function public.accept_call(call uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  c public.call_sessions%rowtype;
  me_role public.user_role;
  caller_role public.user_role;
  is_external_participant boolean;
begin
  select * into c from public.call_sessions where id=call for update;

  if not found or c.status <> 'ringing' or not public.can_access_conversation(c.conversation_id) then
    raise exception 'Call is unavailable';
  end if;

  if c.caller_id = auth.uid() then
    raise exception 'Caller cannot accept their own call';
  end if;

  select role into me_role from public.profiles where id = auth.uid();
  select role into caller_role from public.profiles where id = c.caller_id;

  select exists (
    select 1
    from public.conversations conversation
    where conversation.id = c.conversation_id
      and (
        conversation.customer_id = auth.uid()
        or conversation.vendor_id = auth.uid()
        or conversation.rider_id = auth.uid()
      )
  ) into is_external_participant;

  if me_role in ('support_rep', 'super_admin') then
    if caller_role in ('support_rep', 'super_admin') then
      raise exception 'Only the external participant can accept this call';
    end if;
  elsif is_external_participant then
    if caller_role not in ('support_rep', 'super_admin') then
      raise exception 'Only support can accept this call';
    end if;
  else
    raise exception 'Call access denied';
  end if;

  update public.call_sessions
  set status = 'active', accepted_by = auth.uid(), answered_at = now()
  where id = call;

  return call;
end
$$;

revoke all on function public.accept_call(uuid) from public;
grant execute on function public.accept_call(uuid) to authenticated;
