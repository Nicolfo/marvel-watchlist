# Marvel Watchlist

Explore every Marvel Studios film and series in a **suggested order**, and for any
one title see exactly **what you still need to watch first**.

The catalog is not a flat list, it is a directed graph of story dependencies.
The order you see is a topological sort of that graph, so nothing ever appears
before the titles it builds on, and "what am I missing before *Avengers:
Endgame*?" is a graph traversal rather than a guess.

> **Data source.** The dependency graph is adapted from
> [**"A smarter MCU watch order"** by Rocked03](https://www.reddit.com/r/marvelstudios/s/Yc9CunxbWr)
> (ver. 003, March 2026), posted on r/marvelstudios. All credit for the ordering
> and the arrow-by-arrow judgement calls goes to its author. This project only
> transcribes that chart into machine-readable form. The credit is also shown in
> the app's [About page](src/app/[locale]/about/page.tsx).

## Features

- **Suggested order**: a topological sort of 86 titles and 139 dependencies,
  with ties broken by release date.
- **Three strictness levels**: the chart's *must / should / could* arrows are
  a user-facing setting. Both the order and the missing-prerequisite lists
  react to it, so you can take the shortest viable path or the completionist one.
- **Mark as watched**: one click anywhere, with progress bars per phase.
- **Missing dependencies**: every title's page lists the unwatched titles
  standing between you and it, transitively, in the order to watch them.
  Already-watched titles prune the traversal, so the list shrinks as you go.
- **"Ready to watch"**: the set of titles whose prerequisites you have all met.
- **Local-first**: the watchlist lives in `localStorage`. No account, no
  tracking, no server. JSON export/import to move it between browsers.
- **Upcoming titles**: release dates are compared at render time, so an
  unreleased film flips to released on its own.
- **Poster grid or list view**, with phase-coded artwork, a hero panel showing
  what to watch next, and a sticky filter bar.
- **IMDb links on every title**, plus streaming links: platform chips and a
  region-aware "where to watch" resolver.
- **Artwork**: real posters from TMDB when a key is configured, and designed
  generated posters otherwise, so a fresh clone looks finished with zero setup.
- **14 languages, including right-to-left**: the whole interface is translated
  into English, Spanish, Portuguese, French, German, Italian, Turkish, Russian,
  Hindi, Chinese, Japanese, Korean, Arabic and Persian. Arabic and Persian get a
  properly mirrored layout, plurals go through `Intl.PluralRules` (Russian's
  one/few/many, Arabic's dual), and the language is part of the URL so a shared
  link opens in the language it was shared in.
- **Detailed summaries, behind a spoiler gate**: 80 of the 82 released titles
  have a full plot summary - ending included - so you can skip one and still
  follow what comes next. It is never shown unless you ask, and the text is not
  sent to the browser at all until you press the button; the short spoiler-free
  synopsis stays exactly where it was. Summaries are translatable per title,
  falling back to English. An opt-in preference remembers if you would rather
  always see them.

## Quick start

```bash
npm install
npm run dev            # http://localhost:3000
```

```bash
npm test                   # engine + dataset invariants
npm run typecheck
npm run graph:validate     # dataset integrity (also runs as a prebuild step)
npm run summaries:validate # summary coverage (also runs as a prebuild step)
npm run i18n:validate      # dictionary keys and placeholders (prebuild step)
npm run graph:stats        # print the computed watch order
```

## Help wanted: translations

**You do not have to finish anything.** Both translation layers fall back to
English *per string* and *per title*, so fixing one awkward sentence, or
translating three films, is a complete and useful contribution. Nothing is
blocked on somebody doing all of it.

> **A warning worth reading first.** Every non-English string currently in this
> repository was written by an AI, not by a native speaker. It is careful, and
> it is not the same thing as being right. If you speak one of these languages,
> the most valuable thing you can do is read what is there and correct it —
> that is a bigger contribution than adding a fifteenth language.

### Where help is most needed, in order

| | Where | Size | State |
| --- | --- | --- | --- |
| 1. Reviewing existing translations | `src/i18n/dictionaries/*.json` | ~185 strings each | All 14 written, none reviewed by a speaker |
| 2. Translating plot summaries | `data/summaries/<locale>.json` | 80 titles, ~15,000 words | English complete; Italian complete, unreviewed |
| 3. Adding a new language | both of the above | — | 14 supported |

### Fixing a word or a sentence

```bash
# edit the string in src/i18n/dictionaries/<locale>.json
npm run i18n:validate
```

Keep the key and the `{placeholders}` exactly as they are — the validator fails
the build if a placeholder is dropped, renamed or invented, because `{cont}` for
`{count}` prints literal text to a reader and a dropped `{link}` silently
deletes a link from a sentence.

Two things that are *not* mistakes: a string identical to English (“IMDb”,
“Netflix”, “Menu” are correct as-is in several languages), and a language
needing **more** plural forms than English — Russian's `few`/`many` and Arabic's
`two` are the point. See
[docs/internationalisation.md](docs/internationalisation.md) for plurals and for
sentences with a link inside them.

### Translating a plot summary

```bash
# add an entry to data/summaries/<locale>.json, using the same title id as en.json
npm run summaries:validate
```

Create the file if your language does not have one yet (copy the header from
`data/summaries/it.json`, set `"locale"`, and register it in
`src/lib/summaries/catalog.ts`). **Translate as few as you like** — a title you
have not reached falls back to the English summary, and the reader is told, in
their own language, that this one is not translated yet.

Write it so someone can skip the film and still follow the next one: the whole
plot, ending included. That is what the section is for. Full guide:
[docs/spoiler-summaries.md](docs/spoiler-summaries.md).

### Adding a language

1. Copy `src/i18n/dictionaries/en.json` to `<code>.json` and translate it.
2. Add a row to `LOCALES` in `src/i18n/config.ts` — with the language's name
   **in that language**, and `rtl: true` if it reads right to left.
3. Add the importer line in `src/i18n/dictionary.ts`.
4. Optionally add `data/summaries/<code>.json` and register it in
   `src/lib/summaries/catalog.ts`.
5. Run `npm run i18n:validate && npm run summaries:validate`.

### Current coverage

Both commands print it. As of the last update:

```
UI strings   all 14 languages at 92-99% (the remainder are strings that are
             correctly identical to English)
Summaries    en 80/82 released titles · it 80/82
```

The two titles missing from English — `wonder-man` and
`spider-man-brand-new-day` — are deliberately unwritten rather than forgotten,
and are declared as such so an *undeclared* gap still fails the build. If you
have actually watched either, that is a contribution nobody else can make.

## Updating the data

New Marvel release? Edit **one file** (`data/marvel-graph.json`), then run
`npm run graph:validate`. You never write positions, only dependencies; the
order is computed. Full guide: **[docs/updating-the-graph.md](docs/updating-the-graph.md)**.

The validator rejects unknown ids, duplicate/self edges and **dependency
cycles** before a build can ship, so bad data cannot reach a release.

### Detailed summaries

Full detail: **[docs/spoiler-summaries.md](docs/spoiler-summaries.md)**.

Summaries live in `data/summaries/`, **one file per language**, keyed by title
id, as original prose written for this project. Resolution falls back to English
**per title**, so a translator who does five films ships five translated films
rather than having to finish all eighty first. Add or fix one and run
`npm run summaries:validate`.

### Languages

Full detail: **[docs/internationalisation.md](docs/internationalisation.md)**.

The **interface** is fully translated into all 14. **Title names are not, and
will not be** — they are identifiers, and a machine-translated film title helps
nobody find the film. The **plot summaries** can be translated and English is
the fallback; see [Help wanted](#help-wanted-translations).

Adding a language is one JSON file in `src/i18n/dictionaries/` plus a row in
`src/i18n/config.ts`. Missing keys fall back to English, so a partial
translation is shippable.

### Posters, IMDb and streaming

Full detail: **[docs/artwork-and-links.md](docs/artwork-and-links.md)**.

IMDb has no image API and its posters may not be hotlinked, so **artwork comes
from TMDB**, whose free API also exposes each title's IMDb id, giving posters
and exact IMDb links from one lookup. IMDb is used for linking.

There are two ways to supply a key, and they compose:

```bash
# Build time - bakes URLs into data/artwork.json, so builds stay offline
TMDB_API_KEY=xxxxx npm run artwork:fetch                      # real posters + IMDb ids
TMDB_API_KEY=xxxxx npm run artwork:fetch -- --only=loki --dry-run

# Runtime - the server resolves artwork per request, no image rebuild
TMDB_API_KEY=xxxxx npm start
```

At runtime the key is read **only on the server**. Browsers request
`/api/artwork/<id>/poster` and get redirected to TMDB's public image CDN, which
needs no credential, so the key never reaches a client.

Without a key the app draws **generated posters** from each title's own data
(hue from the id, palette from the phase), so it looks finished offline and with
no third-party accounts. Titles TMDB cannot confidently match are reported and
skipped rather than mismatched.

Streaming availability is regional and volatile, so platform chips are hints and
every title also carries a region-aware **JustWatch** link as the authoritative
answer.

Exporters are included for other stores:

```bash
npm run db:seed              # Postgres, via Prisma (idempotent upsert)
npm run graph:export:sql     # the same as a plain .sql file
npm run graph:export:cypher  # Neo4j CREATE statements
```

## Architecture

```
data/marvel-graph.json     source of truth: titles + typed dependency edges
data/summaries/            detailed spoiler summaries, one file per language
src/i18n/                  locales, dictionaries, plural + interpolation runtime
src/middleware.ts          locale negotiation and redirects for unprefixed URLs
src/lib/graph/schema.ts    zod schema + integrity checks (cycles, dangling ids)
src/lib/graph/engine.ts    topological sort, transitive prerequisites, progress
src/lib/summaries/         summary schema + client-safe accessor
src/lib/watchlist/         WatchlistAdapter interface + localStorage impl + React provider
src/app/[locale]/          Next.js App Router pages, prerendered per language
prisma/                    optional Postgres schema + seed for the future logged-in mode
helm/marvel-watchlist/     Helm chart
```

**Why no database, and why Postgres rather than a graph DB when one is
eventually needed:** see **[docs/adr-001-storage.md](docs/adr-001-storage.md)**.
Short version: 86 nodes and 139 edges is ~50 KB of JSON, which fits in the
browser, so traversals are local and instant; Neo4j would be an extra stateful
component to answer a question a `for` loop answers in microseconds. A Cypher
exporter is included anyway, so nothing is locked in.

### Adding logins later

`src/lib/watchlist/types.ts` defines a three-method `WatchlistAdapter`.
`LocalStorageAdapter` is the default; `RemoteWatchlistAdapter` already speaks
the `/api/watchlist` contract, and `prisma/schema.prisma` models `User` and
`WatchEntry`. Wiring it up means implementing that route against a session.
The UI changes by one argument to `<WatchlistProvider>`.

## Deployment

### Docker

```bash
docker build -t marvel-watchlist:local .
docker run --rm -p 3000:3000 marvel-watchlist:local
```

Multi-stage build on `node:22-alpine` using Next's `output: "standalone"`, so
the runtime image carries the server and only the modules it actually uses, with no
`npm install` at runtime. Runs as non-root (uid 1001) with a `HEALTHCHECK`
against `/api/health`.

`docker compose up --build` additionally starts a Postgres container. **It is
not required**: the app ignores it until accounts exist; it is there for
`npm run db:seed` and local work on the logged-in mode.

### Published images

CI publishes to **`ghcr.io/nicolfo/marvel-watchlist`** from `main` and from
version tags. Pull requests build the image but never publish it, and the job is
gated on the test and chart jobs, so a failing test cannot produce a published
image.

| Trigger | Tags pushed |
| --- | --- |
| push to `main` | `latest`, `main`, `sha-<short>` |
| push tag `v1.2.3` | `1.2.3`, `1.2`, `sha-<short>` |
| pull request | *(none, build only)* |

Cutting a release is therefore a git tag:

```bash
git tag v0.1.0 && git push origin v0.1.0   # publishes :0.1.0 and :0.1
```

Bump `version`/`appVersion` in `helm/marvel-watchlist/Chart.yaml` to match, so
the chart's default tag resolves to an image that exists.

> **Until you cut the first `v*` tag**, only `latest`/`main`/`sha-*` exist, so
> the chart's default (`appVersion`, currently `0.1.0`) will not pull. Use
> `--set image.tag=latest` or a `sha-` tag in the meantime.

> **Package visibility is separate from repo visibility.** A new GHCR package
> inherits the repo's visibility on first publish, but making the repo public
> later does *not* flip the package, change it under
> *Repo → Packages → marvel-watchlist → Package settings → Change visibility*.
> While the package is private a cluster needs a pull secret: create one, then
> pass `--set imagePullSecrets[0].name=ghcr`. Once it is public, `helm install`
> works with no secret at all.

### Kubernetes (Helm)

```bash
helm install marvel-watchlist ./helm/marvel-watchlist \
  --set image.tag=latest        # or 0.1.0 once v0.1.0 is tagged

helm test marvel-watchlist
```

With real TMDB artwork (resolved at runtime, so no image rebuild):

```bash
# Chart-managed Secret...
helm upgrade --install marvel-watchlist ./helm/marvel-watchlist \
  --set tmdb.apiKey=xxxxx

# ...or a Secret you manage yourself, to keep the key out of Git-tracked values
kubectl create secret generic tmdb --from-literal=TMDB_API_KEY=xxxxx
helm upgrade --install marvel-watchlist ./helm/marvel-watchlist \
  --set tmdb.existingSecret=tmdb
```

Do **not** put the key in the plain `env:` map, that renders it as a literal
value in the pod spec, readable by anyone who can `kubectl get pod -o yaml`.

With an ingress:

```bash
helm install marvel-watchlist ./helm/marvel-watchlist \
  --set ingress.enabled=true \
  --set ingress.className=nginx \
  --set ingress.hosts[0].host=marvel.example.com \
  --set ingress.hosts[0].paths[0].path=/ \
  --set ingress.hosts[0].paths[0].pathType=Prefix
```

The chart ships a Deployment, Service, ServiceAccount, PodDisruptionBudget,
optional Ingress / HPA / TMDB_API_KEY / DATABASE_URL Secrets, and a `helm test` pod that curls
`/api/health`. Defaults: 2 replicas, non-root, read-only root filesystem,
dropped capabilities, liveness/readiness probes on `/api/health`, and topology
spread across nodes. The app is stateless, so replicas need no shared storage.

| Value | Default | Notes |
| --- | --- | --- |
| `replicaCount` | `2` | Ignored when `autoscaling.enabled` |
| `image.repository` / `image.tag` | `ghcr.io/nicolfo/marvel-watchlist` / chart appVersion | |
| `ingress.enabled` | `false` | |
| `autoscaling.enabled` | `false` | HPA v2, CPU 75% |
| `podDisruptionBudget.enabled` | `true` | `minAvailable: 1` |
| `database.enabled` | `false` | Injects `DATABASE_URL` from `database.url` or `database.existingSecret` |
| `resources` | 50m/128Mi → 500m/512Mi | |

Shipping a data update = build a new image from an updated
`data/marvel-graph.json` and roll the deployment.

## Endpoints

| Route | Purpose |
| --- | --- |
| `/` | Ordered explorer with filters, search and strictness control |
| `/title/[id]` | One title: missing prerequisites, what points into it, what it unlocks |
| `/watchlist` | Progress by phase, ready-to-watch, JSON export/import |
| `/about` | Source credit, arrow semantics, how the data is maintained |
| `/api/health` | Probe target; reports `dataVersion` |
| `/api/graph` | The whole dataset as JSON |
| `/api/watchlist` | `501` placeholder for the account-backed mode |

## Licence and legal

An unofficial fan project. Marvel, the MCU and all title names are trademarks of
Marvel Characters, Inc. and The Walt Disney Company; this project is not
affiliated with, endorsed by, or sponsored by them. It stores no media, only
title names and the relationships between them.

The code is MIT licensed. The dataset, the Marvel trademarks and the TMDB
artwork are not ours to license: see [LICENSE](LICENSE) for what each covers.
