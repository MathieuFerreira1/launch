-- Additive, launch-dev only. All client writes pass bounded, authenticated RPCs.
create table public.import_batches (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'committing' check(status in ('committing','partial','completed')),
 total_items integer not null check(total_items between 0 and 10000),
 retain_sources boolean not null default false, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique(id,user_id)
);
create table public.activity_files (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'), original_name text not null check(char_length(original_name)<=160),
 format text not null check(format in ('fit','gpx','tcx')), bytes bigint not null check(bytes between 1 and 33554432),
 retained boolean not null default false, storage_path text not null, created_at timestamptz not null default now(),
 unique(user_id,sha256), unique(id,user_id), unique(storage_path)
);
create table public.activities (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 source_key text not null check(char_length(source_key)<=100), title text not null check(char_length(title) between 1 and 160),
 original_sport text not null check(char_length(original_sport)<=120),
 category text not null check(category in ('running','trail','cycling','swimming','unsupported','unknown')),
 started_at_utc timestamptz check(isfinite(started_at_utc)), distance_m double precision check(distance_m between 0 and 20000000),
 duration_s double precision check(duration_s between 0 and 31536000), elevation_gain_m double precision check(elevation_gain_m between 0 and 1000000),
 avg_speed_mps double precision check(avg_speed_mps between 0 and 150), max_speed_mps double precision check(max_speed_mps between 0 and 150),
 status text not null check(status in ('valid','needs_review')), evidence_level text not null check(evidence_level in ('file_import','self_reported')),
 extra jsonb not null default '{}' check(jsonb_typeof(extra)='object' and octet_length(extra::text)<=8192),
 warnings jsonb not null default '[]' check(jsonb_typeof(warnings)='array' and jsonb_array_length(warnings)<=20),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,source_key), unique(id,user_id)
);
create index activities_history on public.activities(user_id,started_at_utc desc,id);
create index activities_category on public.activities(user_id,category);
create table public.activity_file_links (
 user_id uuid not null references auth.users(id) on delete cascade, file_id uuid not null, activity_id uuid not null,
 source_key text not null, primary key(user_id,source_key),
 foreign key(file_id,user_id) references public.activity_files(id,user_id),
 foreign key(activity_id,user_id) references public.activities(id,user_id)
);
create table public.import_items (
 batch_id uuid not null, user_id uuid not null, source_key text not null check(char_length(source_key)<=100),
 activity_id uuid, state text not null check(state in ('committed','duplicate_exact','linked','skipped')),
 primary key(batch_id,source_key), foreign key(batch_id,user_id) references public.import_batches(id,user_id),
 foreign key(activity_id,user_id) references public.activities(id,user_id)
);
create table public.import_errors (
 batch_id uuid not null, user_id uuid not null, item_key text not null check(char_length(item_key)<=100),
 code text not null check(code ~ '^[A-Z_]{1,100}$'), file_name text not null check(char_length(file_name)<=160),
 created_at timestamptz not null default now(), primary key(batch_id,item_key),
 foreign key(batch_id,user_id) references public.import_batches(id,user_id)
);

alter table public.import_batches enable row level security;
alter table public.activity_files enable row level security;
alter table public.activities enable row level security;
alter table public.activity_file_links enable row level security;
alter table public.import_items enable row level security;
alter table public.import_errors enable row level security;
revoke all on public.import_batches,public.activity_files,public.activities,public.activity_file_links,public.import_items,public.import_errors from public,anon,authenticated;
grant select on public.import_batches,public.activity_files,public.activities,public.activity_file_links,public.import_items,public.import_errors to authenticated;
create policy batches_read_own on public.import_batches for select to authenticated using(user_id=(select auth.uid()));
create policy files_read_own on public.activity_files for select to authenticated using(user_id=(select auth.uid()));
create policy activities_read_own on public.activities for select to authenticated using(user_id=(select auth.uid()));
create policy links_read_own on public.activity_file_links for select to authenticated using(user_id=(select auth.uid()));
create policy items_read_own on public.import_items for select to authenticated using(user_id=(select auth.uid()));
create policy errors_read_own on public.import_errors for select to authenticated using(user_id=(select auth.uid()));

