"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getGraph } from "@/lib/graph/catalog";
import {
  computeProgress,
  missingPrerequisites,
  type Progress,
  type Strictness,
} from "@/lib/graph/engine";
import { LocalStorageAdapter } from "./local-storage-adapter";
import {
  emptyWatchlist,
  migrate,
  type WatchlistAdapter,
  type WatchlistState,
} from "./types";

interface WatchlistContextValue {
  /** False until the stored list has been read, so we never flash wrong state. */
  ready: boolean;
  watched: ReadonlySet<string>;
  strictness: Strictness;
  progress: Progress;
  backend: string;
  isWatched(id: string): boolean;
  toggle(id: string): void;
  markWatched(ids: string[]): void;
  markUnwatched(ids: string[]): void;
  /** Tick a title and everything it still depends on, in one go. */
  catchUpTo(id: string): void;
  setStrictness(level: Strictness): void;
  reset(): void;
  exportJson(): string;
  importJson(json: string): { ok: true } | { ok: false; error: string };
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

export function WatchlistProvider({
  children,
  adapter,
}: {
  children: React.ReactNode;
  adapter?: WatchlistAdapter;
}) {
  const backend = useMemo(() => adapter ?? new LocalStorageAdapter(), [adapter]);
  const [state, setState] = useState<WatchlistState>(emptyWatchlist);
  const [ready, setReady] = useState(false);
  const graph = getGraph();
  // Skip the write-back that would otherwise fire right after the initial load.
  const hydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    backend
      .load()
      .then((loaded) => {
        if (cancelled) return;
        setState(loaded);
      })
      .catch(() => {
        /* fall back to the empty default */
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [backend]);

  useEffect(() => {
    if (!ready) return;
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    void backend.save(state);
  }, [backend, ready, state]);

  const watched = useMemo(
    () => new Set(state.entries.map((entry) => entry.titleId)),
    [state.entries],
  );

  const progress = useMemo(() => computeProgress(graph, watched), [graph, watched]);

  const applyIds = useCallback((ids: string[], add: boolean) => {
    setState((current) => {
      const known = new Set(current.entries.map((entry) => entry.titleId));
      if (add && ids.every((id) => known.has(id))) return current;
      if (!add && ids.every((id) => !known.has(id))) return current;

      const now = new Date().toISOString();
      const entries = add
        ? [
            ...current.entries,
            ...ids
              .filter((id) => !known.has(id))
              .map((id) => ({ titleId: id, watchedAt: now })),
          ]
        : current.entries.filter((entry) => !ids.includes(entry.titleId));

      return { ...current, entries, updatedAt: now };
    });
  }, []);

  const value: WatchlistContextValue = {
    ready,
    watched,
    strictness: state.strictness,
    progress,
    backend: backend.id,
    isWatched: (id) => watched.has(id),
    toggle: (id) => applyIds([id], !watched.has(id)),
    markWatched: (ids) => applyIds(ids, true),
    markUnwatched: (ids) => applyIds(ids, false),
    catchUpTo: (id) => {
      const missing = missingPrerequisites(graph, id, watched, state.strictness).map(
        (step) => step.title.id,
      );
      applyIds([...missing, id], true);
    },
    setStrictness: (level) =>
      setState((current) => ({ ...current, strictness: level, updatedAt: new Date().toISOString() })),
    reset: () => {
      void backend.clear();
      hydrated.current = false;
      setState(emptyWatchlist());
    },
    exportJson: () => JSON.stringify(state, null, 2),
    importJson: (json) => {
      try {
        const parsed = migrate(JSON.parse(json));
        const known = new Set(graph.titles.map((title) => title.id));
        setState({
          ...parsed,
          entries: parsed.entries.filter((entry) => known.has(entry.titleId)),
        });
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "invalid JSON" };
      }
    },
  };

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist(): WatchlistContextValue {
  const context = useContext(WatchlistContext);
  if (!context) throw new Error("useWatchlist must be used inside <WatchlistProvider>");
  return context;
}
