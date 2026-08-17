"use client";

import { useI18n } from "@/i18n/context";
import type { Strictness } from "@/lib/graph/engine";
import { useWatchlist } from "@/lib/watchlist/provider";
import { EDGE_STYLES, edgeKey } from "./ui";

const ORDER: Strictness[] = ["must", "should", "could"];

export function StrictnessPicker() {
  const { strictness, setStrictness } = useWatchlist();
  const { t } = useI18n();

  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
        {t("strictness.legend")}
      </legend>
      <div className="flex flex-wrap gap-2">
        {ORDER.map((level) => {
          const style = EDGE_STYLES[level];
          const active = strictness === level;
          return (
            <button
              key={level}
              type="button"
              onClick={() => setStrictness(level)}
              aria-pressed={active}
              title={t(`strictness.blurb.${level}`)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "border-transparent bg-panel-2 text-text ring-1 " + style.ring
                  : "border-edge text-muted hover:border-muted/40 hover:text-text"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${style.dot}`} aria-hidden />
              {t(edgeKey(level))}
              {level !== "must" ? (
                <span className="text-xs text-muted">{t("strictness.orStronger")}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">{t(`strictness.blurb.${strictness}`)}</p>
    </fieldset>
  );
}
