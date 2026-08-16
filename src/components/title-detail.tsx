"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { artworkSrc, generatedPalette } from "@/lib/artwork";
import { useArtworkEnabled } from "@/lib/artwork-context";
import { getGraph } from "@/lib/graph/catalog";
import {
  directPrerequisites,
  isReleased,
  prerequisitesFor,
  suggestedOrder,
  unlockedBy,
} from "@/lib/graph/engine";
import { useWatchlist } from "@/lib/watchlist/provider";
import { ImdbLink, WatchLinks } from "./links";
import { Poster } from "./poster";
import { StrictnessPicker } from "./strictness-picker";
import { Badge, EdgeBadge, KIND_LABELS, ProgressBar, TitleMeta } from "./ui";

/**
 * `overview` is resolved on the server and passed in, rather than looked up
 * here: the synopsis comes from the same TMDB call as the artwork, and that
 * call needs an API key the browser must never see.
 */
export function TitleDetail({ id, overview }: { id: string; overview?: string }) {
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
  const palette = generatedPalette(title);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-muted">
        <Link href="/" className="hover:text-text">
          ← All titles
        </Link>
      </nav>

      <header className="relative overflow-hidden rounded-2xl border border-edge">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(120deg, ${palette.from}, ${palette.via} 60%, ${palette.to})`,
          }}
          aria-hidden
        />
        <Backdrop id={title.id} />
        <div className="absolute inset-0 bg-black/45" aria-hidden />

        {/* Row on every size: a stacked 150px poster pushed the title, the
            links and the actions off a phone screen entirely. */}
        <div className="relative p-4 sm:p-6">
          {/* Only the poster and the identifying text share a row. The synopsis
              and the actions run full width underneath, because in the column
              beside a poster they are ~240px wide on a phone. */}
          <div className="flex flex-row gap-4 sm:gap-6">
            <Poster
              title={title}
              className="h-36 w-24 shrink-0 shadow-2xl sm:h-64 sm:w-[172px]"
              sizes="(max-width: 640px) 96px, 172px"
              priority
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <Badge>#{position} in order</Badge>
                <Badge>{title.phase}</Badge>
                {/* Wrapped rather than given a `hidden` class: Badge sets its
                    own `inline-flex`, which wins over it. */}
                <span className="hidden sm:contents">
                  <Badge>{title.saga}</Badge>
                </span>
                {!released ? <Badge className="text-accent-soft">Upcoming</Badge> : null}
              </div>

              <h1 className="mt-2 text-xl font-bold leading-tight tracking-tight sm:mt-3 sm:text-4xl">
                {title.title}
              </h1>
              <div className="mt-1">
                <TitleMeta title={title} />
              </div>

              <div className="mt-3 hidden flex-wrap items-center gap-2 sm:flex">
                <ImdbLink title={title} />
                <WatchLinks title={title} />
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 sm:hidden">
            <ImdbLink title={title} />
            <WatchLinks title={title} />
          </div>

          {overview ? (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{overview}</p>
          ) : null}
          {title.note ? <p className="mt-3 max-w-2xl text-sm text-muted">{title.note}</p> : null}

          {/* Full-width stacked actions on a phone: side by side they wrapped
              into slivers narrower than a comfortable tap target. */}
          <div className="mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:flex-wrap sm:gap-3">
            <button
              type="button"
              onClick={() => toggle(title.id)}
              className={`min-h-11 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isWatched
                  ? "border border-edge bg-black/40 text-muted hover:text-text"
                  : "bg-accent text-white hover:bg-accent-soft"
              }`}
            >
              {isWatched ? "Mark as not watched" : "Mark as watched"}
            </button>

            {!isWatched && missing.length > 0 ? (
              <button
                type="button"
                onClick={() => catchUpTo(title.id)}
                className="min-h-11 rounded-lg border border-edge bg-black/40 px-4 py-2 text-sm font-medium text-text transition-colors hover:border-accent-soft"
              >
                I&rsquo;ve seen all of it — tick {missing.length} prerequisite
                {missing.length > 1 ? "s" : ""} + this
              </button>
            ) : null}

            {done.length > 0 ? (
              <button
                type="button"
                onClick={() => markUnwatched(done.map((step) => step.title.id))}
                className="min-h-11 rounded-lg border border-edge bg-black/40 px-4 py-2 text-sm text-muted transition-colors hover:text-text"
              >
                Clear its {done.length} watched prerequisite{done.length > 1 ? "s" : ""}
              </button>
            ) : null}
          </div>
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
                className="group relative flex items-center gap-3 rounded-xl border border-edge bg-panel-2/40 p-2 transition-colors hover:border-accent-soft/40"
              >
                <button
                  type="button"
                  onClick={() => toggle(step.title.id)}
                  aria-label={`Mark ${step.title.title} as watched`}
                  className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-edge text-transparent transition-colors hover:border-accent-soft hover:text-text"
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

                <Poster title={step.title} className="h-14 w-10 shrink-0" sizes="40px" />

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/title/${step.title.id}`}
                    className="block truncate font-medium hover:text-accent-soft"
                  >
                    <span className="absolute inset-0" aria-hidden />
                    {step.title.title}
                  </Link>
                  <TitleMeta title={step.title} />
                </div>

                <div className="relative z-10 hidden shrink-0 items-center gap-2 lg:flex">
                  <ImdbLink title={step.title} compact />
                  <WatchLinks title={step.title} />
                </div>

                <div className="relative z-10 hidden shrink-0 items-center gap-2 sm:flex">
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
                  <li key={edge.from} className="flex items-center gap-3">
                    <Poster title={from} className="h-11 w-8 shrink-0" sizes="32px" />
                    <Link
                      href={`/title/${from.id}`}
                      className={`min-w-0 flex-1 truncate text-sm hover:text-accent-soft ${
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
                  <li key={edge.to} className="flex items-center gap-3">
                    <Poster title={to} className="h-11 w-8 shrink-0" sizes="32px" />
                    <Link
                      href={`/title/${to.id}`}
                      className="min-w-0 flex-1 truncate text-sm hover:text-accent-soft"
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
          {KIND_LABELS[title.kind]} · streaming availability is regional and changes often — the
          &ldquo;where to watch&rdquo; link resolves it for your country. Dependency data is a
          transcription of the community watch-order chart, see{" "}
          <Link href="/about" className="text-accent-soft underline underline-offset-2">
            About
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

/**
 * The hero backdrop, layered over the gradient rather than replacing it.
 * Artwork is resolved per request now, so whether one exists is only known
 * once the image either loads or 404s - and either way the gradient underneath
 * is already a finished-looking header.
 */
function Backdrop({ id }: { id: string }) {
  const enabled = useArtworkEnabled();
  const [status, setStatus] = useState<"pending" | "loaded" | "failed">("pending");

  if (!enabled || status === "failed") return null;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={artworkSrc(id, "backdrop")}
        alt=""
        decoding="async"
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("failed")}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          status === "loaded" ? "opacity-100" : "opacity-0"
        }`}
      />
      {status === "loaded" ? (
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-ink/50" aria-hidden />
      ) : null}
    </>
  );
}
