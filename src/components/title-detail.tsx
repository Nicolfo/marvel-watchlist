"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, directionOf } from "@/i18n/config";
import { useI18n, useLocalePath } from "@/i18n/context";
import { Rich } from "@/i18n/rich";
import type { SummaryMeta } from "@/lib/summaries/schema";
import { artworkSrc, generatedPalette } from "@/lib/artwork";
import { useArtworkEnabled } from "@/lib/artwork-context";
import { getGraph } from "@/lib/graph/catalog";
import {
  directPrerequisites,
  isReleased,
  prerequisitesFor,
  suggestedOrder,
  unlockedBy,
} from "@/lib/graph/engine";
import { useWatchlist } from "@/lib/watchlist/provider";
import { ImdbLink, WatchLinks } from "./links";
import { Poster } from "./poster";
import { SpoilerSummary } from "./spoiler-summary";
import { StrictnessPicker } from "./strictness-picker";
import { Badge, EdgeBadge, ProgressBar, TitleMeta, kindKey, usePhaseLabel } from "./ui";

/**
 * The synopsis is fetched from /api/artwork/[id]/meta rather than passed in
 * from the server. It comes from the same keyed TMDB lookup as the artwork, so
 * awaiting it during render would make this page dynamic; the key still stays
 * server-side behind that endpoint. It is supplementary text, so arriving a
 * beat after the rest of the page costs nothing.
 *
 * The active locale goes with the request: TMDB is translated, so the short
 * synopsis is one of the few pieces of catalog text this app *can* show in the
 * reader's own language. It falls back to English where TMDB has no
 * translation, which is common for the one-shots and shorts.
 */