create function public.begin_activity_import(p_id uuid,p_total integer,p_retain boolean) returns public.import_batches
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); b public.import_batches;
begin
 if u is null then raise exception 'AUTH_REQUIRED'; end if;
 insert into public.import_batches(id,user_id,total_items,retain_sources) values(p_id,u,p_total,p_retain) on conflict(id) do nothing;
 select * into b from public.import_batches where id=p_id and user_id=u;
 if b.id is null or b.total_items<>p_total or b.retain_sources<>p_retain then raise exception 'BATCH_MISMATCH'; end if;
 return b;
end $$;
create function public.reserve_activity_file(p_hash text,p_name text,p_format text,p_bytes bigint,p_batch uuid) returns public.activity_files
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); f public.activity_files; retain boolean;
begin
 if u is null then raise exception 'AUTH_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 select retain_sources into retain from public.import_batches where id=p_batch and user_id=u;
 if not found then raise exception 'BATCH_NOT_FOUND'; end if;
 select * into f from public.activity_files where user_id=u and sha256=p_hash;
 if retain and (f.id is null or not f.retained) and (select coalesce(sum(bytes),0) from public.activity_files where user_id=u and retained)+p_bytes>1073741824 then raise exception 'SOURCE_QUOTA_EXCEEDED'; end if;
 insert into public.activity_files(user_id,sha256,original_name,format,bytes,retained,storage_path)
 values(u,p_hash,p_name,p_format,p_bytes,retain,u::text||'/'||p_hash)
 on conflict(user_id,sha256) do update set retained=public.activity_files.retained or excluded.retained
 returning * into f;
 if f.bytes<>p_bytes or f.format<>p_format then raise exception 'SOURCE_MISMATCH'; end if;
 return f;
end $$;

-- Server-side shape and plausibility validation, independent of browser checks.
create function launch_private.insert_activity(u uuid,k text,v jsonb,evidence text) returns uuid
language plpgsql set search_path='' as $$
declare result uuid; s timestamptz; d double precision; t double precision; c text; state text;
begin
 if octet_length(v::text)>16384 then raise exception 'ITEM_TOO_LARGE'; end if;
 s:=(v->>'started_at_utc')::timestamptz;d:=(v->>'distance_m')::double precision;t:=(v->>'duration_s')::double precision;c:=v->>'category';
 state:=case when s is null or s>now()+interval '1 day' or s<timestamptz '1900-01-01' or d is null or t is null or t<=0 or c='unknown' or (t>0 and d/t>50) or jsonb_array_length(coalesce(v->'warnings','[]'))>0 then 'needs_review' else 'valid' end;
 insert into public.activities(user_id,source_key,title,original_sport,category,started_at_utc,distance_m,duration_s,elevation_gain_m,avg_speed_mps,max_speed_mps,status,evidence_level,extra,warnings)
 values(u,k,v->>'title',coalesce(v->>'original_sport',''),c,s,d,t,(v->>'elevation_gain_m')::double precision,(v->>'avg_speed_mps')::double precision,(v->>'max_speed_mps')::double precision,state,evidence,coalesce(v->'extra','{}'),coalesce(v->'warnings','[]')) returning id into result;
 return result;
end $$;
revoke all on function launch_private.insert_activity(uuid,text,jsonb,text) from public,anon,authenticated;

