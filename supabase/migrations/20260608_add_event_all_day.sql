alter table public.calendar_events
add column if not exists all_day boolean not null default false;