export function TitleDetail({ id, summary }: { id: string; summary?: SummaryMeta }) {
  const graph = getGraph();
  const { ready, watched, strictness, toggle, catchUpTo, markUnwatched } = useWatchlist();
  const { t, n, locale } = useI18n();
  const path = useLocalePath();
  const phaseLabel = usePhaseLabel();
  const title = graph.byId.get(id);
  const [overview, setOverview] = useState<{ text: string; language: string } | null>(null);
  const enabled = useArtworkEnabled();

  useEffect(() => {
    // Nothing to fetch when the server has no artwork source configured.
    if (!enabled) return;
    let cancelled = false;
    fetch(`/api/artwork/${encodeURIComponent(id)}/meta?lang=${encodeURIComponent(locale)}`)
      .then((response) => (response.ok ? response.json() : { overview: null }))
      .then((data: { overview?: string | null; language?: string }) => {
        if (cancelled) return;
        setOverview(
          data.overview
            ? { text: data.overview, language: data.language ?? DEFAULT_LOCALE }
            : null,
        );
      })
      .catch(() => {
        /* the page is complete without a synopsis */
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, id, locale]);

  const steps = useMemo(
    () => (title ? prerequisitesFor(graph, id, watched, strictness) : []),
    [graph, id, strictness, title, watched],
  );

  const position = useMemo(() => {
    const order = suggestedOrder(graph, strictness);
    return order.findIndex((entry) => entry.id === id) + 1;
  }, [graph, id, strictness]);

  if (!title) {
    return (
      <div className="panel rounded-2xl p-8 text-center">
        <p className="text-muted">{t("detail.notFound", { id })}</p>
        <Link
          href={path("/")}
          className="mt-4 inline-block text-accent-soft underline underline-offset-2"
        >
          {t("detail.backToList")}
        </Link>
      </div>
    );
  }

  const missing = steps.filter((step) => !step.watched);
  const done = steps.filter((step) => step.watched);
  const isWatched = watched.has(title.id);
  const direct = directPrerequisites(graph, title.id);
  const unlocks = unlockedBy(graph, title.id);
  const released = isReleased(title);
  const palette = generatedPalette(title);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-muted">
        {/* The arrow is part of the string, so a translator can move it to the
            other side for a right-to-left language. */}
        <Link href={path("/")} className="hover:text-text">
          {t("detail.back")}
        </Link>
      </nav>

      <header className="relative overflow-hidden rounded-2xl border border-edge">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(120deg, ${palette.from}, ${palette.via} 60%, ${palette.to})`,
          }}
          aria-hidden
        />
        <Backdrop id={title.id} />
        <div className="absolute inset-0 bg-black/45" aria-hidden />

        {/* Row on every size: a stacked 150px poster pushed the title, the
            links and the actions off a phone screen entirely. */}
        <div className="relative p-4 sm:p-6">
          {/* Only the poster and the identifying text share a row. The synopsis
              and the actions run full width underneath, because in the column
              beside a poster they are ~240px wide on a phone. */}
          <div className="flex flex-row gap-4 sm:gap-6">
            <Poster
              title={title}
              className="h-36 w-24 shrink-0 shadow-2xl sm:h-64 sm:w-[172px]"
              sizes="(max-width: 640px) 96px, 172px"
              priority
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <Badge>{t("detail.position", { position })}</Badge>
                <Badge>{phaseLabel(title.phase)}</Badge>
                {/* Wrapped rather than given a `hidden` class: Badge sets its
                    own `inline-flex`, which wins over it. */}
                <span className="hidden sm:contents">
                  <Badge>{title.saga}</Badge>
                </span>
                {!released ? (
                  <Badge className="text-accent-soft">{t("card.upcoming")}</Badge>
                ) : null}
              </div>

              <h1 className="mt-2 text-xl font-bold leading-tight tracking-tight sm:mt-3 sm:text-4xl">
                {title.title}
              </h1>
              <div className="mt-1">
                <TitleMeta title={title} />
              </div>

              <div className="mt-3 hidden flex-wrap items-center gap-2 sm:flex">
                <ImdbLink title={title} />
                <WatchLinks title={title} />
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 sm:hidden">
            <ImdbLink title={title} />
            <WatchLinks title={title} />
          </div>

          {/* TMDB's coverage is uneven, so this may be the reader's language or
              the English fallback. It is tagged with whichever came back, so an
              English paragraph on a Persian page is not laid out right-to-left
              or read aloud in the wrong voice. */}
          {overview ? (
            <p
              lang={overview.language}
              dir={directionOf(overview.language)}
              className="mt-4 max-w-2xl text-start text-sm leading-relaxed text-muted"
            >
              {overview.text}
            </p>
          ) : null}
          {title.note ? <p className="mt-3 max-w-2xl text-sm text-muted">{title.note}</p> : null}

          {/* Full-width stacked actions on a phone: side by side they wrapped
              into slivers narrower than a comfortable tap target. */}
          <div className="mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:flex-wrap sm:gap-3">
            <button
              type="button"
              onClick={() => toggle(title.id)}
              className={`min-h-11 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isWatched
                  ? "border border-edge bg-black/40 text-muted hover:text-text"
                  : "bg-accent text-white hover:bg-accent-soft"
              }`}
            >
              {isWatched ? t("detail.markUnwatched") : t("detail.markWatched")}
            </button>

            {!isWatched && missing.length > 0 ? (
              <button
                type="button"
                onClick={() => catchUpTo(title.id)}
                className="min-h-11 rounded-lg border border-edge bg-black/40 px-4 py-2 text-sm font-medium text-text transition-colors hover:border-accent-soft"
              >
                {t("detail.catchUp", { count: missing.length })}
              </button>
            ) : null}

            {done.length > 0 ? (
              <button
                type="button"
                onClick={() => markUnwatched(done.map((step) => step.title.id))}
                className="min-h-11 rounded-lg border border-edge bg-black/40 px-4 py-2 text-sm text-muted transition-colors hover:text-text"
              >
                {t("detail.clearPrereqs", { count: done.length })}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* Sits directly under the header, where the spoiler-free synopsis just
          was, because the reader deciding whether to skip this title is deciding
          it right here, and stays shut until they say so. */}
      <SpoilerSummary title={title} summary={summary} />

      <section className="panel rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {!ready
              ? t("detail.checking")
              : missing.length === 0
                ? t("detail.ready")
                : t("detail.toWatchFirst", { count: missing.length })}
          </h2>
          <span className="text-xs text-muted">
            {t("detail.prereqCount", { done: done.length, total: steps.length })}
          </span>
        </div>

        <div className="mt-3">
          <ProgressBar value={done.length} total={steps.length} />
        </div>

        {missing.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            {steps.length === 0 ? t("detail.entryPoint") : t("detail.allTicked")}
          </p>
        ) : (
          <ol className="mt-4 space-y-2">
            {missing.map((step) => (
              <li
                key={step.title.id}
                className="group relative flex items-center gap-3 rounded-xl border border-edge bg-panel-2/40 p-2 transition-colors hover:border-accent-soft/40"
              >
                <button
                  type="button"
                  onClick={() => toggle(step.title.id)}
                  aria-label={t("card.markWatched", { title: step.title.title })}
                  className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-edge text-transparent transition-colors hover:border-accent-soft hover:text-text"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden>
                    <path
                      d="M5 10.5l3.5 3.5L15 7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <Poster title={step.title} className="h-14 w-10 shrink-0" sizes="40px" />

                <div className="min-w-0 flex-1">
                  <Link
                    href={path(`/title/${step.title.id}`)}
                    className="block truncate font-medium hover:text-accent-soft"
                  >
                    <span className="absolute inset-0" aria-hidden />
                    {step.title.title}
                  </Link>
                  <TitleMeta title={step.title} />
                </div>

                <div className="relative z-10 hidden shrink-0 items-center gap-2 lg:flex">
                  <ImdbLink title={step.title} compact />
                  <WatchLinks title={step.title} />
                </div>

                <div className="relative z-10 hidden shrink-0 items-center gap-2 sm:flex">
                  {step.direct ? <Badge>{t("detail.direct")}</Badge> : null}
                  <EdgeBadge type={step.via} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel rounded-2xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            {t("detail.pointsInto")}
          </h2>
          {direct.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t("detail.nothingPointsInto")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {direct.map((edge) => {
                const from = graph.byId.get(edge.from)!;
                return (
                  <li key={edge.from} className="flex items-center gap-3">
                    <Poster title={from} className="h-11 w-8 shrink-0" sizes="32px" />
                    <Link
                      href={path(`/title/${from.id}`)}
                      className={`min-w-0 flex-1 truncate text-sm hover:text-accent-soft ${
                        watched.has(from.id) ? "text-muted line-through" : ""
                      }`}
                    >
                      {from.title}
                    </Link>
                    <EdgeBadge type={edge.type} provisional={edge.provisional} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel rounded-2xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            {t("detail.unlocks")}
          </h2>
          {unlocks.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t("detail.nothingDepends")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {unlocks.map((edge) => {
                const to = graph.byId.get(edge.to)!;
                return (
                  <li key={edge.to} className="flex items-center gap-3">
                    <Poster title={to} className="h-11 w-8 shrink-0" sizes="32px" />
                    <Link
                      href={path(`/title/${to.id}`)}
                      className="min-w-0 flex-1 truncate text-sm hover:text-accent-soft"
                    >
                      {to.title}
                    </Link>
                    <EdgeBadge type={edge.type} provisional={edge.provisional} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="panel rounded-2xl p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          {t("detail.adjust")}
        </h2>
        <div className="mt-3">
          <StrictnessPicker />
        </div>
        <p className="mt-3 text-xs text-muted">
          <Rich
            text={t("detail.footnote", { kind: t(kindKey(title.kind)) })}
            slots={{
              aboutLink: (
                <Link href={path("/about")} className="text-accent-soft underline underline-offset-2">
                  {t("detail.footnote.about")}
                </Link>
              ),
            }}
          />
        </p>
      </section>
    </div>
  );
}

/**
 * The hero backdrop, layered over the gradient rather than replacing it.
 * Artwork is resolved per request now, so whether one exists is only known
 * once the image either loads or 404s, and either way the gradient underneath
 * is already a finished-looking header.
 */
function Backdrop({ id }: { id: string }) {
  const enabled = useArtworkEnabled();
  const [status, setStatus] = useState<"pending" | "loaded" | "failed">("pending");

  if (!enabled || status === "failed") return null;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={artworkSrc(id, "backdrop")}
        alt=""
        decoding="async"
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("failed")}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          status === "loaded" ? "opacity-100" : "opacity-0"
        }`}
      />
      {status === "loaded" ? (
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-ink/50" aria-hidden />
      ) : null}
    </>
  );
}
