import "server-only";

/**
 * Normalized-exact-match reference resolution for the bulk importers.
 * Deliberately NOT a fuzzy/Levenshtein matcher — the task's own
 * instructions call for conservative behavior (auto-match only an
 * unambiguous exact match after normalization; flag anything else for
 * manual resolution; never guess), so a simple, predictable
 * normalize-then-compare is the right tool, not approximate string
 * distance.
 */

export function normalizeLoose(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Strips common academic titles/punctuation so "Dr. Waqas Ahmad", "Dr Waqas Ahmad", and "Waqas Ahmad" all normalize to the same key. */
export function normalizeFacultyName(s: string): string {
  return normalizeLoose(s)
    .replace(/^(dr\.?|prof\.?|professor|mr\.?|mrs\.?|ms\.?)\s+/i, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface MatchResult<T> {
  match: T | null;
  ambiguous: boolean;
  candidates: T[];
}

function noMatch<T>(): MatchResult<T> {
  return { match: null, ambiguous: false, candidates: [] };
}

/** Department/discipline matching — tolerates simple singular/plural variation (e.g. "Geospatial Science" vs "Geospatial Sciences"). */
export function matchDepartment<T extends { name: string }>(input: string, departments: T[]): MatchResult<T> {
  const key = normalizeLoose(input);
  if (!key) return noMatch();

  const candidates = departments.filter((d) => {
    const dKey = normalizeLoose(d.name);
    return dKey === key || dKey === `${key}s` || `${dKey}s` === key;
  });

  if (candidates.length === 1) return { match: candidates[0], ambiguous: false, candidates };
  if (candidates.length > 1) return { match: null, ambiguous: true, candidates };
  return noMatch();
}

/** Faculty matching by normalized display name — see normalizeFacultyName for what's stripped. */
export function matchFaculty<T extends { name: string }>(input: string, faculty: T[]): MatchResult<T> {
  const key = normalizeFacultyName(input);
  if (!key) return noMatch();

  const candidates = faculty.filter((f) => normalizeFacultyName(f.name) === key);
  if (candidates.length === 1) return { match: candidates[0], ambiguous: false, candidates };
  if (candidates.length > 1) return { match: null, ambiguous: true, candidates };
  return noMatch();
}

/** Program matching by normalized name OR code — either is accepted since historical spreadsheets may use either convention. */
export function matchProgram<T extends { name: string; code: string }>(input: string, programs: T[]): MatchResult<T> {
  const key = normalizeLoose(input);
  if (!key) return noMatch();

  const candidates = programs.filter(
    (p) => normalizeLoose(p.name) === key || normalizeLoose(p.code) === key
  );
  if (candidates.length === 1) return { match: candidates[0], ambiguous: false, candidates };
  if (candidates.length > 1) return { match: null, ambiguous: true, candidates };
  return noMatch();
}

/** Normalizes an academic-year string to the canonical "YYYY-YY" form — tolerates en-dash/em-dash/slash separators and stray whitespace. */
export function normalizeAcademicYear(s: string): string {
  return s.trim().replace(/[‒-―/]/g, "-").replace(/\s+/g, "");
}

export function matchSemester<T extends { academic_year: string; name: string }>(
  academicYear: string,
  semesterName: string,
  semesters: T[]
): MatchResult<T> {
  const yearKey = normalizeAcademicYear(academicYear);
  const nameKey = normalizeLoose(semesterName);
  if (!yearKey || !nameKey) return noMatch();

  const candidates = semesters.filter(
    (s) => normalizeAcademicYear(s.academic_year) === yearKey && normalizeLoose(s.name) === nameKey
  );
  if (candidates.length === 1) return { match: candidates[0], ambiguous: false, candidates };
  if (candidates.length > 1) return { match: null, ambiguous: true, candidates };
  return noMatch();
}

/** Course-code matching — case/whitespace-insensitive for lookup purposes only; a genuinely new course preserves the exact code as typed. */
export function matchCourseCode<T extends { code: string }>(input: string, courses: T[]): T | null {
  const key = normalizeLoose(input);
  if (!key) return null;
  return courses.find((c) => normalizeLoose(c.code) === key) ?? null;
}

/** Student matching — student_number (exact, case-insensitive) takes priority over email as the stronger identifier, matching the task's stated priority order. */
export function matchStudent<T extends { student_number: string; email: string | null }>(
  studentId: string,
  email: string,
  students: T[]
): T | null {
  const idKey = normalizeLoose(studentId);
  if (idKey) {
    const byId = students.find((s) => normalizeLoose(s.student_number) === idKey);
    if (byId) return byId;
  }
  const emailKey = normalizeLoose(email);
  if (emailKey) {
    const byEmail = students.find((s) => s.email && normalizeLoose(s.email) === emailKey);
    if (byEmail) return byEmail;
  }
  return null;
}
