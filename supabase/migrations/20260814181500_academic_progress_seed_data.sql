-- Academic Portal — Phase 3 seed data: specializations, NCEG faculty roster,
-- MS/MPhil + PhD milestone templates, document requirements.
--
-- Does NOT create any students (none exist yet; explicitly instructed not
-- to fabricate any). Does NOT create Auth accounts for faculty (explicitly
-- instructed not to) — every faculty row below has profile_id left null.
--
-- Explicit judgment calls made while writing this seed (flagged again in
-- the Phase 3 report, not just here):
--   - "Dr. Waqas Ahmed" appears in the supplied Associate Professor roster
--     and matches the name on the sole existing profile (management role,
--     waqas.nce@uop.edu.pk). This seed does NOT link that faculty row's
--     profile_id to that profile — left null like every other roster
--     entry, since linking a real person's account to a new role is a
--     consequential decision this migration should not make silently.
--   - No department is stated per-person anywhere in the supplied roster,
--     so department_id is left null for all 27 faculty rows, per explicit
--     instruction not to infer it.
--   - milestone_templates.prerequisite_milestone_id is used where a
--     milestone's relative-date target (target_days_after_prerequisite)
--     needs a specific anchor, which is not always the immediately
--     preceding milestone by sequence_no (e.g. PhD comprehensive exam is
--     dated from coursework completion, not from the intervening GSC
--     presentation). sequence_no remains the authoritative *display/
--     ordering* signal; prerequisite_milestone_id is the *dating* anchor
--     where one applies, and is left null at fork/merge points that a
--     single-parent chain cannot represent (see the PhD section below).

-- ============================================================
-- A. Specializations (exactly the supplied list; none invented for Geol)
-- ============================================================

insert into public.specializations (department_id, name)
select d.id, x.name
from public.departments d
cross join (values
  ('Earthquake Seismology'),
  ('Hydrogeophysics'),
  ('Exploration Seismology'),
  ('Petrophysics'),
  ('Gravity'),
  ('Magnetism')
) as x(name)
where d.code = 'Geophy'
on conflict (department_id, name) do nothing;

insert into public.specializations (department_id, name)
select d.id, x.name
from public.departments d
cross join (values
  ('Natural Hazards'),
  ('Environmental Geochemistry'),
  ('Medical Geology'),
  ('Climatology'),
  ('Landscape Ecology'),
  ('Environmental Soil Science'),
  ('Environmental Modeling')
) as x(name)
where d.code = 'Envg'
on conflict (department_id, name) do nothing;

insert into public.specializations (department_id, name)
select d.id, x.name
from public.departments d
cross join (values
  ('GIS/Remote Sensing'),
  ('GPS Geodesy')
) as x(name)
where d.code = 'Geosp'
on conflict (department_id, name) do nothing;

-- ============================================================
-- B. NCEG faculty roster (27 people; no department, email, employee
--    number, or profile_id supplied or inferred — see header note)
-- ============================================================

insert into public.faculty (name, designation, status)
select x.name, x.designation, 'active'
from (values
  ('Dr. Liaqat Ali', 'Director & Professor'),

  ('Dr. M. Qasim Jan', 'Professor Emeritus'),
  ('Dr. M. Tahir Shah', 'Professor Emeritus'),

  ('Dr. M. Hanif', 'Professor'),
  ('Dr. Khalid Latif', 'Professor'),

  ('Dr. Samina Siddiqui', 'Associate Professor'),
  ('Dr. Muhammad Shafique', 'Associate Professor'),
  ('Dr. Khaista Rehman', 'Associate Professor'),
  ('Dr. Said Muhammad', 'Associate Professor'),
  ('Dr. Waqas Ahmed', 'Associate Professor'),

  ('Ghazanfar Ali Khattak', 'Assistant Professor'),
  ('Dr. Seema Anjum', 'Assistant Professor'),
  ('Dr. Muhammad Ali', 'Assistant Professor'),
  ('Dr. Syed Ali Turab', 'Assistant Professor'),
  ('Dr. Sohail Wahid', 'Assistant Professor'),
  ('Dr. Sarfraz Khan', 'Assistant Professor'),
  ('Dr. Shah Rukh', 'Assistant Professor'),
  ('Dr. Muhammad Younis Khan', 'Assistant Professor'),
  ('Dr. Saad Khan', 'Assistant Professor'),

  ('Dr. Wajid Ali', 'Research Associate'),
  ('Abdul Rashid Pasha', 'Research Associate'),
  ('Mr. Shakir Ullah', 'Research Associate'),
  ('Mr. Muhammad Sadiq', 'Research Associate'),

  ('Abdul Wahab', 'Junior Research Assistant'),
  ('Dr. Shuja Ullah', 'Junior Research Assistant'),
  ('Muhammad Muslim', 'Junior Research Assistant'),
  ('Faheem Ahmed', 'Junior Research Assistant')
) as x(name, designation)
where not exists (select 1 from public.faculty f where f.name = x.name);

