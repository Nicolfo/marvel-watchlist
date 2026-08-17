"use client";

import { useEffect, useId, useState } from "react";
import { directionOf } from "@/i18n/config";
import { useI18n } from "@/i18n/context";
import type { Title } from "@/lib/graph/schema";
import { isReleased } from "@/lib/graph/engine";
import { useSpoilerPreference } from "@/lib/spoiler-context";
import type { SummaryEntry, SummaryMeta } from "@/lib/summaries/schema";
import { Badge, kindKey } from "./ui";

/**
 * The detailed, spoilers-and-all summary of a title.
 *
 * This is the "I am going to skip this one" affordance: the short synopsis in
 * the header tells you whether you want to watch it, and this tells you what
 * happens so the next title still makes sense without you having watched it.
 *
 * Only the *metadata* - which language, how long - arrives as a prop. The prose
 * is fetched from `/api/summary/[id]` on reveal, and that is what makes rule 1
 * literally true rather than approximately true: looking it up in this component
 * would put every summary in every language into the JS bundle, and taking it as
 * a prop would put this one into the page's flight payload.
 *
 * Three rules the implementation exists to enforce:
 *
 * 1. It is never open unless asked for. Not "collapsed with a blur over it", and
 *    not "in the page but not rendered" - the text has not been sent to the
 *    browser at all until the reader asks, so it cannot be glimpsed
 *    mid-animation, selected through a blur, dragged out by find-in-page, read
 *    aloud by a screen reader walking the page, or found in view-source.
 * 2. It never replaces the normal description. The spoiler-free synopsis in the
 *    header stays exactly where it was and stays always-on.
 * 3. Opening one is a per-page decision unless the reader says otherwise. The
 *    "always" preference is opt-in and reversible from the same spot.
 */
export function SpoilerSummary({
  title,
  summary,
}: {
  title: Title;
  summary?: SummaryMeta;
}) {
  const { ready, alwaysShow, setAlwaysShow } = useSpoilerPreference();
  const { t, locale } = useI18n();
  const [revealed, setRevealed] = useState(false);
  const [entry, setEntry] = useState<SummaryEntry | null>(null);
  const [failed, setFailed] = useState(false);
  const bodyId = useId();

  // Applies the stored preference once it is known, and re-hides on navigation
  // to another title (this component remounts, but the effect also covers a
  // preference turned off while a summary is open).
  useEffect(() => {
    if (ready) setRevealed(alwaysShow);
  }, [alwaysShow, ready, title.id]);

  // The one network call this component makes, and only once the reader has
  // asked. Not prefetched on hover or on idle: a request that fires before the
  // decision would put the text in the browser before the decision was made.
  useEffect(() => {
    if (!revealed || entry || !summary) return;
    let cancelled = false;
    fetch(`/api/summary/${encodeURIComponent(title.id)}?lang=${encodeURIComponent(locale)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("not found"))))
      .then((data: { paragraphs: string[]; stinger: string | null }) => {
        if (!cancelled) setEntry({ paragraphs: data.paragraphs, stinger: data.stinger ?? undefined });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [entry, locale, revealed, summary, title.id]);

  if (!summary) {
    // Nothing to hide, so nothing to warn about. An unreleased title has no
    // plot to summarise; a released one just has not been written up yet, and
    // saying so is more useful than a section that silently is not there.
    if (!isReleased(title)) return null;
    return (
      <section className="panel rounded-2xl p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          {t("spoiler.heading")}
        </h2>
        <p className="mt-3 text-sm text-muted">
          {t("spoiler.none", { file: "data/summaries/en.json" })}
        </p>
      </section>
    );
  }

  const { language, minutes } = summary;
  const kind = t(kindKey(title.kind)).toLocaleLowerCase(locale);
  const translated = language === locale;

  return (
    <section className="panel rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            {t("spoiler.heading")}
          </h2>
          <Badge className="text-accent-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            {t("spoiler.badge")}
          </Badge>
        </div>
        <span className="text-xs text-muted">
          {t("spoiler.readTime", { count: minutes, kind })}
        </span>
      </div>

      {revealed ? (
        <>
          {/* Tagged with the language the prose is actually in. When a title has
              no translation yet the text below is English, and an English
              paragraph inside a Persian page must not be laid out right-to-left
              or read aloud in the wrong voice. */}
          <div
            id={bodyId}
            lang={language}
            dir={directionOf(language)}
            aria-busy={!entry && !failed}
            className="mt-4 space-y-3 text-start text-sm leading-relaxed text-text/90"
          >
            {entry ? (
              <>
                {entry.paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}

                {entry.stinger ? (
                  <p className="rounded-xl border border-edge bg-panel-2/50 p-3 text-muted">
                    <span className="font-semibold text-text">{t("spoiler.afterCredits")}</span>
                    {entry.stinger}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-muted">
                {failed ? t("spoiler.failed") : t("watchlist.loading")}
              </p>
            )}
          </div>

          {!translated ? (
            <p className="mt-3 text-xs italic text-muted">{t("spoiler.notTranslated")}</p>
          ) : null}

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
              {t("spoiler.hide")}
            </button>
            <AlwaysShowToggle
              checked={alwaysShow}
              onChange={setAlwaysShow}
              label={t("spoiler.always")}
            />
          </div>
        </>
      ) : (
        <>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            {t("spoiler.warning", { title: title.title })}
          </p>
          {/* Said before the reveal too, so nobody presses the button expecting
              their own language and gets a wall of English. */}
          {!translated ? (
            <p className="mt-2 text-xs italic text-muted">{t("spoiler.notTranslated")}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={() => setRevealed(true)}
              aria-expanded={false}
              aria-controls={bodyId}
              className="min-h-11 rounded-lg border border-edge bg-black/40 px-4 py-2 text-sm font-medium text-text transition-colors hover:border-accent-soft"
            >
              {t("spoiler.reveal")}
            </button>
            <AlwaysShowToggle
              checked={alwaysShow}
              onChange={setAlwaysShow}
              label={t("spoiler.always")}
            />
          </div>
        </>
      )}
    </section>
  );
}

function AlwaysShowToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange(value: boolean): void;
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-accent"
      />
      {label}
    </label>
  );
}
