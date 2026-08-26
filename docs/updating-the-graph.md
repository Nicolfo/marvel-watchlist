# Updating the graph

Everything the app knows lives in one file: **`data/marvel-graph.json`**. There
is no database to migrate and no admin UI to log into, a data release is a
pull request against that file.

## Adding a title

Append an entry to `titles`:

```jsonc
{
  "id": "avengers-doomsday",       // lowercase kebab-case, permanent, used in URLs
  "title": "Avengers: Doomsday",
  "year": 2026,
  "releaseDate": "2026-12-18",     // null if announced but undated
  "kind": "film",                  // film | series | special | short | one-shot | animation | collection
  "phase": "Phase Six",
  "saga": "The Multiverse Saga",
  "seasons": 1,                    // series only, optional
  "runtimeMinutes": 53,            // shorts/specials, optional
  "orderGroup": 0,                 // optional tie-break bucket, see below
  "note": "…"                      // optional, shown on the detail page
}
```

`releaseDate` drives the **Upcoming** badge, it is compared against today's
date at render time, so a title flips to released on its own with no code
change.

## Adding dependencies

Append to `edges`. `from` is the prerequisite, `to` is the thing that needs it:

```jsonc
{ "from": "thunderbolts", "to": "avengers-doomsday", "type": "must", "provisional": true }
```

`type` mirrors the source chart's arrow colours:

| type     | chart colour | meaning                                                        |
| -------- | ------------ | -------------------------------------------------------------- |
| `must`   | red          | You are expected to be familiar with this story.                |
| `should` | blue         | Continues a thread, but the title recaps it well enough.        |
| `could`  | green        | Referenced only; you are not expected to have seen it.          |

`provisional: true` is the chart's dashed arrow, a prediction about something
unreleased. It renders as *predicted* in the UI.

## Ordering

The suggested order is a topological sort, so **you never specify positions** -
you specify dependencies and the order falls out. Ties (titles that are equally
ready) break by `orderGroup`, then release date, then name.

`orderGroup` defaults to `0`, the MCU spine. Raise it for side material that
would otherwise lead the list purely by being old: the 1992 X-Men cartoon and
the legacy Fox films are `1` for exactly this reason.

## Validate before committing

```bash
npm run graph:validate      # required, also runs on every build and in CI
npm run graph:stats         # prints the resulting order so you can eyeball it
npm test                    # engine + dataset invariants
```

`graph:validate` fails the build on:

- unknown ids on either end of an edge
- duplicate title ids or duplicate/self edges
- **dependency cycles** (which would make a watch order impossible)
- anything that does not match the schema in `src/lib/graph/schema.ts`

It warns (without failing) on titles with no edges at all and on a `year` that
disagrees with `releaseDate`.

## Checking an arrow is the *right* arrow

Everything above proves the dataset is well formed. None of it can tell you an
arrow is the wrong strength, because `must` and `could` are equally valid
values, and none of it can tell you an arrow is missing, because the graph is
perfectly valid without it. That half needs the chart open next to you:

```bash
npm run graph:inspect avengers-endgame
npm run graph:inspect "civil war"          # part of a name works too
```

It prints one title's direct arrows, in and out, and nothing transitive,
because the direct ones are exactly what the chart draws. Each arrow carries
the colour it is drawn in, since that is the thing you are comparing, and the
last line says which arrowhead colours the box should show.

Compare colours, not counts: the chart merges same-colour arrows into a single
arrowhead, so four blue arrows in the data are one blue arrowhead in the
image. A box that takes green and blue in the data and a red arrowhead in the
image is wrong, and that mismatch is what a whole class of transcription
errors looked like.

An arrow with a `note` is one somebody added by hand rather than read off the
chart. `graph:inspect` prints the note and says how many there are, so you do
not go hunting for them in the image.

Bump `dataVersion` and `updatedAt` when you make a change: the About page and
`/api/health` both surface `dataVersion`, so you can tell at a glance which
dataset a deployment is running.

Regenerate the editor autocomplete schema with:

```bash
npm run graph:validate -- --emit-schema   # rewrites data/marvel-graph.schema.json
```

## Getting it into a database

The JSON stays the source of truth; these push it elsewhere.

```bash
npm run db:seed                # upsert into Postgres via Prisma (idempotent)
npm run graph:export:sql       # same thing as a plain .sql file
npm run graph:export:cypher    # Neo4j CREATE statements, for graph exploration
```

`db:seed` deletes titles that are no longer in the JSON and replaces the edge
set wholesale, so re-running it after an edit is the supported update path.
