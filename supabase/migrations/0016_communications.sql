-- MarketApp communications: shared support inbox, secure media, and call audit trail.
create type public.conversation_kind as enum ('customer_support','support_vendor','support_rider');
create type public.message_kind as enum ('text','image','file','voice_note','system');
create type public.conversation_status as enum ('open','closed');
create type public.call_status as enum ('ringing','active','rejected','missed','ended','failed');

create table public.conversations (
  id uuid primary key default gen_random_uuid(), kind public.conversation_kind not null,
  customer_id uuid references public.profiles(id), vendor_id uuid references public.profiles(id), rider_id uuid references public.profiles(id),
  claimed_by uuid references public.profiles(id), status public.conversation_status not null default 'open',
  last_message_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((kind = 'customer_support' and customer_id is not null and vendor_id is null and rider_id is null) or (kind = 'support_vendor' and vendor_id is not null and customer_id is null and rider_id is null) or (kind = 'support_rider' and rider_id is not null and customer_id is null and vendor_id is null))
);
create unique index conversations_open_customer on public.conversations(customer_id) where kind='customer_support' and status='open';
create unique index conversations_open_vendor on public.conversations(vendor_id) where kind='support_vendor' and status='open';
create unique index conversations_open_rider on public.conversations(rider_id) where kind='support_rider' and status='open';

