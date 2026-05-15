begin;

create extension if not exists pgcrypto;

create table if not exists public.calendar_admins (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint calendar_admins_email_check check (
    email = lower(trim(email)) and position('@' in email) > 1
  )
);

create table if not exists public.calendar_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 40),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.calendar_lists(id) on delete cascade,
  author text not null check (char_length(trim(author)) between 1 and 80),
  title text not null check (char_length(trim(title)) between 1 and 120),
  content text not null default '',
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_time_check check (end_time > start_time)
);

create index if not exists calendar_events_start_time_idx
  on public.calendar_events(start_time);

create index if not exists calendar_events_list_id_idx
  on public.calendar_events(list_id);

create table if not exists public.calendar_settings (
  id boolean primary key default true,
  last_cleaned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_settings_singleton_check check (id)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists calendar_lists_touch_updated_at on public.calendar_lists;
create trigger calendar_lists_touch_updated_at
before update on public.calendar_lists
for each row execute function public.touch_updated_at();

drop trigger if exists calendar_events_touch_updated_at on public.calendar_events;
create trigger calendar_events_touch_updated_at
before update on public.calendar_events
for each row execute function public.touch_updated_at();

drop trigger if exists calendar_settings_touch_updated_at on public.calendar_settings;
create trigger calendar_settings_touch_updated_at
before update on public.calendar_settings
for each row execute function public.touch_updated_at();

insert into public.calendar_settings(id)
values (true)
on conflict (id) do nothing;

insert into public.calendar_lists(name, color, active)
select name, color, true
from (
  values
    ('개인 일정', '#0e4e96'),
    ('프로젝트 A', '#187f64'),
    ('프로젝트 B', '#c76a14'),
    ('프로젝트 C', '#7c3aed'),
    ('프로젝트 D', '#9b2f5b')
) as seed(name, color)
where not exists (select 1 from public.calendar_lists);

create or replace function public.is_calendar_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.calendar_admins
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_calendar_admin() from public;
grant execute on function public.is_calendar_admin() to authenticated;

alter table public.calendar_admins enable row level security;
alter table public.calendar_lists enable row level security;
alter table public.calendar_events enable row level security;
alter table public.calendar_settings enable row level security;

drop policy if exists "calendar_admins_select_admin" on public.calendar_admins;
create policy "calendar_admins_select_admin"
on public.calendar_admins
for select
to authenticated
using (public.is_calendar_admin());

drop policy if exists "calendar_admins_insert_admin" on public.calendar_admins;
create policy "calendar_admins_insert_admin"
on public.calendar_admins
for insert
to authenticated
with check (public.is_calendar_admin());

drop policy if exists "calendar_admins_update_admin" on public.calendar_admins;
create policy "calendar_admins_update_admin"
on public.calendar_admins
for update
to authenticated
using (public.is_calendar_admin())
with check (public.is_calendar_admin());

drop policy if exists "calendar_admins_delete_admin" on public.calendar_admins;
create policy "calendar_admins_delete_admin"
on public.calendar_admins
for delete
to authenticated
using (public.is_calendar_admin());

drop policy if exists "calendar_lists_select_authenticated" on public.calendar_lists;
create policy "calendar_lists_select_authenticated"
on public.calendar_lists
for select
to authenticated
using (true);

drop policy if exists "calendar_lists_insert_admin" on public.calendar_lists;
create policy "calendar_lists_insert_admin"
on public.calendar_lists
for insert
to authenticated
with check (public.is_calendar_admin());

drop policy if exists "calendar_lists_update_admin" on public.calendar_lists;
create policy "calendar_lists_update_admin"
on public.calendar_lists
for update
to authenticated
using (public.is_calendar_admin())
with check (public.is_calendar_admin());

drop policy if exists "calendar_lists_delete_admin" on public.calendar_lists;
create policy "calendar_lists_delete_admin"
on public.calendar_lists
for delete
to authenticated
using (public.is_calendar_admin());

drop policy if exists "calendar_events_select_authenticated" on public.calendar_events;
create policy "calendar_events_select_authenticated"
on public.calendar_events
for select
to authenticated
using (true);

drop policy if exists "calendar_events_insert_authenticated" on public.calendar_events;
create policy "calendar_events_insert_authenticated"
on public.calendar_events
for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and created_by_email = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "calendar_events_update_authenticated" on public.calendar_events;
create policy "calendar_events_update_authenticated"
on public.calendar_events
for update
to authenticated
using (true)
with check (true);

drop policy if exists "calendar_events_delete_authenticated" on public.calendar_events;
create policy "calendar_events_delete_authenticated"
on public.calendar_events
for delete
to authenticated
using (true);

drop policy if exists "calendar_settings_select_authenticated" on public.calendar_settings;
create policy "calendar_settings_select_authenticated"
on public.calendar_settings
for select
to authenticated
using (true);

drop policy if exists "calendar_settings_insert_admin" on public.calendar_settings;
create policy "calendar_settings_insert_admin"
on public.calendar_settings
for insert
to authenticated
with check (public.is_calendar_admin());

drop policy if exists "calendar_settings_update_admin" on public.calendar_settings;
create policy "calendar_settings_update_admin"
on public.calendar_settings
for update
to authenticated
using (public.is_calendar_admin())
with check (public.is_calendar_admin());

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.calendar_admins,
  public.calendar_lists,
  public.calendar_events,
  public.calendar_settings
to authenticated;

commit;

-- After creating the shared Supabase Auth user, bootstrap the first admin:
-- insert into public.calendar_admins(email)
-- values ('calendar@your-domain.com')
-- on conflict (email) do nothing;