-- ============================================================
-- C. MS/MPhil milestone templates (degree_level = 'master')
--    Uniform across programs (program_id null); no entry-basis fork
--    (that distinction is PhD-only per the supplied brief).
-- ============================================================

insert into public.milestone_templates
  (id, degree_level, milestone_code, title, description, sequence_no, required, target_semester, category, prerequisite_milestone_id)
values
  ('b0000000-0000-0000-0000-000000000001', 'master', 'ADMISSION_APPROVAL', 'Admission Approval', null, 1, true, null, 'Admission', null),
  ('b0000000-0000-0000-0000-000000000002', 'master', 'SUPERVISOR_APPROVAL', 'Supervisor Approval', 'Preferably at admission; must not be later than semester 3.', 2, true, 3, 'Supervisor', 'b0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000003', 'master', 'COURSE_WORK', 'Course Work', '24 credit hours. Normally completed within the first 2-3 semesters; must not be later than the 3rd semester.', 3, true, 3, 'Coursework', 'b0000000-0000-0000-0000-000000000002'),
  ('b0000000-0000-0000-0000-000000000004', 'master', 'COURSE_WORK_APPROVAL', 'Course Work Approval', null, 4, true, 3, 'Coursework', 'b0000000-0000-0000-0000-000000000003'),
  ('b0000000-0000-0000-0000-000000000005', 'master', 'GSC_PRESENTATION', 'GSC Presentation', null, 5, true, null, 'Research Proposal', 'b0000000-0000-0000-0000-000000000004'),
  ('b0000000-0000-0000-0000-000000000006', 'master', 'RESEARCH_TOPIC_PROPOSAL', 'Research Topic / Proposal Preparation', null, 6, true, null, 'Research Proposal', 'b0000000-0000-0000-0000-000000000005'),
  ('b0000000-0000-0000-0000-000000000007', 'master', 'ASRB_PRESENTATION', 'ASRB Presentation', 'Research proposal should reach the ASRB sub-committee no later than the 4th semester.', 7, true, 4, 'Research Proposal', 'b0000000-0000-0000-0000-000000000006'),
  ('b0000000-0000-0000-0000-000000000008', 'master', 'CORRECTED_PROPOSAL_SUBMISSION', 'Corrected Research Proposal Submission', 'Submitted to DAS.', 8, true, null, 'Research Proposal', 'b0000000-0000-0000-0000-000000000007'),
  ('b0000000-0000-0000-0000-000000000009', 'master', 'EXTENSION_APPLICATION', 'Extension Application', 'Applicable only where needed; not a fixed-timeline milestone.', 9, false, null, 'Administrative', null),
  ('b0000000-0000-0000-0000-000000000010', 'master', 'THESIS_RESEARCH_PERIOD', 'Thesis Research Period', 'After ASRB approval, the scholar must conduct thesis research for at least one semester before thesis submission (approximated as 180 days below; adjustable by Management).', 10, true, null, 'Thesis', 'b0000000-0000-0000-0000-000000000008'),
  ('b0000000-0000-0000-0000-000000000011', 'master', 'THESIS_SUBMISSION', 'Thesis Submission', 'Should occur early enough to meet the degree-tenure deadline (tenure itself is not encoded here — see Phase 3 report).', 11, true, null, 'Thesis', 'b0000000-0000-0000-0000-000000000010'),
  ('b0000000-0000-0000-0000-000000000012', 'master', 'THESIS_REVIEW_EXAMINATION', 'Thesis Review / Examination', null, 12, true, null, 'Thesis', 'b0000000-0000-0000-0000-000000000011'),
  ('b0000000-0000-0000-0000-000000000013', 'master', 'THESIS_CORRECTIONS', 'Thesis Corrections', 'Only required if the review calls for corrections.', 13, false, null, 'Thesis', 'b0000000-0000-0000-0000-000000000012'),
  ('b0000000-0000-0000-0000-000000000014', 'master', 'VIVA_VOCE', 'Viva Voce', null, 14, true, null, 'Examination', 'b0000000-0000-0000-0000-000000000012'),
  ('b0000000-0000-0000-0000-000000000015', 'master', 'RESULT_DECLARATION', 'Result Declaration / Notification', null, 15, true, null, 'Result', 'b0000000-0000-0000-0000-000000000014'),
  ('b0000000-0000-0000-0000-000000000016', 'master', 'FINAL_TRANSCRIPT', 'Final Transcript', null, 16, true, null, 'Result', 'b0000000-0000-0000-0000-000000000015')
