@AGENTS.md

# Academic Portal — Project Architecture & Rules

## What this is

A web portal for an educational institution serving three roles: **Student**,
**Faculty**, and **Management/Admin**. Each role logs in and sees only the
information and functions appropriate to their role.

This document defines the intended architecture and the rules for working on
this codebase. It reflects decisions made before feature work started —
follow it rather than re-deriving conventions from scratch.

## Current status

Scaffolding stage only. The project is an unmodified `create-next-app`
baseline (App Router, TypeScript, Tailwind CSS v4, ESLint flat config) with
no Supabase integration, no auth, no database schema, and no role-based
features yet. Nothing in this section should be read as "already built" —
it describes the target architecture to build incrementally.

## Technology stack

- **Framework**: Next.js (App Router) — currently v16.3.0. See the Next.js
  breaking-changes notice above (`@AGENTS.md`): consult
  `node_modules/next/dist/docs/` before using any API, since this version
  may differ from training-data assumptions.
- **Language**: TypeScript (`strict: true` — keep it that way)
- **Backend/DB**: Supabase (Postgres, Supabase Auth, Supabase Row Level
  Security)
- **Styling**: Tailwind CSS v4 (already configured — use it; do not add a
  second styling system)
- **Hosting**: Vercel
- **Source control**: GitHub — https://github.com/waqasnce-source/Academic-portal

## Primary user roles

1. **Student**
2. **Faculty**
3. **Management/Admin**

Role must be resolved server-side (from the authenticated Supabase session /
`profiles` table), never trusted from client state alone.

## Planned functional areas

These are the target areas per role. Do not build them until explicitly
requested — this list exists so architecture decisions (routing, data
access, layout) are made with the full shape in mind.

**Student**: dashboard, personal profile, program information, courses,
timetable, attendance, results/grades, notices, notifications.

**Faculty**: dashboard, personal profile, assigned courses, assigned
students, attendance management, marks/results management, timetable,
notices, notifications.

**Management/Admin**: dashboard, student management, faculty management,
department management, program management, course management, semester
management, course offerings, enrollments, attendance, results, timetable,
notices, notifications, reports, user/role management, system settings.

## Proposed database entities

`profiles`, `students`, `faculty`, `departments`, `programs`, `semesters`,
`courses`, `course_offerings`, `enrollments`, `attendance`, `results`,
`timetables`, `notices`, `notifications`.

These are proposed, not yet created. Any schema change must be documented
(see Development Rules below) at the time it's made.

## Security requirements

- Authentication goes through **Supabase Auth** — no custom auth.
- Role checks must be enforced **server-side**; never rely solely on
  frontend route guards or hiding buttons in the UI.
- **Row Level Security (RLS)** must eventually be the database-level
  enforcement mechanism for every table holding role-scoped data.
- Students may only access their own academic records.
- Faculty may only access students/courses they are actually assigned to.
- Management/Admin has broader access, scoped by what the feature actually
  requires (not blanket superuser access by default).
- The Supabase **service-role key** must never appear in browser/client-side
  code — server-only usage.
- Secrets live in `.env.local` only, and must never be committed. The
  existing `.gitignore` already excludes `.env*` — do not narrow that.
- Every new feature should be reasoned about in terms of "who can call this,
  and what does RLS/server logic actually restrict" before it's considered
  done.

## Development rules

1. No large, uncontrolled changes — incremental, reviewable steps.
2. Do not invent academic business rules that haven't been specified; ask
   when a rule is genuinely ambiguous rather than guessing.
3. Build incrementally and verify after each significant change.
4. Preserve existing working code unless there's a clear reason to change
   it.
5. No unnecessary dependencies — justify any new package before adding it.
6. TypeScript throughout; keep `strict` mode on.
7. Keep components modular and maintainable.
8. Use clear, descriptive naming.
9. No hard-coded academic data (course lists, grades, timetables, etc.) that
   should ultimately come from Supabase.
10. No mock data in production functionality unless explicitly requested.
11. Consider security (auth, RLS, data exposure) for every feature, not just
    at the end.
12. Any database structure change must be documented at the time it's made
    (what changed and why — e.g. in the PR/commit description or a
    migration note).
13. Don't delete existing files or functionality without explaining why.
14. Run the available lint/build/test checks before considering a task
    complete (`npm run lint`, `npm run build` at minimum).

## Git workflow

- Repo: https://github.com/waqasnce-source/Academic-portal
- Main branch: `main`
- Never commit secrets.
- Understand the current working tree state before starting significant
  changes.
- Write clear, descriptive commit messages; group related changes into
  logical commits.
- Do not push to GitHub unless explicitly asked to.

## Deployment

- Vercel is the deployment target; Supabase provides backend services.
- The app must work correctly both locally (`npm run dev`) and on Vercel.
- Environment variables are configured separately for local (`.env.local`)
  and Vercel (project environment variable settings) — keep both in sync
  when a new variable is introduced, and document what each variable is for.
