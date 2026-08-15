import { artworkFor, HAS_REAL_ARTWORK, type ArtworkEntry } from "./artwork";
import { getGraph } from "./graph/catalog";
import {
  backdropUrl,
  detailsUrl,
  mediaTypeFor,
  pickBestMatch,
  posterUrl,
  redact,
  searchUrl,
  tmdbAuth,
  type TmdbAuth,
  type TmdbResult,
} from "./tmdb";

/**
 * Runtime artwork resolution.
 *
 * `scripts/fetch-artwork.ts` bakes artwork into the image at build time. This
 * module is the other half: it resolves artwork *at request time* from a
 * TMDB_API_KEY supplied by the environment, so an operator can turn posters on
 * with a Helm value instead of rebuilding and republishing the image.
 *
 * The credential never leaves the server. Only `/api/artwork/[id]/[variant]`
 * calls in here, and all a browser ever receives is a redirect to a public
 * image.tmdb.org URL - which needs no key to fetch.
 */

// A hard guard rather than a comment: bundling this into client code would ship
// the key to every visitor, so fail loudly instead of subtly.
if (typeof window !== "undefined") {
  throw new Error("artwork-server.ts is server-only and must never be imported by a client component");
}

const HIT_TTL_MS = 24 * 60 * 60 * 1000;
/** Misses expire sooner: TMDB gains entries, and outages should self-heal. */
const MISS_TTL_MS = 60 * 60 * 1000;
const ERROR_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 6000;
/** TMDB tolerates ~50 req/s; a cold grid of 86 posters must not go at once. */
const MAX_CONCURRENT = 8;

interface CacheEntry {
  entry: ArtworkEntry | null;
  expires: number;
}

const cache = new Map<string, CacheEntry>();
/** Dedupes the burst of identical lookups a cold poster grid produces. */
const inflight = new Map<string, Promise<ArtworkEntry | null>>();

function apiKey(): string | null {
  const raw = process.env.TMDB_API_KEY?.trim();
  return raw ? raw : null;
}

/**
 * Whether it is worth the browser asking for artwork at all. False means every
 * poster is drawn locally, so the client can skip requests that would all 404.
 */
export function artworkEnabled(): boolean {
  return HAS_REAL_ARTWORK || apiKey() !== null;
}

let active = 0;
const waiting: Array<() => void> = [];

async function gate<T>(run: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) {
    await new Promise<void>((release) => waiting.push(release));
  }
  active += 1;
  try {
    return await run();
  } finally {
    active -= 1;
    waiting.shift()?.();
  }
}

async function getJson<T>(url: string, auth: TmdbAuth): Promise<T> {
  const response = await gate(() =>
    fetch(url, {
      headers: auth.headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      // Next would otherwise cache these in its own data cache, which is a
      // second TTL on top of the one below; the map here is the single source.
      cache: "no-store",
    }),
  );
  if (!response.ok) {
    // Deliberately does not include the URL: with a v3 key the URL *is* the
    // credential.
    throw new Error(`TMDB responded ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

function remember(id: string, entry: ArtworkEntry | null, ttl: number): ArtworkEntry | null {
  cache.set(id, { entry, expires: Date.now() + ttl });
  return entry;
}

async function lookup(id: string, auth: TmdbAuth): Promise<ArtworkEntry | null> {
  const title = getGraph().byId.get(id);
  if (!title) return remember(id, null, MISS_TTL_MS);

  try {
    const search = await getJson<{ results?: TmdbResult[] }>(searchUrl(title, auth), auth);
    const match = pickBestMatch(title, search.results ?? []);
    // Same rule as the offline script: no confident match means generated art,
    // never a guess that would pair a wrong poster with a wrong IMDb link.
    if (!match) return remember(id, null, MISS_TTL_MS);

    const type = mediaTypeFor(title);
    const details = await getJson<{ imdb_id?: string }>(detailsUrl(match.id, type, auth), auth);

    return remember(
      id,
      {
        tmdbId: match.id,
        imdbId: details.imdb_id ?? title.imdbId ?? undefined,
        posterUrl: posterUrl(match.poster_path),
        backdropUrl: backdropUrl(match.backdrop_path),
        overview: match.overview || undefined,
      },
      HIT_TTL_MS,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`artwork: ${id}: ${redact(message, auth)}`);
    // Cache the failure briefly, so a TMDB outage cannot turn every page view
    // into another doomed round of requests.
    return remember(id, null, ERROR_TTL_MS);
  }
}

/**
 * Artwork for one title, or null if there is none to be had.
 *
 * Baked-in artwork wins and costs no network call, so a populated
 * `data/artwork.json` keeps working exactly as before and a key is only
 * consulted for the titles it does not cover.
 */
export async function resolveArtwork(id: string): Promise<ArtworkEntry | null> {
  const seeded = artworkFor(id);
  if (seeded) return seeded;

  const key = apiKey();
  if (!key) return null;

  const cached = cache.get(id);
  if (cached && cached.expires > Date.now()) return cached.entry;

  const pending = inflight.get(id);
  if (pending) return pending;

  const started = lookup(id, tmdbAuth(key)).finally(() => inflight.delete(id));
  inflight.set(id, started);
  return started;
}
