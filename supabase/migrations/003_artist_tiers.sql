-- ============================================================
-- Migration 003 — Artist tier system
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add artist_tier to profiles
alter table public.profiles
  add column if not exists artist_tier text
    default 'amateur'
    check (artist_tier in ('all_stars', 'local_legends', 'amateur'));

-- Back-fill existing rows
update public.profiles
  set artist_tier = 'amateur'
  where artist_tier is null;

-- 2. Fan → artist subscriptions (paid follow)
create table if not exists public.fan_artist_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  fan_id      uuid not null references public.profiles(id) on delete cascade,
  artist_id   uuid not null references public.profiles(id) on delete cascade,
  plan        text not null default 'monthly' check (plan in ('monthly', 'annual')),
  status      text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  created_at  timestamptz default now(),
  expires_at  timestamptz,
  unique (fan_id, artist_id)
);

-- Enable RLS
alter table public.fan_artist_subscriptions enable row level security;

create policy "fans_manage_own_subs" on public.fan_artist_subscriptions
  for all using (auth.uid() = (select user_id from public.profiles where id = fan_id));

create policy "artists_see_their_subs" on public.fan_artist_subscriptions
  for select using (auth.uid() = (select user_id from public.profiles where id = artist_id));

-- 3. Repertory items (setlist / works)
create table if not exists public.repertory_items (
  id          uuid primary key default gen_random_uuid(),
  artist_id   uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  composer    text,
  duration    text,
  genre       text,
  notes       text,
  is_public   boolean default true,
  created_at  timestamptz default now()
);

-- Enable RLS
alter table public.repertory_items enable row level security;

create policy "artists_manage_repertory" on public.repertory_items
  for all using (auth.uid() = (select user_id from public.profiles where id = artist_id));

create policy "public_see_public_repertory" on public.repertory_items
  for select using (is_public = true);
