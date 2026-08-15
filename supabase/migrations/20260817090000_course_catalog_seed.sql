-- Phase 8C — factual course catalog seed.
--
-- Seeds ONLY course_code / title / credit_hours / department, from the
-- course lists supplied for Environmental Geosciences, Geospatial
-- Sciences, PGD Geotechnical & Highway Engineering, and PGD Gemology.
-- These are catalog facts, not curriculum requirements — no row here
-- implies compulsory/elective status, a specialization requirement, a
-- recommended semester, a prerequisite, or PhD entry-basis applicability.
-- curriculum_requirements (Phase 8B) remains empty; this migration does
-- not touch it.
--
-- Idempotent: `on conflict (code) do nothing` against courses.code's
-- existing UNIQUE constraint, so re-running this migration (or applying
-- it to a database that already has some of these codes for any reason)
-- is a no-op for rows that already exist rather than an error.
--
-- `insert ... select ... from departments d ... where d.code = 'X'`
-- mirrors the exact pattern the Phase 3 seed migration
-- (20260814181500_academic_progress_seed_data.sql) already uses for
-- specializations: departments are real institutional data entered
-- directly (never seeded by any migration — confirmed empty on a fresh
-- local `db reset`), so a course block whose department code doesn't
-- exist yet simply seeds zero rows for that block rather than erroring
-- the whole migration. This keeps `db reset` clean on an empty local
-- database (the standard local test flow) while still seeding correctly
-- against remote, where the four departments (Geol, Envg, Geophy, Geosp)
-- already exist. Verified counts against remote are reported in the
-- Phase 8C completion report, the same way Phase 3's specialization seed
-- was verified.
--
-- Department mapping (courses.department_id — a catalog fact: which
-- department administratively owns the course, not which program's
-- curriculum uses it):
--   Geol.* -> Geol (Geology) — exact code-prefix match, including the
--     "related/general" courses shared by the Environmental Geosciences
--     and Geospatial Sciences sections, and the PGD Geotechnical/Highway
--     and PGD Gemology course blocks (all supplied under Geol.* codes).
--   Envg.* -> Envg (Environmental Geosciences) — exact code-prefix match.
--   Geos.* -> Geosp (Geospatial Sciences) — the supplied source groups
--     every Geos.* course under its own "GEOSPATIAL SCIENCES" section
--     header; the department code (Geosp) simply isn't a literal string
--     match to the course code prefix (Geos), which is expected — course
--     codes and department codes are independent identifiers.
--   Geophy (Geophysics) receives no seeded courses — no Geophysics
--     course list was supplied.
--
-- SKIPPED — flagged, not guessed (see the Phase 8C completion report for
-- the full list):
--   Envg.799 (Seminar) — supplied credit hours are a range ("1-3"), and
--     courses.credit_hours is a single numeric value; seeding an
--     arbitrary point within that range would misrepresent the source.
--   Two "Project Report: additional 3 CH project" notes (PGD
--     Geotechnical/Highway and PGD Gemology) — no course code was
--     supplied for either, so no catalog row can be created for them
--     without inventing a code.
--
-- PRESERVED VERBATIM (not "corrected"): two supplied titles appear to
-- contain source typos — "Computing with MATLABORATORY" (Geol.501) and
-- "Global Positing System" (Geos.700). Silently rewriting them would be
-- altering supplied data rather than reproducing it; both are seeded
-- exactly as given and flagged in the completion report for confirmation.
--
-- NORMALIZED CODE (not invented content): the source lists both
-- "Geos.730" (GIS Data Management) and "Geos.730 B" (Geological
-- applications of Remote sensing) as two distinct courses with different
-- titles/content. Since courses.code is UNIQUE and a literal space is an
-- awkward key, "Geos.730 B" is seeded as "Geos.730B" (space removed) —
-- the identifying code is normalized, the course content is not altered.
--
-- Credit-hour notation "3(2+1)" (lecture+practical breakdown, e.g.
-- Geos.730B, Geos.830) is seeded as credit_hours = 3 — the parenthetical
-- is a breakdown annotation of the same total, not a different total, and
-- no lecture/practical-hour columns exist (explicitly not added this
-- phase).

