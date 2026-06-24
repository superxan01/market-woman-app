create or replace function public.accept_call(call uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare c public.call_sessions%rowtype;
begin
  select * into c from public.call_sessions where id=call for update;
  if not found or c.status<>'ringing' or not public.can_access_conversation(c.conversation_id) then raise exception 'Call is unavailable'; end if;
  if (select role from public.profiles where id=auth.uid()) not in ('support_rep','super_admin') and c.caller_id<>auth.uid() then raise exception 'Only support can accept this call'; end if;
  update public.call_sessions set status='active',accepted_by=auth.uid(),answered_at=now() where id=call;
  return call;
end $$;
create or replace function public.reject_call(call uuid) returns void language plpgsql security definer set search_path=public as $$
begin if not exists(select 1 from public.call_sessions where id=call and public.can_access_conversation(conversation_id)) then raise exception 'Call access denied'; end if; update public.call_sessions set status='rejected',ended_at=now() where id=call and status='ringing'; end $$;
create or replace function public.mark_missed_call(call uuid) returns void language plpgsql security definer set search_path=public as $$
begin update public.call_sessions set status='missed',ended_at=now() where id=call and status='ringing' and public.can_access_conversation(conversation_id); end $$;
revoke all on function public.accept_call(uuid),public.reject_call(uuid),public.mark_missed_call(uuid) from public;
grant execute on function public.accept_call(uuid),public.reject_call(uuid),public.mark_missed_call(uuid) to authenticated;
