-- ============================================================
-- Migration 002 — add boost_level to events
-- Run in Supabase SQL Editor
-- ============================================================

alter table public.events
  add column if not exists boost_level text
    default 'standard'
    check (boost_level in ('standard', 'local', 'boost', 'pro'));

-- Back-fill existing rows
update public.events
  set boost_level = 'standard'
  where boost_level is null;
