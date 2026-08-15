# Marvel Watchlist

Explore every Marvel Studios film and series in a **suggested order**, and for any
one title see exactly **what you still need to watch first**.

The catalog is not a flat list — it is a directed graph of story dependencies.
The order you see is a topological sort of that graph, so nothing ever appears
before the titles it builds on, and "what am I missing before *Avengers:
Endgame*?" is a graph traversal rather than a guess.

> **Data source.** The dependency graph is adapted from
> [**"A smarter MCU watch order"** by Rocked03](https://www.reddit.com/r/marvelstudios/s/Yc9CunxbWr)
> (ver. 003, March 2026), posted on r/marvelstudios. All credit for the ordering
> and the arrow-by-arrow judgement calls goes to its author — this project only
> transcribes that chart into machine-readable form. The credit is also shown in
> the app's [About page](src/app/about/page.tsx).

## Features

- **Suggested order** — topological sort of 86 titles and 139 dependencies,
  with ties broken by release date.
- **Three strictness levels** — the chart's *must / should / could* arrows are
  a user-facing setting. Both the order and the missing-prerequisite lists
  react to it, so you can take the shortest viable path or the completionist one.
- **Mark as watched** — one click anywhere; progress bars per phase.
- **Missing dependencies** — every title's page lists the unwatched titles
  standing between you and it, transitively, in the order to watch them.
  Already-watched titles prune the traversal, so the list shrinks as you go.
- **"Ready to watch"** — the set of titles whose prerequisites you have all met.
- **Local-first** — the watchlist lives in `localStorage`. No account, no
  tracking, no server. JSON export/import to move it between browsers.
- **Upcoming titles** — release dates are compared at render time, so an
  unreleased film flips to released on its own.
- **Poster grid or list view**, with phase-coded artwork, a hero panel showing
  what to watch next, and a sticky filter bar.
- **IMDb links on every title**, plus streaming links — platform chips and a
  region-aware "where to watch" resolver.
- **Artwork** — real posters from TMDB when a key is configured, and designed
  generated posters otherwise, so a fresh clone looks finished with zero setup.

## Quick start

```bash
npm install
npm run dev            # http://localhost:3000
```

```bash
npm test               # engine + dataset invariants (20 tests)
npm run typecheck
npm run graph:validate # dataset integrity (also runs as a prebuild step)
npm run graph:stats    # print the computed watch order
```

## Updating the data

New Marvel release? Edit **one file** — `data/marvel-graph.json` — then run
`npm run graph:validate`. You never write positions, only dependencies; the
order is computed. Full guide: **[docs/updating-the-graph.md](docs/updating-the-graph.md)**.

The validator rejects unknown ids, duplicate/self edges and **dependency
cycles** before a build can ship, so bad data cannot reach a release.

### Posters, IMDb and streaming

Full detail: **[docs/artwork-and-links.md](docs/artwork-and-links.md)**.

IMDb has no image API and its posters may not be hotlinked, so **artwork comes
from TMDB** — whose free API also exposes each title's IMDb id, giving posters
and exact IMDb links from one lookup. IMDb is used for linking.

```bash
TMDB_API_KEY=xxxxx npm run artwork:fetch                      # real posters + IMDb ids
TMDB_API_KEY=xxxxx npm run artwork:fetch -- --only=loki --dry-run
```

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
src/lib/graph/schema.ts    zod schema + integrity checks (cycles, dangling ids)
src/lib/graph/engine.ts    topological sort, transitive prerequisites, progress
src/lib/watchlist/         WatchlistAdapter interface + localStorage impl + React provider
src/app/                   Next.js App Router pages (all 91 routes prerendered)
prisma/                    optional Postgres schema + seed for the future logged-in mode
helm/marvel-watchlist/     Helm chart
```

**Why no database, and why Postgres rather than a graph DB when one is
eventually needed:** see **[docs/adr-001-storage.md](docs/adr-001-storage.md)**.
Short version — 86 nodes and 139 edges is ~50 KB of JSON, which fits in the
browser, so traversals are local and instant; Neo4j would be an extra stateful
component to answer a question a `for` loop answers in microseconds. A Cypher
exporter is included anyway, so nothing is locked in.

### Adding logins later

`src/lib/watchlist/types.ts` defines a three-method `WatchlistAdapter`.
`LocalStorageAdapter` is the default; `RemoteWatchlistAdapter` already speaks
the `/api/watchlist` contract, and `prisma/schema.prisma` models `User` and
`WatchEntry`. Wiring it up means implementing that route against a session —
the UI changes by one argument to `<WatchlistProvider>`.

## Deployment

### Docker

```bash
docker build -t marvel-watchlist:local .
docker run --rm -p 3000:3000 marvel-watchlist:local
```

Multi-stage build on `node:22-alpine` using Next's `output: "standalone"`, so
the runtime image carries the server and only the modules it actually uses — no
`npm install` at runtime. Runs as non-root (uid 1001) with a `HEALTHCHECK`
against `/api/health`.

`docker compose up --build` additionally starts a Postgres container. **It is
not required** — the app ignores it until accounts exist; it is there for
`npm run db:seed` and local work on the logged-in mode.

### Kubernetes (Helm)

```bash
helm install marvel-watchlist ./helm/marvel-watchlist \
  --set image.repository=ghcr.io/nicolfo/marvel-watchlist \
  --set image.tag=0.1.0

helm test marvel-watchlist
```

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
optional Ingress / HPA / DATABASE_URL Secret, and a `helm test` pod that curls
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

## Legal

An unofficial fan project. Marvel, the MCU and all title names are trademarks of
Marvel Characters, Inc. and The Walt Disney Company; this project is not
affiliated with, endorsed by, or sponsored by them. It stores no media — only
title names and the relationships between them.
