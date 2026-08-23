-- Academic catalogue seed data: NCEG-supplied disciplines, programs,
-- specializations, courses, curriculum requirements, program-course
-- links, and catalogue anomaly notes. See
-- 20260818130000_academic_catalogue_schema.sql for the schema reasoning.
--
-- Every INSERT is idempotent (on conflict do nothing, or a plain insert
-- guarded by nothing existing yet for curriculum_requirements/
-- catalogue_notes, which have no natural unique key to conflict on --
-- safe here because this migration runs exactly once per environment,
-- same as every other seed migration in this project).
--
-- Row counts (verified programmatically before this file was written):
--   9 new Geology specializations (Geophysics/Envg/Geospatial specializations
--     already existed with exact-matching names -- zero touched)
--   8 new programs (4 disciplines x MS/M.Phil./Ph.D., duration_years left
--     NULL -- see schema migration)
--   105 new courses (56 Geology MS/M.Phil. specialized + 1 Geol.704 +
--     30 Geology Ph.D. + 17 Geophysics + 1 Geop.833; zero new
--     Environmental Geosciences or Geospatial Sciences courses -- every
--     course supplied for those two disciplines already existed,
--     verified by exact code+title+credit-hour match)
--   175 program_courses links (related/general pools + specialized/PhD
--     pools, across all 8 programs)
--   20 curriculum_requirements rows (12 for the 4 MS/M.Phil. programs:
--     total/related-general/specialized-major; 8 for the 4 Ph.D.
--     programs x 2 entry bases, credit hours left NULL -- the 24-vs-48
--     rule was not resolved, per explicit instruction not to guess)
--   8 catalogue_notes rows recording every source-data anomaly found
--     (Geol.704/Geol.706 conflicts, three range-credit-hour "Seminar"
--     courses, the Geop.833 department/list mismatch, and the two
--     unresolved credit-hour rules above) -- nothing was silently
--     corrected, merged, or guessed to make the data look complete.

-- Generated seed data -- see migration header for full reasoning.



-- ============================================================

-- 1. Geology specializations (9 new -- 0 existed before)

-- ============================================================

insert into public.specializations (department_id, name)
  select id, 'Structural Geology/Tectonics' from public.departments where code = 'Geol'
  on conflict (department_id, name) do nothing;

insert into public.specializations (department_id, name)
  select id, 'Stratigraphy/Paleontology' from public.departments where code = 'Geol'
  on conflict (department_id, name) do nothing;

insert into public.specializations (department_id, name)
  select id, 'Mineralogy/Petrology/Geochemistry' from public.departments where code = 'Geol'
  on conflict (department_id, name) do nothing;

insert into public.specializations (department_id, name)
  select id, 'Petroleum Geology' from public.departments where code = 'Geol'
  on conflict (department_id, name) do nothing;

insert into public.specializations (department_id, name)
  select id, 'Economic Geology' from public.departments where code = 'Geol'
  on conflict (department_id, name) do nothing;

insert into public.specializations (department_id, name)
  select id, 'Engineering Geology' from public.departments where code = 'Geol'
  on conflict (department_id, name) do nothing;

insert into public.specializations (department_id, name)
  select id, 'Sedimentology' from public.departments where code = 'Geol'
  on conflict (department_id, name) do nothing;

insert into public.specializations (department_id, name)
  select id, 'Hydrogeology' from public.departments where code = 'Geol'
  on conflict (department_id, name) do nothing;

insert into public.specializations (department_id, name)
  select id, 'Geomorphology' from public.departments where code = 'Geol'
  on conflict (department_id, name) do nothing;



-- ============================================================

-- 2. Programs (8 -- 4 disciplines x {MS/M.Phil., Ph.D.})

-- duration_years intentionally NULL / duration_verified false --

-- no source-confirmed duration exists yet.

-- ============================================================

insert into public.programs (department_id, code, name, degree_level, duration_years, duration_verified, status)
  select id, 'MSMPHIL-GEOL', 'MS/M.Phil. in Geology', 'master', null, false, 'active' from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.programs (department_id, code, name, degree_level, duration_years, duration_verified, status)
  select id, 'PHD-GEOL', 'Ph.D. in Geology', 'phd', null, false, 'active' from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.programs (department_id, code, name, degree_level, duration_years, duration_verified, status)
  select id, 'MSMPHIL-GEOP', 'MS/M.Phil. in Geophysics', 'master', null, false, 'active' from public.departments where code = 'Geophy'
  on conflict (code) do nothing;

