-- Fix notices_authenticated_select: grant management the same read
-- override every other _select_authenticated policy in this schema
-- already has.
--
-- Prior definition (from 20260813152648_remote_schema.sql):
--
--   using (((audience = 'all') OR (audience = public.get_my_role()))
--          AND (expires_at IS NULL OR expires_at > now()))
--
-- Problem: get_my_role() for a management caller returns 'management',
-- so this only ever matched audience IN ('all', 'management'), and never
-- an expired notice — regardless of who published it. Every other
-- _select_authenticated policy in the schema (students, faculty,
-- attendance, results, enrollments, notifications, profiles, ...) has a
-- `has_role('management') OR ...` branch; notices was the sole exception,
-- discovered and reported (not silently worked around) while building the
-- Management -> Notices module.
--
-- Fix: add the same management override, applied only as an additional
-- OR branch. Non-management behavior (audience/expiry scoping) is
-- byte-for-byte unchanged.
drop policy "notices_authenticated_select" on "public"."notices";

create policy "notices_authenticated_select"
  on "public"."notices"
  as permissive
  for select
  to authenticated
  using (
    public.has_role('management'::text)
    or (
      ((audience = 'all'::text) or (audience = public.get_my_role()))
      and ((expires_at is null) or (expires_at > now()))
    )
  );
