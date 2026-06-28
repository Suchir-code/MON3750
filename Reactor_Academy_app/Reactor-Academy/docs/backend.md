# Reactor Builder OS Backend

This MVP uses a free-friendly backend:

- Next.js API routes for app logic
- Supabase Auth for Google login
- Supabase Postgres for student data
- Supabase Row Level Security so students only access their own records
- Gemini API called from the server only, keeping `GEMINI_API_KEY` private

## Folder Structure

- `src/frontend`: student-facing UI, Google login client, API client
- `src/backend`: Supabase server helpers, Gemini service, official academy data
- `src/app/api`: backend endpoints exposed by Next.js
- `supabase/schema.sql`: database tables and row-level security

## Required Env Location

The app reads env values from:

```text
D:\MON3750\Reactor_Academy_app\reactor-academy\.env.local
```

Required:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_GOOGLE_CALENDAR_BOOKING_URL=
```

## API Routes

All routes expect the student's Supabase access token:

```http
Authorization: Bearer <supabase_access_token>
```

### `GET /api/bootstrap`

Loads the authenticated student's app state:

- user
- enrollment status
- student profile
- current academy month
- official timeline
- pathways
- missions
- Google Calendar booking URL

### `POST /api/onboarding`

Creates or updates the student's Builder Profile after the AI onboarding flow.

### `POST /api/ai/chat`

Sends a student question to the Reactor AI Co-Pilot.

The AI is instructed to:

- stay inside the 12-month Reactor timeline
- personalise by pathway, mission, and monthly output
- suggest 2-3 focused deep dives when useful
- recommend tutor escalation when AI is not enough

### `GET /api/tutor-requests`

Lists the student's tutor requests.

### `POST /api/tutor-requests`

Creates a tutor request after AI/deep-dive support is not enough.

## Supabase Setup

1. Open Supabase.
2. Go to SQL Editor.
3. Paste and run:

```text
supabase/schema.sql
```

This creates:

- `enrollments`
- `student_profiles`
- `ai_messages`
- `tutor_requests`
- `passport_items`

It also enables row-level security policies.

## Enrollment Rule

For now, a student is considered enrolled when this row exists:

```sql
insert into public.enrollments (student_id, status, cohort)
values ('<auth-user-id>', 'active', '2026-cohort');
```

Later, this can be handled from an admin dashboard.