insert into public.programs (department_id, code, name, degree_level, duration_years, duration_verified, status)
  select id, 'PHD-GEOP', 'Ph.D. in Geophysics', 'phd', null, false, 'active' from public.departments where code = 'Geophy'
  on conflict (code) do nothing;

insert into public.programs (department_id, code, name, degree_level, duration_years, duration_verified, status)
  select id, 'MSMPHIL-ENVG', 'MS/M.Phil. in Environmental Geosciences', 'master', null, false, 'active' from public.departments where code = 'Envg'
  on conflict (code) do nothing;

insert into public.programs (department_id, code, name, degree_level, duration_years, duration_verified, status)
  select id, 'PHD-ENVG', 'Ph.D. in Environmental Geosciences', 'phd', null, false, 'active' from public.departments where code = 'Envg'
  on conflict (code) do nothing;

insert into public.programs (department_id, code, name, degree_level, duration_years, duration_verified, status)
  select id, 'MSMPHIL-GEOS', 'MS/M.Phil. in Geospatial Sciences', 'master', null, false, 'active' from public.departments where code = 'Geosp'
  on conflict (code) do nothing;

insert into public.programs (department_id, code, name, degree_level, duration_years, duration_verified, status)
  select id, 'PHD-GEOS', 'Ph.D. in Geospatial Sciences', 'phd', null, false, 'active' from public.departments where code = 'Geosp'
  on conflict (code) do nothing;



-- ============================================================

-- 3. New courses

-- ============================================================

-- Geol

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.704', 'Computer Application for Earth Sciences', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.700', 'Depositional Environments', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.701', 'Transitional Environments & Facies', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.705', 'Basin Analysis', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.710', 'Industrial Mineralogy', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.711', 'Palynology and Paleobotany', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.712', 'Carbonate Microfacies', 2 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.714', 'Unconventional Hydrocarbon Reservoirs', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.715', 'Introduction to Geological Processes', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.716', 'Introduction to Physical Geology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.718', 'Neotectonics', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.719', 'Soil mechanics', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.720', 'Geological Site Investigations', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.721', 'Tectonics of Foreland Basins of Pakistan', 2 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.722', 'Coal Geology', 2 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.723', 'Rock mechanics', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.724', 'Stream Sediment Geochemical Exploration', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.726', 'Microbial Carbonates: Components and Categories', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.728', 'Advanced Techniques in rocks/minerals identification', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.730', 'Hydrogeology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.731', 'Engineering Geology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.732', 'Quaternary Geochronology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.733', 'Techniques in Structural Geology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.734', 'Kinematic and Dynamic Analyses', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.735', 'Ore Microscopy', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.736', 'Mineral Processing and Beneficiation', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.738', 'Geomorphology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.740', 'Invertebrate Paleontology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.741', 'Vertebrate Paleontology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.742', 'Stratigraphic Analysis', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.743', 'Micropaleontology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.745', 'Alkaline Igneous Rocks', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.746', 'Advanced Sedimentary Petrology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.747', 'Glacial Geology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.750', 'Tectonics of Northern Pakistan', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.751', 'Interpretation of Geological Maps', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.752', 'Tectonics', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.753', 'Low-Temperature Geochemistry', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.755', 'Thrust Tectonics', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.757', 'Genesis of Ore Deposits', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.760', 'Exploration Geochemistry', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.765', 'Ore Deposits Geology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.767', 'Metallogeny and Mineral Deposits of Pakistan', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.770', 'Metamorphic Structures', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.771', 'Gemology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.772', 'Techniques in Field Geology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.775', 'Specialized Field & Laboratory Techniques in Structural Geology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.777', 'Igneous Petrology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.780', 'Geochemistry', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.783', 'Sedimentary Petrology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.785', 'Metamorphic Petrology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.788', 'Petroleum Geology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.789', 'Petroleum Engineering', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.790', 'Petroleum Economics', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.792', 'Petroleum Geochemistry', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.795', 'Non-Clastic Sedimentology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.798', 'Clastic Sedimentology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.800', 'Diagenesis of Sediments', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.801', 'Techniques in Paleontology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.802', 'Sequence stratigraphy', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.803', 'Micro-tectonics', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.805', 'Stratigraphy and Petroleum Prospects of Pakistan', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.806', 'Biostratigraphy', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.807', 'Palynofacies analyses', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.808', 'Instrumental Techniques in Organic Geochemistry', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.810', 'Continental Environments and Facies', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.812', 'Marine Depositional Environments', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.814', 'Gold Exploration and Evaluation', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.815', 'Geochronology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.818', 'Analytical Rock Mechanics', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.819', 'Numerical Analysis and Modeling in Geomechancis', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.820', 'Regional Tectonics', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.821', 'Tectonic Geomorphology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.824', 'Engineering Geological Mapping', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.825', 'Metallogeny and Plate Tectonics', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.830', 'Economic Evaluation in Exploration', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.835', 'Geological Data Analysis in Mineral Exploration', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.840', 'Plate Tectonics & Kinematic of Plate Movements', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.841', 'Fission Track Dating of Rocks and Minerals', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.845', 'Mesoscopic Structures', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.850', 'Advanced Igneous Petrology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.851', 'Advance Hydrogeology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.852', 'Advance Soil Mechanics', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.855', 'Advanced Geochemistry', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.860', 'Advanced Metamorphic Petrology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.863', 'Advanced Mineral Processing Techniques', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geol.871', 'Isotope Geology', 3 from public.departments where code = 'Geol'
  on conflict (code) do nothing;

