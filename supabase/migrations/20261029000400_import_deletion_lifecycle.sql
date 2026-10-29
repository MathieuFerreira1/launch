-- Fix FK lifecycle only; no rows are deleted by this migration.
-- Import receipts must not block eventual deletion of their parent account/batch.
alter table public.import_items drop constraint import_items_batch_id_user_id_fkey;
alter table public.import_items add foreign key(batch_id,user_id) references public.import_batches(id,user_id) on delete cascade;
alter table public.import_errors drop constraint import_errors_batch_id_user_id_fkey;
alter table public.import_errors add foreign key(batch_id,user_id) references public.import_batches(id,user_id) on delete cascade;
alter table public.activity_file_links drop constraint activity_file_links_file_id_user_id_fkey;
alter table public.activity_file_links add foreign key(file_id,user_id) references public.activity_files(id,user_id) on delete cascade;
alter table public.activity_file_links drop constraint activity_file_links_activity_id_user_id_fkey;
alter table public.activity_file_links add foreign key(activity_id,user_id) references public.activities(id,user_id) on delete cascade;
alter table public.import_items drop constraint import_items_activity_id_user_id_fkey;
alter table public.import_items add foreign key(activity_id,user_id) references public.activities(id,user_id) on delete set null (activity_id);
