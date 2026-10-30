-- A sport correction must not make an incomplete or future-dated activity eligible.
create or replace function public.correct_activity_sport(p_id uuid,p_category text) returns void
language plpgsql security definer set search_path='' as $$
begin
 update public.activities set category=p_category,updated_at=now(),
 extra=extra||jsonb_build_object('classification_source','user'),
 status=case when started_at_utc is null or started_at_utc>now()+interval '1 day'
 or started_at_utc<timestamptz '1900-01-01' or distance_m is null or duration_s is null
 or duration_s<=0 or p_category='unknown'
 or exists(select 1 from jsonb_array_elements(warnings) w where w<>'"SPORT_A_PRECISER"'::jsonb)
 or (duration_s>0 and distance_m/duration_s>50) then 'needs_review' else 'valid' end,
 warnings=coalesce((select jsonb_agg(w) from jsonb_array_elements(warnings) w where w<>'"SPORT_A_PRECISER"'::jsonb),'[]')
 where id=p_id and user_id=auth.uid();
 if not found then raise exception 'ACTIVITY_NOT_FOUND'; end if;
end $$;
