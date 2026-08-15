"use client";

import Link from "next/link";
import type { Title } from "@/lib/graph/schema";
import { useWatchlist } from "@/lib/watchlist/provider";
import { ImdbLink, WatchLinks } from "./links";
import { Poster } from "./poster";
import { Badge, ProgressBar, TitleMeta } from "./ui";

export interface TitleCardData {
  title: Title;
  position: number;
  watched: boolean;
  missingCount: number;
  released: boolean;
}

function WatchToggle({
  title,
  watched,
  size = "md",
}: {
  title: Title;
  watched: boolean;
  size?: "sm" | "md";
}) {
  const { toggle } = useWatchlist();
  const dimensions = size === "sm" ? "h-6 w-6" : "h-8 w-8";

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(title.id);
      }}
      aria-pressed={watched}
      aria-label={watched ? `Mark ${title.title} as unwatched` : `Mark ${title.title} as watched`}
      className={`group/toggle grid ${dimensions} shrink-0 place-items-center rounded-full border backdrop-blur transition-colors ${
        watched
          ? "border-accent bg-accent text-white"
          : "border-white/30 bg-black/50 text-white hover:border-accent-soft"
      }`}
    >
      {/* Unwatched: the tick stays hidden until hover, so an empty circle is
          never mistaken for a ticked one. */}
      <svg
        viewBox="0 0 20 20"
        className={`h-4 w-4 transition-opacity ${
          watched ? "opacity-100" : "opacity-0 group-hover/toggle:opacity-60"
        }`}
        fill="none"
        aria-hidden
      >
        <path
          d="M5 10.5l3.5 3.5L15 7"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/** Poster tile used in the grid view. */
export function TitleTile({ data, priority = false }: { data: TitleCardData; priority?: boolean }) {
  const { title, position, watched, missingCount, released } = data;

  return (
    <li className="group relative">
      <div className="tile relative overflow-hidden rounded-xl border border-edge">
        <Poster title={title} className="aspect-[2/3] w-full" priority={priority} />

        {/* Readability scrim for the text that sits over the art. */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/40"
          aria-hidden
        />

        <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white/80 backdrop-blur">
          {position}
        </span>

        <div className="absolute right-2 top-2">
          <WatchToggle title={title} watched={watched} size="sm" />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2.5">
          <h3
            className={`line-clamp-2 text-sm font-semibold leading-tight text-white ${
              watched ? "opacity-60" : ""
            }`}
          >
            {title.title}
          </h3>
          <p className="mt-1 text-[11px] text-white/60">
            {title.year}
            {!released ? " · Upcoming" : ""}
          </p>

          <div className="mt-1.5">
            {watched ? (
              <span className="inline-block rounded bg-could/20 px-1.5 py-0.5 text-[10px] font-medium text-could">
                Watched
              </span>
            ) : missingCount > 0 ? (
              <span className="inline-block rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white/70">
                {missingCount} first
              </span>
            ) : (
              <span className="inline-block rounded bg-could/20 px-1.5 py-0.5 text-[10px] font-medium text-could">
                Ready
              </span>
            )}
          </div>
        </div>

        {/* Hover/focus panel with the external links. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 p-2.5 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <div className="rounded-lg bg-black/85 p-2 backdrop-blur">
            <div className="flex flex-wrap items-center gap-1.5">
              <ImdbLink title={title} compact />
              <WatchLinks title={title} />
            </div>
          </div>
        </div>
      </div>

      <Link
        href={`/title/${title.id}`}
        className="absolute inset-0 rounded-xl"
        aria-label={`${title.title} details`}
      >
        <span className="sr-only">{title.title}</span>
      </Link>
    </li>
  );
}

/** Compact row used in the list view. */
export function TitleCard({ data }: { data: TitleCardData }) {
  const { title, position, watched, missingCount, released } = data;

  return (
    <li
      className={`panel group relative flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:border-accent-soft/40 sm:gap-4 ${
        watched ? "opacity-70" : ""
      }`}
    >
      <span className="w-7 shrink-0 text-right text-xs tabular-nums text-muted">{position}</span>

      <div className="relative z-10">
        <WatchToggle title={title} watched={watched} size="sm" />
      </div>

      <Poster title={title} className="h-16 w-11 shrink-0" sizes="44px" />

      <div className="min-w-0 flex-1">
        <Link href={`/title/${title.id}`} className="block">
          <span className="absolute inset-0" aria-hidden />
          <span
            className={`block truncate font-medium ${watched ? "line-through decoration-muted" : ""}`}
          >
            {title.title}
          </span>
        </Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <TitleMeta title={title} />
          {!released ? <Badge className="text-accent-soft">Upcoming</Badge> : null}
        </div>
      </div>

      <div className="relative z-10 hidden shrink-0 items-center gap-2 lg:flex">
        <ImdbLink title={title} compact />
        <WatchLinks title={title} />
      </div>

      <div className="relative z-10 hidden shrink-0 sm:block">
        {watched ? (
          <Badge className="text-could">Watched</Badge>
        ) : missingCount > 0 ? (
          <Badge className="text-muted">{missingCount} to watch first</Badge>
        ) : (
          <Badge className="text-could">Ready</Badge>
        )}
      </div>
    </li>
  );
}

export function PhaseHeading({
  phase,
  watched,
  total,
}: {
  phase: string;
  watched: number;
  total: number;
}) {
  return (
    <div className="mb-3 mt-8 flex items-center gap-4 first:mt-0">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">{phase}</h2>
      <div className="hidden flex-1 sm:block">
        <ProgressBar value={watched} total={total} />
      </div>
      <span className="text-xs tabular-nums text-muted">
        {watched}/{total}
      </span>
    </div>
  );
}
