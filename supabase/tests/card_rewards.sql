begin;
insert into auth.users(id,raw_user_meta_data) values
('60000000-0000-0000-0000-000000000001','{}'),('60000000-0000-0000-0000-000000000002','{}'),('60000000-0000-0000-0000-000000000003','{}');
insert into public.activities(user_id,source_key,title,original_sport,category,started_at_utc,distance_m,duration_s,elevation_gain_m,status,evidence_level) values
('60000000-0000-0000-0000-000000000001','synthetic:run','Synthetic marathon','Running','running','2026-01-01',42195,15000,0,'valid','file_import'),
('60000000-0000-0000-0000-000000000001','synthetic:trail','Synthetic trail','Trail','trail','2026-01-02',20000,12000,null,'valid','file_import'),
('60000000-0000-0000-0000-000000000001','synthetic:bike','Synthetic bike','Cycling','cycling','2026-01-03',200000,30000,2000,'valid','self_reported'),
('60000000-0000-0000-0000-000000000001','synthetic:swim','Synthetic swim','Swimming','swimming','2026-01-04',5000,8000,0,'valid','file_import'),
('60000000-0000-0000-0000-000000000001','synthetic:ski','Synthetic ski','Ski','unsupported','2026-01-05',5000,4000,0,'valid','file_import'),
('60000000-0000-0000-0000-000000000001','synthetic:unknown','Synthetic ambiguous','Trail','unknown','2026-01-02',50000,12000,3000,'valid','file_import'),
('60000000-0000-0000-0000-000000000001','synthetic:zero','Synthetic zero duration','Trail','trail','2026-01-02',50000,0,3000,'valid','file_import'),
('60000000-0000-0000-0000-000000000001','synthetic:speed','Synthetic incoherent','Trail','trail','2026-01-02',50000,1,3000,'valid','file_import'),
('60000000-0000-0000-0000-000000000001','synthetic:missing','Synthetic missing date','Trail','trail',null,50000,12000,3000,'valid','file_import'),
('60000000-0000-0000-0000-000000000001','synthetic:distance','Synthetic missing distance','Trail','trail','2026-01-02',null,12000,3000,'valid','file_import'),
('60000000-0000-0000-0000-000000000001','synthetic:review','Synthetic incomplete','Trail','trail','2026-01-02',50000,12000,3000,'needs_review','file_import'),
('60000000-0000-0000-0000-000000000001','synthetic:future','Synthetic future','Trail','trail','2099-01-02',50000,12000,3000,'valid','file_import'),
('60000000-0000-0000-0000-000000000002','synthetic:below','Synthetic below marathon','Running','running','2026-01-01',42194.99,15000,0,'valid','self_reported');
set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000001',true);
do $$ declare r jsonb; i integer; s uuid; a uuid;begin
 if (select count(*) from public.card_definitions)<>28 then raise exception 'Catalogue must contain 24 milestones and 4 completions';end if;
 r:=public.process_reward_batch(2);
 if r->>'status'<>'processing' or (r->>'processed')::int<>2 then raise exception 'Bounded batch/cursor failed';end if;
 for i in 1..100 loop r:=public.process_reward_batch(2);exit when r->>'status'='ready';end loop;
 if r->>'status'<>'ready' then raise exception 'Resume did not finish';end if;
 if (select count(*) from public.user_cards)<>24 then raise exception 'Expected 24 cards; absent elevation/invalid activities must not qualify: %',(select count(*) from public.user_cards);end if;
 if exists(select 1 from public.user_cards where card_id in ('TRAIL_UP_500','TRAIL_UP_1500','TRAIL_UP_3000','TRAIL_COMPLETE')) then raise exception 'Missing/ambiguous metrics awarded a card';end if;
 if (select count(*) from public.user_cards where card_id like 'RUN_%')<>7 then raise exception 'Single activity must unlock all 6 inclusive thresholds plus completion';end if;
 if exists(select 1 from public.user_cards where competitive_eligible or scope<>'personal') then raise exception 'Personal cards marked certified';end if;
 if not exists(select 1 from public.user_cards where evidence_level='self_reported') then raise exception 'Manual provenance lost';end if;
 if (select count(*) from public.achievement_events)<>24 or (select count(*) from public.reveal_items)<>24 then raise exception 'Award audit/reveal items missing';end if;
 if (select count(*) from public.reveal_sessions)<>1 or (select card_count from public.reveal_sessions)<>24 then raise exception 'Initial reveal must be grouped';end if;
 perform public.process_reward_batch(250,true);perform public.process_reward_batch(250,true);
 if (select count(*) from public.user_cards)<>24 or (select count(*) from public.reveal_sessions)<>1 then raise exception 'Replay duplicated rewards';end if;
 begin insert into public.user_cards(user_id,card_id,engine_version,catalogue_revision,evidence_level,rule_snapshot,evidence_snapshot) values(auth.uid(),'TRAIL_COMPLETE','spoof',0,'file_import','{}','{}');raise exception 'Arbitrary client award allowed';exception when insufficient_privilege then null;end;
 begin update public.card_unlock_rules set threshold=1;raise exception 'Client catalogue mutation allowed';exception when insufficient_privilege then null;end;
 begin perform public.process_reward_batch(251);raise exception 'Unbounded server batch allowed';exception when raise_exception then if sqlerrm<>'BATCH_LIMIT' then raise;end if;end;
 select id into s from public.reveal_sessions;
 perform set_config('launch.test_initial_reveal',s::text,true);
 perform public.advance_reveal(s,3);
 perform public.advance_reveal(s,1);
 if (select position from public.reveal_sessions where id=s)<>3 then raise exception 'Reveal progress regressed';end if;
 if (select count(*) from public.reveal_items where seen_at is not null)<>3 then raise exception 'Progress receipt missing';end if;
