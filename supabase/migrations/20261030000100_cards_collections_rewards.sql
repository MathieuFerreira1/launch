-- Mission 04: additive personal collections, versioned server evaluation and reveals.
create table public.collection_sets (
 id text primary key check(id ~ '^[a-z0-9_]+$'), sport_slug text not null references public.sports(slug),
 title text not null, version integer not null check(version>0), active boolean not null default true,
 source_sport_labels text[] not null default '{}', sort_order integer not null default 0,
 unique(sport_slug,version)
);
create unique index collection_one_active_sport on public.collection_sets(sport_slug) where active;
create table public.card_definitions (
 id text primary key check(id ~ '^[A-Z0-9_]+$'), collection_id text not null references public.collection_sets(id),
 title text not null, rarity text not null check(rarity in ('common','rare','epic','legendary')),
 kind text not null check(kind in ('milestone','completion')), ruleset_version text not null default 'v1',
 artwork_key text not null check(artwork_key ~ '^[a-z0-9_-]+$'), active boolean not null default true,
 sort_order integer not null default 0
);
create unique index collection_one_completion on public.card_definitions(collection_id) where kind='completion';
create table public.card_unlock_rules (
 card_id text not null references public.card_definitions(id), metric text not null
 check(metric in ('distance_m','elevation_gain_m','duration_s','avg_speed_mps','max_speed_mps')),
 threshold numeric not null check(threshold>0 and threshold<=20000000), primary key(card_id,metric)
);
create table public.collection_set_cards (
 collection_id text not null references public.collection_sets(id), card_id text not null references public.card_definitions(id),
 required boolean not null default true, primary key(collection_id,card_id)
);
create table public.reward_catalogue_state (
 singleton boolean primary key default true check(singleton), revision bigint not null default 1
);
insert into public.reward_catalogue_state default values;
create table public.reward_processing_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 activity_revision bigint not null default 0, processed_revision bigint not null default -1,
 catalogue_revision bigint not null default -1
);
create table public.reward_jobs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'processing' check(status in ('processing','completed')),
 engine_version text not null default 'launch-rewards-1', activity_revision bigint not null,
 catalogue_revision bigint not null, catalogue_snapshot jsonb not null,
 cursor_id uuid, upper_id uuid, snapshot_before timestamptz not null default clock_timestamp(),
 processed integer not null default 0, total integer not null, new_awards integer not null default 0,
 created_at timestamptz not null default now(), completed_at timestamptz, unique(id,user_id)
);
create unique index one_running_reward_job on public.reward_jobs(user_id) where status='processing';
create table public.user_cards (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 card_id text not null references public.card_definitions(id), first_awarded_at timestamptz not null default now(),
 activity_id uuid, job_id uuid, engine_version text not null, catalogue_revision bigint not null,
 evidence_level text not null check(evidence_level in ('file_import','self_reported','collection_unverified')),
 scope text not null default 'personal' check(scope='personal'), competitive_eligible boolean not null default false check(not competitive_eligible),
 proof_status text not null default 'available' check(proof_status in ('available','needs_review')),
 rule_snapshot jsonb not null, evidence_snapshot jsonb not null,
 unique(user_id,card_id), unique(id,user_id),
 foreign key(activity_id,user_id) references public.activities(id,user_id) on delete set null (activity_id),
 foreign key(job_id,user_id) references public.reward_jobs(id,user_id) on delete set null (job_id)
);
create index user_cards_collection on public.user_cards(user_id,first_awarded_at desc);
create table public.achievement_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 user_card_id uuid not null, activity_id uuid, event_type text not null default 'awarded' check(event_type='awarded'),
 engine_version text not null, catalogue_revision bigint not null, rule_snapshot jsonb not null, evidence_snapshot jsonb not null,
 created_at timestamptz not null default now(), unique(user_card_id,event_type),
 foreign key(user_card_id,user_id) references public.user_cards(id,user_id) on delete cascade,
 foreign key(activity_id,user_id) references public.activities(id,user_id) on delete set null (activity_id)
);
create table public.reveal_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('initial_collection','new_achievements','new_sport_collection')),
 status text not null default 'pending' check(status in ('pending','viewing','seen')),
 position integer not null default 0 check(position>=0), card_count integer not null check(card_count>0),
 created_at timestamptz not null default now(), seen_at timestamptz, unique(id,user_id)
);
create unique index one_initial_reveal on public.reveal_sessions(user_id) where kind='initial_collection';
create index reveal_pending on public.reveal_sessions(user_id,created_at) where status<>'seen';
create table public.reveal_items (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null, user_card_id uuid not null unique, ordinal integer not null check(ordinal>=0), seen_at timestamptz,
 unique(session_id,ordinal) deferrable initially deferred,
 foreign key(session_id,user_id) references public.reveal_sessions(id,user_id) on delete cascade,
 foreign key(user_card_id,user_id) references public.user_cards(id,user_id) on delete cascade
);
create index reveal_order on public.reveal_items(session_id,ordinal);

