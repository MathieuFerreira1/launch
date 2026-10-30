-- Additive proof reconciliation: ownership and original award audit never change.
create table public.reward_proof_history (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 user_card_id uuid not null, activity_id uuid, previous_evidence jsonb not null, evidence_snapshot jsonb not null,
 engine_version text not null, catalogue_revision bigint not null, created_at timestamptz not null default now(),
 foreign key(user_card_id,user_id) references public.user_cards(id,user_id) on delete cascade,
 foreign key(activity_id,user_id) references public.activities(id,user_id) on delete set null (activity_id)
);
alter table public.reward_proof_history enable row level security;
revoke all on public.reward_proof_history from public,anon,authenticated;
grant select on public.reward_proof_history to authenticated;
create policy proof_history_owner on public.reward_proof_history for select to authenticated using(user_id=(select auth.uid()));
create index cards_needing_proof on public.user_cards(user_id) where proof_status='needs_review';
create function launch_private.restore_reward_proofs(a public.activities,engine text,revision bigint) returns void
language plpgsql set search_path='' as $$
declare x public.user_cards;proof jsonb;
begin
 for x in select * from public.user_cards where user_id=a.user_id and proof_status='needs_review' and evidence_level<>'collection_unverified' loop
  if launch_private.activity_matches_card(a,x.rule_snapshot) then
   proof:=jsonb_build_object('activity_id',a.id,'category',a.category,'original_sport',a.original_sport,'started_at_utc',a.started_at_utc,'distance_m',a.distance_m,'duration_s',a.duration_s,'elevation_gain_m',a.elevation_gain_m,'evidence_level',a.evidence_level);
   insert into public.reward_proof_history(user_id,user_card_id,activity_id,previous_evidence,evidence_snapshot,engine_version,catalogue_revision) values(a.user_id,x.id,a.id,x.evidence_snapshot,proof,engine,revision);
   update public.user_cards set activity_id=a.id,evidence_level=a.evidence_level,evidence_snapshot=proof,proof_status='available' where id=x.id and user_id=a.user_id;
  end if;
 end loop;
end $$;
revoke all on function launch_private.restore_reward_proofs(public.activities,text,bigint) from public,anon,authenticated;

create or replace function public.process_reward_batch(p_limit integer default 200,p_replay boolean default false) returns jsonb
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
  update public.user_cards x set proof_status=case when exists(select 1 from public.activities proof_activity where proof_activity.id=x.activity_id and proof_activity.user_id=u and launch_private.activity_matches_card(proof_activity,x.rule_snapshot)) then 'available' else 'needs_review' end where x.user_id=u and x.evidence_level<>'collection_unverified';
 end if;
 for a in select * from public.activities where user_id=u and (j.cursor_id is null or id>j.cursor_id) and id<=j.upper_id and created_at<=j.snapshot_before order by id limit p_limit loop
  n:=n+1;j.cursor_id:=a.id;
  if not launch_private.reward_eligible(a) then continue;end if;
  perform launch_private.restore_reward_proofs(a,j.engine_version,j.catalogue_revision);
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

-- Revisit existing processing states on the next authenticated opening.
update public.reward_catalogue_state set revision=revision+1 where singleton;