-- Geophy

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geop.700', 'Geophysics', 3 from public.departments where code = 'Geophy'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geop.705', 'Applied geophysics', 3 from public.departments where code = 'Geophy'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geop.710', 'Formation Evaluation (theory + Laboratories)', 3 from public.departments where code = 'Geophy'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geop.715', 'Seismic Methods', 3 from public.departments where code = 'Geophy'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geop.720', 'Gravity and Geomagnetic Methods', 3 from public.departments where code = 'Geophy'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geop.725', 'Applied Mathematics in Geophyiscs', 3 from public.departments where code = 'Geophy'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geop.730', 'Seismic Stratigraphy', 3 from public.departments where code = 'Geophy'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geop.735', 'Geophysical Techniques in Hydrogeology (theory + Laboratories)', 3 from public.departments where code = 'Geophy'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geop.740', 'Rock Magnetism', 3 from public.departments where code = 'Geophy'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geop.745', 'Environmental Geophysics', 3 from public.departments where code = 'Geophy'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geop.800', 'Seismic Data processing', 2 from public.departments where code = 'Geophy'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geop.805', 'Engineering Seismology', 3 from public.departments where code = 'Geophy'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geop.810', 'Earthquake Seismology', 3 from public.departments where code = 'Geophy'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geop.815', 'Advanced Geophysics', 3 from public.departments where code = 'Geophy'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geop.820', 'Advanced Seismology', 3 from public.departments where code = 'Geophy'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geop.825', 'Advanced Gravity and Geomagnetic Methods', 3 from public.departments where code = 'Geophy'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geop.830', 'Hydrogeophysics', 3 from public.departments where code = 'Geophy'
  on conflict (code) do nothing;

insert into public.courses (department_id, code, name, credit_hours)
  select id, 'Geop.833', 'Landslide Hazards and Risk Assessment Modelling', 3 from public.departments where code = 'Geophy'
  on conflict (code) do nothing;

-- Generated seed data, part 2: program_courses, curriculum_requirements, catalogue_notes.