-- Catalogue: approved Mission 04 thresholds in SI. No rules are encoded in React.
insert into public.collection_sets(id,sport_slug,title,version,sort_order) values
('running_v1','running','Running',1,1),('trail_v1','trail','Trail',1,2),
('cycling_v1','cycling','Vélo',1,3),('swimming_v1','swimming','Natation',1,4);
with seeds(id,sport,title,rarity,metric,threshold,position) as (values
('RUN_5K','running','5 km','common','distance_m',5000,1),('RUN_10K','running','10 km','rare','distance_m',10000,2),
('RUN_15K','running','15 km','rare','distance_m',15000,3),('RUN_HALF','running','21,1 km','epic','distance_m',21100,4),
('RUN_30K','running','30 km','epic','distance_m',30000,5),('RUN_MARATHON','running','42,195 km','legendary','distance_m',42195,6),
('TRAIL_5K','trail','5 km','common','distance_m',5000,1),('TRAIL_10K','trail','10 km','rare','distance_m',10000,2),
('TRAIL_UP_500','trail','500 m D+','rare','elevation_gain_m',500,3),('TRAIL_20K','trail','20 km','epic','distance_m',20000,4),
('TRAIL_UP_1500','trail','1 500 m D+','epic','elevation_gain_m',1500,5),('TRAIL_UP_3000','trail','3 000 m D+','legendary','elevation_gain_m',3000,6),
('BIKE_20K','cycling','20 km','common','distance_m',20000,1),('BIKE_50K','cycling','50 km','rare','distance_m',50000,2),
('BIKE_100K','cycling','100 km','epic','distance_m',100000,3),('BIKE_UP_1000','cycling','1 000 m D+','rare','elevation_gain_m',1000,4),
('BIKE_UP_2000','cycling','2 000 m D+','epic','elevation_gain_m',2000,5),('BIKE_200K','cycling','200 km','legendary','distance_m',200000,6),
('SWIM_500','swimming','500 m','common','distance_m',500,1),('SWIM_1K','swimming','1 km','rare','distance_m',1000,2),
('SWIM_1500','swimming','1,5 km','rare','distance_m',1500,3),('SWIM_2K','swimming','2 km','epic','distance_m',2000,4),
('SWIM_3K','swimming','3 km','epic','distance_m',3000,5),('SWIM_5K','swimming','5 km','legendary','distance_m',5000,6)
), defs as (
 insert into public.card_definitions(id,collection_id,title,rarity,kind,artwork_key,sort_order)
 select id,sport||'_v1',title,rarity,'milestone',sport,position from seeds returning id
)
insert into public.card_unlock_rules(card_id,metric,threshold) select s.id,s.metric,s.threshold from seeds s join defs d on d.id=s.id;
insert into public.collection_set_cards(collection_id,card_id) select collection_id,id from public.card_definitions where kind='milestone';
insert into public.card_definitions(id,collection_id,title,rarity,kind,artwork_key,sort_order) values
('RUN_COMPLETE','running_v1','Maître du bitume','legendary','completion','completion',7),
('TRAIL_COMPLETE','trail_v1','Maître des sentiers','legendary','completion','completion',7),
('BIKE_COMPLETE','cycling_v1','Maître de la route','legendary','completion','completion',7),
('SWIM_COMPLETE','swimming_v1','Maître des eaux','legendary','completion','completion',7);

-- Ingestion and corrections only enqueue work, never run an unbounded trigger.
create function launch_private.dirty_activity_rewards() returns trigger language plpgsql security definer set search_path='' as $$
declare u uuid;
begin
 u:=case when tg_op='DELETE' then old.user_id else new.user_id end;
 if not exists(select 1 from auth.users where id=u) then return null;end if;
 insert into public.reward_processing_state(user_id,activity_revision) values(u,1)
 on conflict(user_id) do update set activity_revision=public.reward_processing_state.activity_revision+1;
 return null;
