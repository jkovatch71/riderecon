-- supabase/migrations/20260509_001_create_trail_suggestions.sql

create table if not exists public.trail_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  username text,
  trail_name text not null,
  system_name text,
  city text,
  state text,
  latitude double precision,
  longitude double precision,
  location_accuracy_meters double precision,
  notes text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_trail_suggestions_status
on public.trail_suggestions(status);

create index if not exists idx_trail_suggestions_created_at
on public.trail_suggestions(created_at desc);

alter table public.trail_suggestions enable row level security;

drop policy if exists "Authenticated users can create trail suggestions"
on public.trail_suggestions;

create policy "Authenticated users can create trail suggestions"
on public.trail_suggestions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can read their own trail suggestions"
on public.trail_suggestions;

create policy "Users can read their own trail suggestions"
on public.trail_suggestions
for select
to authenticated
using (auth.uid() = user_id);