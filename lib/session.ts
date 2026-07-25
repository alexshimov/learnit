/**
 * Study-session options. Kept free of any database import so client
 * components can use these without pulling the data layer into the bundle.
 */

/** Session length choices offered alongside "everything due". */
export const SESSION_SIZES = [10, 30] as const;

/** Hard ceiling on one session, and what "everything due" resolves to. */
export const MAX_SESSION = 500;

/** Parse the `n` query param into a card limit. Missing or invalid means
 *  "everything due". */
export function parseLimit(v: unknown): number {
  const n = typeof v === "string" ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_SESSION) : MAX_SESSION;
}