end $$;
create trigger rewards_activity_changed after insert or update or delete on public.activities for each row execute function launch_private.dirty_activity_rewards();
create function launch_private.dirty_reward_catalogue() returns trigger language plpgsql security definer set search_path='' as $$
begin update public.reward_catalogue_state set revision=revision+1 where singleton;return null;end $$;
create trigger reward_definitions_changed after insert or update or delete on public.card_definitions for each statement execute function launch_private.dirty_reward_catalogue();
create trigger reward_rules_changed after insert or update or delete on public.card_unlock_rules for each statement execute function launch_private.dirty_reward_catalogue();
create trigger reward_collections_changed after insert or update or delete on public.collection_sets for each statement execute function launch_private.dirty_reward_catalogue();
create trigger reward_core_changed after insert or update or delete on public.collection_set_cards for each statement execute function launch_private.dirty_reward_catalogue();

create function launch_private.reward_eligible(a public.activities) returns boolean language sql stable set search_path='' as $$
 select a.status='valid' and a.category<>'unknown' and a.started_at_utc between timestamptz '1900-01-01' and now()
 and a.distance_m is not null and a.distance_m>0 and a.duration_s is not null and a.duration_s>0
 and a.distance_m/nullif(a.duration_s,0)<=50 and (a.avg_speed_mps is null or a.avg_speed_mps<=50)
 and jsonb_array_length(a.warnings)=0 and a.evidence_level in ('file_import','self_reported');
$$;
create function launch_private.activity_matches_card(a public.activities,c jsonb) returns boolean language sql stable set search_path='' as $$
 select coalesce(launch_private.reward_eligible(a)
 and (a.category=c->>'sport_slug' or (a.category='unsupported' and exists(select 1 from jsonb_array_elements_text(c->'source_sport_labels') s where lower(s)=lower(a.original_sport))))
 and jsonb_array_length(c->'rules')>0
 and not exists(select 1 from jsonb_array_elements(c->'rules') r where
 (to_jsonb(a)->>(r->>'metric')) is null or (to_jsonb(a)->>(r->>'metric'))::numeric<(r->>'threshold')::numeric),false);
$$;
create function launch_private.reward_catalogue_snapshot() returns jsonb language sql stable set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(d)||jsonb_build_object('sport_slug',s.sport_slug,'source_sport_labels',to_jsonb(s.source_sport_labels),
 'rules',coalesce((select jsonb_agg(to_jsonb(r)) from public.card_unlock_rules r where r.card_id=d.id),'[]'),
 'required_ids',coalesce((select jsonb_agg(m.card_id order by m.card_id) from public.collection_set_cards m join public.card_definitions x on x.id=m.card_id where m.collection_id=s.id and m.required and x.kind='milestone' and x.collection_id=s.id),'[]')) order by s.sort_order,d.sort_order,d.id),'[]')
 from public.card_definitions d join public.collection_sets s on s.id=d.collection_id where d.active and s.active;
$$;

