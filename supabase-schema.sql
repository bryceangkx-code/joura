-- ============================================================
-- Run this in the Supabase SQL editor
-- ============================================================

-- Resumes table (PDF uploads)
create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  file_name text not null,
  file_url text not null,   -- storage path: {clerk_id}/{uuid}.pdf
  created_at timestamptz not null default now()
);

-- User profiles table (per-user job preferences & skills)
create table if not exists user_profiles (
  clerk_id text primary key,
  job_title text,
  skills text[] default '{}',
  years_experience integer,
  preferred_job_types text[] default '{}',
  preferred_locations text[] default '{}',
  updated_at timestamptz not null default now()
);

-- Jobs table (already exists — shown here for reference)
-- create table if not exists jobs (
--   id uuid primary key default gen_random_uuid(),
--   user_id text not null,      -- Clerk user ID
--   title text not null,
--   company text not null,
--   location text not null default 'Remote',
--   fit_score integer not null default 0,
--   job_type text not null default 'Full-time',
--   status text not null default 'new',
--   posted_date date,
--   created_at timestamptz not null default now()
-- );

-- Optional: seed sample jobs (replace with your Clerk user ID)
-- insert into jobs (user_id, title, company, location, fit_score, job_type, status, posted_date) values
--   ('user_xxx', 'Operations Manager', 'Stripe', 'Remote', 80, 'Full-time', 'new', now());
