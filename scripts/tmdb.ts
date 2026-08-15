/**
 * The TMDB helpers live in `src/lib/tmdb.ts` so the build-time script and the
 * runtime resolver share one set of matching rules. Re-exported here because
 * the scripts import each other by relative path.
 */
export * from "../src/lib/tmdb";
