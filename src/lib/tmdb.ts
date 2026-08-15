import type { Title } from "./graph/schema";

/**
 * TMDB lookup helpers, kept pure and separate from the network so the matching
 * rules can be unit-tested without an API key.
 *
 * Why TMDB and not IMDb: IMDb publishes no image API and its artwork may not be
 * hotlinked. TMDB's API is free, explicitly permits this use, and exposes the
 * IMDb id for every entry - so we get posters *and* exact IMDb links from one
 * source.
 *
 * This module is shared by the build-time script (`scripts/fetch-artwork.ts`)
 * and the runtime resolver (`src/lib/artwork-server.ts`). It is pure: it builds
 * URLs and scores candidates, and never reads the environment or the network.
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

/**
 * How a request proves itself to TMDB.
 *
 * TMDB accepts two credential formats. A v4 read access token (a JWT) can go in
 * an `Authorization` header, which keeps it out of the URL - and therefore out
 * of access logs, error messages and stack traces. A v3 API key only works as a
 * query parameter, so URLs built with one are themselves secret; anything that
 * might log or return such a URL must put it through `redact` first.
 */
export interface TmdbAuth {
  headers: Record<string, string>;
  query: Record<string, string>;
  /** The raw credential, kept only so `redact` can find it again. */
  secret: string;
  /** True when the credential travels in a header rather than the URL. */
  inHeader: boolean;
}

export function tmdbAuth(key: string): TmdbAuth {
  const secret = key.trim();
  // v4 read access tokens are JWTs, which always start with a base64 "{"alg".
  const isToken = secret.startsWith("eyJ");
  return {
    headers: isToken ? { Authorization: `Bearer ${secret}` } : {},
    query: isToken ? {} : { api_key: secret },
    secret,
    inHeader: isToken,
  };
}

/** Strips the credential out of anything about to be logged or returned. */
export function redact(text: string, auth: TmdbAuth): string {
  return auth.secret ? text.split(auth.secret).join("***") : text;
}

/** TV-shaped entries live under a different endpoint than films. */
export function mediaTypeFor(title: Title): "movie" | "tv" {
  return title.kind === "series" || title.kind === "animation" ? "tv" : "movie";
}

export function searchUrl(title: Title, auth: TmdbAuth): string {
  const type = mediaTypeFor(title);
  const params = new URLSearchParams({ ...auth.query, query: title.title });
  // A year filter kills most of the ambiguity (there are several "Daredevil"s).
  if (title.releaseDate) {
    params.set(type === "movie" ? "primary_release_year" : "first_air_date_year", String(title.year));
  }
  return `${TMDB_API}/search/${type}?${params}`;
}

export function detailsUrl(tmdbId: number, type: "movie" | "tv", auth: TmdbAuth): string {
  const suffix = type === "tv" ? "/external_ids" : "";
  const params = new URLSearchParams(auth.query);
  const query = params.toString();
  return `${TMDB_API}/${type}/${tmdbId}${suffix}${query ? `?${query}` : ""}`;
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

/**
 * Guards the redirect target. Everything we hand a browser must be a TMDB image
 * CDN URL - never an arbitrary string that reached us from a data file.
 */
export function isTmdbImageUrl(url: string): boolean {
  return url.startsWith(`${TMDB_IMAGE}/`);
}
