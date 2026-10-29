-- Additive foundation for Launch dev. Run in a transaction via the migration runner.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text unique check (handle is null or handle ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null default '' check (char_length(display_name) <= 80),
  avatar_url text check (avatar_url is null or (char_length(avatar_url) <= 2048 and avatar_url ~ '^https://[^[:space:]]+$')),
  bio text not null default '' check (char_length(bio) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.sports (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z][a-z0-9_]*$'),
  name text not null check (char_length(name) between 1 and 80),
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

-- Pin search_path and keep privileged trigger functions outside the exposed schema.
create schema if not exists launch_private;
revoke all on schema launch_private from public, anon, authenticated;
create function launch_private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80));
  return new;
end;
$$;
revoke all on function launch_private.create_profile() from public, anon, authenticated;
create trigger launch_create_profile after insert on auth.users
for each row execute function launch_private.create_profile();

create function launch_private.touch_profile() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function launch_private.touch_profile() from public, anon, authenticated;
create trigger launch_touch_profile before update on public.profiles
for each row execute function launch_private.touch_profile();

-- Backfill only missing profiles for accounts that predate this migration.
insert into public.profiles (user_id, display_name)
select id, left(coalesce(raw_user_meta_data ->> 'display_name', ''), 80)
from auth.users on conflict (user_id) do nothing;

alter table public.profiles enable row level security;
alter table public.sports enable row level security;
revoke all on public.profiles, public.sports from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (handle, display_name, avatar_url, bio) on public.profiles to authenticated;
grant select on public.sports to anon, authenticated;
create policy profiles_select_own on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);
create policy profiles_update_own on public.profiles for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy sports_read_active on public.sports for select to anon, authenticated
using (is_active);

insert into public.sports (slug, name, is_active) values
('running', 'Running', true), ('trail', 'Trail', true),
('cycling', 'Vélo', true), ('swimming', 'Natation', true);