on conflict do nothing;

update public.milestone_templates
  set target_days_after_prerequisite = 180
  where id = 'b0000000-0000-0000-0000-000000000010';

-- ============================================================
-- D. PhD milestone templates (degree_level = 'phd')
--    Coursework, both comprehensive-exam attempts, ASRB Presentation, and
--    Thesis Research Period are split into two rows each — one per
--    applicable_entry_basis — because the supplied brief gives genuinely
--    different target_semester values for MS/MPhil/LLM-entry vs
--    BS/Master-entry scholars. Every other PhD milestone is a single row
--    (applicable_entry_basis null) because no differing rule was supplied
--    for it. See the header note on prerequisite_milestone_id at
--    fork/merge points.
-- ============================================================

insert into public.milestone_templates
  (id, degree_level, milestone_code, title, description, sequence_no, required, target_semester, applicable_entry_basis, category, prerequisite_milestone_id)
values
  ('c0000000-0000-0000-0000-000000000001', 'phd', 'ADMISSION_APPROVAL', 'Admission Approval', null, 1, true, null, null, 'Admission', null),
  ('c0000000-0000-0000-0000-000000000002', 'phd', 'SUPERVISOR_APPROVAL', 'Supervisor Approval', 'Preferably at admission; must not be later than semester 4 (same deadline for both entry-basis tracks per the supplied brief).', 2, true, 4, null, 'Supervisor', 'c0000000-0000-0000-0000-000000000001'),

  ('c0000000-0000-0000-0000-000000000003', 'phd', 'COURSEWORK', 'Coursework', '24 or 48 CH. Normally 2-3 semesters; must not exceed the 3rd semester. Applies to scholars admitted on an MS/MPhil/LLM basis.', 3, true, 3, 'ms_mphil_llm', 'Coursework', 'c0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000004', 'phd', 'COURSEWORK', 'Coursework', '24 or 48 CH. Normally 4-6 semesters; must not exceed the 6th semester. Applies to scholars admitted on a BS/Master basis.', 3, true, 6, 'bs_master', 'Coursework', 'c0000000-0000-0000-0000-000000000002'),

  ('c0000000-0000-0000-0000-000000000005', 'phd', 'GSC_PRESENTATION', 'GSC Presentation', 'Prerequisite intentionally left unset: it follows coursework regardless of entry-basis track, but coursework is represented as two track-specific rows above — see migration header note on fork/merge points.', 4, true, null, null, 'Research Proposal', null),

  ('c0000000-0000-0000-0000-000000000006', 'phd', 'COMPREHENSIVE_EXAMINATION', 'Comprehensive Examination', 'Within 3 months of coursework completion. Dated from the MS/MPhil/LLM-entry coursework row (not from the intervening GSC Presentation) per the supplied brief.', 5, true, null, 'ms_mphil_llm', 'Examination', 'c0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000007', 'phd', 'COMPREHENSIVE_EXAMINATION', 'Comprehensive Examination', 'Within 3 months of coursework completion. Dated from the BS/Master-entry coursework row.', 5, true, null, 'bs_master', 'Examination', 'c0000000-0000-0000-0000-000000000004'),

  ('c0000000-0000-0000-0000-000000000008', 'phd', 'COMPREHENSIVE_EXAMINATION_SECOND', 'Comprehensive Examination (Second Attempt)', 'Where required: within 3 months of the first attempt.', 5, false, null, 'ms_mphil_llm', 'Examination', 'c0000000-0000-0000-0000-000000000006'),
  ('c0000000-0000-0000-0000-000000000009', 'phd', 'COMPREHENSIVE_EXAMINATION_SECOND', 'Comprehensive Examination (Second Attempt)', 'Where required: within 3 months of the first attempt.', 5, false, null, 'bs_master', 'Examination', 'c0000000-0000-0000-0000-000000000007'),

  ('c0000000-0000-0000-0000-000000000010', 'phd', 'CONFIRMATION_OF_ADMISSION', 'Confirmation of Admission', 'Prerequisite intentionally left unset (merge point after the comprehensive exam, which is track-split) — see migration header note.', 6, true, null, null, 'Examination', null),

  ('c0000000-0000-0000-0000-000000000011', 'phd', 'RESEARCH_TOPIC_PROPOSAL', 'Research Topic / Proposal', null, 7, true, null, null, 'Research Proposal', 'c0000000-0000-0000-0000-000000000010'),

  ('c0000000-0000-0000-0000-000000000012', 'phd', 'ASRB_PRESENTATION', 'ASRB Presentation', 'Research topic submission must not be later than semester 5. Applies to scholars admitted on an MS/MPhil/LLM basis.', 8, true, 5, 'ms_mphil_llm', 'Research Proposal', 'c0000000-0000-0000-0000-000000000011'),
  ('c0000000-0000-0000-0000-000000000013', 'phd', 'ASRB_PRESENTATION', 'ASRB Presentation', 'Research topic submission must not be later than semester 7. Applies to scholars admitted on a BS/Master basis.', 8, true, 7, 'bs_master', 'Research Proposal', 'c0000000-0000-0000-0000-000000000011'),

  ('c0000000-0000-0000-0000-000000000014', 'phd', 'CORRECTED_PROPOSAL_SUBMISSION', 'Corrected Research Proposal Submission', 'Submitted to DAS. Prerequisite intentionally left unset (merge point after ASRB Presentation, which is track-split).', 9, true, null, null, 'Research Proposal', null),

  ('c0000000-0000-0000-0000-000000000015', 'phd', 'EXTENSION_APPLICATION', 'Extension Application', 'Applicable only where needed; not a fixed-timeline milestone.', 10, false, null, null, 'Administrative', null),

  ('c0000000-0000-0000-0000-000000000016', 'phd', 'RESEARCH_PERIOD', 'Research Period', 'At least one year of research required after ASRB approval, before thesis submission (approximated as 365 days below; adjustable by Management). Dated from the MS/MPhil/LLM-entry ASRB Presentation.', 11, true, null, 'ms_mphil_llm', 'Thesis', 'c0000000-0000-0000-0000-000000000012'),
  ('c0000000-0000-0000-0000-000000000017', 'phd', 'RESEARCH_PERIOD', 'Research Period', 'At least one year of research required after ASRB approval, before thesis submission. Dated from the BS/Master-entry ASRB Presentation.', 11, true, null, 'bs_master', 'Thesis', 'c0000000-0000-0000-0000-000000000013'),

  ('c0000000-0000-0000-0000-000000000018', 'phd', 'THESIS_SUBMISSION', 'Thesis Submission', 'Prerequisite intentionally left unset (merge point after Research Period, which is track-split).', 12, true, null, null, 'Thesis', null),
  ('c0000000-0000-0000-0000-000000000019', 'phd', 'FOREIGN_NATIONAL_REVIEWER_PROCESS', 'Foreign/National Reviewer Process', null, 13, true, null, null, 'Thesis', 'c0000000-0000-0000-0000-000000000018'),
  ('c0000000-0000-0000-0000-000000000020', 'phd', 'THESIS_CORRECTIONS', 'Thesis Corrections', 'Only required if the review calls for corrections.', 14, false, null, null, 'Thesis', 'c0000000-0000-0000-0000-000000000019'),
  ('c0000000-0000-0000-0000-000000000021', 'phd', 'DEFENCE_VIVA_VOCE', 'Defence / Viva Voce', null, 15, true, null, null, 'Examination', 'c0000000-0000-0000-0000-000000000019'),
  ('c0000000-0000-0000-0000-000000000022', 'phd', 'RESULT_DECLARATION', 'Result Declaration / Notification', null, 16, true, null, null, 'Result', 'c0000000-0000-0000-0000-000000000021'),
  ('c0000000-0000-0000-0000-000000000023', 'phd', 'FINAL_TRANSCRIPT', 'Final Transcript', null, 17, true, null, null, 'Result', 'c0000000-0000-0000-0000-000000000022')