-- Geol — related/general courses, plus PGD Geotechnical/Highway and PGD Gemology
-- ("Project Report: additional 3 CH" notes skipped in both PGD blocks: no course code supplied)
insert into public.courses (department_id, code, name, credit_hours)
select d.id, x.code, x.name, x.credit_hours
from public.departments d
cross join (values
  ('Geol.500', 'Computer Application for Earth Sciences', 2::numeric),
  ('Geol.501', 'Computing with MATLABORATORY', 3),
  ('Geol.520', 'Chemical Methods of Rock Analysis', 2),
  ('Geol.702', 'Modern Methods of Geochemical Analysis', 3),
  ('Geol.703', 'Applied Geostatistics', 3),
  ('Geol.706', 'Research Methodology', 3),
  ('Geol.634', 'Geological & Geophysical Investigations', 3),
  ('Geol.635', 'Geotechnical Aspects of Dam and Reservoir Construction', 3),
  ('Geol.636', 'Foundation Engineering', 3),
  ('Geol.637', 'Concrete Technology', 3),
  ('Geol.638', 'Highway Engineering', 3),
  ('Geol.639', 'Rock Mechanics', 3),
  ('Geol.640', 'Material Testing', 3),
  ('Geol.641', 'Tunnel Engineering', 3),
  ('Geol.642', 'Numerical Modelling in Geotechnical Engineering', 3),
  ('Geol.617', 'Introduction to Gemology', 3),
  ('Geol.618', 'Crystallography', 3),
  ('Geol.619', 'Gem Testing and Evaluation', 3),
  ('Geol.620', 'Gemstones of Pakistan', 3),
  ('Geol.621', 'Imitations and synthetic and treated gemstones', 3),
  ('Geol.625', 'Field Gemology', 3),
  ('Geol.761', 'Mineralogy', 3)
) as x(code, name, credit_hours)
where d.code = 'Geol'
on conflict (code) do nothing;

-- Envg — MS/MPhil + PhD Environmental Geosciences (Envg.799 Seminar skipped: supplied CH is a range, not a single value)
insert into public.courses (department_id, code, name, credit_hours)
select d.id, x.code, x.name, x.credit_hours
from public.departments d
cross join (values
  ('Envg.700', 'Geological Waste Management', 3::numeric),
  ('Envg.705', 'Soil Classification', 3),
  ('Envg.706', 'Monitoring of Gas Fluxes', 3),
  ('Envg.708', 'Soil Mineralogy', 3),
  ('Envg.710', 'Geology of Earthquakes', 3),
  ('Envg.715', 'Disaster Mitigation', 3),
  ('Envg.720', 'Contaminated Land and Remediation', 3),
  ('Envg.725', 'Environmental Geology (Part I)', 3),
  ('Envg.726', 'Environmental Geology (Part II)', 3),
  ('Envg.728', 'Ecohydrology', 3),
  ('Envg.730', 'Field methods in environmental sciences', 3),
  ('Envg.735', 'Seismic Hazard Analyses', 3),
  ('Envg.740', 'Geo-environmental Mapping', 3),
  ('Envg.745', 'Mountain Environment', 3),
  ('Envg.750', 'Natural Hazards: Assessment, mapping and Mitigation Tools', 3),
  ('Envg.755', 'Natural Resource Management', 3),
  ('Envg.790', 'Environment and Urbanization', 3),
  ('Envg.800', 'Wetland Geosciences', 3),
  ('Envg.804', 'Evaluation and Remediation of Land Contamination', 3),
  ('Envg.805', 'Geoecology', 3),
  ('Envg.806', 'Dryland Issues: Preparedness and Mitigation', 3),
  ('Envg.807', 'Hazardous Minerals Impact Assessment', 3),
  ('Envg.810', 'Paleoclimatology (Part-I)', 3),
  ('Envg.811', 'Paleoclimatology (Part-II)', 3),
  ('Envg.815', 'Environmental Geochemistry', 3),
  ('Envg.820', 'Climate Change', 3),
  ('Envg.835', 'Hydrochemistry and Groundwater Pollution', 3),
  ('Envg.840', 'Watershed Management', 3)
) as x(code, name, credit_hours)
where d.code = 'Envg'
on conflict (code) do nothing;

-- Geosp — MS/MPhil + PhD Geospatial Sciences
insert into public.courses (department_id, code, name, credit_hours)
select d.id, x.code, x.name, x.credit_hours
from public.departments d
cross join (values
  ('Geos.700', 'Global Positing System', 3::numeric),
  ('Geos.705', 'Geographical Information Systems (GIS)', 3),
  ('Geos.710', 'Remote Sensing', 3),
  ('Geos.715', 'Digital image processing', 3),
  ('Geos.720', 'Cartography', 3),
  ('Geos.722', 'Digital Terrain Modeling', 3),
  ('Geos.725', 'Land Surveying', 3),
  ('Geos.730', 'GIS Data Management', 3),
  ('Geos.730B', 'Geological applications of Remote sensing', 3),
  ('Geos.733', 'Seismic Hazard Analyses', 3),
  ('Geos.735', 'Geodesy', 3),
  ('Geos.740', 'Remote Sensing of Hydrologic Processes', 3),
  ('Geos.800', 'Spatial Data Modeling using GIS', 3),
  ('Geos.805', 'Advance Remote Sensing', 3),
  ('Geos.810', 'Application of GIS and RS to Hazard Mapping', 3),
  ('Geos.815', 'Application of Geo-informatics in Natural Resource Management', 3),
  ('Geos.820', 'Advanced Digital Terrain Modeling', 3),
  ('Geos.823', 'Applications of Remote Sensing in Hydrology', 3),
  ('Geos.825', 'Modelling of Water Resource Dynamics', 3),
  ('Geos.830', 'Advanced Remote Sensing for Geology', 3)
) as x(code, name, credit_hours)
where d.code = 'Geosp'
on conflict (code) do nothing;
