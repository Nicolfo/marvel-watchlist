"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getGraph } from "@/lib/graph/catalog";
import { isReleased, missingPrerequisites, nextUp, suggestedOrder } from "@/lib/graph/engine";
import type { Title } from "@/lib/graph/schema";
import { useWatchlist } from "@/lib/watchlist/provider";
import { ImdbLink, WatchLinks } from "./links";
import { Poster } from "./poster";
import { StrictnessPicker } from "./strictness-picker";
import { PhaseHeading, TitleCard, TitleTile, type TitleCardData } from "./title-card";
import { Badge, KIND_LABELS, ProgressBar } from "./ui";

type Filter = "all" | "unwatched" | "ready" | "watched";
type Grouping = "order" | "phase";
type View = "grid" | "list";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "unwatched", label: "Not watched" },
  { id: "ready", label: "Ready" },
  { id: "watched", label: "Watched" },
];

export function Explorer() {
  const graph = getGraph();
  const { ready, watched, strictness, progress } = useWatchlist();
  const [filter, setFilter] = useState<Filter>("all");
  const [grouping, setGrouping] = useState<Grouping>("order");
  const [view, setView] = useState<View>("grid");
  const [query, setQuery] = useState("");
  const [includeUpcoming, setIncludeUpcoming] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const order = useMemo(() => suggestedOrder(graph, strictness), [graph, strictness]);

  const rows = useMemo<TitleCardData[]>(
    () =>
      order.map((title, index) => ({
        title,
        position: index + 1,
        watched: watched.has(title.id),
        missingCount: missingPrerequisites(graph, title.id, watched, strictness).length,
        released: isReleased(title),
      })),
    [graph, order, strictness, watched],
  );

  const next = useMemo(() => nextUp(graph, watched, strictness), [graph, watched, strictness]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (!includeUpcoming && !row.released) return false;
      if (filter === "watched" && !row.watched) return false;
      if (filter === "unwatched" && row.watched) return false;
      if (filter === "ready" && (row.watched || row.missingCount > 0)) return false;
      if (needle) {
        const haystack = `${row.title.title} ${row.title.phase} ${KIND_LABELS[row.title.kind]}`;
        if (!haystack.toLowerCase().includes(needle)) return false;
      }
      return true;
    });
  }, [filter, includeUpcoming, query, rows]);

  const groups = useMemo(() => {
    if (grouping === "order") return [{ key: "", rows: visible }];
    const map = new Map<string, TitleCardData[]>();
    for (const row of visible) {
      const list = map.get(row.title.phase);
      if (list) list.push(row);
      else map.set(row.title.phase, [row]);
    }
    return [...map.entries()].map(([key, groupRows]) => ({ key, rows: groupRows }));
  }, [grouping, visible]);

  return (
    <div className="space-y-6">
      <Hero next={next} ready={ready} progress={progress} />

      {/* Docks directly under the app bar (h-14) rather than at the viewport top. */}
      <section className="sticky-bar sticky top-14 z-20 -mx-3 border-y border-edge px-3 py-2.5 sm:-mx-6 sm:px-6 sm:py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
          {/* Scrolls horizontally on a phone so the chips share a row with
              Options instead of claiming one of their own. */}
          <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-lg border border-edge p-0.5 sm:max-w-full sm:flex-none">
            {FILTERS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setFilter(entry.id)}
                aria-pressed={filter === entry.id}
                className={`shrink-0 rounded-md px-2.5 py-1 text-sm transition-colors ${
                  filter === entry.id
                    ? "bg-panel-2 text-text"
                    : "text-muted hover:bg-panel-2/60 hover:text-text"
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>

          {/* Full width on its own row on phones; shares the bar from sm up. */}
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles…"
            aria-label="Search titles"
            className="order-last w-full min-w-0 rounded-lg border border-edge bg-panel px-3 py-1.5 text-sm placeholder:text-muted sm:order-none sm:w-auto sm:flex-1 sm:max-w-xs"
          />

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {/* Grid is the right default on a phone; the toggle is desktop-only
                so the bar stays two rows tall. */}
            <div className="hidden items-center gap-0.5 rounded-lg border border-edge p-0.5 sm:flex">
              <ViewButton current={view} value="grid" onSelect={setView} label="Grid view">
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
                  <rect x="1" y="1" width="6" height="6" rx="1.5" />
                  <rect x="9" y="1" width="6" height="6" rx="1.5" />
                  <rect x="1" y="9" width="6" height="6" rx="1.5" />
                  <rect x="9" y="9" width="6" height="6" rx="1.5" />
                </svg>
              </ViewButton>
              <ViewButton current={view} value="list" onSelect={setView} label="List view">
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
                  <rect x="1" y="2" width="14" height="2.5" rx="1.25" />
                  <rect x="1" y="6.75" width="14" height="2.5" rx="1.25" />
                  <rect x="1" y="11.5" width="14" height="2.5" rx="1.25" />
                </svg>
              </ViewButton>
            </div>

            <button
              type="button"
              onClick={() => setShowSettings((open) => !open)}
              aria-expanded={showSettings}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                showSettings
                  ? "border-accent-soft text-text"
                  : "border-edge text-muted hover:text-text"
              }`}
            >
              Options
            </button>
          </div>
        </div>

        {showSettings ? (
          <div className="mt-2.5 flex flex-col gap-4 border-t border-edge pt-3 lg:flex-row lg:items-start lg:justify-between">
            <StrictnessPicker />
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={includeUpcoming}
                  onChange={(event) => setIncludeUpcoming(event.target.checked)}
                  className="h-4 w-4 accent-[var(--color-accent)]"
                />
                Show upcoming
              </label>
              <label className="flex items-center gap-2 text-sm text-muted">
                Group by
                <select
                  value={grouping}
                  onChange={(event) => setGrouping(event.target.value as Grouping)}
                  className="rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-text"
                >
                  <option value="order">Suggested order</option>
                  <option value="phase">Phase</option>
                </select>
              </label>
            </div>
          </div>
        ) : null}
      </section>

      {visible.length === 0 ? (
        <p className="panel rounded-2xl p-10 text-center text-sm text-muted">
          Nothing matches those filters.
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.key || "all"}>
            {group.key ? (
              <PhaseHeading
                phase={group.key}
                watched={group.rows.filter((row) => row.watched).length}
                total={group.rows.length}
              />
            ) : null}
            {view === "grid" ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {group.rows.map((row, index) => (
                  <TitleTile key={row.title.id} data={row} priority={index < 6} />
                ))}
              </ul>
            ) : (
              <ul className="space-y-2">
                {group.rows.map((row) => (
                  <TitleCard key={row.title.id} data={row} />
                ))}
              </ul>
            )}
          </div>
        ))
      )}

      <p className="text-center text-xs text-muted">
        Showing {visible.length} of {rows.length} titles · order recomputed live from{" "}
        {graph.data.edges.length} dependencies.
      </p>
    </div>
  );
}