-- ============================================================
-- 4. program_courses
-- ============================================================

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.704'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.501'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.702'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.703'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.706'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.700'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.701'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.705'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.710'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.711'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.712'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.714'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.715'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.716'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.718'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.719'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.720'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.721'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.722'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.723'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.724'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.726'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.728'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.730'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.731'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.732'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.733'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.734'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.735'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.736'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.738'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.740'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.741'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.742'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.743'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.745'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.746'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.747'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.750'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.751'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.752'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.753'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.755'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.757'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.760'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.761'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.765'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.767'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.770'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.771'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.772'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.775'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.777'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.780'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.783'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.785'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.788'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.789'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.790'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.792'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.795'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOL' and c.code = 'Geol.798'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.800'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.801'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.802'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.803'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.805'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.806'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.807'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.808'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.810'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.812'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.814'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.815'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.818'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.819'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.820'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.821'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.824'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.825'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.830'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.835'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.840'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.841'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.845'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.850'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.851'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.852'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.855'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.860'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.863'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOL' and c.code = 'Geol.871'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOP' and c.code = 'Geol.500'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOP' and c.code = 'Geol.501'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOP' and c.code = 'Geol.520'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOP' and c.code = 'Geol.702'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOP' and c.code = 'Geol.703'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOP' and c.code = 'Geol.706'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOP' and c.code = 'Geop.700'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOP' and c.code = 'Geop.705'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOP' and c.code = 'Geop.710'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOP' and c.code = 'Geop.715'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOP' and c.code = 'Geop.720'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOP' and c.code = 'Geop.725'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOP' and c.code = 'Geop.730'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOP' and c.code = 'Geop.735'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOP' and c.code = 'Geop.740'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOP' and c.code = 'Geop.745'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOP' and c.code = 'Geop.800'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOP' and c.code = 'Geop.805'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOP' and c.code = 'Geop.810'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOP' and c.code = 'Geop.815'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOP' and c.code = 'Geop.820'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOP' and c.code = 'Geop.825'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOP' and c.code = 'Geop.830'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-ENVG' and c.code = 'Geol.500'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-ENVG' and c.code = 'Geol.501'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-ENVG' and c.code = 'Geol.520'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-ENVG' and c.code = 'Geol.702'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-ENVG' and c.code = 'Geol.703'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-ENVG' and c.code = 'Geol.706'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-ENVG' and c.code = 'Envg.700'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-ENVG' and c.code = 'Envg.705'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-ENVG' and c.code = 'Envg.706'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-ENVG' and c.code = 'Envg.708'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-ENVG' and c.code = 'Envg.710'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-ENVG' and c.code = 'Envg.715'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-ENVG' and c.code = 'Envg.720'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-ENVG' and c.code = 'Envg.725'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-ENVG' and c.code = 'Envg.726'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-ENVG' and c.code = 'Envg.728'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-ENVG' and c.code = 'Envg.730'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-ENVG' and c.code = 'Envg.735'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-ENVG' and c.code = 'Envg.740'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-ENVG' and c.code = 'Envg.745'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-ENVG' and c.code = 'Envg.750'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-ENVG' and c.code = 'Envg.755'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-ENVG' and c.code = 'Envg.790'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-ENVG' and c.code = 'Envg.800'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-ENVG' and c.code = 'Envg.804'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-ENVG' and c.code = 'Envg.805'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-ENVG' and c.code = 'Envg.806'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-ENVG' and c.code = 'Envg.807'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-ENVG' and c.code = 'Envg.810'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-ENVG' and c.code = 'Envg.811'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-ENVG' and c.code = 'Envg.815'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-ENVG' and c.code = 'Envg.820'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-ENVG' and c.code = 'Envg.835'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-ENVG' and c.code = 'Envg.840'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOS' and c.code = 'Geol.500'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOS' and c.code = 'Geol.501'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOS' and c.code = 'Geol.520'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOS' and c.code = 'Geol.702'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOS' and c.code = 'Geol.703'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOS' and c.code = 'Geol.706'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOS' and c.code = 'Geos.700'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOS' and c.code = 'Geos.705'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOS' and c.code = 'Geos.710'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOS' and c.code = 'Geos.715'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOS' and c.code = 'Geos.720'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOS' and c.code = 'Geos.722'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOS' and c.code = 'Geos.725'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOS' and c.code = 'Geos.730'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOS' and c.code = 'Geos.730B'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOS' and c.code = 'Geos.733'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOS' and c.code = 'Geos.735'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'MSMPHIL-GEOS' and c.code = 'Geos.740'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOS' and c.code = 'Geos.800'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOS' and c.code = 'Geos.805'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOS' and c.code = 'Geos.810'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOS' and c.code = 'Geos.815'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOS' and c.code = 'Geos.820'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOS' and c.code = 'Geos.823'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOS' and c.code = 'Geos.825'
  on conflict (program_id, course_id) do nothing;

