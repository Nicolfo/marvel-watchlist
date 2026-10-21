import { LEGACY_SHOW_IDS } from "@/lib/graph/catalog";
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

/**
 * Tolerant parse: unknown/older payloads degrade to an empty list.
 *
 * An entry naming a show that has since been split into seasons stands for the
 * whole show, so it becomes one entry per season with the same timestamp.
 * Ticking "Daredevil" before the split meant having watched Daredevil.
 */
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
    const at = typeof watchedAt === "string" ? watchedAt : new Date().toISOString();
    for (const id of LEGACY_SHOW_IDS.get(titleId) ?? [titleId]) {
      if (seen.has(id)) continue;
      seen.add(id);
      entries.push({ titleId: id, watchedAt: at });
    }
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
