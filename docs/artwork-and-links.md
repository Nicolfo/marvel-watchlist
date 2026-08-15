# Artwork, IMDb and streaming links

## Why artwork comes from TMDB, not IMDb

IMDb publishes **no image API**, and its poster images may not be scraped or
hotlinked under its conditions of use. So the app does not take images from
IMDb.

It uses **[TMDB](https://www.themoviedb.org/)** instead, which offers a free
official API that explicitly permits this use — and, usefully, exposes the
**IMDb id** for every entry. One lookup therefore gives us both the poster and
an exact IMDb link.

IMDb is still used for what it is good at: **linking**. Every title links to its
IMDb page.

## Three tiers of artwork

1. **Real TMDB poster/backdrop** — either baked in by `npm run artwork:fetch`,
   or resolved at request time from a `TMDB_API_KEY` in the server's
   environment. See [Two ways to get real artwork](#two-ways-to-get-real-artwork).
2. **Generated poster** — a deterministic designed treatment derived from the
   title itself: hue from a hash of its id, palette family from its phase, big
   typographic initials. This is the default, so a fresh clone with no API key
   looks finished rather than broken, and the app stays fully offline.
3. **Runtime fallback** — if a remote image fails to load, the tile silently
   degrades to tier 2 instead of showing a broken image.

Because phases map to hue bands, the grid reads as eras at a glance even with
no real artwork: Phase One is crimson, Phase Two amber, Phase Three violet, and
so on.

Tier 2 is always drawn *underneath* tier 1 rather than as an either/or. Runtime
resolution means the app cannot know at render time whether a poster exists, so
the designed art paints immediately and a real poster fades in over it. A title
with no match simply keeps what is already on screen.

## Two ways to get real artwork

|                | `artwork:fetch` (build time)     | `TMDB_API_KEY` (runtime)             |
| -------------- | -------------------------------- | ------------------------------------ |
| Where the key lives | Your shell, once            | The server's environment             |
| To enable      | Rebuild and republish the image  | Set a value, restart the pod         |
| Offline builds | Yes — URLs are committed         | No — needs egress to TMDB            |
| First page load| Instant                          | Generated art, then posters fade in  |

They compose: baked-in entries always win and cost no network call, so a
populated `data/artwork.json` keeps working untouched and a runtime key only
fills the gaps.

### Runtime resolution

Set `TMDB_API_KEY` on the server (in Kubernetes, `tmdb.apiKey` or
`tmdb.existingSecret` in the Helm chart) and posters appear on the next restart
— no image rebuild.

**The key never reaches a browser.** Only `src/lib/artwork-server.ts` reads it,
and that module throws if it is ever bundled into client code. Clients ask
`/api/artwork/<id>/<poster|backdrop>`, and the server answers with a **redirect**
to `image.tmdb.org`, whose images need no credential. So the pod does the
keyed lookup and TMDB's CDN serves the bytes.

Details worth knowing:

- **Caching.** Resolved entries are held in each pod's memory for 24h, misses
  for 1h, errors for 5 minutes. It is per-pod and lost on restart, which is
  why the first view after a rollout briefly shows generated art.
- **Politeness.** Concurrent lookups for the same title are deduplicated and at
  most 8 TMDB requests are in flight at once, so a cold 86-poster grid does not
  burst through the rate limit.
- **Prefer a v4 read access token** over a v3 API key. A v4 token is sent in an
  `Authorization` header; a v3 key can only go in the query string, which makes
  the URL itself secret. Anything loggable is passed through `redact()` either
  way, but not putting the credential in the URL is the stronger guarantee.
- **The redirect target is checked** against the TMDB image CDN prefix, so a
  malformed `data/artwork.json` cannot turn the endpoint into an open redirect.

## Fetching real artwork

```bash
# Free key: https://www.themoviedb.org/settings/api
TMDB_API_KEY=xxxxx npm run artwork:fetch

# Try one title first
TMDB_API_KEY=xxxxx npm run artwork:fetch -- --only=loki --dry-run
```

This writes `data/artwork.json` (posters, backdrops, overviews, TMDB ids and
IMDb ids). The script:

- searches the right endpoint per kind (`/search/tv` for series and animation,
  `/search/movie` otherwise) and filters by year;
- scores candidates on name and year, and **refuses to match** when nothing
  scores well — a wrong poster attached to a wrong IMDb link is worse than no
  poster, so unmatched titles are listed and keep their generated art;
- backs off and retries on TMDB's 429 rate limit;
- is idempotent, so re-running it after adding titles only fills the gaps.

`data/artwork.json` is committed with an empty `items` map. Whether you commit a
populated one is your call — committing it makes builds reproducible and
offline; leaving it empty keeps the repo free of third-party URLs.

> The matching rules live in `src/lib/tmdb.ts` (re-exported by `scripts/tmdb.ts`)
> so the script and the runtime resolver score candidates identically, and are
> unit-tested against stub payloads.

## IMDb links

`imdbId` is an **optional** field on each title in `data/marvel-graph.json`.

- **Present** → links straight to `imdb.com/title/<id>/`.
- **Absent** → links to an IMDb *search* for the title, scoped to film or TV.
  Never a dead link.

45 of the 86 titles ship with a hand-verified id. The rest use the search
fallback until either you add one by hand or `artwork:fetch` fills it in from
TMDB. Tests assert every stored id is well-formed and that no id is reused
across two titles.

## Streaming links

Streaming rights are **regional and rotate constantly**, so the app never claims
a title is definitely available to you.

- `providers: ["disney-plus"]` on a title renders a platform chip that opens
  that platform's search. Treat it as a hint, not a guarantee.
- Every title also gets a **"Where to watch"** link to JustWatch, which resolves
  availability for the visitor's country. This is the authoritative answer.

Add a platform by extending `PROVIDERS` in `src/lib/streaming.ts` (id, display
name, chip colours, search URL builder) and tagging titles with its id. Unknown
tags are ignored rather than rendered as dead chips.
