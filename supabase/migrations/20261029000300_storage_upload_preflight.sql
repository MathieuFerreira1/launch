-- Storage's preflight uses contentLength, while finalized object metadata uses size.
-- Preserve ownership, reservation and actual size checks in both phases.
drop policy sport_sources_insert on storage.objects;
create policy sport_sources_insert on storage.objects for insert to authenticated
with check(bucket_id='sport-sources' and exists(
 select 1 from public.activity_files f where f.storage_path=name
 and f.user_id=(select auth.uid()) and f.retained
 and f.bytes=coalesce((metadata->>'size')::bigint,(metadata->>'contentLength')::bigint,f.bytes)
));