end $$;
-- User B cannot see or alter A's cards, processing state, audit or presentation.
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000002',true);
do $$ declare r jsonb;s uuid; a uuid;i integer;begin
 if exists(select 1 from public.user_cards) or exists(select 1 from public.reveal_sessions) or exists(select 1 from public.reveal_items) or exists(select 1 from public.achievement_events) or exists(select 1 from public.reward_jobs) or exists(select 1 from public.reward_processing_state where user_id<>auth.uid()) then raise exception 'Cross-account visibility';end if;
 begin perform public.advance_reveal(current_setting('launch.test_initial_reveal')::uuid,0,true);raise exception 'Cross-account reveal write';exception when raise_exception then if sqlerrm<>'REVEAL_NOT_FOUND' then raise;end if;end;
 r:=public.get_collection_data();if jsonb_array_length(r->'owned')<>0 or jsonb_array_length(r->'pending')<>0 then raise exception 'Manifest leaked A';end if;
 perform public.process_reward_batch();
 if (select count(*) from public.user_cards)<>5 then raise exception 'Rounded distance must not grant marathon';end if;
 select id into s from public.reveal_sessions;
 perform public.advance_reveal(s,0,true);perform public.advance_reveal(s,0,true);
 if (select status from public.reveal_sessions where id=s)<>'seen' then raise exception 'Skip failed';end if;
 a:=public.save_manual_activity('61000000-0000-0000-0000-000000000001','{"title":"Synthetic marathon","category":"running","original_sport":"Running","started_at_utc":"2026-01-03T08:00:00Z","distance_m":42195,"duration_s":15000}',true);
 perform public.process_reward_batch();
 if (select count(*) from public.user_cards)<>7 or (select count(*) from public.reveal_sessions)<>2 then raise exception 'Daily marathon/completion missing';end if;
 if (select card_count from public.reveal_sessions where kind='new_achievements')<>2 then raise exception 'Daily reveal must contain only novelties';end if;
 perform public.save_manual_activity('61000000-0000-0000-0000-000000000001','{"title":"Synthetic marathon","category":"running","original_sport":"Running","started_at_utc":"2026-01-03T08:00:00Z","distance_m":42195,"duration_s":15000}',true);
 perform public.process_reward_batch();
 perform public.save_manual_activity('61000000-0000-0000-0000-000000000002','{"title":"Synthetic short run","category":"running","original_sport":"Running","started_at_utc":"2026-01-04T08:00:00Z","distance_m":1000,"duration_s":600}',true);
 perform public.process_reward_batch();
 if (select count(*) from public.reveal_items)<>7 or (select count(*) from public.reveal_sessions)<>2 then raise exception 'Reimport/no-reward activity produced fake novelties';end if;
 perform public.correct_activity_sport(a,'unknown');perform public.process_reward_batch();
 if (select count(*) from public.user_cards)<>7 then raise exception 'Correction silently removed souvenirs';end if;
 if not exists(select 1 from public.user_cards where card_id='RUN_MARATHON' and proof_status='needs_review') then raise exception 'Correction not flagged';end if;
 perform public.correct_activity_sport(a,'running');perform public.process_reward_batch();
 if exists(select 1 from public.user_cards where proof_status='needs_review') then raise exception 'Corrected proof did not recover';end if;
 if (select count(*) from public.reveal_sessions)<>2 then raise exception 'Proof correction replayed reveals';end if;
