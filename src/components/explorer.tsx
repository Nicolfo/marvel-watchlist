"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getGraph } from "@/lib/graph/catalog";
import {
  isReleased,
  missingPrerequisites,
  nextUp,
  suggestedOrder,
} from "@/lib/graph/engine";
import type { Title } from "@/lib/graph/schema";
import { useWatchlist } from "@/lib/watchlist/provider";
import { StrictnessPicker } from "./strictness-picker";
import { PhaseHeading, TitleCard, type TitleCardData } from "./title-card";
import { Badge, KIND_LABELS, ProgressBar } from "./ui";

type Filter = "all" | "unwatched" | "ready" | "watched";
type Grouping = "order" | "phase";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "unwatched", label: "Not watched" },
  { id: "ready", label: "Ready to watch" },
  { id: "watched", label: "Watched" },
];

export function Explorer() {
  const graph = getGraph();
  const { ready, watched, strictness, progress } = useWatchlist();
  const [filter, setFilter] = useState<Filter>("all");
  const [grouping, setGrouping] = useState<Grouping>("order");
  const [query, setQuery] = useState("");
  const [includeUpcoming, setIncludeUpcoming] = useState(true);

  const order = useMemo(() => suggestedOrder(graph, strictness), [graph, strictness]);

  // One pass over the order gives every card its rank and its "what's still
  // missing" count, so the list stays in sync with the strictness setting.
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
      <section className="panel rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Every Marvel film and series, in an order that actually works
            </h1>
            <p className="mt-2 text-sm text-muted">
              The list below is a topological sort of a story-dependency graph, so nothing ever
              appears before the titles it builds on. Tick things off as you watch them — your
              watchlist stays in this browser.
            </p>
          </div>

          <div className="w-full shrink-0 sm:w-56">
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="text-muted">Progress</span>
              <span className="tabular-nums font-medium">{ready ? `${progress.percent}%` : "—"}</span>
            </div>
            <ProgressBar value={ready ? progress.watched : 0} total={progress.total} />
            <p className="mt-2 text-xs text-muted">
              {ready ? `${progress.watched} of ${progress.total} titles watched` : "Loading…"}
            </p>
          </div>
        </div>

        {ready && next ? (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-edge bg-panel-2/60 px-4 py-3">
            <span className="text-xs uppercase tracking-wide text-muted">Next up</span>
            <Link href={`/title/${next.id}`} className="font-medium hover:text-accent-soft">
              {next.title}
            </Link>
            <Badge className="text-could">No prerequisites left</Badge>
          </div>
        ) : null}

        <div className="mt-6 border-t border-edge pt-5">
          <StrictnessPicker />
        </div>
      </section>

      <section className="panel rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1">
            {FILTERS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setFilter(entry.id)}
                aria-pressed={filter === entry.id}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  filter === entry.id
                    ? "bg-panel-2 text-text"
                    : "text-muted hover:bg-panel-2/60 hover:text-text"
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
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

            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search titles…"
              aria-label="Search titles"
              className="w-full rounded-lg border border-edge bg-panel px-3 py-1.5 text-sm placeholder:text-muted sm:w-52"
            />
          </div>
        </div>
      </section>

      {visible.length === 0 ? (
        <p className="panel rounded-2xl p-8 text-center text-sm text-muted">
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
            <ul className="space-y-2">
              {group.rows.map((row) => (
                <TitleCard key={row.title.id} data={row} />
              ))}
            </ul>
          </div>
        ))
      )}

      <p className="text-center text-xs text-muted">
        Showing {visible.length} of {rows.length} titles.
      </p>
    </div>
  );
}

export type { Title };
