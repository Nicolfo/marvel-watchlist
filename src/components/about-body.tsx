"use client";

import Link from "next/link";
import { useI18n, useLocalePath } from "@/i18n/context";
import { Rich } from "@/i18n/rich";
import { LOCALES } from "@/i18n/config";
import { DATA_VERSION, EDGE_TYPE_META, SOURCE, graphData } from "@/lib/graph/catalog";
import { REPO_URL } from "@/lib/site";
import type { EdgeType } from "@/lib/graph/schema";
import { EDGE_STYLES, edgeKey } from "./ui";

/**
 * The About page body.
 *
 * A client component so it can reach the dictionary through the same context
 * every other component uses, rather than threading a server-loaded dictionary
 * down through props for one page. It renders no interactive state, so it costs
 * nothing beyond the strings it displays.
 *
 * Every sentence with a link or a bold run in it is a single dictionary value
 * with `{slots}`, not three concatenated fragments. See `Rich` for why.
 */
export function AboutBody({ summaryCount }: { summaryCount: number }) {
  const { t, n } = useI18n();
  const path = useLocalePath();

  const counts = graphData.edges.reduce<Record<string, number>>((acc, edge) => {
    acc[edge.type] = (acc[edge.type] ?? 0) + 1;
    return acc;
  }, {});

  const code = (value: string) => <code className="text-text">{value}</code>;
  const external = (href: string, label: string) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-accent-soft underline underline-offset-2"
    >
      {label}
    </a>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="panel rounded-2xl p-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("about.title")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          <Rich
            text={t("about.intro")}
            slots={{ strong: <strong className="text-text">{t("about.intro.strong")}</strong> }}
          />
        </p>
      </section>

      <section className="panel rounded-2xl p-6">
        <h2 className="text-lg font-semibold">{t("about.source.heading")}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          <Rich
            text={t("about.source.lead")}
            slots={{
              link: external(SOURCE.url, SOURCE.name),
              author: <strong className="text-text">{SOURCE.author}</strong>,
            }}
          />
        </p>
        {/* A URL is not prose: it stays left-to-right in every language. */}
        <p
          dir="ltr"
          className="mt-3 break-all rounded-lg border border-edge bg-panel-2/40 p-3 text-start font-mono text-xs text-muted"
        >
          <a href={SOURCE.url} target="_blank" rel="noreferrer noopener" className="hover:text-accent-soft">
            {SOURCE.url}
          </a>
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {t("about.source.credit")}{" "}
          <em className="text-text">{t("about.source.disclaimer")}</em> {SOURCE.note}
        </p>
      </section>

      <section className="panel rounded-2xl p-6">
        <h2 className="text-lg font-semibold">{t("about.arrows.heading")}</h2>
        <p className="mt-2 text-sm text-muted">{t("about.arrows.lead")}</p>
        <ul className="mt-4 space-y-3">
          {EDGE_TYPE_META.map((meta) => {
            const style = EDGE_STYLES[meta.id as EdgeType];
            return (
              <li key={meta.id} className="flex gap-3 rounded-xl border border-edge p-3">
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} aria-hidden />
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className={`font-medium ${style.text}`}>{t(edgeKey(meta.id))}</span>
                    <span className="text-xs text-muted">
                      {t("about.arrows.count", { count: counts[meta.id] ?? 0 })}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">{t(`strictness.blurb.${meta.id}`)}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-sm text-muted">
          <Rich
            text={t("about.arrows.dashed")}
            slots={{
              predicted: <span className="text-text">{t("about.arrows.dashed.predicted")}</span>,
            }}
          />
        </p>
      </section>

      <section className="panel rounded-2xl p-6">
        <h2 className="text-lg font-semibold">{t("about.language.heading")}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {t("about.language.body1", { count: LOCALES.length })}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          <Rich
            text={t("about.language.body2")}
            slots={{
              folder: code("src/i18n/dictionaries/"),
              doc: code("docs/internationalisation.md"),
            }}
          />
        </p>
        <ul dir="ltr" className="mt-4 flex flex-wrap gap-2 text-start">
          {LOCALES.map((entry) => (
            <li
              key={entry.code}
              lang={entry.code}
              dir={entry.rtl ? "rtl" : "ltr"}
              className="rounded-full border border-edge px-2.5 py-1 text-xs text-muted"
            >
              {entry.name}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel rounded-2xl p-6">
        <h2 className="text-lg font-semibold">{t("about.artwork.heading")}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          <Rich
            text={t("about.artwork.body1")}
            slots={{
              imdb: <strong className="text-text">IMDb</strong>,
              not: <em>{t("about.artwork.body1.not")}</em>,
              tmdb: external("https://www.themoviedb.org/", "TMDB"),
            }}
          />
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          <Rich
            text={t("about.artwork.body2")}
            slots={{ link: <strong className="text-text">{t("links.whereToWatch")}</strong> }}
          />
        </p>
      </section>

      <section className="panel rounded-2xl p-6">
        <h2 className="text-lg font-semibold">{t("about.summaries.heading")}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          <Rich
            text={t("about.summaries.body1", { count: summaryCount })}
            slots={{
              strong: <strong className="text-text">{t("about.summaries.body1.strong")}</strong>,
            }}
          />
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          <Rich
            text={t("about.summaries.body2")}
            slots={{
              never: <em>{t("about.summaries.body2.never")}</em>,
              key: code("marvel-watchlist:spoilers:v1"),
            }}
          />
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          <Rich
            text={t("about.summaries.body3")}
            slots={{
              file: code("data/summaries/"),
              command: code("npm run summaries:validate"),
            }}
          />
        </p>
      </section>

      <section className="panel rounded-2xl p-6">
        <h2 className="text-lg font-semibold">{t("about.watchlist.heading")}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          <Rich
            text={t("about.watchlist.body")}
            slots={{
              storage: code("localStorage"),
              key: code("marvel-watchlist:v1"),
              link: (
                <Link
                  href={path("/watchlist")}
                  className="text-accent-soft underline underline-offset-2"
                >
                  {t("about.watchlist.body.link")}
                </Link>
              ),
            }}
          />
        </p>
      </section>

      <section className="panel rounded-2xl p-6">
        <h2 className="text-lg font-semibold">{t("about.data.heading")}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          <Rich
            text={t("about.data.body")}
            slots={{
              file: code("data/marvel-graph.json"),
              command: code("npm run graph:validate"),
            }}
          />
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-edge p-3">
            <dt className="text-xs uppercase tracking-wide text-muted">{t("about.data.titles")}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{n(graphData.titles.length)}</dd>
          </div>
          <div className="rounded-xl border border-edge p-3">
            <dt className="text-xs uppercase tracking-wide text-muted">
              {t("about.data.dependencies")}
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{n(graphData.edges.length)}</dd>
          </div>
          <div className="rounded-xl border border-edge p-3">
            <dt className="text-xs uppercase tracking-wide text-muted">{t("about.data.dataset")}</dt>
            <dd dir="ltr" className="mt-1 text-start text-xl font-semibold tabular-nums">
              {DATA_VERSION}
            </dd>
          </div>
        </dl>
      </section>

      <section className="panel rounded-2xl p-6">
        <h2 className="text-lg font-semibold">{t("about.repo.heading")}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          <Rich text={t("about.repo.body")} slots={{ link: external(REPO_URL, "GitHub") }} />
        </p>
        {/* Spelled out as well as linked, the same way the source chart is: a
            URL someone can copy, and one that stays left-to-right in Arabic
            and Persian because it is an address, not prose. */}
        <p
          dir="ltr"
          className="mt-3 break-all rounded-lg border border-edge bg-panel-2/40 p-3 text-start font-mono text-xs text-muted"
        >
          <a href={REPO_URL} target="_blank" rel="noreferrer noopener" className="hover:text-accent-soft">
            {REPO_URL}
          </a>
        </p>
      </section>

      <section className="panel rounded-2xl p-6">
        <h2 className="text-lg font-semibold">{t("about.legal.heading")}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">{t("about.legal.body")}</p>
      </section>
    </div>
  );
}
