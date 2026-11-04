-- Only the application server may access these tables and RPCs. No browser DB keys.
create table public.build_limits (
 singleton boolean primary key default true check (singleton),
 enabled boolean not null default false,
 daily_cap integer not null default 20 check (daily_cap between 1 and 100),
 ip_daily_cap integer not null default 3 check (ip_daily_cap between 1 and 10),
 concurrency_cap integer not null default 2 check (concurrency_cap between 1 and 10),
 daily_budget_cents integer not null default 0 check (daily_budget_cents between 0 and 100000),
 reservation_cents integer not null default 500 check (reservation_cents >= 500)
);
insert into public.build_limits(singleton) values(true);
create table public.builds (
 id uuid primary key, slug text unique not null, prompt text not null check (char_length(prompt) between 10 and 200),
 status text not null check (status in ('running','completed','partial','failed')),
 started_at timestamptz not null default now(), duration_ms integer not null default 0,
 artifacts jsonb not null, featured boolean not null default false, schema_version integer not null default 1,
 ip_hash text not null, request_key uuid not null, access_hash text not null,
 reserved_cents integer not null, expires_at timestamptz not null default now() + interval '10 minutes',
 unique(request_key)
);
create index builds_daily on public.builds(started_at);
create index builds_ip_daily on public.builds(ip_hash, started_at);
create index builds_active on public.builds(expires_at) where status='running';
create table public.build_events (
 build_id uuid not null references public.builds(id) on delete cascade,
 seq integer not null check (seq between 1 and 256),
 t_ms integer not null check (t_ms between 0 and 3600000),
 agent text not null check (agent in ('Brief','Brand','Finance','Website','Pitch','System')),
 type text not null, payload jsonb not null check (octet_length(payload::text) <= 65536),
 primary key(build_id,seq)
);
alter table public.build_limits enable row level security;
alter table public.builds enable row level security;
alter table public.build_events enable row level security;
revoke all on public.build_limits,public.builds,public.build_events from public,anon,authenticated;
grant all on public.build_limits,public.builds,public.build_events to service_role;

-- Same database lock serializes every admission, including across serverless instances.
-- Failures count toward the budget; reservations are never refunded automatically.
-- Request keys are global: a lost-response retry after a network/IP change must not pay twice.
create function public.reserve_build(p_id uuid,p_prompt text,p_ip_hash text,p_request_key uuid,p_access_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare lim public.build_limits; existing public.builds; created public.builds;
 total bigint; ip_total bigint; active bigint; spent bigint;
begin
 select * into lim from public.build_limits where singleton=true for update;
 select * into existing from public.builds where request_key=p_request_key;
 if found then
  if existing.prompt<>p_prompt then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return jsonb_build_object('created',false,'record',to_jsonb(existing)-array['ip_hash','request_key','access_hash','reserved_cents','expires_at']);
 end if;
 if not lim.enabled then raise exception 'GENERATION_DISABLED'; end if;
 perform public.expire_builds();
 select count(*),count(*) filter(where ip_hash=p_ip_hash),coalesce(sum(reserved_cents),0)
 into total,ip_total,spent from public.builds where started_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
 select count(*) into active from public.builds where status='running';
 if total>=lim.daily_cap or ip_total>=lim.ip_daily_cap or active>=lim.concurrency_cap or spent+lim.reservation_cents>lim.daily_budget_cents then
  raise exception 'BUILD_LIMIT_REACHED';
 end if;
 insert into public.builds(id,slug,prompt,status,artifacts,ip_hash,request_key,access_hash,reserved_cents)
 values(p_id,p_id::text,p_prompt,'running','{"brief":null,"brand":{"core":null,"logo":null},"finance":null,"website":{"setup":null,"sections":[]},"pitch":{"slides":[]}}',p_ip_hash,p_request_key,p_access_hash,lim.reservation_cents)
 returning * into created;
 return jsonb_build_object('created',true,'record',to_jsonb(created)-array['ip_hash','request_key','access_hash','reserved_cents','expires_at']);
end $$;

-- Lease is longer than the hard generation and platform deadlines. Expiration is honest.
create function public.expire_builds() returns integer language plpgsql security invoker set search_path='' as $$
declare row public.builds; n integer:=0; next_seq integer; elapsed integer;
begin
 for row in select * from public.builds where status='running' and expires_at<now() for update skip locked loop
  select coalesce(max(seq),0)+1 into next_seq from public.build_events where build_id=row.id;
  elapsed:=least(3600000,greatest(0,extract(epoch from now()-row.started_at)*1000))::integer;
  if next_seq<=256 then
   insert into public.build_events values(row.id,next_seq,elapsed,'System','build.completed','{"status":"failed","message":"Build exceeded its execution window. Saved work is available."}');
  end if;
  update public.builds set status='failed',duration_ms=elapsed where id=row.id;
  n:=n+1;
 end loop;
 return n;
end $$;
revoke execute on function public.reserve_build(uuid,text,text,uuid,text),public.expire_builds() from public,anon,authenticated;
grant execute on function public.reserve_build(uuid,text,text,uuid,text),public.expire_builds() to service_role;

-- The snapshot and its terminal event commit together. Viewers cannot observe success
-- that was not saved, nor a finalized snapshot with a missing terminal event.
create function public.finish_build(p_id uuid,p_status text,p_duration_ms integer,p_artifacts jsonb,p_event jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare current_status text; next_seq integer; event_count integer; last_time integer;
begin
 select status into current_status from public.builds where id=p_id for update;
 if not found then raise exception 'BUILD_NOT_FOUND'; end if;
 if current_status<>'running' then raise exception 'BUILD_ALREADY_FINISHED'; end if;
 if p_status is null or p_status not in ('completed','partial','failed')
  or p_duration_ms is null or p_duration_ms not between 0 and 3600000
  or jsonb_typeof(p_artifacts) is distinct from 'object'
  or jsonb_typeof(p_event) is distinct from 'object'
  or p_event->>'type' is distinct from 'build.completed'
  or p_event->>'agent' is distinct from 'System'
  or p_event->>'build_id' is distinct from p_id::text
  or p_event->'payload'->>'status' is distinct from p_status
  or p_event->'t_ms' is distinct from to_jsonb(p_duration_ms)
  or p_event->'payload'->'duration_ms' is distinct from to_jsonb(p_duration_ms)
  or jsonb_typeof(p_event->'seq') is distinct from 'number'
  or (p_event->>'seq' ~ '^[0-9]{1,3}$') is not true then
  raise exception 'INVALID_TERMINAL_EVENT';
 end if;
 select coalesce(max(seq),0)+1,count(*),coalesce(max(t_ms),0)
 into next_seq,event_count,last_time from public.build_events where build_id=p_id;
 if (p_event->>'seq')::integer<>next_seq or next_seq>256 or event_count<>next_seq-1 or p_duration_ms<last_time then
  raise exception 'INVALID_TERMINAL_EVENT';
 end if;
 insert into public.build_events(build_id,seq,t_ms,agent,type,payload)
 values(p_id,(p_event->>'seq')::integer,(p_event->>'t_ms')::integer,'System','build.completed',p_event->'payload');
 update public.builds set status=p_status,duration_ms=p_duration_ms,artifacts=p_artifacts where id=p_id;
end $$;
revoke execute on function public.finish_build(uuid,text,integer,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.finish_build(uuid,text,integer,jsonb,jsonb) to service_role;
