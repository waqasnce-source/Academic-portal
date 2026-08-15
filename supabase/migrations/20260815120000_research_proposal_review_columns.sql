-- Adds reviewer-attribution columns to research_proposals, so the Phase 7
-- GSC/ASRB decision workflow can record which management user actioned
-- each stage review — the same convention already used by
-- document_submissions.verified_by. Without this, gsc_status/asrb_status
-- could change with no record of who decided it, which conflicts with the
-- "maintain historical record for academically significant decisions"
-- rule. Nullable and additive: existing rows are unaffected, no RLS change
-- is required (already covered by research_proposals_update_management),
-- and the columns simply stay unset until the first review action runs.

alter table public.research_proposals
  add column gsc_reviewed_by uuid references public.profiles (id) on delete set null,
  add column asrb_reviewed_by uuid references public.profiles (id) on delete set null;

comment on column public.research_proposals.gsc_reviewed_by is
  'Management user who last recorded the GSC stage decision (gsc_status/gsc_date/gsc_comments). Nullable — unset until a review action runs.';
comment on column public.research_proposals.asrb_reviewed_by is
  'Management user who last recorded the ASRB stage decision (asrb_status/asrb_date/asrb_comments). Nullable — unset until a review action runs.';