on conflict do nothing;

update public.milestone_templates
  set target_days_after_prerequisite = 90
  where id in (
    'c0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000007',
    'c0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000009'
  );

update public.milestone_templates
  set target_days_after_prerequisite = 365
  where id in ('c0000000-0000-0000-0000-000000000016', 'c0000000-0000-0000-0000-000000000017');

-- ============================================================
-- E. Document requirements
--
-- Only the concretely named documents from the supplied brief are seeded
-- (e.g. "other program-specific requirements" / "other applicable forms"
-- are vague catch-alls, not document names, and are not seeded as
-- placeholder rows). Attached to every matching milestone_templates row
-- (both MS/MPhil and PhD, and both PhD entry-basis variants where the
-- relevant milestone is track-split) so the requirement surfaces
-- regardless of which template a given student's applicable set includes.
-- ============================================================

insert into public.document_requirements (milestone_template_id, document_name, required)
select mt.id, x.document_name, true
from public.milestone_templates mt
join (values
  ('Research Proposal'),
  ('Plagiarism Certificate'),
  ('Reply to GSC Comments'),
  ('Correction Certificate')
) as x(document_name) on true
where mt.milestone_code = 'ASRB_PRESENTATION';

insert into public.document_requirements (milestone_template_id, document_name, required)
select mt.id, x.document_name, true
from public.milestone_templates mt
join (values
  ('Corrected Research Proposal'),
  ('Supervisor Correction Certificate'),
  ('Reply to ASRB Comments/Minutes')
) as x(document_name) on true
where mt.milestone_code = 'CORRECTED_PROPOSAL_SUBMISSION';

insert into public.document_requirements (milestone_template_id, document_name, required)
select mt.id, x.document_name, true
from public.milestone_templates mt
join (values
  ('Thesis Soft Copy'),
  ('Examiner List'),
  ('Plagiarism Certificate'),
  ('Relevant Publication Documents'),
  ('NCEG/UoP Clearance')
) as x(document_name) on true
where mt.milestone_code = 'THESIS_SUBMISSION';

insert into public.document_requirements (milestone_template_id, document_name, required)
select mt.id, x.document_name, true
from public.milestone_templates mt
join (values
  ('Library Submission'),
  ('IT Submission'),
  ('Secrecy Submission'),
  ('Examiner Fee Receipt/Acknowledgment')
) as x(document_name) on true
where mt.milestone_code = 'RESULT_DECLARATION';