function ViewButton({
  current,
  value,
  onSelect,
  label,
  children,
}: {
  current: View;
  value: View;
  onSelect: (view: View) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={current === value}
      aria-label={label}
      title={label}
      className={`grid h-7 w-7 place-items-center rounded-md transition-colors ${
        current === value ? "bg-panel-2 text-text" : "text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function Hero({
  next,
  ready,
  progress,
}: {
  next: Title | null;
  ready: boolean;
  progress: { watched: number; total: number; percent: number };
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-edge">
      <div
        className="absolute inset-0 bg-gradient-to-br from-accent/25 via-panel to-should/15"
        aria-hidden
      />
      <div className="relative grid gap-4 p-4 sm:gap-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-soft sm:text-xs">
            The Marvel Cinematic Universe, untangled
          </p>
          <h1 className="mt-2 text-xl font-bold leading-[1.15] tracking-tight sm:mt-3 sm:text-4xl lg:text-5xl">
            Every film and series,
            <br className="hidden sm:block" /> in an order that actually works
          </h1>
          {/* The pitch is desktop-only: on a phone it pushed the first poster
              a full screen down, and the About page carries the same copy. */}
          <p className="mt-4 hidden max-w-xl text-sm leading-relaxed text-muted sm:block">
            This isn&rsquo;t a flat list. It&rsquo;s a story-dependency graph, sorted so nothing
            ever appears before the titles it builds on. Open any title to see exactly what
            you&rsquo;re missing — and where to stream it.
          </p>

          <div className="mt-4 w-full max-w-xs sm:mt-6">
            <div className="mb-1.5 flex items-baseline justify-between text-xs">
              <span className="text-muted">Your progress</span>
              <span className="tabular-nums font-medium">
                {ready ? `${progress.watched}/${progress.total} · ${progress.percent}%` : "—"}
              </span>
            </div>
            <ProgressBar value={ready ? progress.watched : 0} total={progress.total} />
          </div>
        </div>

        {ready && next ? (
          <div className="w-full rounded-xl border border-edge bg-black/40 p-3 backdrop-blur sm:max-w-xs sm:p-4 lg:w-72">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted sm:text-xs">
              Next up
            </p>
            <div className="mt-2 flex gap-3 sm:mt-3">
              <Link href={`/title/${next.id}`} className="shrink-0">
                <Poster title={next} className="h-24 w-16 sm:h-28 sm:w-[74px]" sizes="74px" priority />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/title/${next.id}`}
                  className="block text-sm font-semibold leading-tight hover:text-accent-soft"
                >
                  {next.title}
                </Link>
                <p className="mt-0.5 text-xs text-muted">
                  {KIND_LABELS[next.kind]} · {next.year}
                </p>
                <div className="mt-1.5">
                  <Badge className="text-could">No prerequisites left</Badge>
                </div>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <ImdbLink title={next} compact />
              <WatchLinks title={next} />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