create function public.commit_activity_import(p_batch uuid,p_items jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); v jsonb; k text; f public.activity_files; a uuid; st text; match_exists boolean;
begin
 if u is null then raise exception 'AUTH_REQUIRED'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>25 then raise exception 'BATCH_LIMIT'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 if not exists(select 1 from public.import_batches where id=p_batch and user_id=u) then raise exception 'BATCH_NOT_FOUND'; end if;
 for v in select * from jsonb_array_elements(p_items) loop
 k:=v->>'key';if exists(select 1 from public.import_items where batch_id=p_batch and source_key=k) then continue; end if;
 a:=null; st:='committed';
 if v->>'decision'='skip' then st:='skipped';
 else
 select * into f from public.activity_files where user_id=u and sha256=v->>'fileHash';
 if f.id is null or k !~ ('^'||f.sha256||':[0-9]{1,3}$') then raise exception 'SOURCE_NOT_FOUND'; end if;
 if f.retained and not exists(select 1 from storage.objects where bucket_id='sport-sources' and name=f.storage_path) then raise exception 'SOURCE_UPLOAD_MISSING'; end if;
 select activity_id into a from public.activity_file_links where user_id=u and source_key=k;
 if a is not null then st:='duplicate_exact';
 elsif coalesce(v->>'linkId','')<>'' or coalesce(v->>'linkKey','')<>'' then
 if coalesce(v->>'linkId','')<>'' then a:=(v->>'linkId')::uuid; else select activity_id into a from public.activity_file_links where user_id=u and source_key=v->>'linkKey'; end if;
 if a is null or not exists(select 1 from public.activities where id=a and user_id=u) then raise exception 'ACTIVITY_NOT_FOUND'; end if;st:='linked';
 else
 select exists(select 1 from public.activities x where x.user_id=u and x.category=v->>'category'
 and (x.category<>'unsupported' or lower(x.original_sport)=lower(v->>'original_sport'))
 and abs(extract(epoch from (x.started_at_utc-(v->>'started_at_utc')::timestamptz)))<=120
 and abs(x.distance_m-(v->>'distance_m')::double precision)<=greatest(100,(v->>'distance_m')::double precision*.02)
 and abs(x.duration_s-(v->>'duration_s')::double precision)<=greatest(60,(v->>'duration_s')::double precision*.02)) into match_exists;
 if match_exists and coalesce(v->>'decision','')<>'keep' then raise exception 'DUPLICATE_REVIEW_REQUIRED'; end if;
 a:=launch_private.insert_activity(u,k,v,'file_import');
 end if;
 insert into public.activity_file_links(user_id,file_id,activity_id,source_key) values(u,f.id,a,k) on conflict(user_id,source_key) do nothing;
 end if;
 insert into public.import_items(batch_id,user_id,source_key,activity_id,state) values(p_batch,u,k,a,st);
 end loop;
 update public.import_batches set updated_at=now(),status='partial' where id=p_batch and user_id=u;
 return jsonb_array_length(p_items);
end $$;
create function public.record_import_errors(p_batch uuid,p_errors jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); v jsonb;
begin
 if u is null or not exists(select 1 from public.import_batches where id=p_batch and user_id=u) then raise exception 'BATCH_NOT_FOUND'; end if;
 if jsonb_typeof(p_errors)<>'array' or jsonb_array_length(p_errors)>25 then raise exception 'BATCH_LIMIT'; end if;
 for v in select * from jsonb_array_elements(p_errors) loop
 insert into public.import_errors(batch_id,user_id,item_key,code,file_name) values(p_batch,u,v->>'key',v->>'code',v->>'name') on conflict do nothing;
 end loop;
end $$;
create function public.finish_activity_import(p_batch uuid) returns text
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); n integer; t integer; s text;
begin
 select total_items into t from public.import_batches where id=p_batch and user_id=u;
 if not found then raise exception 'BATCH_NOT_FOUND'; end if;
 select (select count(*) from public.import_items where batch_id=p_batch)+(select count(*) from public.import_errors where batch_id=p_batch) into n;
 s:=case when n>=t then 'completed' else 'partial' end;
 update public.import_batches set status=s,updated_at=now() where id=p_batch and user_id=u;return s;
end $$;
create function public.save_manual_activity(p_id uuid,p_activity jsonb,p_keep_duplicate boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); a uuid;
begin
 if u is null then raise exception 'AUTH_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 select id into a from public.activities where user_id=u and source_key='manual:'||p_id::text;
 if a is not null then return a; end if;
 if not p_keep_duplicate and exists(select 1 from public.activities x where x.user_id=u and x.category=p_activity->>'category' and abs(extract(epoch from (x.started_at_utc-(p_activity->>'started_at_utc')::timestamptz)))<=120 and abs(x.distance_m-(p_activity->>'distance_m')::double precision)<=greatest(100,(p_activity->>'distance_m')::double precision*.02)) then raise exception 'DUPLICATE_REVIEW_REQUIRED'; end if;
 return launch_private.insert_activity(u,'manual:'||p_id::text,p_activity,'self_reported');
