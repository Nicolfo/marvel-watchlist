import type { Strictness } from "@/lib/graph/engine";

export const WATCHLIST_SCHEMA_VERSION = 1;

export interface WatchEntry {
  titleId: string;
  /** ISO timestamp of when it was marked watched. */
  watchedAt: string;
}

export interface WatchlistState {
  schemaVersion: number;
  entries: WatchEntry[];
  /** How strict the user wants prerequisite tracking to be. */
  strictness: Strictness;
  updatedAt: string;
}

export function emptyWatchlist(): WatchlistState {
  return {
    schemaVersion: WATCHLIST_SCHEMA_VERSION,
    entries: [],
    strictness: "should",
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Where a watchlist lives. `LocalStorageAdapter` is the only implementation
 * today; a `RemoteWatchlistAdapter` talking to `/api/watchlist` (and from
 * there to Postgres) drops in behind the same three methods once accounts
 * exist, without the UI changing.
 */
export interface WatchlistAdapter {
  readonly id: string;
  load(): Promise<WatchlistState>;
  save(state: WatchlistState): Promise<void>;
  clear(): Promise<void>;
}

/** Tolerant parse: unknown/older payloads degrade to an empty list. */
export function migrate(input: unknown): WatchlistState {
  if (!input || typeof input !== "object") return emptyWatchlist();
  const candidate = input as Partial<WatchlistState>;

  if (!Array.isArray(candidate.entries)) return emptyWatchlist();

  const entries: WatchEntry[] = [];
  const seen = new Set<string>();
  for (const entry of candidate.entries) {
    if (!entry || typeof entry !== "object") continue;
    const { titleId, watchedAt } = entry as Partial<WatchEntry>;
    if (typeof titleId !== "string" || titleId.length === 0) continue;
    if (seen.has(titleId)) continue;
    seen.add(titleId);
    entries.push({
      titleId,
      watchedAt: typeof watchedAt === "string" ? watchedAt : new Date().toISOString(),
    });
  }

  const strictness: Strictness =
    candidate.strictness === "must" || candidate.strictness === "could"
      ? candidate.strictness
      : "should";

  return {
    schemaVersion: WATCHLIST_SCHEMA_VERSION,
    entries,
    strictness,
    updatedAt:
      typeof candidate.updatedAt === "string" ? candidate.updatedAt : new Date().toISOString(),
  };
}