create function public.process_reward_batch(p_limit integer default 200,p_replay boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); st public.reward_processing_state; j public.reward_jobs; a public.activities; c jsonb; uc uuid; count_new integer:=0; n integer:=0; cat bigint; sid uuid; complete boolean; dirty boolean; proof jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_limit is null or p_limit<1 or p_limit>250 then raise exception 'BATCH_LIMIT';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 insert into public.reward_processing_state(user_id) values(u) on conflict do nothing;
 select * into st from public.reward_processing_state where user_id=u;
 select revision into cat from public.reward_catalogue_state where singleton;
 select * into j from public.reward_jobs where user_id=u and status='processing';
 if j.id is null then
  if not p_replay and st.processed_revision=st.activity_revision and st.catalogue_revision=cat then
   return jsonb_build_object('status','ready','processed',0,'total',0,'new_awards',0,'job_id',null);
  end if;
  insert into public.reward_jobs(user_id,activity_revision,catalogue_revision,catalogue_snapshot,upper_id,total)
  select u,st.activity_revision,cat,launch_private.reward_catalogue_snapshot(),(select id from public.activities where user_id=u order by id desc limit 1),(select count(*) from public.activities where user_id=u)
  returning * into j;
 end if;
 for a in select * from public.activities where user_id=u and (j.cursor_id is null or id>j.cursor_id) and id<=j.upper_id and created_at<=j.snapshot_before order by id limit p_limit loop
  n:=n+1;j.cursor_id:=a.id;
  if not launch_private.reward_eligible(a) then continue;end if;
  for c in select value from jsonb_array_elements(j.catalogue_snapshot) where value->>'kind'='milestone'
   and (value->>'sport_slug'=a.category or (a.category='unsupported' and exists(select 1 from jsonb_array_elements_text(value->'source_sport_labels') s where lower(s)=lower(a.original_sport))))
   and not exists(select 1 from public.user_cards x where x.user_id=u and x.card_id=value->>'id') loop
   if launch_private.activity_matches_card(a,c) then
    uc:=null;proof:=jsonb_build_object('activity_id',a.id,'category',a.category,'original_sport',a.original_sport,'started_at_utc',a.started_at_utc,'distance_m',a.distance_m,'duration_s',a.duration_s,'elevation_gain_m',a.elevation_gain_m,'evidence_level',a.evidence_level);
    insert into public.user_cards(user_id,card_id,activity_id,job_id,engine_version,catalogue_revision,evidence_level,rule_snapshot,evidence_snapshot)
    values(u,c->>'id',a.id,j.id,j.engine_version,j.catalogue_revision,a.evidence_level,c,proof) on conflict(user_id,card_id) do nothing returning id into uc;
    if uc is not null then
     count_new:=count_new+1;
     insert into public.achievement_events(user_id,user_card_id,activity_id,engine_version,catalogue_revision,rule_snapshot,evidence_snapshot) values(u,uc,a.id,j.engine_version,j.catalogue_revision,c,proof);
    end if;
   end if;
  end loop;
 end loop;
 update public.reward_jobs set cursor_id=j.cursor_id,processed=processed+n,new_awards=new_awards+count_new where id=j.id returning * into j;
 complete:=not exists(select 1 from public.activities where user_id=u and (j.cursor_id is null or id>j.cursor_id) and id<=j.upper_id and created_at<=j.snapshot_before);
 if complete then
  -- Preserve earned souvenirs after correction/deletion; never silently revoke.
  update public.user_cards x set proof_status=case when exists(select 1 from public.activities proof_activity where proof_activity.id=x.activity_id and proof_activity.user_id=u and launch_private.activity_matches_card(proof_activity,x.rule_snapshot)) then 'available' else 'needs_review' end where x.user_id=u and x.evidence_level<>'collection_unverified';
  for c in select value from jsonb_array_elements(j.catalogue_snapshot) where value->>'kind'='completion' loop
   if jsonb_array_length(c->'required_ids')>0 and not exists(select 1 from jsonb_array_elements_text(c->'required_ids') r where not exists(select 1 from public.user_cards x where x.user_id=u and x.card_id=r and x.proof_status='available')) then
    uc:=null;proof:=jsonb_build_object('required_card_ids',c->'required_ids','scope','personal','certified',false);
    insert into public.user_cards(user_id,card_id,job_id,engine_version,catalogue_revision,evidence_level,rule_snapshot,evidence_snapshot) values(u,c->>'id',j.id,j.engine_version,j.catalogue_revision,'collection_unverified',c,proof) on conflict(user_id,card_id) do nothing returning id into uc;
    if uc is not null then
     count_new:=count_new+1;j.new_awards:=j.new_awards+1;
     insert into public.achievement_events(user_id,user_card_id,engine_version,catalogue_revision,rule_snapshot,evidence_snapshot) values(u,uc,j.engine_version,j.catalogue_revision,c,proof);
    end if;
   end if;
  end loop;
  update public.user_cards x set proof_status=case when not exists(select 1 from jsonb_array_elements_text(x.rule_snapshot->'required_ids') r where not exists(select 1 from public.user_cards k where k.user_id=u and k.card_id=r and k.proof_status='available')) then 'available' else 'needs_review' end where x.user_id=u and x.evidence_level='collection_unverified';
  if j.new_awards>0 then
   select id into sid from public.reveal_sessions where user_id=u and kind='initial_collection' and status='pending';
   if sid is null then
    insert into public.reveal_sessions(user_id,kind,card_count) values(u,case when exists(select 1 from public.reveal_sessions where user_id=u and kind='initial_collection') then 'new_achievements' else 'initial_collection' end,j.new_awards) returning id into sid;
   end if;
   insert into public.reveal_items(user_id,session_id,user_card_id,ordinal) select u,sid,id,0 from public.user_cards where user_id=u and job_id=j.id on conflict(user_card_id) do nothing;
   with ranked as (select i.id,row_number() over(order by case d.rarity when 'legendary' then 4 when 'epic' then 3 when 'rare' then 2 else 1 end desc,d.collection_id,d.sort_order,d.id)-1 as pos from public.reveal_items i join public.user_cards x on x.id=i.user_card_id join public.card_definitions d on d.id=x.card_id where i.session_id=sid)
   update public.reveal_items i set ordinal=r.pos from ranked r where i.id=r.id;
   update public.reveal_sessions set card_count=(select count(*) from public.reveal_items where session_id=sid) where id=sid;
  end if;
  update public.reward_jobs set status='completed',completed_at=clock_timestamp(),new_awards=j.new_awards where id=j.id;
  update public.reward_processing_state set processed_revision=j.activity_revision,catalogue_revision=j.catalogue_revision where user_id=u;
 end if;
 select activity_revision<>j.activity_revision into dirty from public.reward_processing_state where user_id=u;
 dirty:=dirty or (select revision<>j.catalogue_revision from public.reward_catalogue_state where singleton);
 return jsonb_build_object('status',case when complete and not dirty then 'ready' else 'processing' end,'job_id',j.id,'processed',j.processed,'total',j.total,'new_awards',j.new_awards);
