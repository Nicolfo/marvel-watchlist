import {
  emptyWatchlist,
  migrate,
  type WatchlistAdapter,
  type WatchlistState,
} from "./types";

export const STORAGE_KEY = "marvel-watchlist:v1";

/**
 * Default backend: the browser. No account, no network, no cookie banner.
 */
export class LocalStorageAdapter implements WatchlistAdapter {
  readonly id = "local";

  constructor(private readonly key: string = STORAGE_KEY) {}

  async load(): Promise<WatchlistState> {
    if (typeof window === "undefined") return emptyWatchlist();
    try {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) return emptyWatchlist();
      return migrate(JSON.parse(raw));
    } catch {
      // Corrupt or unavailable storage (private mode, quota, hand-edited JSON)
      // should never take the app down. Start fresh instead.
      return emptyWatchlist();
    }
  }

  async save(state: WatchlistState): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(this.key, JSON.stringify(state));
    } catch {
      /* storage full or blocked; the in-memory state stays correct */
    }
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(this.key);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Sketch of the logged-in backend. Wire this up when auth lands:
 * `new RemoteWatchlistAdapter()` in place of `new LocalStorageAdapter()` in
 * the provider is the whole change on the UI side.
 */
export class RemoteWatchlistAdapter implements WatchlistAdapter {
  readonly id = "remote";

  constructor(private readonly baseUrl: string = "/api/watchlist") {}

  async load(): Promise<WatchlistState> {
    const response = await fetch(this.baseUrl, { credentials: "include" });
    if (!response.ok) throw new Error(`watchlist load failed: ${response.status}`);
    return migrate(await response.json());
  }

  async save(state: WatchlistState): Promise<void> {
    const response = await fetch(this.baseUrl, {
      method: "PUT",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(state),
    });
    if (!response.ok) throw new Error(`watchlist save failed: ${response.status}`);
  }

  async clear(): Promise<void> {
    await fetch(this.baseUrl, { method: "DELETE", credentials: "include" });
  }
}
