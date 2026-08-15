import type { Title } from "../src/lib/graph/schema";

/**
 * TMDB lookup helpers, kept pure and separate from the network so the matching
 * rules can be unit-tested without an API key.
 *
 * Why TMDB and not IMDb: IMDb publishes no image API and its artwork may not be
 * hotlinked. TMDB's API is free, explicitly permits this use, and exposes the
 * IMDb id for every entry - so we get posters *and* exact IMDb links from one
 * source.
 */

export const TMDB_API = "https://api.themoviedb.org/3";
export const TMDB_IMAGE = "https://image.tmdb.org/t/p";

export interface TmdbResult {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  popularity?: number;
}

/** TV-shaped entries live under a different endpoint than films. */
export function mediaTypeFor(title: Title): "movie" | "tv" {
  return title.kind === "series" || title.kind === "animation" ? "tv" : "movie";
}

export function searchUrl(title: Title, apiKey: string): string {
  const type = mediaTypeFor(title);
  const params = new URLSearchParams({ api_key: apiKey, query: title.title });
  // A year filter kills most of the ambiguity (there are several "Daredevil"s).
  if (title.releaseDate) {
    params.set(type === "movie" ? "primary_release_year" : "first_air_date_year", String(title.year));
  }
  return `${TMDB_API}/search/${type}?${params}`;
}

export function detailsUrl(tmdbId: number, type: "movie" | "tv", apiKey: string): string {
  const suffix = type === "tv" ? "/external_ids" : "";
  return `${TMDB_API}/${type}/${tmdbId}${suffix}?api_key=${apiKey}`;
}

export function resultYear(result: TmdbResult): number | null {
  const date = result.release_date ?? result.first_air_date;
  if (!date) return null;
  const year = Number.parseInt(date.slice(0, 4), 10);
  return Number.isNaN(year) ? null : year;
}

export function resultName(result: TmdbResult): string {
  return result.title ?? result.name ?? "";
}

function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Picks the best candidate for a title. Exact-ish name match and a matching
 * year dominate; popularity only breaks remaining ties. Returns null rather
 * than guessing when nothing is close, so a bad match never silently ships a
 * wrong poster and a wrong IMDb link.
 */
export function pickBestMatch(title: Title, results: TmdbResult[]): TmdbResult | null {
  const wanted = normalise(title.title);
  let best: { result: TmdbResult; score: number } | null = null;

  for (const result of results) {
    const name = normalise(resultName(result));
    if (!name) continue;

    let score = 0;
    if (name === wanted) score += 100;
    else if (name.startsWith(wanted) || wanted.startsWith(name)) score += 60;
    else if (name.includes(wanted) || wanted.includes(name)) score += 30;
    else continue; // unrelated title - never match on popularity alone

    const year = resultYear(result);
    if (year !== null) {
      const drift = Math.abs(year - title.year);
      if (drift === 0) score += 40;
      else if (drift === 1) score += 20;
      else score -= drift * 5;
    }

    score += Math.min(result.popularity ?? 0, 50) / 100;

    if (!best || score > best.score) best = { result, score };
  }

  return best && best.score >= 40 ? best.result : null;
}

export function posterUrl(path: string | null | undefined, size = "w500"): string | undefined {
  return path ? `${TMDB_IMAGE}/${size}${path}` : undefined;
}

export function backdropUrl(path: string | null | undefined, size = "w1280"): string | undefined {
  return path ? `${TMDB_IMAGE}/${size}${path}` : undefined;
}
