# Reactor Academy App: Tools And Folders

## Tools Used

- Next.js: web app framework, pages, API routes, and build system.
- React: interactive frontend components and state.
- TypeScript: safer frontend and backend code.
- Tailwind CSS: styling, layout, spacing, and responsive UI.
- Supabase: Google authentication, user enrollment, profiles, proof records, tutor requests, and opportunity suggestions.
- Google OAuth through Supabase: continue-with-Google login.
- Ollama / local AI: local AI option for Reactor AI during development and demo.
- Gemini API support: optional AI provider support if quota and key are working.
- Google Calendar booking link: tutor booking / escalation link.
- Browser Speech Recognition: microphone dictation inside Build Room.
- ESLint: code quality checks.

## Main Folders

- `src/app`
  Next.js app routes, global CSS, and backend API routes.

- `src/app/api`
  Server endpoints used by the frontend. Examples: AI chat, onboarding, bootstrap data, proof saving, tutor requests, and opportunity suggestions.

- `src/frontend`
  Student-facing React app code.

- `src/frontend/components`
  Main UI screens and reusable visual components. The key file is `reactor-app.tsx`.

- `src/frontend/lib`
  Browser-side helpers for API calls, Supabase client setup, types, and AI fallback helpers.

- `src/backend`
  Server-side academy data, environment helpers, Supabase server helpers, and API utilities.

- `supabase`
  Database setup and demo/reset SQL files.

- `supabase/schema.sql`
  Main Supabase tables and security policies.

- `supabase/reset-student-data.sql`
  Demo helper file to reset one student by email.

- `docs`
  Project explanations and handover notes.

## Important Files

- `src/frontend/components/reactor-app.tsx`
  The main app UI: login state, onboarding, Today, Ask AI, Build Room, Passport, and Opportunities.

- `src/backend/academy-data.ts`
  The 12-month programme timeline, pathways, missions, and weekly plan data.

- `src/frontend/lib/api-client.ts`
  Frontend functions that call the app API routes.

- `.env.local`
  Local environment variables for Supabase, AI provider, Ollama, Gemini, and Google Calendar.

## Demo Notes

- Current week is forced to Week 1 in `getCurrentCalendarWeek()` inside `reactor-app.tsx`.
- To clear only proof records for demo, run a SQL delete against `public.passport_items`.
- To reset the whole student journey, run `supabase/reset-student-data.sql` after replacing the email.
