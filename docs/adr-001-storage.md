# ADR 001, Storage: no database now, Postgres later, not a graph database

Status: accepted · Date: 2026-08-15

## Context

The app needs to hold two very different things:

1. **The catalog**, ~86 titles and ~139 dependency edges transcribed from the
   community watch-order chart. Read-only at runtime, changes a handful of
   times a year when Marvel ships something new.
2. **The watchlist**, which titles a given person has watched. Written
   constantly, read constantly, and belongs to one user.

The brief asked whether a graph database was warranted, since the catalog is
literally a graph.

## Decision

**The catalog ships as a versioned JSON file in the repo** (`data/marvel-graph.json`),
bundled into the build. **The watchlist lives in `localStorage`.** The app
therefore runs with **no database at all**.

For the future logged-in mode, the chosen store is **PostgreSQL via Prisma**
(`prisma/schema.prisma`), *not* Neo4j or another graph database.

## Why not a graph database

The dataset is tiny and the queries are shallow:

- 86 nodes, 139 edges: the entire graph is ~50 KB of JSON. It fits in a
  browser tab with room to spare, so traversals run client-side in
  microseconds and the watchlist stays instant with no network round trip.
- The only traversal is "all ancestors of one node", bounded by the depth of
  the MCU (well under 20). Neo4j earns its keep on deep, variable-length
  traversals over millions of relationships; here it would be an extra
  stateful component, backup story, and operational burden to answer a
  question a `for` loop answers instantly.
- Postgres does this query natively anyway when the data is server-side, a
  `WITH RECURSIVE` CTE gets transitive prerequisites in one statement. There
  is an example at the bottom of `npm run graph:export:sql` output.

So a graph database would be overkill. That said, the *shape* of the data is a
graph and we do not want to lock that away: `npm run graph:export:cypher`
emits the whole dataset as Neo4j `CREATE` statements, so exploring it in a
graph database, or migrating to one if the edge set ever grows by orders of
magnitude, is a one-command exercise, not a rewrite.

## Why the catalog is a file, not a table

- It is code-shaped, not user-shaped: it changes by pull request, gets
  reviewed, and should be versioned alongside the app that renders it.
- It makes the app deployable as a stateless container with no migrations and
  no seeding step, which is what makes the Helm chart trivial.
- Validation runs in CI (`npm run graph:validate`), so a typo'd id or an
  accidental dependency cycle is caught at review time rather than at 3am.

The Prisma schema still models `Title` and `Dependency` so the server can
answer catalog queries once accounts exist; `npm run db:seed` loads the same
JSON file into those tables. The JSON stays the source of truth in both worlds.

## Why localStorage first

A watchlist is worthless to anyone but its owner, so requiring an account to
use the app is pure friction. `localStorage` means no sign-up, no cookie
banner, no personal data on our side, and no database to run.

The cost is that the list is per-browser. That is mitigated by JSON
export/import on the watchlist page, and by the fact that the storage layer is
an interface (`WatchlistAdapter`) with two implementations already sketched -
`LocalStorageAdapter` and `RemoteWatchlistAdapter`. Adding accounts means
implementing `/api/watchlist` against Prisma and passing a different adapter to
`<WatchlistProvider>`; no component changes.

## Consequences

- Zero-dependency deployment: one stateless container, horizontally scalable,
  no volumes (see the Helm chart).
- A data update requires a rebuild and redeploy. Acceptable at a few releases
  a year; if it ever becomes annoying, the same JSON can be served from the
  `Dataset`/`Title`/`Dependency` tables without changing the engine's
  interfaces.
- Users who clear site data lose their list unless they exported it. Called out
  in the UI.
