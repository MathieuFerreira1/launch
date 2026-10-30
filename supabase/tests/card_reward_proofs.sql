begin;
insert into auth.users(id,raw_user_meta_data) values('62000000-0000-0000-0000-000000000001','{}'),('62000000-0000-0000-0000-000000000002','{}');
set local role authenticated;
select set_config('request.jwt.claim.sub','62000000-0000-0000-0000-000000000001',true);
do $$declare a uuid;b uuid;r jsonb;n integer;begin
 a:=public.save_manual_activity('62100000-0000-0000-0000-000000000001','{"title":"Synthetic first marathon","category":"running","original_sport":"Running","started_at_utc":"2026-01-02T08:00:00Z","distance_m":42195,"duration_s":15000}',true);
 perform public.process_reward_batch();
 b:=public.save_manual_activity('62100000-0000-0000-0000-000000000002','{"title":"Synthetic alternative marathon","category":"running","original_sport":"Running","started_at_utc":"2026-01-04T08:00:00Z","distance_m":43000,"duration_s":15000}',true);
 perform public.correct_activity_sport(a,'unknown');
 perform public.process_reward_batch();
 if (select count(*) from public.user_cards)<>7 or exists(select 1 from public.user_cards where proof_status='needs_review') then raise exception 'Alternative proof failed';end if;
 if (select count(*) from public.reward_proof_history)<>6 then raise exception 'Reconciliation audit missing';end if;
 if exists(select 1 from public.user_cards where evidence_level<>'collection_unverified' and activity_id<>b) then raise exception 'Wrong alternative activity';end if;
 if (select count(*) from public.achievement_events where activity_id=a)<>6 then raise exception 'Original award audit was rewritten';end if;
 if (select count(*) from public.reveal_sessions)<>1 or (select count(*) from public.reveal_items)<>7 then raise exception 'Proof restoration created fake novelties';end if;
 perform public.process_reward_batch(250,true);
 if (select count(*) from public.reward_proof_history)<>6 then raise exception 'Replay duplicated proof audit';end if;
end $$;
select set_config('request.jwt.claim.sub','62000000-0000-0000-0000-000000000002',true);
do $$begin
 if exists(select 1 from public.reward_proof_history) then raise exception 'Cross-account proof history read';end if;
 begin delete from public.reward_proof_history;raise exception 'Client proof history mutation';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
