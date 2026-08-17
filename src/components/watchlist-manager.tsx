"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useI18n, useLocalePath } from "@/i18n/context";
import { Rich } from "@/i18n/rich";
import { getGraph, phaseOrder } from "@/lib/graph/catalog";
import { readyToWatch, suggestedOrder } from "@/lib/graph/engine";
import { useWatchlist } from "@/lib/watchlist/provider";
import { Badge, ProgressBar, TitleMeta, usePhaseLabel } from "./ui";

export function WatchlistManager() {
  const graph = getGraph();
  const { ready, watched, strictness, progress, backend, reset, exportJson, importJson } =
    useWatchlist();
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const { t, n } = useI18n();
  const path = useLocalePath();
  const phaseLabel = usePhaseLabel();

  const watchedTitles = useMemo(
    () => suggestedOrder(graph, strictness).filter((title) => watched.has(title.id)),
    [graph, strictness, watched],
  );

  const upNext = useMemo(
    () => readyToWatch(graph, watched, strictness).slice(0, 8),
    [graph, strictness, watched],
  );

  const phases = phaseOrder();

  const download = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `marvel-watchlist-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section className="panel rounded-2xl p-5 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("watchlist.title")}</h1>
        <p className="mt-2 text-sm text-muted">
          <Rich
            text={t("watchlist.storedIn")}
            slots={{
              code: <code className="text-text">localStorage</code>,
              backend: <span className="text-text">{backend}</span>,
            }}
          />
        </p>

        <div className="mt-5 flex items-baseline justify-between text-sm">
          <span className="text-muted">{t("watchlist.overall")}</span>
          <span className="tabular-nums">
            {n(progress.watched)}/{n(progress.total)} · {n(progress.percent)}%
          </span>
        </div>
        <div className="mt-2">
          <ProgressBar value={progress.watched} total={progress.total} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {phases.map((phase) => {
            const stats = progress.byPhase[phase];
            if (!stats) return null;
            return (
              <div key={phase} className="rounded-xl border border-edge bg-panel-2/40 p-3">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="truncate font-medium">{phaseLabel(phase)}</span>
                  <span className="tabular-nums text-muted">
                    {n(stats.watched)}/{n(stats.total)}
                  </span>
                </div>
                <div className="mt-2">
                  <ProgressBar value={stats.watched} total={stats.total} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-semibold">{t("watchlist.readyNow")}</h2>
        <p className="mt-1 text-sm text-muted">{t("watchlist.readyNowSub")}</p>
        {!ready ? (
          <p className="mt-4 text-sm text-muted">{t("watchlist.loading")}</p>
        ) : upNext.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{t("watchlist.allWatched")}</p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {upNext.map((title) => (
              <li
                key={title.id}
                className="rounded-xl border border-edge bg-panel-2/40 px-3 py-2"
              >
                <Link
                  href={path(`/title/${title.id}`)}
                  className="font-medium hover:text-accent-soft"
                >
                  {title.title}
                </Link>
                <div>
                  <TitleMeta title={title} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">
            {t("watchlist.watchedCount", { count: watchedTitles.length })}
          </h2>
          {watchedTitles.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                if (confirm(t("watchlist.clearConfirm"))) {
                  reset();
                  setMessage(t("watchlist.cleared"));
                }
              }}
              className="text-sm text-muted underline underline-offset-2 hover:text-accent-soft"
            >
              {t("watchlist.clearAll")}
            </button>
          ) : null}
        </div>
        {watchedTitles.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            {t("watchlist.empty")}{" "}
            <Link href={path("/")} className="text-accent-soft underline underline-offset-2">
              {t("watchlist.startTicking")}
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {watchedTitles.map((title) => (
              <li key={title.id}>
                <Link href={path(`/title/${title.id}`)}>
                  <Badge className="hover:border-accent-soft hover:text-text">{title.title}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-semibold">{t("watchlist.backup")}</h2>
        <p className="mt-1 text-sm text-muted">{t("watchlist.backupSub")}</p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={download}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-soft"
          >
            {t("watchlist.download")}
          </button>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(exportJson());
              setMessage(t("watchlist.copied"));
            }}
            className="rounded-lg border border-edge px-4 py-2 text-sm hover:border-accent-soft"
          >
            {t("watchlist.copy")}
          </button>
        </div>

        <label className="mt-5 block text-sm text-muted" htmlFor="import">
          {t("watchlist.pasteLabel")}
        </label>
        <textarea
          id="import"
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          rows={4}
          placeholder='{"schemaVersion":1,"entries":[…]}'
          dir="ltr"
          className="mt-2 w-full rounded-lg border border-edge bg-panel px-3 py-2 text-start font-mono text-xs placeholder:text-muted"
        />
        <button
          type="button"
          onClick={() => {
            const result = importJson(importText);
            setMessage(
              result.ok
                ? t("watchlist.imported")
                : t("watchlist.importFailed", { error: result.error }),
            );
            if (result.ok) setImportText("");
          }}
          disabled={importText.trim().length === 0}
          className="mt-2 rounded-lg border border-edge px-4 py-2 text-sm disabled:opacity-40"
        >
          {t("watchlist.import")}
        </button>

        {message ? (
          <p aria-live="polite" className="mt-3 text-sm text-accent-soft">
            {message}
          </p>
        ) : null}
      </section>
    </div>
  );
}
