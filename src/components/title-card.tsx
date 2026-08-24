"use client";

import Link from "next/link";
import { useI18n, useLocalePath } from "@/i18n/context";
import type { Title } from "@/lib/graph/schema";
import { useWatchlist } from "@/lib/watchlist/provider";
import { ImdbLink, WatchLinks } from "./links";
import { Poster } from "./poster";
import { Badge, ProgressBar, TitleMeta, usePhaseLabel } from "./ui";

export interface TitleCardData {
  title: Title;
  position: number;
  watched: boolean;
  missingCount: number;
  released: boolean;
}

function WatchToggle({
  title,
  watched,
  size = "md",
}: {
  title: Title;
  watched: boolean;
  size?: "sm" | "md";
}) {
  const { toggle } = useWatchlist();
  const { t } = useI18n();
  const dimensions = size === "sm" ? "h-6 w-6" : "h-8 w-8";

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(title.id);
      }}
      aria-pressed={watched}
      aria-label={
        watched
          ? t("card.markUnwatched", { title: title.title })
          : t("card.markWatched", { title: title.title })
      }
      className={`group/toggle grid ${dimensions} shrink-0 place-items-center rounded-full border backdrop-blur transition-colors ${
        watched
          ? "border-accent bg-accent text-white"
          : "border-white/30 bg-black/50 text-white hover:border-accent-soft"
      }`}
    >
      {/* Unwatched: the tick stays hidden until hover, so an empty circle is
          never mistaken for a ticked one. */}
      <svg
        viewBox="0 0 20 20"
        className={`h-4 w-4 transition-opacity ${
          watched ? "opacity-100" : "opacity-0 group-hover/toggle:opacity-60"
        }`}
        fill="none"
        aria-hidden
      >
        <path
          d="M5 10.5l3.5 3.5L15 7"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/** Poster tile used in the grid view. */
export function TitleTile({ data, priority = false }: { data: TitleCardData; priority?: boolean }) {
  const { title, position, watched, missingCount, released } = data;
  const { t, n } = useI18n();
  const path = useLocalePath();

  return (
    <li className="group relative">
      <div className="tile relative overflow-hidden rounded-xl border border-edge">
        <Poster title={title} className="aspect-[2/3] w-full" priority={priority} />

        {/* Readability scrim for the text that sits over the art. */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/40"
          aria-hidden
        />

        <span className="pointer-events-none absolute start-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white/80 backdrop-blur">
          {n(position)}
        </span>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2.5">
          <h3
            className={`line-clamp-2 text-sm font-semibold leading-tight text-white ${
              watched ? "opacity-60" : ""
            }`}
          >
            {title.title}
          </h3>
          <p className="mt-1 text-[11px] text-white/60">
            {n(title.year)}
            {!released ? ` · ${t("card.upcoming")}` : ""}
          </p>

          <div className="mt-1.5">
            {watched ? (
              <span className="inline-block rounded bg-could/20 px-1.5 py-0.5 text-[10px] font-medium text-could">
                {t("card.watched")}
              </span>
            ) : missingCount > 0 ? (
              <span className="inline-block rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white/70">
                {t("card.first", { count: missingCount })}
              </span>
            ) : (
              <span className="inline-block rounded bg-could/20 px-1.5 py-0.5 text-[10px] font-medium text-could">
                {t("card.ready")}
              </span>
            )}
          </div>
        </div>
      </div>

      <Link
        href={path(`/title/${title.id}`)}
        className="absolute inset-0 rounded-xl"
        aria-label={t("card.details", { title: title.title })}
      >
        <span className="sr-only">{title.title}</span>
      </Link>

      {/* Everything interactive sits after the stretched link, and outside
          `.tile`, so it paints on top of it. Ordering is the only thing that
          works here: `.group:hover .tile` sets a transform, a transform makes
          `.tile` a stacking context, and a z-index inside a stacking context
          cannot lift anything above a later sibling of that context. A z-10 on
          the toggle therefore fixed the tap and left the hover still opening
          the title page. */}
      <div className="absolute end-2 top-2">
        <WatchToggle title={title} watched={watched} size="sm" />
      </div>

      {/* Hover/focus panel with the external links.

          Only the visible black box takes pointer events, never the
          positioning wrapper around it. The wrapper spans the full width of
          the card and its p-2.5 is transparent, so making *it* interactive on
          hover put an invisible catcher over the bottom strip of the card and
          swallowed clicks meant for the card link underneath.

          The reveal keys off focus *inside the panel*, not group-focus-within.
          Tailwind gates hover behind `@media (hover: hover)` but not
          focus-within, so with the card-wide version a tap on the tick focused
          the button, the card matched :focus-within, and a panel of external
          links slid over the title on every tap. Keyboard access is unchanged:
          the chips are still in the tab order, and tabbing to one opens the
          panel that contains it. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 p-2.5 opacity-0 transition-all duration-200 focus-within:translate-y-0 focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100">
        <div className="pointer-events-none rounded-lg bg-black/85 p-2 backdrop-blur focus-within:pointer-events-auto group-hover:pointer-events-auto">
          <div className="flex flex-wrap items-center gap-1.5">
            <ImdbLink title={title} compact />
            <WatchLinks title={title} />
          </div>
        </div>
      </div>
    </li>
  );
}

/** Compact row used in the list view. */
export function TitleCard({ data }: { data: TitleCardData }) {
  const { title, position, watched, missingCount, released } = data;
  const { t, n } = useI18n();
  const path = useLocalePath();

  return (
    <li
      className={`panel group relative flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:border-accent-soft/40 sm:gap-4 ${
        watched ? "opacity-70" : ""
      }`}
    >
      <span className="w-7 shrink-0 text-end text-xs tabular-nums text-muted">{n(position)}</span>

      <div className="relative z-10">
        <WatchToggle title={title} watched={watched} size="sm" />
      </div>

      <Poster title={title} className="h-16 w-11 shrink-0" sizes="44px" />

      <div className="min-w-0 flex-1">
        <Link href={path(`/title/${title.id}`)} className="block">
          <span className="absolute inset-0" aria-hidden />
          <span
            className={`block truncate font-medium ${watched ? "line-through decoration-muted" : ""}`}
          >
            {title.title}
          </span>
        </Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <TitleMeta title={title} />
          {!released ? <Badge className="text-accent-soft">{t("card.upcoming")}</Badge> : null}
        </div>
      </div>

      <div className="relative z-10 hidden shrink-0 items-center gap-2 lg:flex">
        <ImdbLink title={title} compact />
        <WatchLinks title={title} />
      </div>

      <div className="relative z-10 hidden shrink-0 sm:block">
        {watched ? (
          <Badge className="text-could">{t("card.watched")}</Badge>
        ) : missingCount > 0 ? (
          <Badge className="text-muted">{t("card.toWatchFirst", { count: missingCount })}</Badge>
        ) : (
          <Badge className="text-could">{t("card.ready")}</Badge>
        )}
      </div>
    </li>
  );
}

export function PhaseHeading({
  phase,
  watched,
  total,
}: {
  phase: string;
  watched: number;
  total: number;
}) {
  const { n } = useI18n();
  const phaseLabel = usePhaseLabel();

  return (
    <div className="mb-3 mt-8 flex items-center gap-4 first:mt-0">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
        {phaseLabel(phase)}
      </h2>
      <div className="hidden flex-1 sm:block">
        <ProgressBar value={watched} total={total} />
      </div>
      <span className="text-xs tabular-nums text-muted">
        {n(watched)}/{n(total)}
      </span>
    </div>
  );
}
