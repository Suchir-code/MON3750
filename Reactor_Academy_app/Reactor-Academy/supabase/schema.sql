-- Reactor Builder OS MVP schema
-- Run this in the Supabase SQL editor for your project.

create extension if not exists pgcrypto;

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'paused', 'completed')),
  cohort text,
  starts_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id)
);

create table if not exists public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  frontier_interests text[] not null default '{}',
  skills text[] not null default '{}',
  learning_style text not null default '',
  confidence_level int not null default 3 check (confidence_level between 1 and 5),
  weekly_commitment_hours int not null default 4 check (weekly_commitment_hours between 1 and 12),
  long_term_goal text not null default '',
  pathway text check (pathway in ('founder', 'researcher', 'operator', 'enterprise')),
  selected_mission text not null default '',
  profile_summary text not null default '',
  current_month int not null default 1 check (current_month between 1 and 12),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id)
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  answer text not null,
  response jsonb not null default '{}'::jsonb,
  pathway text,
  mission text,
  current_month int,
  should_escalate_to_tutor boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.tutor_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  ai_message_id uuid references public.ai_messages(id) on delete set null,
  question text not null,
  context text not null default '',
  preferred_time text not null default '',
  tutor_reply text,
  status text not null default 'open' check (status in ('open', 'in_review', 'replied', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.passport_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  month int not null check (month between 1 and 12),
  title text not null,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'submitted', 'verified')),
  evidence_url text,
  mentor_feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opportunity_suggestions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  url text not null,
  type text not null default 'Other',
  domain text not null default '',
  notes text not null default '',
  status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.enrollments enable row level security;
alter table public.student_profiles enable row level security;
alter table public.ai_messages enable row level security;
alter table public.tutor_requests enable row level security;
alter table public.passport_items enable row level security;
alter table public.opportunity_suggestions enable row level security;

drop policy if exists "students read own enrollment" on public.enrollments;
create policy "students read own enrollment"
on public.enrollments for select
to authenticated
using (auth.uid() = student_id);

drop policy if exists "students read own profile" on public.student_profiles;
create policy "students read own profile"
on public.student_profiles for select
to authenticated
using (auth.uid() = student_id);

drop policy if exists "students create own profile" on public.student_profiles;
create policy "students create own profile"
on public.student_profiles for insert
to authenticated
with check (auth.uid() = student_id);

drop policy if exists "students update own profile" on public.student_profiles;
create policy "students update own profile"
on public.student_profiles for update
to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);

drop policy if exists "students delete own profile" on public.student_profiles;
create policy "students delete own profile"
on public.student_profiles for delete
to authenticated
using (auth.uid() = student_id);

drop policy if exists "students read own ai messages" on public.ai_messages;
create policy "students read own ai messages"
on public.ai_messages for select
to authenticated
using (auth.uid() = student_id);

drop policy if exists "students create own ai messages" on public.ai_messages;
create policy "students create own ai messages"
on public.ai_messages for insert
to authenticated
with check (auth.uid() = student_id);

drop policy if exists "students delete own ai messages" on public.ai_messages;
create policy "students delete own ai messages"
on public.ai_messages for delete
to authenticated
using (auth.uid() = student_id);

drop policy if exists "students read own tutor requests" on public.tutor_requests;
create policy "students read own tutor requests"
on public.tutor_requests for select
to authenticated
using (auth.uid() = student_id);

drop policy if exists "students create own tutor requests" on public.tutor_requests;
create policy "students create own tutor requests"
on public.tutor_requests for insert
to authenticated
with check (auth.uid() = student_id);

drop policy if exists "students delete own tutor requests" on public.tutor_requests;
create policy "students delete own tutor requests"
on public.tutor_requests for delete
to authenticated
using (auth.uid() = student_id);

drop policy if exists "students read own passport items" on public.passport_items;
create policy "students read own passport items"
on public.passport_items for select
to authenticated
using (auth.uid() = student_id);

drop policy if exists "students create own passport items" on public.passport_items;
create policy "students create own passport items"
on public.passport_items for insert
to authenticated
with check (auth.uid() = student_id);

drop policy if exists "students update own passport items" on public.passport_items;
create policy "students update own passport items"
on public.passport_items for update
to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);

drop policy if exists "students delete own passport items" on public.passport_items;
create policy "students delete own passport items"
on public.passport_items for delete
to authenticated
using (auth.uid() = student_id);

drop policy if exists "students read own opportunity suggestions" on public.opportunity_suggestions;
create policy "students read own opportunity suggestions"
on public.opportunity_suggestions for select
to authenticated
using (auth.uid() = student_id);

drop policy if exists "students create own opportunity suggestions" on public.opportunity_suggestions;
create policy "students create own opportunity suggestions"
on public.opportunity_suggestions for insert
to authenticated
with check (auth.uid() = student_id);

drop policy if exists "students delete own opportunity suggestions" on public.opportunity_suggestions;
create policy "students delete own opportunity suggestions"
on public.opportunity_suggestions for delete
to authenticated
using (auth.uid() = student_id);

create index if not exists enrollments_student_id_idx on public.enrollments(student_id);
create index if not exists student_profiles_student_id_idx on public.student_profiles(student_id);
create index if not exists ai_messages_student_id_created_at_idx on public.ai_messages(student_id, created_at desc);
create index if not exists tutor_requests_student_id_created_at_idx on public.tutor_requests(student_id, created_at desc);
create index if not exists passport_items_student_id_month_idx on public.passport_items(student_id, month);
create index if not exists opportunity_suggestions_student_id_created_at_idx on public.opportunity_suggestions(student_id, created_at desc);
