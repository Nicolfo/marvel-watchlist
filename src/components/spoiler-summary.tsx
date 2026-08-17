"use client";

import { useEffect, useId, useState } from "react";
import type { Title } from "@/lib/graph/schema";
import { isReleased } from "@/lib/graph/engine";
import { useSpoilerPreference } from "@/lib/spoiler-context";
import { readingMinutes, summaryFor } from "@/lib/summaries/catalog";
import { Badge, KIND_LABELS } from "./ui";

/**
 * The detailed, spoilers-and-all summary of a title.
 *
 * This is the "I am going to skip this one" affordance: the short synopsis in
 * the header tells you whether you want to watch it, and this tells you what
 * happens so the next title still makes sense without you having watched it.
 *
 * Three rules the implementation exists to enforce:
 *
 * 1. It is never open unless asked for. Not "collapsed with a blur over it" -
 *    the text is not in the document at all until the reader reveals it, so it
 *    cannot be glimpsed mid-animation, selected through the blur, dragged out
 *    by find-in-page, or read aloud by a screen reader walking the page.
 * 2. It never replaces the normal description. The spoiler-free synopsis in the
 *    header stays exactly where it was and stays always-on.
 * 3. Opening one is a per-page decision unless the reader says otherwise. The
 *    "always" preference is opt-in and reversible from the same spot.
 */
export function SpoilerSummary({ title }: { title: Title }) {
  const entry = summaryFor(title.id);
  const { ready, alwaysShow, setAlwaysShow } = useSpoilerPreference();
  const [revealed, setRevealed] = useState(false);
  const bodyId = useId();

  // Applies the stored preference once it is known, and re-hides on navigation
  // to another title (this component remounts, but the effect also covers a
  // preference turned off while a summary is open).
  useEffect(() => {
    if (ready) setRevealed(alwaysShow);
  }, [alwaysShow, ready, title.id]);

  if (!entry) {
    // Nothing to hide, so nothing to warn about. An unreleased title has no
    // plot to summarise; a released one just has not been written up yet, and
    // saying so is more useful than a section that silently is not there.
    if (!isReleased(title)) return null;
    return (
      <section className="panel rounded-2xl p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Detailed summary
        </h2>
        <p className="mt-3 text-sm text-muted">
          No detailed summary written for this one yet. They live in{" "}
          <code className="rounded bg-panel-2 px-1 py-0.5 text-xs">data/summaries.json</code> -
          contributions welcome.
        </p>
      </section>
    );
  }

  const minutes = readingMinutes(entry);
  const kind = KIND_LABELS[title.kind].toLowerCase();

  return (
    <section className="panel rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Detailed summary
          </h2>
          <Badge className="text-accent-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            Spoilers
          </Badge>
        </div>
        <span className="text-xs text-muted">
          {minutes} min read · the whole {kind}, ending included
        </span>
      </div>

      {revealed ? (
        <>
          <div id={bodyId} className="mt-4 space-y-3 text-sm leading-relaxed text-text/90">
            {entry.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}

            {entry.stinger ? (
              <p className="rounded-xl border border-edge bg-panel-2/50 p-3 text-muted">
                <span className="font-semibold text-text">After the credits: </span>
                {entry.stinger}
              </p>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={() => {
                setRevealed(false);
                // Leaving "always" on would re-open it on the next render, so
                // hiding it here also means "stop doing that".
                if (alwaysShow) setAlwaysShow(false);
              }}
              aria-expanded
              aria-controls={bodyId}
              className="min-h-11 rounded-lg border border-edge bg-black/40 px-4 py-2 text-sm text-muted transition-colors hover:text-text"
            >
              Hide the summary
            </button>
            <AlwaysShowToggle checked={alwaysShow} onChange={setAlwaysShow} />
          </div>
        </>
      ) : (
        <>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            Everything that happens in {title.title}, including how it ends. Written so you can
            skip watching it and still follow whatever comes next - so only open it if you are
            fine with that.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={() => setRevealed(true)}
              aria-expanded={false}
              aria-controls={bodyId}
              className="min-h-11 rounded-lg border border-edge bg-black/40 px-4 py-2 text-sm font-medium text-text transition-colors hover:border-accent-soft"
            >
              Show me what happens
            </button>
            <AlwaysShowToggle checked={alwaysShow} onChange={setAlwaysShow} />
          </div>
        </>
      )}
    </section>
  );
}

function AlwaysShowToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange(value: boolean): void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-accent"
      />
      Always open these for me
    </label>
  );
}