end $$;
create function public.correct_activity_sport(p_id uuid,p_category text) returns void
language plpgsql security definer set search_path='' as $$
begin
 update public.activities set category=p_category,updated_at=now(),extra=extra||jsonb_build_object('classification_source','user'),status=case when started_at_utc is null or distance_m is null or duration_s is null or duration_s<=0 or p_category='unknown' or exists(select 1 from jsonb_array_elements(warnings) w where w<>'"SPORT_A_PRECISER"'::jsonb) or (duration_s>0 and distance_m/duration_s>50) then 'needs_review' else 'valid' end,
 warnings=coalesce((select jsonb_agg(w) from jsonb_array_elements(warnings) w where w<>'"SPORT_A_PRECISER"'::jsonb),'[]')
 where id=p_id and user_id=auth.uid();
 if not found then raise exception 'ACTIVITY_NOT_FOUND'; end if;
end $$;
create function public.forget_activity_source(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.activity_files f join storage.objects o on o.bucket_id='sport-sources' and o.name=f.storage_path where f.id=p_id and f.user_id=auth.uid()) then raise exception 'DELETE_SOURCE_FIRST'; end if;
 update public.activity_files set retained=false where id=p_id and user_id=auth.uid();if not found then raise exception 'SOURCE_NOT_FOUND'; end if;
end $$;

revoke all on function public.begin_activity_import(uuid,integer,boolean),public.reserve_activity_file(text,text,text,bigint,uuid),public.commit_activity_import(uuid,jsonb),public.record_import_errors(uuid,jsonb),public.finish_activity_import(uuid),public.save_manual_activity(uuid,jsonb,boolean),public.correct_activity_sport(uuid,text),public.forget_activity_source(uuid) from public,anon;
grant execute on function public.begin_activity_import(uuid,integer,boolean),public.reserve_activity_file(text,text,text,bigint,uuid),public.commit_activity_import(uuid,jsonb),public.record_import_errors(uuid,jsonb),public.finish_activity_import(uuid),public.save_manual_activity(uuid,jsonb,boolean),public.correct_activity_sport(uuid,text),public.forget_activity_source(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('sport-sources','sport-sources',false,33554432,array['application/octet-stream']);
create policy sport_sources_read on storage.objects for select to authenticated using(bucket_id='sport-sources' and exists(select 1 from public.activity_files f where f.storage_path=name and f.user_id=(select auth.uid()) and f.retained));
create policy sport_sources_insert on storage.objects for insert to authenticated with check(bucket_id='sport-sources' and exists(select 1 from public.activity_files f where f.storage_path=name and f.user_id=(select auth.uid()) and f.retained and f.bytes=(metadata->>'size')::bigint));
create policy sport_sources_delete on storage.objects for delete to authenticated using(bucket_id='sport-sources' and exists(select 1 from public.activity_files f where f.storage_path=name and f.user_id=(select auth.uid())));
-- No update policy: immutable, content-addressed originals. No public URLs.
create view public.reward_activity_inputs with(security_invoker=true) as
select id,user_id,category,original_sport,started_at_utc,distance_m,duration_s,elevation_gain_m,avg_speed_mps,max_speed_mps,evidence_level,extra,updated_at
from public.activities where status='valid' and category in ('running','trail','cycling','swimming');
revoke all on public.reward_activity_inputs from public,anon;
grant select on public.reward_activity_inputs to authenticated;

create function public.find_activity_duplicates(p_items jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid(); result jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>100 then raise exception 'BATCH_LIMIT'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('key',v->>'key','exactId',(select activity_id from public.activity_file_links where user_id=u and source_key=v->>'key'),
 'matches',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'title',x.title)) from (select id,title from public.activities a where a.user_id=u and a.category=v->>'category'
 and (a.category<>'unsupported' or lower(a.original_sport)=lower(v->>'original_sport'))
 and abs(extract(epoch from (a.started_at_utc-(v->>'started_at_utc')::timestamptz)))<=120
 and abs(a.distance_m-(v->>'distance_m')::double precision)<=greatest(100,(v->>'distance_m')::double precision*.02)
 and abs(a.duration_s-(v->>'duration_s')::double precision)<=greatest(60,(v->>'duration_s')::double precision*.02) limit 5) x),'[]'))),'[]') into result from jsonb_array_elements(p_items) v;
 return result;
end $$;
revoke all on function public.find_activity_duplicates(jsonb) from public,anon;
grant execute on function public.find_activity_duplicates(jsonb) to authenticated;