end $$;

create function public.advance_reveal(p_session uuid,p_position integer default 0,p_finish boolean default false) returns public.reveal_sessions
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); s public.reveal_sessions;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 select * into s from public.reveal_sessions where id=p_session and user_id=u for update;
 if not found then raise exception 'REVEAL_NOT_FOUND';end if;
 if s.status='seen' then return s;end if;
 if p_position is null or p_position<0 or p_position>s.card_count then raise exception 'POSITION_INVALID';end if;
 update public.reveal_sessions set position=case when p_finish then card_count else greatest(position,p_position) end,
 status=case when p_finish or greatest(position,p_position)=card_count then 'seen' else 'viewing' end,
 seen_at=case when p_finish or greatest(position,p_position)=card_count then clock_timestamp() else null end where id=s.id returning * into s;
 update public.reveal_items set seen_at=coalesce(seen_at,clock_timestamp()) where session_id=s.id and user_id=u and ordinal<s.position;
 return s;
end $$;

-- Explicit privileges and owner isolation. Catalogue writes are admin-only.
do $$ declare t text; begin
 foreach t in array array['collection_sets','card_definitions','card_unlock_rules','collection_set_cards','reward_catalogue_state','reward_processing_state','reward_jobs','user_cards','achievement_events','reveal_sessions','reveal_items'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
 foreach t in array array['collection_sets','card_definitions','card_unlock_rules','collection_set_cards'] loop
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy catalogue_read on public.%I for select to authenticated using(true)',t);
 end loop;
 foreach t in array array['reward_processing_state','reward_jobs','user_cards','achievement_events','reveal_sessions','reveal_items'] loop
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy owner_read on public.%I for select to authenticated using(user_id=(select auth.uid()))',t);
 end loop;
end $$;
revoke all on function launch_private.dirty_activity_rewards(),launch_private.dirty_reward_catalogue(),launch_private.reward_eligible(public.activities),launch_private.activity_matches_card(public.activities,jsonb),launch_private.reward_catalogue_snapshot() from public,anon,authenticated;
revoke all on function public.process_reward_batch(integer,boolean),public.advance_reveal(uuid,integer,boolean) from public,anon;
grant execute on function public.process_reward_batch(integer,boolean),public.advance_reveal(uuid,integer,boolean) to authenticated;

create function public.get_collection_data() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'collections',coalesce((select jsonb_agg(s order by sort_order,id) from public.collection_sets s where active or exists(select 1 from public.user_cards x join public.card_definitions d on d.id=x.card_id where d.collection_id=s.id and x.user_id=auth.uid())),'[]'),
 'definitions',coalesce((select jsonb_agg(d order by collection_id,sort_order,id) from public.card_definitions d where active or exists(select 1 from public.user_cards x where x.card_id=d.id and x.user_id=auth.uid())),'[]'),
 'rules',coalesce((select jsonb_agg(r order by card_id,metric) from public.card_unlock_rules r),'[]'),
 'core',coalesce((select jsonb_agg(m order by collection_id,card_id) from public.collection_set_cards m),'[]'),
 'owned',coalesce((select jsonb_agg(x order by first_awarded_at desc,id) from public.user_cards x where user_id=auth.uid()),'[]'),
 'pending',coalesce((select jsonb_agg(s order by created_at,id) from (select * from public.reveal_sessions where user_id=auth.uid() and status<>'seen' order by created_at,id limit 20) s),'[]'),
 'activity_count',(select count(*) from public.activities where user_id=auth.uid()));
$$;
revoke all on function public.get_collection_data() from public,anon;
grant execute on function public.get_collection_data() to authenticated;
