"use client";

import Link from "next/link";
import type { Title } from "@/lib/graph/schema";
import { useWatchlist } from "@/lib/watchlist/provider";
import { Badge, ProgressBar, TitleMeta } from "./ui";

export interface TitleCardData {
  title: Title;
  position: number;
  watched: boolean;
  missingCount: number;
  released: boolean;
}

export function TitleCard({ data }: { data: TitleCardData }) {
  const { title, position, watched, missingCount, released } = data;
  const { toggle } = useWatchlist();
  const blocked = missingCount > 0;

  return (
    <li
      className={`panel group relative flex items-center gap-3 rounded-xl px-3 py-3 transition-colors sm:gap-4 sm:px-4 ${
        watched ? "opacity-70" : ""
      }`}
    >
      <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted">{position}</span>

      <button
        type="button"
        onClick={() => toggle(title.id)}
        aria-pressed={watched}
        aria-label={watched ? `Mark ${title.title} as unwatched` : `Mark ${title.title} as watched`}
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors ${
          watched
            ? "border-accent bg-accent text-white"
            : "border-edge text-transparent hover:border-accent-soft"
        }`}
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

      <div className="relative z-10 hidden shrink-0 sm:block">
        {watched ? (
          <Badge className="text-could">Watched</Badge>
        ) : blocked ? (
          <Badge className="text-muted">
            {missingCount} to watch first
          </Badge>
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
