# Detailed summaries, and how spoilers are handled

## Why the feature exists

A watch order is only useful if you are allowed to skip things. Eighty-six
titles is a lot, most people will not watch all of them, and the honest answer
to "can I skip this one?" is not yes or no - it is *here is what happens in it,
now decide*.

So every released title carries a **detailed summary**: what actually happens,
including the ending, written so a reader can miss the title entirely and still
follow the ones that depend on it.

That is a loaded gun pointed at everyone who has *not* decided to skip it, which
is what the rest of this document is about.

## Two descriptions, never confused

| | Short synopsis | Detailed summary |
| --- | --- | --- |
| Where | The title page header | Its own panel, directly below |
| Contains spoilers | No | Yes, deliberately, including the ending |
| Shown by default | Always | Never, unless you opt in |
| Source | TMDB, per language (`/api/artwork/[id]/meta?lang=`) | `data/summaries/<locale>.json`, per language |
| Reaches the browser | With the page | Only when revealed (`/api/summary/[id]?lang=`) |

Adding the second one did not change the first. The spoiler-free synopsis is
still there, still always on, still the thing you read to decide whether you
want to watch it.

## The rules the implementation enforces

1. **It is never open unless asked for**, and the text has not been sent to the
   browser at all until then. It therefore cannot be glimpsed mid-animation,
   selected through a blur, pulled out by find-in-page, scraped from
   view-source, or read aloud by a screen reader walking the page.

   Getting that literally true took three attempts, and the two that failed are
   worth recording because both *look* correct:

   - **Looking it up in the client component** renders nothing until revealed,
     but the static import puts the entire corpus - every title, and once there
     are translations, every language - into a JS chunk the browser downloads on
     arrival. Not in the DOM; very much on the machine.
   - **Passing it down as a prop** from the server component keeps it out of the
     bundle, but React serialises props into the flight payload, so the spoiler
     is in the page source. `curl | grep` finds it.

   What actually works is fetching it on reveal from `/api/summary/[id]`. The
   page renders from metadata only - which language, how many minutes - and the
   prose crosses the wire when, and only when, a reader presses the button. It
   is deliberately not prefetched on hover or on idle either: a request that
   fires before the decision has already moved the text to the reader's machine
   before the decision was made.
2. **The safe state is the default state**, including every failure mode. Before
   storage is read, if storage is blocked or corrupt, and while the page is
   prerendered on the server, the answer is closed. A spoiler shown by accident
   cannot be taken back, so the fallbacks all point the same way.
3. **Revealing is per page unless the reader says otherwise.** The "always open
   these for me" checkbox stores `always` under
   `marvel-watchlist:spoilers:v1`, and is reversible from the same spot -
   pressing *Hide the summary* also turns it off, since otherwise the section
   would immediately reopen.
4. **Unreleased titles have no summary at all.** There is nothing to summarise,
   so anything under such an id is either a guess or a leak.
   `npm run summaries:validate` fails the build on one.

The preference is deliberately *not* part of the watchlist state. That state is
exported, imported, and destined for a server once accounts exist; how you like
to be spoiled is a display preference for one browser, and sharing a watchlist
file should not share it.

## Where the files live

One file per language, under `data/summaries/`, mirroring
`src/i18n/dictionaries/`:

```
data/summaries/
  en.json    the base - complete, and what everything else falls back to
  it.json    a partial translation, which is the normal state
```

**Resolution falls back per title, not per file.** `resolveSummary(id, locale)`
looks for the title in the requested language and, failing that, returns the
English one along with the language it actually found. A translator who does
five films ships five translated films; the other seventy-five keep working in
English rather than the language looking broken until somebody finishes it.

That is why the resolver returns `{ entry, language }` rather than just the
prose. The caller needs the second field: it tags the block `lang`/`dir` so an
English paragraph inside a Persian page is not laid out right-to-left, and it
decides whether to show the "not translated yet" line.

**It resolves on the server.** The summaries are the largest text in the repo,
so the page resolves the one summary it needs and passes it down as a prop.
Looking it up in the client component - which is what it used to do - would ship
every summary in every language to the browser to display one of them.

## Adding a language

1. Create `data/summaries/<locale>.json` with the same shape as `en.json` and a
   matching `"locale"` field. Translate as many or as few titles as you like;
   use the same ids.
2. Register it in `loaders` in `src/lib/summaries/catalog.ts`.
3. Run `npm run summaries:validate`.

The locale must be one the site already offers — see
[docs/internationalisation.md](internationalisation.md).

## Adding or fixing a summary

Each file is keyed by title id:

```jsonc
{
  "schemaVersion": 1,
  "locale": "it",
  "items": {
    "iron-man": {
      "paragraphs": [
        "First paragraph...",
        "Second paragraph..."
      ],
      "stinger": "What the post-credits scene sets up."   // optional
    }
  }
}
```

- **`paragraphs`** is one string per rendered paragraph. Aim for 120-250 words
  for a film, more for a multi-season series, and cover the *ending* - a summary
  that stops before the twist is worse than none, because the reader trusted it.
- **`stinger`** is the mid- or post-credits scene, rendered in its own box. It is
  separate because it is often the only part of a skippable title that anything
  else depends on.
- A missing key is a normal state, not an error. In a translation it falls back
  to English; missing from English too, the page says so and points here.

Then:

```bash
npm run summaries:validate   # also runs as a prebuild step and in CI
npm test                     # cross-checks coverage against the graph
```

The validator **fails** on: a summary keyed to a title that does not exist; a
summary on a title that has not been released, because there is no plot to
summarise yet and the text is therefore either a guess or a leak; a file whose
`locale` disagrees with its filename, which would quietly serve the wrong
language; a file no loader registers, or a loader with no file; and a released
title missing from English that is not declared pending.

It **warns**, without failing, on prose too thin to skip a title on (the floor
scales with format: 60 words for a four-minute one-shot, 120 for anything
longer) and on a translation whose English original is missing. Word counts go
through `Intl.Segmenter`, so Chinese and Japanese — which put no spaces between
words — are measured rather than dismissed as a single word.

Partial translations are reported as coverage, never as an error. That is the
expected state of a community translation and the whole reason the fallback is
per title.

## Licensing

The English summaries are **original prose written for this project**, and
translations contributed here are expected to be original renderings of them on
the same terms. They are not
copied from Wikipedia, a fan wiki, or a press kit - partly because a plot
summary lifted from a CC BY-SA source would drag a share-alike obligation into
an MIT-licensed repository, and partly because a summary written for this
purpose can say "you can skip this, here is the one thing that matters later",
which an encyclopaedia entry cannot.

## Known gaps

Two released titles are deliberately unsummarised **in English**, which means
they have no summary in any language: `wonder-man` and
`spider-man-brand-new-day`. Writing those up from a trailer and a synopsis would
produce exactly the confident, wrong text this feature must not have, so they
wait for someone who has actually watched them. They are listed in
`src/lib/summaries/catalog.test.ts` and in `scripts/validate-summaries.ts` as
`PENDING`, so an *undeclared* gap still fails - a new release that nobody writes
up will be caught.

Italian currently covers 5 of 82 released titles. That is a deliberate seed to
prove the fallback works end to end, not an abandoned effort.