create table public.conversation_messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id), kind public.message_kind not null default 'text', body text,
  storage_path text unique, file_name text, mime_type text, duration_ms integer check(duration_ms is null or duration_ms between 0 and 120000),
  created_at timestamptz not null default now(), check (body is not null or storage_path is not null)
);
create index conversation_messages_feed on public.conversation_messages(conversation_id, created_at);
create table public.conversation_read_states (conversation_id uuid not null references public.conversations(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade, last_read_at timestamptz not null default now(), primary key(conversation_id,user_id));
create table public.call_sessions (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
  room_name text not null unique, caller_id uuid not null references public.profiles(id), accepted_by uuid references public.profiles(id), status public.call_status not null default 'ringing',
  requested_at timestamptz not null default now(), answered_at timestamptz, ended_at timestamptz, created_at timestamptz not null default now()
);

create or replace function public.can_access_conversation(conversation uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.conversations c join public.profiles me on me.id=auth.uid() where c.id=conversation and ((c.customer_id=auth.uid()) or (c.vendor_id=auth.uid()) or (c.rider_id=auth.uid()) or me.role in ('support_rep','super_admin')));
$$;
create or replace function public.start_support_conversation(target_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare me public.profiles%rowtype; target public.profiles%rowtype; k public.conversation_kind; cid uuid;
begin select * into me from public.profiles where id=auth.uid(); select * into target from public.profiles where id=target_id; if not found then raise exception 'Account not found'; end if;
  if me.role in ('support_rep','super_admin') then if target.role='customer' then k='customer_support'; elsif target.role='vendor' then k='support_vendor'; elsif target.role='rider' then k='support_rider'; else raise exception 'Unsupported communication target'; end if;
  elsif me.role='customer' then k='customer_support'; target_id=auth.uid(); elsif me.role='vendor' then k='support_vendor'; target_id=auth.uid(); elsif me.role='rider' then k='support_rider'; target_id=auth.uid(); else raise exception 'Unsupported communication role'; end if;
  select id into cid from public.conversations where status='open' and ((k='customer_support' and customer_id=target_id) or (k='support_vendor' and vendor_id=target_id) or (k='support_rider' and rider_id=target_id));
  if cid is null then insert into public.conversations(kind,customer_id,vendor_id,rider_id) values(k,case when k='customer_support' then target_id end,case when k='support_vendor' then target_id end,case when k='support_rider' then target_id end) returning id into cid; end if; return cid;
end $$;
create or replace function public.send_conversation_message(conversation uuid, message_kind public.message_kind, message_body text default null, media_path text default null, media_name text default null, media_type text default null, note_duration integer default null) returns uuid language plpgsql security definer set search_path=public as $$
declare mid uuid; begin if not public.can_access_conversation(conversation) then raise exception 'Conversation access denied'; end if; if media_path is not null and media_path !~ ('^' || conversation::text || '/') then raise exception 'Invalid media path'; end if; insert into public.conversation_messages(conversation_id,sender_id,kind,body,storage_path,file_name,mime_type,duration_ms) values(conversation,auth.uid(),message_kind,nullif(message_body,''),media_path,media_name,media_type,note_duration) returning id into mid; update public.conversations set last_message_at=now(),updated_at=now() where id=conversation; return mid; end $$;
create or replace function public.mark_conversation_read(conversation uuid) returns void language plpgsql security definer set search_path=public as $$ begin if not public.can_access_conversation(conversation) then raise exception 'Conversation access denied'; end if; insert into public.conversation_read_states(conversation_id,user_id,last_read_at) values(conversation,auth.uid(),now()) on conflict(conversation_id,user_id) do update set last_read_at=excluded.last_read_at; end $$;
create or replace function public.request_call(conversation uuid) returns uuid language plpgsql security definer set search_path=public as $$ declare cid uuid; begin if not public.can_access_conversation(conversation) then raise exception 'Conversation access denied'; end if; insert into public.call_sessions(conversation_id,room_name,caller_id) values(conversation,'pending',auth.uid()) returning id into cid; update public.call_sessions set room_name='marketapp-call-'||cid::text where id=cid; return cid; end $$;
create or replace function public.accept_call(call uuid) returns uuid language plpgsql security definer set search_path=public as $$ declare c public.call_sessions%rowtype; begin select * into c from public.call_sessions where id=call for update; if not found or not public.can_access_conversation(c.conversation_id) or c.status<>'ringing' then raise exception 'Call is unavailable'; end if; update public.call_sessions set status='active',accepted_by=auth.uid(),answered_at=now() where id=call; return call; end $$;
create or replace function public.end_call(call uuid, result public.call_status default 'ended') returns void language plpgsql security definer set search_path=public as $$ declare c public.call_sessions%rowtype; begin select * into c from public.call_sessions where id=call; if not found or not public.can_access_conversation(c.conversation_id) then raise exception 'Call access denied'; end if; update public.call_sessions set status=result,ended_at=now() where id=call and status in ('ringing','active'); end $$;

alter table public.conversations enable row level security; alter table public.conversation_messages enable row level security; alter table public.conversation_read_states enable row level security; alter table public.call_sessions enable row level security;
create policy "conversation members read" on public.conversations for select to authenticated using(public.can_access_conversation(id));
create policy "conversation messages read" on public.conversation_messages for select to authenticated using(public.can_access_conversation(conversation_id));
create policy "conversation read states read" on public.conversation_read_states for select to authenticated using(public.can_access_conversation(conversation_id));
create policy "conversation calls read" on public.call_sessions for select to authenticated using(public.can_access_conversation(conversation_id));
insert into storage.buckets(id,name,public,file_size_limit) values('chat-media','chat-media',false,20971520) on conflict(id) do nothing;
create policy "conversation members upload chat media" on storage.objects for insert to authenticated with check(bucket_id='chat-media' and public.can_access_conversation((storage.foldername(name))[1]::uuid));
create policy "conversation members read chat media" on storage.objects for select to authenticated using(bucket_id='chat-media' and public.can_access_conversation((storage.foldername(name))[1]::uuid));
alter publication supabase_realtime add table public.conversations, public.conversation_messages, public.conversation_read_states, public.call_sessions;
grant execute on function public.start_support_conversation(uuid), public.send_conversation_message(uuid,public.message_kind,text,text,text,text,integer), public.mark_conversation_read(uuid), public.request_call(uuid), public.accept_call(uuid), public.end_call(uuid,public.call_status) to authenticated;



