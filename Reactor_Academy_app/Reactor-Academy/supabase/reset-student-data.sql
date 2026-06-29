-- Reset one Reactor Academy student's app data.
-- How to use:
-- 1. Replace the email below with the Google login email.
-- 2. Run this file in Supabase SQL Editor.
-- 3. Refresh the app. The same enrolled account will start onboarding again.
--
-- This keeps public.enrollments, so the student remains allowed into the course.

do $$
declare
  target_email text := 'student@example.com';
  target_user_id uuid;
begin
  select id
  into target_user_id
  from auth.users
  where email = target_email;

  if target_user_id is null then
    raise exception 'No Supabase auth user found for email: %', target_email;
  end if;

  delete from public.opportunity_suggestions where student_id = target_user_id;
  delete from public.passport_items where student_id = target_user_id;
  delete from public.tutor_requests where student_id = target_user_id;
  delete from public.ai_messages where student_id = target_user_id;
  delete from public.student_profiles where student_id = target_user_id;

  raise notice 'Reset Reactor app data for %, user id %', target_email, target_user_id;
end $$;
