create extension if not exists pgcrypto;

create table if not exists public.trails (
  id text primary key,
  name text not null,
  alias text,
  system_name text not null,
  city text default 'San Antonio',
  state text default 'TX',
  latitude double precision not null,
  longitude double precision not null,
  status_color text not null default 'yellow' check (status_color in ('green', 'yellow', 'red')),
  current_condition text not null default 'Other',
  last_reported_at timestamptz,
  weather_warning text,
  report_count integer not null default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.trail_reports (
  id uuid primary key default gen_random_uuid(),
  trail_id text not null references public.trails(id) on delete cascade,
  username text not null,
  primary_condition text not null,
  hazard_tags text[] not null default '{}',
  note text,
  photo_url text,
  photo_review_status text default 'pending_review',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  is_edited boolean default false,
  is_visible boolean default true
);

create table if not exists public.feedback_items (
  id bigint generated always as identity primary key,
  type text not null,
  title text,
  message text not null,
  submitted_name text,
  submitted_location text,
  created_at timestamptz default now()
);

insert into public.trails (
  id, name, alias, system_name, latitude, longitude, status_color, current_condition, last_reported_at, weather_warning, report_count
)
values
  ('mcallister-park', 'McAllister Park', 'Mac', 'Salado Creek Greenway', 29.5449, -98.4243, 'yellow', 'Muddy', now() - interval '42 minutes', 'Likely Wet (Auto-detected)', 5),
  ('op-schnabel-park', 'O.P. Schnabel Park', null, 'Leon Creek Greenway', 29.5365, -98.6904, 'green', 'Hero Dirt', now() - interval '25 minutes', null, 3),
  ('government-canyon', 'Government Canyon State Natural Area', null, 'Outside Greenways', 29.6003, -98.7695, 'red', 'Closed', now() - interval '2 hours 10 minutes', 'Likely Wet (Auto-detected)', 2)
on conflict (id) do update set
  name = excluded.name,
  alias = excluded.alias,
  system_name = excluded.system_name,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  status_color = excluded.status_color,
  current_condition = excluded.current_condition,
  last_reported_at = excluded.last_reported_at,
  weather_warning = excluded.weather_warning,
  report_count = excluded.report_count,
  updated_at = now();

insert into public.trail_reports (
  id, trail_id, username, primary_condition, hazard_tags, note, created_at, updated_at, is_edited, is_visible
)
values
  ('11111111-1111-4111-8111-111111111111', 'mcallister-park', 'traildad', 'Muddy', array['Bees'], 'Front side is greasy. Back side has standing water.', now() - interval '42 minutes', now() - interval '42 minutes', false, true),
  ('22222222-2222-4222-8222-222222222222', 'mcallister-park', 'rockhopper', 'Muddy', array['Obstructed'], 'Small branch pile near the creek crossing.', now() - interval '55 minutes', now() - interval '18 minutes', true, true),
  ('33333333-3333-4333-8333-333333333333', 'op-schnabel-park', 'singletracksam', 'Hero Dirt', array[]::text[], 'Fast and tacky this morning.', now() - interval '25 minutes', now() - interval '25 minutes', false, true),
  ('44444444-4444-4444-8444-444444444444', 'government-canyon', 'mesa_masher', 'Closed', array[]::text[], 'Posting says closed after overnight rain.', now() - interval '2 hours 10 minutes', now() - interval '2 hours 10 minutes', false, true)
on conflict (id) do nothing;