end $$;
-- Explicit future sport mapping and a new rule work without parser/engine changes.
reset role;
insert into public.sports(slug,name,is_active) values('ski','Ski',true);
insert into public.collection_sets(id,sport_slug,title,version,source_sport_labels) values('ski_v1','ski','Ski',1,array['Ski']);
insert into public.card_definitions(id,collection_id,title,rarity,kind,artwork_key) values('SKI_1K','ski_v1','1 km','rare','milestone','trail');
insert into public.card_unlock_rules(card_id,metric,threshold) values('SKI_1K','distance_m',1000);
set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000001',true);
do $$begin
 perform public.process_reward_batch();
 if not exists(select 1 from public.user_cards where card_id='SKI_1K') then raise exception 'Future sport replay failed';end if;
 if (select count(*) from public.reveal_sessions)<>2 then raise exception 'Viewed initial should not absorb daily novelties';end if;
end $$;
reset role;
-- 10,000 synthetic activities; bounded resume, no cards for sub-threshold outings.
insert into public.activities(user_id,source_key,title,original_sport,category,started_at_utc,distance_m,duration_s,status,evidence_level)
select '60000000-0000-0000-0000-000000000003','synthetic:large:'||n,'Synthetic training','Running','running',timestamptz '2026-01-01'+n*interval '1 second',1000,600,'valid','file_import' from generate_series(1,10000) n;
set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000003',true);
do $$declare i integer;r jsonb;t timestamptz:=clock_timestamp();begin
 for i in 1..100 loop r:=public.process_reward_batch(250);exit when r->>'status'='ready';end loop;
 if i<>40 or (r->>'processed')::int<>10000 then raise exception 'Large history cursor lost rows';end if;
 if exists(select 1 from public.user_cards) or exists(select 1 from public.reveal_sessions) then raise exception 'Sub-threshold history produced rewards';end if;
 raise notice 'Synthetic reward benchmark: 10000 activities, % ms',round(extract(epoch from clock_timestamp()-t)*1000);
end $$;
reset role;
set local role anon;
do $$begin
 begin perform * from public.user_cards;raise exception 'Anonymous cards accessible';exception when insufficient_privilege then null;end;
 begin perform public.process_reward_batch();raise exception 'Anonymous engine access';exception when insufficient_privilege then null;end;
 begin perform public.advance_reveal(gen_random_uuid());raise exception 'Anonymous reveal mutation';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
