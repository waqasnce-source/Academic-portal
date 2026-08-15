drop extension if exists "pg_net";

alter table "public"."attendance" enable row level security;

alter table "public"."course_offering_faculty" enable row level security;

alter table "public"."course_offerings" enable row level security;

alter table "public"."course_sessions" enable row level security;

alter table "public"."courses" enable row level security;

alter table "public"."departments" enable row level security;

alter table "public"."enrollments" enable row level security;

alter table "public"."faculty" enable row level security;

alter table "public"."notices" enable row level security;

alter table "public"."notifications" enable row level security;

alter table "public"."profiles" enable row level security;

alter table "public"."program_courses" enable row level security;

alter table "public"."programs" enable row level security;

alter table "public"."results" enable row level security;

alter table "public"."semesters" enable row level security;

alter table "public"."students" enable row level security;

alter table "public"."timetables" enable row level security;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.current_faculty_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select f.id
  from public.faculty f
  where f.profile_id = (select auth.uid())
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.current_student_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select s.id
  from public.students s
  where s.profile_id = (select auth.uid())
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_faculty_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select id
  from public.faculty
  where profile_id = auth.uid()
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select role
  from public.profiles
  where id = auth.uid()
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_student_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select id
  from public.students
  where profile_id = auth.uid()
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(required_role text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.current_user_role() = required_role;
$function$
;

CREATE OR REPLACE FUNCTION public.is_own_profile(target_profile_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select target_profile_id = (select auth.uid());
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_attendance_offering_match()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_enrollment_offering_id uuid;
  v_session_offering_id uuid;
begin
  select course_offering_id
    into v_enrollment_offering_id
    from public.enrollments
    where id = new.enrollment_id;

  select course_offering_id
    into v_session_offering_id
    from public.course_sessions
    where id = new.course_session_id;

  if v_enrollment_offering_id is distinct from v_session_offering_id then
    raise exception
      'attendance row invalid: enrollment % belongs to course_offering %, but course_session % belongs to course_offering %',
      new.enrollment_id, v_enrollment_offering_id,
      new.course_session_id, v_session_offering_id
      using errcode = '23514';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

grant delete on table "public"."attendance" to "anon";

grant insert on table "public"."attendance" to "anon";

grant select on table "public"."attendance" to "anon";

grant update on table "public"."attendance" to "anon";

grant delete on table "public"."attendance" to "authenticated";

grant insert on table "public"."attendance" to "authenticated";

grant select on table "public"."attendance" to "authenticated";

grant update on table "public"."attendance" to "authenticated";

grant delete on table "public"."attendance" to "service_role";

grant insert on table "public"."attendance" to "service_role";

grant select on table "public"."attendance" to "service_role";

grant update on table "public"."attendance" to "service_role";

grant delete on table "public"."course_offering_faculty" to "anon";

grant insert on table "public"."course_offering_faculty" to "anon";

grant select on table "public"."course_offering_faculty" to "anon";

grant update on table "public"."course_offering_faculty" to "anon";

grant delete on table "public"."course_offering_faculty" to "authenticated";

grant insert on table "public"."course_offering_faculty" to "authenticated";

grant select on table "public"."course_offering_faculty" to "authenticated";

grant update on table "public"."course_offering_faculty" to "authenticated";

grant delete on table "public"."course_offering_faculty" to "service_role";

grant insert on table "public"."course_offering_faculty" to "service_role";

grant select on table "public"."course_offering_faculty" to "service_role";

grant update on table "public"."course_offering_faculty" to "service_role";

grant delete on table "public"."course_offerings" to "anon";

grant insert on table "public"."course_offerings" to "anon";

grant select on table "public"."course_offerings" to "anon";

grant update on table "public"."course_offerings" to "anon";

grant delete on table "public"."course_offerings" to "authenticated";

grant insert on table "public"."course_offerings" to "authenticated";

grant select on table "public"."course_offerings" to "authenticated";

grant update on table "public"."course_offerings" to "authenticated";

grant delete on table "public"."course_offerings" to "service_role";

grant insert on table "public"."course_offerings" to "service_role";

grant select on table "public"."course_offerings" to "service_role";

grant update on table "public"."course_offerings" to "service_role";

grant delete on table "public"."course_sessions" to "anon";

grant insert on table "public"."course_sessions" to "anon";

grant select on table "public"."course_sessions" to "anon";

grant update on table "public"."course_sessions" to "anon";

grant delete on table "public"."course_sessions" to "authenticated";

grant insert on table "public"."course_sessions" to "authenticated";

grant select on table "public"."course_sessions" to "authenticated";

grant update on table "public"."course_sessions" to "authenticated";

grant delete on table "public"."course_sessions" to "service_role";

grant insert on table "public"."course_sessions" to "service_role";

grant select on table "public"."course_sessions" to "service_role";

grant update on table "public"."course_sessions" to "service_role";

grant delete on table "public"."courses" to "anon";

grant insert on table "public"."courses" to "anon";

grant select on table "public"."courses" to "anon";

grant update on table "public"."courses" to "anon";

grant delete on table "public"."courses" to "authenticated";

grant insert on table "public"."courses" to "authenticated";

grant select on table "public"."courses" to "authenticated";

grant update on table "public"."courses" to "authenticated";

grant delete on table "public"."courses" to "service_role";

grant insert on table "public"."courses" to "service_role";

grant select on table "public"."courses" to "service_role";

grant update on table "public"."courses" to "service_role";

grant delete on table "public"."departments" to "anon";

grant insert on table "public"."departments" to "anon";

grant select on table "public"."departments" to "anon";

grant update on table "public"."departments" to "anon";

grant delete on table "public"."departments" to "authenticated";

grant insert on table "public"."departments" to "authenticated";

grant select on table "public"."departments" to "authenticated";

grant update on table "public"."departments" to "authenticated";

grant delete on table "public"."departments" to "service_role";

grant insert on table "public"."departments" to "service_role";

grant select on table "public"."departments" to "service_role";

grant update on table "public"."departments" to "service_role";

grant delete on table "public"."enrollments" to "anon";

grant insert on table "public"."enrollments" to "anon";

grant select on table "public"."enrollments" to "anon";

grant update on table "public"."enrollments" to "anon";

grant delete on table "public"."enrollments" to "authenticated";

grant insert on table "public"."enrollments" to "authenticated";

grant select on table "public"."enrollments" to "authenticated";

grant update on table "public"."enrollments" to "authenticated";

grant delete on table "public"."enrollments" to "service_role";

grant insert on table "public"."enrollments" to "service_role";

grant select on table "public"."enrollments" to "service_role";

grant update on table "public"."enrollments" to "service_role";

grant delete on table "public"."faculty" to "anon";

grant insert on table "public"."faculty" to "anon";

grant select on table "public"."faculty" to "anon";

grant update on table "public"."faculty" to "anon";

grant delete on table "public"."faculty" to "authenticated";

grant insert on table "public"."faculty" to "authenticated";

grant select on table "public"."faculty" to "authenticated";

grant update on table "public"."faculty" to "authenticated";

grant delete on table "public"."faculty" to "service_role";

grant insert on table "public"."faculty" to "service_role";

grant select on table "public"."faculty" to "service_role";

grant update on table "public"."faculty" to "service_role";

grant delete on table "public"."notices" to "anon";

grant insert on table "public"."notices" to "anon";

grant select on table "public"."notices" to "anon";

grant update on table "public"."notices" to "anon";

grant delete on table "public"."notices" to "authenticated";

grant insert on table "public"."notices" to "authenticated";

grant select on table "public"."notices" to "authenticated";

grant update on table "public"."notices" to "authenticated";

grant delete on table "public"."notices" to "service_role";

grant insert on table "public"."notices" to "service_role";

grant select on table "public"."notices" to "service_role";

grant update on table "public"."notices" to "service_role";

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant delete on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "authenticated";

grant select on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."program_courses" to "anon";

grant insert on table "public"."program_courses" to "anon";

grant select on table "public"."program_courses" to "anon";

grant update on table "public"."program_courses" to "anon";

grant delete on table "public"."program_courses" to "authenticated";

grant insert on table "public"."program_courses" to "authenticated";

grant select on table "public"."program_courses" to "authenticated";

grant update on table "public"."program_courses" to "authenticated";

grant delete on table "public"."program_courses" to "service_role";

grant insert on table "public"."program_courses" to "service_role";

grant select on table "public"."program_courses" to "service_role";

grant update on table "public"."program_courses" to "service_role";

grant delete on table "public"."programs" to "anon";

grant insert on table "public"."programs" to "anon";

grant select on table "public"."programs" to "anon";

grant update on table "public"."programs" to "anon";

grant delete on table "public"."programs" to "authenticated";

grant insert on table "public"."programs" to "authenticated";

grant select on table "public"."programs" to "authenticated";

grant update on table "public"."programs" to "authenticated";

grant delete on table "public"."programs" to "service_role";

grant insert on table "public"."programs" to "service_role";

grant select on table "public"."programs" to "service_role";

grant update on table "public"."programs" to "service_role";

grant delete on table "public"."results" to "anon";

grant insert on table "public"."results" to "anon";

grant select on table "public"."results" to "anon";

grant update on table "public"."results" to "anon";

grant delete on table "public"."results" to "authenticated";

grant insert on table "public"."results" to "authenticated";

grant select on table "public"."results" to "authenticated";

grant update on table "public"."results" to "authenticated";

grant delete on table "public"."results" to "service_role";

grant insert on table "public"."results" to "service_role";

grant select on table "public"."results" to "service_role";

grant update on table "public"."results" to "service_role";

grant delete on table "public"."semesters" to "anon";

grant insert on table "public"."semesters" to "anon";

grant select on table "public"."semesters" to "anon";

grant update on table "public"."semesters" to "anon";

grant delete on table "public"."semesters" to "authenticated";

grant insert on table "public"."semesters" to "authenticated";

grant select on table "public"."semesters" to "authenticated";

grant update on table "public"."semesters" to "authenticated";

grant delete on table "public"."semesters" to "service_role";

grant insert on table "public"."semesters" to "service_role";

grant select on table "public"."semesters" to "service_role";

grant update on table "public"."semesters" to "service_role";

grant delete on table "public"."students" to "anon";

grant insert on table "public"."students" to "anon";

grant select on table "public"."students" to "anon";

grant update on table "public"."students" to "anon";

grant delete on table "public"."students" to "authenticated";

grant insert on table "public"."students" to "authenticated";

grant select on table "public"."students" to "authenticated";

grant update on table "public"."students" to "authenticated";

grant delete on table "public"."students" to "service_role";

grant insert on table "public"."students" to "service_role";

grant select on table "public"."students" to "service_role";

grant update on table "public"."students" to "service_role";

grant delete on table "public"."timetables" to "anon";

grant insert on table "public"."timetables" to "anon";

grant select on table "public"."timetables" to "anon";

grant update on table "public"."timetables" to "anon";

grant delete on table "public"."timetables" to "authenticated";

grant insert on table "public"."timetables" to "authenticated";

grant select on table "public"."timetables" to "authenticated";

grant update on table "public"."timetables" to "authenticated";

grant delete on table "public"."timetables" to "service_role";

grant insert on table "public"."timetables" to "service_role";

grant select on table "public"."timetables" to "service_role";

grant update on table "public"."timetables" to "service_role";


  create policy "attendance_delete_management"
  on "public"."attendance"
  as permissive
  for delete
  to authenticated
using (public.has_role('management'::text));



  create policy "attendance_faculty_insert"
  on "public"."attendance"
  as permissive
  for insert
  to authenticated
with check (((public.get_my_role() = 'management'::text) OR ((public.get_my_role() = 'faculty'::text) AND (course_session_id IN ( SELECT cs.id
   FROM public.course_sessions cs
  WHERE (cs.course_offering_id IN ( SELECT cof.course_offering_id
           FROM public.course_offering_faculty cof
          WHERE (cof.faculty_id = public.get_my_faculty_id()))))))));



  create policy "attendance_faculty_update"
  on "public"."attendance"
  as permissive
  for update
  to authenticated
using (((public.get_my_role() = 'management'::text) OR ((public.get_my_role() = 'faculty'::text) AND (course_session_id IN ( SELECT cs.id
   FROM public.course_sessions cs
  WHERE (cs.course_offering_id IN ( SELECT cof.course_offering_id
           FROM public.course_offering_faculty cof
          WHERE (cof.faculty_id = public.get_my_faculty_id()))))))))
with check (((public.get_my_role() = 'management'::text) OR ((public.get_my_role() = 'faculty'::text) AND (course_session_id IN ( SELECT cs.id
   FROM public.course_sessions cs
  WHERE (cs.course_offering_id IN ( SELECT cof.course_offering_id
           FROM public.course_offering_faculty cof
          WHERE (cof.faculty_id = public.get_my_faculty_id()))))))));



  create policy "attendance_select_authenticated"
  on "public"."attendance"
  as permissive
  for select
  to authenticated
using ((public.has_role('management'::text) OR (public.has_role('faculty'::text) AND (EXISTS ( SELECT 1
   FROM ((public.enrollments e
     JOIN public.course_offering_faculty cof ON ((cof.course_offering_id = e.course_offering_id)))
     JOIN public.faculty f ON ((f.id = cof.faculty_id)))
  WHERE ((e.id = attendance.enrollment_id) AND (f.profile_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM (public.enrollments e
     JOIN public.students s ON ((s.id = e.student_id)))
  WHERE ((e.id = attendance.enrollment_id) AND (s.profile_id = auth.uid()))))));



  create policy "course_offering_faculty_delete_management"
  on "public"."course_offering_faculty"
  as permissive
  for delete
  to authenticated
using (public.has_role('management'::text));



  create policy "course_offering_faculty_insert_management"
  on "public"."course_offering_faculty"
  as permissive
  for insert
  to authenticated
with check (public.has_role('management'::text));



  create policy "course_offering_faculty_self_select"
  on "public"."course_offering_faculty"
  as permissive
  for select
  to authenticated
using (((faculty_id = public.get_my_faculty_id()) OR (public.get_my_role() = 'management'::text)));



  create policy "course_offering_faculty_update_management"
  on "public"."course_offering_faculty"
  as permissive
  for update
  to authenticated
using (public.has_role('management'::text))
with check (public.has_role('management'::text));



  create policy "course_offerings_delete_management"
  on "public"."course_offerings"
  as permissive
  for delete
  to authenticated
using (public.has_role('management'::text));



  create policy "course_offerings_insert_management"
  on "public"."course_offerings"
  as permissive
  for insert
  to authenticated
with check (public.has_role('management'::text));



  create policy "course_offerings_select_authenticated"
  on "public"."course_offerings"
  as permissive
  for select
  to authenticated
using (true);



  create policy "course_offerings_update_management"
  on "public"."course_offerings"
  as permissive
  for update
  to authenticated
using (public.has_role('management'::text))
with check (public.has_role('management'::text));



  create policy "course_sessions_delete_management"
  on "public"."course_sessions"
  as permissive
  for delete
  to authenticated
using (public.has_role('management'::text));



  create policy "course_sessions_faculty_insert"
  on "public"."course_sessions"
  as permissive
  for insert
  to authenticated
with check (((public.get_my_role() = 'management'::text) OR ((public.get_my_role() = 'faculty'::text) AND (course_offering_id IN ( SELECT cof.course_offering_id
   FROM public.course_offering_faculty cof
  WHERE (cof.faculty_id = public.get_my_faculty_id()))))));



  create policy "course_sessions_faculty_update"
  on "public"."course_sessions"
  as permissive
  for update
  to authenticated
using (((public.get_my_role() = 'management'::text) OR ((public.get_my_role() = 'faculty'::text) AND (course_offering_id IN ( SELECT cof.course_offering_id
   FROM public.course_offering_faculty cof
  WHERE (cof.faculty_id = public.get_my_faculty_id()))))))
with check (((public.get_my_role() = 'management'::text) OR ((public.get_my_role() = 'faculty'::text) AND (course_offering_id IN ( SELECT cof.course_offering_id
   FROM public.course_offering_faculty cof
  WHERE (cof.faculty_id = public.get_my_faculty_id()))))));



  create policy "course_sessions_select_authenticated"
  on "public"."course_sessions"
  as permissive
  for select
  to authenticated
using (true);



  create policy "courses_delete_management"
  on "public"."courses"
  as permissive
  for delete
  to authenticated
using (public.has_role('management'::text));



  create policy "courses_insert_management"
  on "public"."courses"
  as permissive
  for insert
  to authenticated
with check (public.has_role('management'::text));



  create policy "courses_select_authenticated"
  on "public"."courses"
  as permissive
  for select
  to authenticated
using (true);



  create policy "courses_update_management"
  on "public"."courses"
  as permissive
  for update
  to authenticated
using (public.has_role('management'::text))
with check (public.has_role('management'::text));



  create policy "departments_delete_management"
  on "public"."departments"
  as permissive
  for delete
  to authenticated
using (public.has_role('management'::text));



  create policy "departments_insert_management"
  on "public"."departments"
  as permissive
  for insert
  to authenticated
with check (public.has_role('management'::text));



  create policy "departments_select_authenticated"
  on "public"."departments"
  as permissive
  for select
  to authenticated
using (true);



  create policy "departments_update_management"
  on "public"."departments"
  as permissive
  for update
  to authenticated
using (public.has_role('management'::text))
with check (public.has_role('management'::text));



  create policy "enrollments_delete_management"
  on "public"."enrollments"
  as permissive
  for delete
  to authenticated
using (public.has_role('management'::text));



  create policy "enrollments_insert_management"
  on "public"."enrollments"
  as permissive
  for insert
  to authenticated
with check (public.has_role('management'::text));



  create policy "enrollments_select_authenticated"
  on "public"."enrollments"
  as permissive
  for select
  to authenticated
using ((public.has_role('management'::text) OR (public.has_role('faculty'::text) AND (EXISTS ( SELECT 1
   FROM (public.course_offering_faculty cof
     JOIN public.faculty f ON ((f.id = cof.faculty_id)))
  WHERE ((cof.course_offering_id = enrollments.course_offering_id) AND (f.profile_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = enrollments.student_id) AND (s.profile_id = auth.uid())))) OR (student_id = public.get_my_student_id()) OR (course_offering_id IN ( SELECT cof.course_offering_id
   FROM public.course_offering_faculty cof
  WHERE (cof.faculty_id = public.get_my_faculty_id())))));



  create policy "enrollments_update_management"
  on "public"."enrollments"
  as permissive
  for update
  to authenticated
using (public.has_role('management'::text))
with check (public.has_role('management'::text));



  create policy "faculty_delete_management"
  on "public"."faculty"
  as permissive
  for delete
  to authenticated
using (( SELECT public.has_role('management'::text) AS has_role));



  create policy "faculty_insert_management"
  on "public"."faculty"
  as permissive
  for insert
  to authenticated
with check (( SELECT public.has_role('management'::text) AS has_role));



  create policy "faculty_select_authenticated"
  on "public"."faculty"
  as permissive
  for select
  to authenticated
using ((public.has_role('management'::text) OR public.has_role('faculty'::text) OR (profile_id = auth.uid())));



  create policy "faculty_update_management"
  on "public"."faculty"
  as permissive
  for update
  to authenticated
using (( SELECT public.has_role('management'::text) AS has_role))
with check (( SELECT public.has_role('management'::text) AS has_role));



  create policy "notices_authenticated_select"
  on "public"."notices"
  as permissive
  for select
  to authenticated
using ((((audience = 'all'::text) OR (audience = public.get_my_role())) AND ((expires_at IS NULL) OR (expires_at > now()))));



  create policy "notices_delete_management"
  on "public"."notices"
  as permissive
  for delete
  to authenticated
using (public.has_role('management'::text));



  create policy "notices_insert_management"
  on "public"."notices"
  as permissive
  for insert
  to authenticated
with check (public.has_role('management'::text));



  create policy "notices_update_management"
  on "public"."notices"
  as permissive
  for update
  to authenticated
using (public.has_role('management'::text))
with check (public.has_role('management'::text));



  create policy "notifications_delete_own"
  on "public"."notifications"
  as permissive
  for delete
  to authenticated
using ((profile_id = auth.uid()));



  create policy "notifications_insert_management"
  on "public"."notifications"
  as permissive
  for insert
  to authenticated
with check (public.has_role('management'::text));



  create policy "notifications_self_select"
  on "public"."notifications"
  as permissive
  for select
  to authenticated
using (((profile_id = auth.uid()) OR (public.get_my_role() = 'management'::text)));



  create policy "notifications_self_update"
  on "public"."notifications"
  as permissive
  for update
  to authenticated
using (((profile_id = auth.uid()) OR (public.get_my_role() = 'management'::text)))
with check (((profile_id = auth.uid()) OR (public.get_my_role() = 'management'::text)));



  create policy "profiles_delete_management"
  on "public"."profiles"
  as permissive
  for delete
  to authenticated
using (( SELECT public.has_role('management'::text) AS has_role));



  create policy "profiles_insert_management"
  on "public"."profiles"
  as permissive
  for insert
  to authenticated
with check (( SELECT public.has_role('management'::text) AS has_role));



  create policy "profiles_select_authenticated"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using ((public.has_role('management'::text) OR (id = auth.uid())));



  create policy "profiles_update_authenticated"
  on "public"."profiles"
  as permissive
  for update
  to authenticated
using ((public.has_role('management'::text) OR (id = auth.uid())))
with check ((public.has_role('management'::text) OR (id = auth.uid())));



  create policy "program_courses_authenticated_select"
  on "public"."program_courses"
  as permissive
  for select
  to authenticated
using (true);



  create policy "program_courses_delete_management"
  on "public"."program_courses"
  as permissive
  for delete
  to authenticated
using (public.has_role('management'::text));



  create policy "program_courses_insert_management"
  on "public"."program_courses"
  as permissive
  for insert
  to authenticated
with check (public.has_role('management'::text));



  create policy "program_courses_update_management"
  on "public"."program_courses"
  as permissive
  for update
  to authenticated
using (public.has_role('management'::text))
with check (public.has_role('management'::text));



  create policy "programs_authenticated_select"
  on "public"."programs"
  as permissive
  for select
  to authenticated
using (true);



  create policy "programs_delete_management"
  on "public"."programs"
  as permissive
  for delete
  to authenticated
using (public.has_role('management'::text));



  create policy "programs_insert_management"
  on "public"."programs"
  as permissive
  for insert
  to authenticated
with check (public.has_role('management'::text));



  create policy "programs_update_management"
  on "public"."programs"
  as permissive
  for update
  to authenticated
using (public.has_role('management'::text))
with check (public.has_role('management'::text));



  create policy "results_delete_management"
  on "public"."results"
  as permissive
  for delete
  to authenticated
using (public.has_role('management'::text));



  create policy "results_faculty_insert"
  on "public"."results"
  as permissive
  for insert
  to authenticated
with check (((public.get_my_role() = 'management'::text) OR ((public.get_my_role() = 'faculty'::text) AND (enrollment_id IN ( SELECT e.id
   FROM public.enrollments e
  WHERE (e.course_offering_id IN ( SELECT cof.course_offering_id
           FROM public.course_offering_faculty cof
          WHERE (cof.faculty_id = public.get_my_faculty_id()))))))));



  create policy "results_faculty_update"
  on "public"."results"
  as permissive
  for update
  to authenticated
using (((public.get_my_role() = 'management'::text) OR ((public.get_my_role() = 'faculty'::text) AND (enrollment_id IN ( SELECT e.id
   FROM public.enrollments e
  WHERE (e.course_offering_id IN ( SELECT cof.course_offering_id
           FROM public.course_offering_faculty cof
          WHERE (cof.faculty_id = public.get_my_faculty_id()))))))))
with check (((public.get_my_role() = 'management'::text) OR ((public.get_my_role() = 'faculty'::text) AND (enrollment_id IN ( SELECT e.id
   FROM public.enrollments e
  WHERE (e.course_offering_id IN ( SELECT cof.course_offering_id
           FROM public.course_offering_faculty cof
          WHERE (cof.faculty_id = public.get_my_faculty_id()))))))));



  create policy "results_select_authenticated"
  on "public"."results"
  as permissive
  for select
  to authenticated
using ((public.has_role('management'::text) OR (public.has_role('faculty'::text) AND (EXISTS ( SELECT 1
   FROM ((public.enrollments e
     JOIN public.course_offering_faculty cof ON ((cof.course_offering_id = e.course_offering_id)))
     JOIN public.faculty f ON ((f.id = cof.faculty_id)))
  WHERE ((e.id = results.enrollment_id) AND (f.profile_id = auth.uid()))))) OR ((published_at IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (public.enrollments e
     JOIN public.students s ON ((s.id = e.student_id)))
  WHERE ((e.id = results.enrollment_id) AND (s.profile_id = auth.uid()))))) OR (enrollment_id IN ( SELECT e.id
   FROM public.enrollments e
  WHERE (e.student_id = public.get_my_student_id()))) OR (enrollment_id IN ( SELECT e.id
   FROM public.enrollments e
  WHERE (e.course_offering_id IN ( SELECT cof.course_offering_id
           FROM public.course_offering_faculty cof
          WHERE (cof.faculty_id = public.get_my_faculty_id())))))));



  create policy "semesters_authenticated_select"
  on "public"."semesters"
  as permissive
  for select
  to authenticated
using (true);



  create policy "semesters_delete_management"
  on "public"."semesters"
  as permissive
  for delete
  to authenticated
using (public.has_role('management'::text));



  create policy "semesters_insert_management"
  on "public"."semesters"
  as permissive
  for insert
  to authenticated
with check (public.has_role('management'::text));



  create policy "semesters_update_management"
  on "public"."semesters"
  as permissive
  for update
  to authenticated
using (public.has_role('management'::text))
with check (public.has_role('management'::text));



  create policy "students_delete_management"
  on "public"."students"
  as permissive
  for delete
  to authenticated
using (( SELECT public.has_role('management'::text) AS has_role));



  create policy "students_insert_management"
  on "public"."students"
  as permissive
  for insert
  to authenticated
with check (( SELECT public.has_role('management'::text) AS has_role));



  create policy "students_select_authenticated"
  on "public"."students"
  as permissive
  for select
  to authenticated
using ((public.has_role('management'::text) OR public.has_role('faculty'::text) OR (profile_id = auth.uid())));



  create policy "students_update_management"
  on "public"."students"
  as permissive
  for update
  to authenticated
using (( SELECT public.has_role('management'::text) AS has_role))
with check (( SELECT public.has_role('management'::text) AS has_role));



  create policy "timetables_delete_management"
  on "public"."timetables"
  as permissive
  for delete
  to authenticated
using (public.has_role('management'::text));



  create policy "timetables_insert_management"
  on "public"."timetables"
  as permissive
  for insert
  to authenticated
with check (public.has_role('management'::text));



  create policy "timetables_select_authenticated"
  on "public"."timetables"
  as permissive
  for select
  to authenticated
using (true);



  create policy "timetables_update_management"
  on "public"."timetables"
  as permissive
  for update
  to authenticated
using (public.has_role('management'::text))
with check (public.has_role('management'::text));