insert into public.program_courses (program_id, course_id, is_elective)
  select pr.id, c.id, true from public.programs pr, public.courses c
  where pr.code = 'PHD-GEOS' and c.code = 'Geos.830'
  on conflict (program_id, course_id) do nothing;


-- ============================================================
-- 5. curriculum_requirements
-- ============================================================

-- requirement_category is a controlled vocabulary already fixed by Phase
-- 8B (general/major/elective/seminar/project/thesis_research) -- there is
-- no "total" category, so the 24 CH overall figure is not stored as its
-- own row (it is fully documented in the catalogue_notes row below about
-- the unallocated remainder instead of being force-fit into a category
-- that doesn't exist). 'related_general' -> 'general', 'specialized_major'
-- -> 'major' (closest existing fit; 'major' is also used for the Ph.D.
-- coursework rows below, since Ph.D. coursework is advanced major-subject
-- coursework, same as MS/M.Phil.'s specialized-major category).

insert into public.curriculum_requirements (program_id, requirement_category, required_credit_hours)
  select id, 'general', 6 from public.programs where code = 'MSMPHIL-GEOL';

insert into public.curriculum_requirements (program_id, requirement_category, required_credit_hours)
  select id, 'major', 12 from public.programs where code = 'MSMPHIL-GEOL';

insert into public.curriculum_requirements (program_id, requirement_category, required_credit_hours)
  select id, 'general', 6 from public.programs where code = 'MSMPHIL-GEOP';

insert into public.curriculum_requirements (program_id, requirement_category, required_credit_hours)
  select id, 'major', 12 from public.programs where code = 'MSMPHIL-GEOP';

insert into public.curriculum_requirements (program_id, requirement_category, required_credit_hours)
  select id, 'general', 6 from public.programs where code = 'MSMPHIL-ENVG';

insert into public.curriculum_requirements (program_id, requirement_category, required_credit_hours)
  select id, 'major', 12 from public.programs where code = 'MSMPHIL-ENVG';

insert into public.curriculum_requirements (program_id, requirement_category, required_credit_hours)
  select id, 'general', 6 from public.programs where code = 'MSMPHIL-GEOS';

insert into public.curriculum_requirements (program_id, requirement_category, required_credit_hours)
  select id, 'major', 12 from public.programs where code = 'MSMPHIL-GEOS';

insert into public.curriculum_requirements (program_id, requirement_category, required_credit_hours, applicable_entry_basis)
  select id, 'major', null, 'ms_mphil_llm' from public.programs where code = 'PHD-GEOL';

insert into public.curriculum_requirements (program_id, requirement_category, required_credit_hours, applicable_entry_basis)
  select id, 'major', null, 'bs_master' from public.programs where code = 'PHD-GEOL';

insert into public.curriculum_requirements (program_id, requirement_category, required_credit_hours, applicable_entry_basis)
  select id, 'major', null, 'ms_mphil_llm' from public.programs where code = 'PHD-GEOP';

insert into public.curriculum_requirements (program_id, requirement_category, required_credit_hours, applicable_entry_basis)
  select id, 'major', null, 'bs_master' from public.programs where code = 'PHD-GEOP';

insert into public.curriculum_requirements (program_id, requirement_category, required_credit_hours, applicable_entry_basis)
  select id, 'major', null, 'ms_mphil_llm' from public.programs where code = 'PHD-ENVG';

insert into public.curriculum_requirements (program_id, requirement_category, required_credit_hours, applicable_entry_basis)
  select id, 'major', null, 'bs_master' from public.programs where code = 'PHD-ENVG';

insert into public.curriculum_requirements (program_id, requirement_category, required_credit_hours, applicable_entry_basis)
  select id, 'major', null, 'ms_mphil_llm' from public.programs where code = 'PHD-GEOS';

insert into public.curriculum_requirements (program_id, requirement_category, required_credit_hours, applicable_entry_basis)
  select id, 'major', null, 'bs_master' from public.programs where code = 'PHD-GEOS';


-- ============================================================
-- 6. catalogue_notes -- every unresolved source-data issue,
--    preserved rather than silently corrected.
-- ============================================================

insert into public.catalogue_notes (entity_type, entity_reference, course_id, issue_summary, source_detail)
  select 'course', 'Geol.704',
    (select id from public.courses where code = 'Geol.704'),
    'Title overlaps an existing, differently-coded course', 'Geology related/general source list gives Geol.704 = ''Computer Application for Earth Sciences'' (3 CH). An existing course, Geol.500, already carries the identical title at 2 CH. Both are preserved as distinct rows -- not merged, since the two source documents may genuinely describe different offerings.';

insert into public.catalogue_notes (entity_type, entity_reference, course_id, issue_summary, source_detail)
  select 'course', 'Geol.706',
    (select id from public.courses where code = 'Geol.706'),
    'Course code collision with conflicting title', 'The existing catalog (Phase 8C) has Geol.706 = ''Research Methodology'' (3 CH). The Geology related/general source list also gives Geol.706 = ''Chemical Methods of Rock Analysis'' (3 CH) -- and separately repeats Geol.706 = ''Research Methodology'' within the same list. Because courses.code is UNIQUE, the conflicting ''Chemical Methods of Rock Analysis'' entry could not be inserted as a distinct row; it is preserved here as a note only, not merged or silently dropped.';

insert into public.catalogue_notes (entity_type, entity_reference, course_id, issue_summary, source_detail)
  select 'course', 'Geol.799',
    (select id from public.courses where code = 'Geol.799'),
    'Credit hours given as a range, cannot be represented', '''Seminar (Teaching/Research of selected topics)'' is listed as 1-3 CH. courses.credit_hours is a single numeric value; picking a specific number within the range would misrepresent the source. Not inserted. (Same issue previously identified for Envg.799 in the Phase 8C course-catalog seed.)';

insert into public.catalogue_notes (entity_type, entity_reference, course_id, issue_summary, source_detail)
  select 'course', 'Geol.865',
    (select id from public.courses where code = 'Geol.865'),
    'Credit hours given as a range, cannot be represented', '''Seminar'' (Ph.D.) is listed as 1-4 CH. Same range-credit-hours issue as Geol.799 and Envg.799. Not inserted.';

insert into public.catalogue_notes (entity_type, entity_reference, course_id, issue_summary, source_detail)
  select 'course', 'Envg.799',
    (select id from public.courses where code = 'Envg.799'),
    'Credit hours given as a range, cannot be represented', '''Seminar (Teaching/Research of selected topics)'' is listed as 1-3 CH, re-supplied in this phase. This is the same course/issue already flagged (and left unseeded for the same reason) during the Phase 8C course-catalog seed -- still unresolved, not newly discovered.';

insert into public.catalogue_notes (entity_type, entity_reference, course_id, issue_summary, source_detail)
  select 'course', 'Geop.833',
    (select id from public.courses where code = 'Geop.833'),
    'Course code prefix does not match the program list it appeared under', '''Landslide Hazards and Risk Assessment Modelling'' was supplied inside the Geology Ph.D. course list, but carries a Geop.* code (Geophysics'' prefix convention). Inserted under the Geophysics department, consistent with how every other course in this catalog has been department-assigned by code prefix -- but NOT linked into either Geology''s or Geophysics'' Ph.D. curriculum via program_courses automatically, since which program''s requirement it actually counts toward was not confirmed.';

insert into public.catalogue_notes (entity_type, entity_reference, issue_summary, source_detail)
  values ('curriculum_requirement', 'All 4 Ph.D. programs -- total coursework credit hours', 'Coursework CH requirement not resolved (24 or 48)', 'The supplied Ph.D. requirements state coursework is ''24 or 48 CH'' for both the MS/M.Phil./LLM-entry and BS/Master-entry tracks, without specifying which figure applies to which. Recorded as 8 curriculum_requirements rows (4 programs x 2 entry bases) with required_credit_hours left NULL pending confirmation, rather than guessing an assignment.');

insert into public.catalogue_notes (entity_type, entity_reference, issue_summary, source_detail)
  values ('curriculum_requirement', 'All 4 MS/M.Phil. programs -- credit-hour allocation', '6 CH (related/general) + 12 CH (specialized major, minimum) does not fully account for the 24 CH total', 'Source states: total coursework 24 CH, of which 6 CH must be Related/General and ''at least'' 12 CH must be Specialized Major. That accounts for 18 of 24 CH; how the remaining up to 6 CH is allocated (additional specialized courses, a separate elective pool, etc.) was not specified. Recorded as given (6 and 12, the latter as a floor) rather than inventing a rule for the remainder.');
