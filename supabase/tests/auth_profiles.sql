-- Transactional integration suite. All fixtures are rolled back, including auth users.
begin;
insert into auth.users (id, raw_user_meta_data) values
 ('10000000-0000-0000-0000-000000000001', '{"display_name":"Athlete A"}'),
 ('10000000-0000-0000-0000-000000000002', '{"display_name":"Athlete B"}');
insert into public.sports (slug,name,is_active) values ('test_inactive','Hidden fixture',false);
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$
begin
 if (select count(*) from public.profiles) <> 1 then raise exception 'A must see only own profile'; end if;
 if (select display_name from public.profiles) <> 'Athlete A' then raise exception 'Trigger must initialize profile'; end if;
 update public.profiles set handle='athlete_a',bio='My story',avatar_url='https://example.com/avatar.png' where user_id=auth.uid();
 if not found then raise exception 'A must edit own profile'; end if;
 if exists(select 1 from public.profiles where updated_at=created_at) then raise exception 'Server must update timestamp'; end if;
 update public.profiles set bio='Hacked' where user_id='10000000-0000-0000-0000-000000000002';
 if found then raise exception 'A must not update B'; end if;
 if (select count(*) from public.sports) <> 4 then raise exception 'Only four active sports must be visible'; end if;
 begin
  update public.profiles set user_id='10000000-0000-0000-0000-000000000002';
  raise exception 'Owner column unexpectedly writable';
 exception when insufficient_privilege then null; end;
 begin
  update public.profiles set created_at=now();
  raise exception 'Created timestamp unexpectedly writable';
 exception when insufficient_privilege then null; end;
 begin
  update public.profiles set updated_at=now();
  raise exception 'Updated timestamp unexpectedly writable';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.profiles (user_id) values ('10000000-0000-0000-0000-000000000002');
  raise exception 'Profile insertion unexpectedly allowed';
 exception when insufficient_privilege then null; end;
 begin
  delete from public.profiles;
  raise exception 'Profile deletion unexpectedly allowed';
 exception when insufficient_privilege then null; end;
 begin
  update public.sports set name='Hacked';
  raise exception 'Sport update unexpectedly allowed';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.sports (slug,name) values ('hacked','Hacked');
  raise exception 'Sport insertion unexpectedly allowed';
 exception when insufficient_privilege then null; end;
 begin
  delete from public.sports;
  raise exception 'Sport deletion unexpectedly allowed';
 exception when insufficient_privilege then null; end;
 begin
  update public.profiles set handle='INVALID HANDLE';
  raise exception 'Invalid handle unexpectedly accepted';
 exception when check_violation then null; end;
 begin
  update public.profiles set avatar_url='javascript:alert(1)';
  raise exception 'Unsafe avatar URL unexpectedly accepted';
 exception when check_violation then null; end;
 begin
  perform launch_private.create_profile();
  raise exception 'Private function unexpectedly accessible';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$
begin
 if (select count(*) from public.profiles) <> 1 or (select display_name from public.profiles) <> 'Athlete B' then raise exception 'B isolation failed'; end if;
 update public.profiles set display_name='B edited' where user_id=auth.uid();
 if not found then raise exception 'B must edit own profile'; end if;
 begin
  update public.profiles set handle='athlete_a';
  raise exception 'Duplicate handle unexpectedly accepted';
 exception when unique_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub','',true);
do $$
begin
 if exists(select 1 from public.profiles) then raise exception 'Expired identity must see no profiles'; end if;
end $$;
reset role;
set local role anon;
do $$
begin
 if (select count(*) from public.sports) <> 4 then raise exception 'Anonymous active catalogue failed'; end if;
 begin
  perform * from public.profiles;
  raise exception 'Anonymous profile read unexpectedly allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
-- No fixture accounts or changes survive the suite.
rollback;
