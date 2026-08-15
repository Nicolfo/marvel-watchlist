"use client";

import type { Title } from "@/lib/graph/schema";
import { imdbUrl, hasExactImdbLink, providersFor, whereToWatchUrl } from "@/lib/streaming";

/** IMDb chip. Falls back to an IMDb search when we have no exact id. */
export function ImdbLink({ title, compact = false }: { title: Title; compact?: boolean }) {
  const exact = hasExactImdbLink(title);
  return (
    <a
      href={imdbUrl(title)}
      target="_blank"
      rel="noreferrer noopener"
      onClick={(event) => event.stopPropagation()}
      title={exact ? `${title.title} on IMDb` : `Search IMDb for ${title.title}`}
      className="inline-flex items-center gap-1.5 rounded-md border border-[#c9a227]/40 bg-[#3a2f06] px-2 py-1 text-[11px] font-semibold text-[#f5cf4a] transition-colors hover:border-[#f5cf4a]"
    >
      <span className="tracking-tight">IMDb</span>
      {!compact && !exact ? <span className="font-normal text-[#f5cf4a]/70">search</span> : null}
    </a>
  );
}

/**
 * Where to watch. Platform chips are hints; the JustWatch link is the
 * authoritative, region-aware answer and is always shown.
 */
export function WatchLinks({ title, className = "" }: { title: Title; className?: string }) {
  const providers = providersFor(title);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {providers.map((provider) => (
        <a
          key={provider.id}
          href={provider.search(title)}
          target="_blank"
          rel="noreferrer noopener"
          onClick={(event) => event.stopPropagation()}
          className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-opacity hover:opacity-80 ${provider.className}`}
        >
          {provider.name}
        </a>
      ))}
      <a
        href={whereToWatchUrl(title)}
        target="_blank"
        rel="noreferrer noopener"
        onClick={(event) => event.stopPropagation()}
        className="inline-flex items-center gap-1 rounded-md border border-edge px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:border-accent-soft hover:text-text"
      >
        Where to watch
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" aria-hidden>
          <path
            d="M4.5 2h5.5v5.5M10 2L2 10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    </div>
  );
}
