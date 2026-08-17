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
| Source | TMDB, fetched at runtime (`/api/artwork/[id]/meta`) | `data/summaries.json`, bundled |

Adding the second one did not change the first. The spoiler-free synopsis is
still there, still always on, still the thing you read to decide whether you
want to watch it.

## The rules the implementation enforces

1. **It is never open unless asked for.** Not "collapsed with a blur over it" -
   the text is not in the document at all until the reader reveals it. It
   therefore cannot be glimpsed mid-animation, selected through the blur, pulled
   out by find-in-page, scraped from view-source, or read aloud by a screen
   reader walking the page. `src/components/spoiler-summary.tsx` renders the
   paragraphs only in the revealed branch, and nothing at all otherwise.
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

## Adding or fixing a summary

Everything lives in one file, `data/summaries.json`, keyed by title id:

```jsonc
{
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
- A missing key is a normal state, not an error. The page says so and points here.

Then:

```bash
npm run summaries:validate   # also runs as a prebuild step and in CI
npm test                     # cross-checks coverage against the graph
```

The validator rejects a summary keyed to a title that does not exist, a summary
on an unreleased title, and prose too thin to skip a title on (the floor scales
with format: 60 words for a four-minute one-shot, 120 for anything longer).

## Licensing

The summaries are **original prose written for this project**. They are not
copied from Wikipedia, a fan wiki, or a press kit - partly because a plot
summary lifted from a CC BY-SA source would drag a share-alike obligation into
an MIT-licensed repository, and partly because a summary written for this
purpose can say "you can skip this, here is the one thing that matters later",
which an encyclopaedia entry cannot.

## Known gaps

Two released titles are deliberately unsummarised: `wonder-man` and
`spider-man-brand-new-day`. Writing those up from a trailer and a synopsis would
produce exactly the confident, wrong text this feature must not have, so they
wait for someone who has actually watched them. They are listed in
`src/lib/summaries/catalog.test.ts` as `PENDING`, so an *undeclared* gap still
fails the suite - a new release that nobody writes up will be caught.
