"use client";

import Link from "next/link";
import { useMemo } from "react";
import { getGraph } from "@/lib/graph/catalog";
import {
  directPrerequisites,
  isReleased,
  prerequisitesFor,
  suggestedOrder,
  unlockedBy,
} from "@/lib/graph/engine";
import { useWatchlist } from "@/lib/watchlist/provider";
import { StrictnessPicker } from "./strictness-picker";
import { Badge, EdgeBadge, KIND_LABELS, ProgressBar, TitleMeta } from "./ui";

export function TitleDetail({ id }: { id: string }) {
  const graph = getGraph();
  const { ready, watched, strictness, toggle, catchUpTo, markUnwatched } = useWatchlist();
  const title = graph.byId.get(id);

  const steps = useMemo(
    () => (title ? prerequisitesFor(graph, id, watched, strictness) : []),
    [graph, id, strictness, title, watched],
  );

  const position = useMemo(() => {
    const order = suggestedOrder(graph, strictness);
    return order.findIndex((entry) => entry.id === id) + 1;
  }, [graph, id, strictness]);

  if (!title) {
    return (
      <div className="panel rounded-2xl p-8 text-center">
        <p className="text-muted">No title with id &ldquo;{id}&rdquo;.</p>
        <Link href="/" className="mt-4 inline-block text-accent-soft underline underline-offset-2">
          Back to the list
        </Link>
      </div>
    );
  }

  const missing = steps.filter((step) => !step.watched);
  const done = steps.filter((step) => step.watched);
  const isWatched = watched.has(title.id);
  const direct = directPrerequisites(graph, title.id);
  const unlocks = unlockedBy(graph, title.id);
  const released = isReleased(title);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-muted">
        <Link href="/" className="hover:text-text">
          ← All titles
        </Link>
      </nav>

      <header className="panel rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>#{position} in suggested order</Badge>
          <Badge>{title.phase}</Badge>
          <Badge>{title.saga}</Badge>
          {!released ? <Badge className="text-accent-soft">Upcoming</Badge> : null}
        </div>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{title.title}</h1>
        <div className="mt-1">
          <TitleMeta title={title} />
        </div>
        {title.note ? <p className="mt-3 max-w-2xl text-sm text-muted">{title.note}</p> : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => toggle(title.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isWatched
                ? "border border-edge text-muted hover:text-text"
                : "bg-accent text-white hover:bg-accent-soft"
            }`}
          >
            {isWatched ? "Mark as not watched" : "Mark as watched"}
          </button>

          {!isWatched && missing.length > 0 ? (
            <button
              type="button"
              onClick={() => catchUpTo(title.id)}
              className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-text transition-colors hover:border-accent-soft"
            >
              I&rsquo;ve seen all of it — tick {missing.length} prerequisite
              {missing.length > 1 ? "s" : ""} + this
            </button>
          ) : null}

          {done.length > 0 ? (
            <button
              type="button"
              onClick={() => markUnwatched(done.map((step) => step.title.id))}
              className="rounded-lg border border-edge px-4 py-2 text-sm text-muted transition-colors hover:text-text"
            >
              Clear its {done.length} watched prerequisite{done.length > 1 ? "s" : ""}
            </button>
          ) : null}
        </div>
      </header>

      <section className="panel rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {!ready
              ? "Checking your watchlist…"
              : missing.length === 0
                ? "You're ready to watch this"
                : `${missing.length} title${missing.length > 1 ? "s" : ""} to watch first`}
          </h2>
          <span className="text-xs text-muted">
            {done.length}/{steps.length} prerequisites watched
          </span>
        </div>

        <div className="mt-3">
          <ProgressBar value={done.length} total={steps.length} />
        </div>

        {missing.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            {steps.length === 0
              ? "Nothing points into this one — it's a valid entry point into the franchise."
              : "Every prerequisite is ticked off. Go watch it."}
          </p>
        ) : (
          <ol className="mt-4 space-y-2">
            {missing.map((step) => (
              <li
                key={step.title.id}
                className="flex items-center gap-3 rounded-xl border border-edge bg-panel-2/40 px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => toggle(step.title.id)}
                  aria-label={`Mark ${step.title.title} as watched`}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-edge text-transparent transition-colors hover:border-accent-soft"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden>
                    <path
                      d="M5 10.5l3.5 3.5L15 7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/title/${step.title.id}`}
                    className="block truncate font-medium hover:text-accent-soft"
                  >
                    {step.title.title}
                  </Link>
                  <TitleMeta title={step.title} />
                </div>
                <div className="hidden shrink-0 items-center gap-2 sm:flex">
                  {step.direct ? <Badge>Direct</Badge> : null}
                  <EdgeBadge type={step.via} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel rounded-2xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Points into this
          </h2>
          {direct.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nothing — this is an entry point.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {direct.map((edge) => {
                const from = graph.byId.get(edge.from)!;
                return (
                  <li key={edge.from} className="flex items-center justify-between gap-3">
                    <Link
                      href={`/title/${from.id}`}
                      className={`truncate text-sm hover:text-accent-soft ${
                        watched.has(from.id) ? "text-muted line-through" : ""
                      }`}
                    >
                      {from.title}
                    </Link>
                    <EdgeBadge type={edge.type} provisional={edge.provisional} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel rounded-2xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Watching this unlocks
          </h2>
          {unlocks.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nothing depends on it — yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {unlocks.map((edge) => {
                const to = graph.byId.get(edge.to)!;
                return (
                  <li key={edge.to} className="flex items-center justify-between gap-3">
                    <Link
                      href={`/title/${to.id}`}
                      className="truncate text-sm hover:text-accent-soft"
                    >
                      {to.title}
                    </Link>
                    <EdgeBadge type={edge.type} provisional={edge.provisional} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="panel rounded-2xl p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Adjust what counts as a prerequisite
        </h2>
        <div className="mt-3">
          <StrictnessPicker />
        </div>
        <p className="mt-3 text-xs text-muted">
          {KIND_LABELS[title.kind]} · dependency data is a transcription of the community watch-order
          chart — see{" "}
          <Link href="/about" className="text-accent-soft underline underline-offset-2">
            About
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
