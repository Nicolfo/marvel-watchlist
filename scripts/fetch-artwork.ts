/**
 * Fills data/artwork.json with real posters, backdrops and IMDb ids from TMDB.
 *
 *   TMDB_API_KEY=xxxxx npm run artwork:fetch
 *   TMDB_API_KEY=xxxxx npm run artwork:fetch -- --only=iron-man --dry-run
 *
 * Get a free key at https://www.themoviedb.org/settings/api. Without one the
 * app renders its own generated poster art, so this step is entirely optional.
 *
 * Titles that TMDB cannot confidently match are reported and skipped rather
 * than guessed at, since a wrong poster with a wrong IMDb link is worse than none.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadGraphData } from "./load-graph";
import {
  backdropUrl,
  detailsUrl,
  mediaTypeFor,
  pickBestMatch,
  posterUrl,
  redact,
  resultName,
  searchUrl,
  tmdbAuth,
  type TmdbResult,
} from "./tmdb";

const ARTWORK_PATH = resolve(process.cwd(), "data/artwork.json");
const DRY_RUN = process.argv.includes("--dry-run");
const ONLY = process.argv.find((arg) => arg.startsWith("--only="))?.slice("--only=".length);

const apiKey = process.env.TMDB_API_KEY;
if (!apiKey) {
  console.error(
    "TMDB_API_KEY is not set.\n" +
      "Get a free key at https://www.themoviedb.org/settings/api, then:\n" +
      "  TMDB_API_KEY=xxxxx npm run artwork:fetch\n\n" +
      "This step is optional; without it the app draws its own poster art.",
  );
  process.exit(1);
}

const auth = tmdbAuth(apiKey);
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: auth.headers });
  if (response.status === 429) {
    // TMDB rate limit: back off once and retry.
    await sleep(2000);
    return getJson<T>(url);
  }
  // With a v3 key the URL carries the credential, so redact before it can end
  // up in a terminal scrollback or a CI log.
  if (!response.ok) {
    throw new Error(redact(`${response.status} ${response.statusText} for ${url}`, auth));
  }
  return (await response.json()) as T;
}

async function main() {
  const data = loadGraphData();
  const existing = JSON.parse(readFileSync(ARTWORK_PATH, "utf8"));
  const items: Record<string, unknown> = { ...(existing.items ?? {}) };

  const targets = ONLY ? data.titles.filter((title) => title.id === ONLY) : data.titles;
  if (targets.length === 0) {
    console.error(`no title matches --only=${ONLY}`);
    process.exit(1);
  }

  const unmatched: string[] = [];

  for (const title of targets) {
    const type = mediaTypeFor(title);
    try {
      const search = await getJson<{ results: TmdbResult[] }>(searchUrl(title, auth));
      const match = pickBestMatch(title, search.results ?? []);

      if (!match) {
        unmatched.push(title.id);
        console.warn(`?  ${title.id}: no confident match`);
        continue;
      }

      const details = await getJson<{ imdb_id?: string }>(detailsUrl(match.id, type, auth));

      items[title.id] = {
        tmdbId: match.id,
        imdbId: details.imdb_id ?? title.imdbId ?? undefined,
        posterUrl: posterUrl(match.poster_path),
        backdropUrl: backdropUrl(match.backdrop_path),
        overview: match.overview || undefined,
      };

      console.log(`ok ${title.id} -> ${resultName(match)} (${details.imdb_id ?? "no imdb id"})`);
      await sleep(120); // stay well inside TMDB's rate limit
    } catch (error) {
      unmatched.push(title.id);
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`!  ${title.id}: ${redact(message, auth)}`);
    }
  }

  const output = {
    ...existing,
    generatedAt: new Date().toISOString(),
    items,
  };

  if (DRY_RUN) {
    console.log(`\ndry run: would write ${Object.keys(items).length} entries`);
  } else {
    writeFileSync(ARTWORK_PATH, `${JSON.stringify(output, null, 2)}\n`);
    console.log(`\nwrote ${Object.keys(items).length} entries to ${ARTWORK_PATH}`);
  }

  if (unmatched.length > 0) {
    console.log(
      `\n${unmatched.length} title(s) skipped: ${unmatched.join(", ")}\n` +
        "These keep their generated artwork. Add an imdbId in data/marvel-graph.json if you want an exact link.",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
