begin;
insert into auth.users(id,raw_user_meta_data) values('20000000-0000-0000-0000-000000000001','{}'),('20000000-0000-0000-0000-000000000002','{}');
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select public.begin_activity_import('30000000-0000-0000-0000-000000000001',3,false);
select public.reserve_activity_file(repeat('a',64),'synthetic.gpx','gpx',100,'30000000-0000-0000-0000-000000000001');
select public.commit_activity_import('30000000-0000-0000-0000-000000000001',jsonb_build_array(jsonb_build_object('key',repeat('a',64)||':0','fileHash',repeat('a',64),'title','Synthetic run','original_sport','Running','category','running','started_at_utc','2026-01-01T08:00:00Z','distance_m',5000,'duration_s',1800)));
-- Resume exactly the same request, then import the same file in a second batch.
select public.commit_activity_import('30000000-0000-0000-0000-000000000001',jsonb_build_array(jsonb_build_object('key',repeat('a',64)||':0','fileHash',repeat('a',64))));
select public.begin_activity_import('30000000-0000-0000-0000-000000000002',1,false);
select public.commit_activity_import('30000000-0000-0000-0000-000000000002',jsonb_build_array(jsonb_build_object('key',repeat('a',64)||':0','fileHash',repeat('a',64))));
do $$
begin
 if (select count(*) from public.activities)<>1 then raise exception 'Replay created duplicate'; end if;
 if (select state from public.import_items where batch_id='30000000-0000-0000-0000-000000000002')<>'duplicate_exact' then raise exception 'Exact duplicate not recorded'; end if;
 if public.finish_activity_import('30000000-0000-0000-0000-000000000001')<>'partial' then raise exception 'Interruption state failed'; end if;
end $$;
select public.reserve_activity_file(repeat('b',64),'synthetic.tcx','tcx',100,'30000000-0000-0000-0000-000000000001');
do $$
declare candidate jsonb:=jsonb_build_object('key',repeat('b',64)||':0','fileHash',repeat('b',64),'title','Same run TCX','original_sport','Running','category','running','started_at_utc','2026-01-01T08:00:01Z','distance_m',5001,'duration_s',1801); a uuid;
begin
 if jsonb_array_length(public.find_activity_duplicates(jsonb_build_array(candidate))->0->'matches')<>1 then raise exception 'Cross-format duplicate not detected'; end if;
 begin
 perform public.commit_activity_import('30000000-0000-0000-0000-000000000001',jsonb_build_array(candidate));raise exception 'Probable duplicate silently accepted';
 exception when raise_exception then if sqlerrm<>'DUPLICATE_REVIEW_REQUIRED' then raise;end if;end;
 select id into a from public.activities limit 1;
 perform public.commit_activity_import('30000000-0000-0000-0000-000000000001',jsonb_build_array(candidate||jsonb_build_object('linkId',a)));
 if (select count(*) from public.activities)<>1 or (select count(*) from public.activity_file_links)<>2 then raise exception 'Explicit source linking failed'; end if;
 perform public.record_import_errors('30000000-0000-0000-0000-000000000001','[{"key":"bad","name":"broken.fit","code":"FIT_CORROMPU"}]');
 if public.finish_activity_import('30000000-0000-0000-0000-000000000001')<>'completed' then raise exception 'Resume completion failed'; end if;
 begin
 update public.activities set evidence_level='self_reported'; raise exception 'Direct activity mutation allowed';
 exception when insufficient_privilege then null;end;
 begin
 insert into public.activity_files(user_id,sha256,original_name,format,bytes,storage_path) values(auth.uid(),repeat('f',64),'x','fit',1,'spoof');raise exception 'Source spoof allowed';
 exception when insufficient_privilege then null;end;
