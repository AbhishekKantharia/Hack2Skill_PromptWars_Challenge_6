-- BreatheWise AI — PostgreSQL / Supabase Database Schema
-- Designed with privacy-by-default (neighborhood-level coarse locations only, never exact home coordinates).

create extension if not exists "pgcrypto";

-- 1. User Profiles & Sensitivity Preferences
create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(),
  session_key text unique not null,
  display_name text not null default 'Community Member',
  default_city text not null default 'New Delhi',
  default_lat double precision not null default 28.6139,
  default_lon double precision not null default 77.2090,
  sensitivity_group text not null default 'general'
    check (sensitivity_group in ('general', 'children', 'older_adults', 'respiratory', 'outdoor_athletes')),
  budget_tier text not null default 'balanced'
    check (budget_tier in ('free_first', 'balanced', 'advanced')),
  theme text not null default 'light' check (theme in ('light', 'dark')),
  units text not null default 'metric' check (units in ('metric', 'imperial')),
  demo_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Custom Alert Rules
create table if not exists alert_preferences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references user_profiles(id) on delete cascade,
  high_aqi_threshold integer not null default 101,
  severe_aqi_threshold integer not null default 201,
  spike_delta_threshold integer not null default 35,
  favorable_ventilation_max_aqi integer not null default 65,
  enable_high_aqi boolean not null default true,
  enable_severe_aqi boolean not null default true,
  enable_spike_alerts boolean not null default true,
  enable_forecast_spikes boolean not null default true,
  enable_ventilation_windows boolean not null default true,
  updated_at timestamptz not null default now()
);

-- 3. Saved Daily Routines ("My Cleaner Day")
create table if not exists daily_routines (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references user_profiles(id) on delete cascade,
  city text not null,
  aqi_snapshot integer not null,
  data_mode text not null check (data_mode in ('live', 'demo')),
  preferences jsonb not null default '{}'::jsonb,
  schedule jsonb not null,
  created_at timestamptz not null default now()
);

-- 4. AI Assistant Conversations
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references user_profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  city_context text,
  aqi_context integer,
  data_mode text not null default 'live',
  created_at timestamptz not null default now()
);

-- 5. Sustainability Actions & Impact Logs
create table if not exists sustainability_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references user_profiles(id) on delete cascade,
  action_id text not null,
  action_label text not null,
  frequency_per_week integer not null default 1,
  co2_avoided_kg_week numeric(10, 3) not null,
  fuel_saved_liters_week numeric(10, 3) not null default 0,
  energy_saved_kwh_week numeric(10, 3) not null default 0,
  logged_at timestamptz not null default now()
);

-- 6. Community Clean-Air Observations (Privacy-preserving: neighborhood name only, never home GPS)
create table if not exists community_observations (
  id uuid primary key default gen_random_uuid(),
  neighborhood text not null,
  city text not null,
  category text not null check (category in ('smoke_haze', 'traffic_congestion', 'construction_dust', 'waste_burning', 'clear_breeze', 'green_commute')),
  severity text not null check (severity in ('low', 'moderate', 'high')),
  description text not null,
  verification_type text not null default 'user_submitted' check (verification_type = 'user_submitted'),
  upvotes integer not null default 0,
  created_at timestamptz not null default now()
);

-- 7. Neighborhood Clean-Air Challenges
create table if not exists community_challenges (
  id text primary key,
  title text not null,
  neighborhood text not null,
  description text not null,
  target_actions integer not null,
  current_actions integer not null default 0,
  participants_count integer not null default 0,
  badge_name text not null,
  ends_on date not null
);

-- Enable Row Level Security (Supabase best practice)
alter table user_profiles enable row level security;
alter table alert_preferences enable row level security;
alter table daily_routines enable row level security;
alter table chat_messages enable row level security;
alter table sustainability_logs enable row level security;
alter table community_observations enable row level security;
alter table community_challenges enable row level security;

-- Public community feed: anyone may read reports, anyone may submit a
-- neighborhood-level user report. Personal tables above remain service-role only.
drop policy if exists "Community observations are readable" on community_observations;
create policy "Community observations are readable"
  on community_observations for select to anon, authenticated
  using (true);

drop policy if exists "Users may submit neighborhood reports" on community_observations;
create policy "Users may submit neighborhood reports"
  on community_observations for insert to anon, authenticated
  with check (
    verification_type = 'user_submitted'
    and char_length(neighborhood) between 1 and 80
    and char_length(description) between 1 and 320
    and upvotes between 0 and 1
    and neighborhood !~* '[0-9]{1,3}\.[0-9]{2,}'
    and description !~* '[0-9]{1,3}\.[0-9]{2,}'
    and position('°' in neighborhood) = 0
    and position('°' in description) = 0
  );

drop policy if exists "Community challenges are readable" on community_challenges;
create policy "Community challenges are readable"
  on community_challenges for select to anon, authenticated
  using (true);

create index if not exists community_observations_created_at_idx
  on community_observations (created_at desc);
