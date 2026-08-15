import type { Title } from "./graph/schema";

/**
 * Where to watch a title.
 *
 * Streaming rights are regional and rotate constantly, so this module treats
 * per-title platform tags as a *hint* and always offers a JustWatch link as the
 * authoritative, region-aware answer. Nothing here claims a title is definitely
 * available to a given visitor.
 */

export interface Provider {
  id: string;
  name: string;
  /** Tailwind classes for the chip. */
  className: string;
  search(title: Title): string;
}

const q = (title: Title) => encodeURIComponent(title.title);

export const PROVIDERS: Provider[] = [
  {
    id: "disney-plus",
    name: "Disney+",
    className: "bg-[#0c2a6b] text-[#c9dcff] border-[#1b4bb0]",
    search: (title) => `https://www.disneyplus.com/search?q=${q(title)}`,
  },
  {
    id: "hulu",
    name: "Hulu",
    className: "bg-[#0a2e1d] text-[#7ef0b0] border-[#14764a]",
    search: (title) => `https://www.hulu.com/search?q=${q(title)}`,
  },
  {
    id: "netflix",
    name: "Netflix",
    className: "bg-[#3a0c10] text-[#ff9a9a] border-[#8c1a22]",
    search: (title) => `https://www.netflix.com/search?q=${q(title)}`,
  },
  {
    id: "prime-video",
    name: "Prime Video",
    className: "bg-[#06263a] text-[#8fd4ff] border-[#0f5c88]",
    search: (title) => `https://www.amazon.com/s?k=${q(title)}&i=instant-video`,
  },
];

const BY_ID = new Map(PROVIDERS.map((provider) => [provider.id, provider]));

export function providersFor(title: Title): Provider[] {
  return (title.providers ?? [])
    .map((id) => BY_ID.get(id))
    .filter((provider): provider is Provider => provider !== undefined);
}

/**
 * Region-aware "where can I actually watch this" link. JustWatch resolves
 * availability per country, which is the honest answer to a question that has
 * no single global truth.
 */
export function whereToWatchUrl(title: Title): string {
  return `https://www.justwatch.com/us/search?q=${q(title)}`;
}

/**
 * A direct IMDb link when we know the id, otherwise an IMDb search that always
 * lands on something useful rather than a 404.
 */
export function imdbUrl(title: Title): string {
  if (title.imdbId) return `https://www.imdb.com/title/${title.imdbId}/`;
  const kind = title.kind === "series" || title.kind === "animation" ? "tv" : "ft";
  return `https://www.imdb.com/find/?q=${q(title)}&s=tt&ttype=${kind}`;
}

export function hasExactImdbLink(title: Title): boolean {
  return Boolean(title.imdbId);
}