end $$;
-- Explicit source retention, object RLS and metadata binding.
select public.begin_activity_import('30000000-0000-0000-0000-000000000003',1,true);
select public.reserve_activity_file(repeat('c',64),'private.fit','fit',100,'30000000-0000-0000-0000-000000000003');
insert into storage.objects(bucket_id,name,metadata) values('sport-sources','20000000-0000-0000-0000-000000000001/'||repeat('c',64),'{"size":100}');
do $$
begin
 if (select count(*) from storage.objects where bucket_id='sport-sources')<>1 then raise exception 'Own storage read failed';end if;
 begin
 insert into storage.objects(bucket_id,name,metadata) values('sport-sources','20000000-0000-0000-0000-000000000001/spoof','{"size":100}');raise exception 'Unreserved path accepted';
 exception when insufficient_privilege then null;end;
end $$;
-- B must see zero of A's activities, files, import records and objects.
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
do $$
declare a uuid;
begin
 if exists(select 1 from public.activities) or exists(select 1 from public.activity_files) or exists(select 1 from public.import_batches) or exists(select 1 from public.import_items) or exists(select 1 from public.import_errors) or exists(select 1 from storage.objects where bucket_id='sport-sources') or exists(select 1 from public.reward_activity_inputs) then raise exception 'Cross-account visibility';end if;
 begin delete from storage.objects where bucket_id='sport-sources';if found then raise exception 'Cross-account source deletion';end if;exception when insufficient_privilege then null;end;
 begin
 perform public.commit_activity_import('30000000-0000-0000-0000-000000000001','[]');raise exception 'Cross-account batch write';
 exception when raise_exception then if sqlerrm<>'BATCH_NOT_FOUND' then raise;end if;end;
 begin
 perform public.begin_activity_import('30000000-0000-0000-0000-000000000001',3,false);raise exception 'Cross-account id collision';
 exception when raise_exception then if sqlerrm<>'BATCH_MISMATCH' then raise;end if;end;
 perform public.save_manual_activity('40000000-0000-0000-0000-000000000001','{"title":"Synthetic ski","original_sport":"Ski","category":"unsupported","started_at_utc":"2026-01-02T08:00:00Z","distance_m":0,"duration_s":1800}');
 perform public.save_manual_activity('40000000-0000-0000-0000-000000000001','{"title":"Synthetic ski","original_sport":"Ski","category":"unsupported","started_at_utc":"2026-01-02T08:00:00Z","distance_m":0,"duration_s":1800}');
 if (select count(*) from public.activities)<>1 or (select evidence_level from public.activities)<>'self_reported' then raise exception 'Manual idempotence/evidence';end if;
 if exists(select 1 from public.reward_activity_inputs) then raise exception 'Unsupported sport in rewards';end if;
 select id into a from public.activities limit 1;
 perform public.correct_activity_sport(a,'unknown');
 if (select status from public.activities where id=a)<>'needs_review' then raise exception 'Unknown sport must stay in review';end if;
 perform public.correct_activity_sport(a,'unsupported');
 if (select original_sport from public.activities where id=a)<>'Ski' then raise exception 'Original sport lost';end if;
 a:=public.save_manual_activity('40000000-0000-0000-0000-000000000002','{"title":"Future synthetic","category":"unknown","original_sport":"","started_at_utc":"2099-01-01T08:00:00Z","distance_m":5000,"duration_s":1800}');
 perform public.correct_activity_sport(a,'running');
 if (select status from public.activities where id=a)<>'needs_review' then raise exception 'Classification bypassed future date guard';end if;

end $$;
reset role;
set local role anon;
do $$
begin
 begin perform * from public.activities;raise exception 'Anonymous activity read';exception when insufficient_privilege then null;end;
 begin perform public.begin_activity_import(gen_random_uuid(),1,false);raise exception 'Anonymous RPC access';exception when insufficient_privilege then null;end;
 if exists(select 1 from storage.objects where bucket_id='sport-sources') then raise exception 'Anonymous storage read';end if;
end $$;
reset role;
rollback;
