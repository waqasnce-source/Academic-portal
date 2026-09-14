import "server-only";

/**
 * Academic rank ordering for sorting faculty listings across the portal.
 * `faculty.designation` is free text with no CHECK constraint (set by
 * whoever enters the record — see faculty.ts), so there's no schema enum
 * to hook an order onto. This is an explicit, known-vocabulary map built
 * from the designations actually present in the real roster, with an
 * honest fallback: any designation not in this list sorts after every
 * known rank (alphabetically among themselves) rather than guessing where
 * an unfamiliar title belongs.
 */
const DESIGNATION_RANK_ORDER = [
  "Director & Professor",
  "Professor",
  "Professor Emeritus",
  "Associate Professor",
  "Assistant Professor",
  "Research Associate",
  "Junior Research Assistant",
];

const RANK_BY_DESIGNATION = new Map(
  DESIGNATION_RANK_ORDER.map((d, i) => [d.trim().toLowerCase(), i])
);

function rankOf(designation: string): number {
  return RANK_BY_DESIGNATION.get(designation.trim().toLowerCase()) ?? DESIGNATION_RANK_ORDER.length;
}

/**
 * Sorts by academic rank (Professor tier down to research-assistant
 * tier), then by display name within the same rank. `getDesignation`/
 * `getName` let each caller's own row shape be used directly rather than
 * forcing a common interface.
 */
export function sortByDesignationRank<T>(
  items: T[],
  getDesignation: (item: T) => string,
  getName: (item: T) => string
): T[] {
  return [...items].sort((a, b) => {
    const rankDiff = rankOf(getDesignation(a)) - rankOf(getDesignation(b));
    if (rankDiff !== 0) return rankDiff;
    return getName(a).localeCompare(getName(b));
  });
}
