-- ============================================================
-- StageMap — Full Database Schema
-- Run in Supabase SQL Editor
-- ============================================================

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";

-- ─── PROFILES ────────────────────────────────────────────────
create table public.profiles (
  id           uuid references auth.users on delete cascade primary key,
  email        text unique not null,
  name         text not null,
  type         text not null check (type in ('artist','venue','fan')),
  genre        text,
  bio          text,
  fee          text,
  avatar       text default '🎵',
  region       text,
  country      text,
  lat          double precision,
  lng          double precision,
  links        text[] default '{}',
  available    boolean default true,
  verified     boolean default false,
  rating       numeric(3,2) default 0,
  rating_count integer default 0,
  stripe_customer_id text,
  subscribed   boolean default false,
  sub_plan     text check (sub_plan in ('monthly','annual')) default null,
  sub_until    timestamptz default null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles visible to all"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- ─── MESSAGES (inbox threads) ────────────────────────────────
create table public.messages (
  id           uuid default uuid_generate_v4() primary key,
  from_id      uuid references public.profiles(id) on delete cascade,
  to_id        uuid references public.profiles(id) on delete cascade,
  subject      text,
  body         text not null,
  read         boolean default false,
  has_invite   boolean default false,
  invite_id    uuid default null,
  created_at   timestamptz default now()
);

alter table public.messages enable row level security;

create policy "Users see their own messages"
  on public.messages for select
  using (auth.uid() = from_id or auth.uid() = to_id);

create policy "Users can send messages"
  on public.messages for insert
  with check (auth.uid() = from_id);

create policy "Recipients can mark read"
  on public.messages for update
  using (auth.uid() = to_id);

-- ─── CHAT MESSAGES (real-time) ───────────────────────────────
create table public.chats (
  id           uuid default uuid_generate_v4() primary key,
  room_id      text not null,  -- sorted concat of two user ids
  sender_id    uuid references public.profiles(id) on delete cascade,
  body         text not null,
  created_at   timestamptz default now()
);

alter table public.chats enable row level security;

create policy "Chat participants can read"
  on public.chats for select
  using (room_id like '%' || auth.uid()::text || '%');

create policy "Authenticated users can send"
  on public.chats for insert
  with check (auth.uid() = sender_id);

-- ─── EVENTS / BOOKINGS ───────────────────────────────────────
create table public.events (
  id           uuid default uuid_generate_v4() primary key,
  organizer_id uuid references public.profiles(id) on delete cascade,
  title        text not null,
  description  text,
  venue_name   text,
  city         text,
  country      text,
  date_start   date not null,
  date_end     date,
  genre        text,
  status       text default 'draft' check (status in ('draft','published','confirmed','cancelled')),
  visual       text default '🎭',
  is_public    boolean default true,
  created_at   timestamptz default now()
);

alter table public.events enable row level security;

create policy "Public events visible to all"
  on public.events for select using (is_public = true or auth.uid() = organizer_id);

create policy "Organizers manage their events"
  on public.events for all using (auth.uid() = organizer_id);

-- ─── TOUR INVITATIONS ────────────────────────────────────────
create table public.invitations (
  id           uuid default uuid_generate_v4() primary key,
  tour_title   text not null,
  organizer_id uuid references public.profiles(id) on delete cascade,
  invitee_id   uuid references public.profiles(id) on delete cascade,
  event_id     uuid references public.events(id) on delete set null,
  city         text,
  date         date,
  role         text check (role in ('headliner','support','venue','special')),
  note         text,
  status       text default 'pending' check (status in ('pending','accepted','declined','withdrawn')),
  legal_accepted_by_organizer boolean default false,
  legal_accepted_by_invitee   boolean default false,
  organizer_signature text,
  invitee_signature   text,
  cal_visibility text default 'private' check (cal_visibility in ('private','shared','public')),
  cal_token    text default uuid_generate_v4()::text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table public.invitations enable row level security;

create policy "Parties see their invitations"
  on public.invitations for select
  using (auth.uid() = organizer_id or auth.uid() = invitee_id);

create policy "Organizers create invitations"
  on public.invitations for insert
  with check (auth.uid() = organizer_id);

create policy "Both parties can update"
  on public.invitations for update
  using (auth.uid() = organizer_id or auth.uid() = invitee_id);

-- ─── AD CAMPAIGNS ────────────────────────────────────────────
create table public.campaigns (
  id           uuid default uuid_generate_v4() primary key,
  user_id      uuid references public.profiles(id) on delete cascade,
  package_id   text not null check (package_id in ('local','boost','pro')),
  event_title  text,
  event_date   date,
  venue_name   text,
  city         text,
  genre        text,
  description  text,
  visual       text default '🎷',
  budget       integer not null,
  platforms    text[] default '{"stagemap"}',
  status       text default 'active' check (status in ('active','paused','completed')),
  views        integer default 0,
  clicks       integer default 0,
  fans_notified integer default 0,
  stripe_payment_id text,
  created_at   timestamptz default now()
);

alter table public.campaigns enable row level security;

create policy "Users manage their campaigns"
  on public.campaigns for all using (auth.uid() = user_id);

-- ─── CALENDAR ENTRIES ────────────────────────────────────────
create table public.calendar_entries (
  id           uuid default uuid_generate_v4() primary key,
  user_id      uuid references public.profiles(id) on delete cascade,
  title        text not null,
  description  text,
  date_start   timestamptz not null,
  date_end     timestamptz,
  event_type   text default 'event' check (event_type in ('event','booking','invitation','personal')),
  ref_id       uuid default null,
  visibility   text default 'private' check (visibility in ('private','shared','public')),
  share_token  text default uuid_generate_v4()::text,
  color        text default '#d95f00',
  created_at   timestamptz default now()
);

alter table public.calendar_entries enable row level security;

create policy "Users manage own calendar"
  on public.calendar_entries for all using (auth.uid() = user_id);

create policy "Public entries visible by token" 
  on public.calendar_entries for select
  using (visibility = 'public' or auth.uid() = user_id);

-- ─── RATINGS ─────────────────────────────────────────────────
create table public.ratings (
  id           uuid default uuid_generate_v4() primary key,
  from_id      uuid references public.profiles(id) on delete cascade,
  to_id        uuid references public.profiles(id) on delete cascade,
  score        integer not null check (score between 1 and 5),
  comment      text,
  created_at   timestamptz default now(),
  unique (from_id, to_id)
);

alter table public.ratings enable row level security;

create policy "Anyone can read ratings"
  on public.ratings for select using (true);

create policy "Auth users can rate"
  on public.ratings for insert with check (auth.uid() = from_id);

-- ─── FUNCTIONS ───────────────────────────────────────────────

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function update_updated_at();

create trigger invitations_updated_at before update on public.invitations
  for each row execute function update_updated_at();

-- Recalculate rating average after insert
create or replace function recalc_rating()
returns trigger as $$
begin
  update public.profiles set
    rating = (select avg(score) from public.ratings where to_id = NEW.to_id),
    rating_count = (select count(*) from public.ratings where to_id = NEW.to_id)
  where id = NEW.to_id;
  return NEW;
end;
$$ language plpgsql;

create trigger ratings_recalc after insert or update on public.ratings
  for each row execute function recalc_rating();

-- ─── REALTIME ────────────────────────────────────────────────
alter publication supabase_realtime add table public.chats;
alter publication supabase_realtime add table public.invitations;
alter publication supabase_realtime add table public.messages;

-- ─── INDEXES ─────────────────────────────────────────────────
create index profiles_type_idx on public.profiles(type);
create index profiles_region_idx on public.profiles(region);
create index profiles_available_idx on public.profiles(available);
create index messages_to_idx on public.messages(to_id, read);
create index chats_room_idx on public.chats(room_id, created_at);
create index invitations_invitee_idx on public.invitations(invitee_id, status);
create index campaigns_user_idx on public.campaigns(user_id);
