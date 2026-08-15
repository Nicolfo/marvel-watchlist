"use client";

import { EDGE_TYPE_META } from "@/lib/graph/catalog";
import type { Strictness } from "@/lib/graph/engine";
import { useWatchlist } from "@/lib/watchlist/provider";
import { EDGE_STYLES } from "./ui";

const ORDER: Strictness[] = ["must", "should", "could"];

const BLURB: Record<Strictness, string> = {
  must: "Only hard story dependencies. The shortest path through the MCU.",
  should: "Hard dependencies plus context a title recaps but assumes.",
  could: "Everything, including passing references. The completionist path.",
};

export function StrictnessPicker() {
  const { strictness, setStrictness } = useWatchlist();

  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
        Count a title as a prerequisite when it&rsquo;s…
      </legend>
      <div className="flex flex-wrap gap-2">
        {ORDER.map((level) => {
          const meta = EDGE_TYPE_META.find((entry) => entry.id === level);
          const style = EDGE_STYLES[level];
          const active = strictness === level;
          return (
            <button
              key={level}
              type="button"
              onClick={() => setStrictness(level)}
              aria-pressed={active}
              title={meta?.description}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "border-transparent bg-panel-2 text-text ring-1 " + style.ring
                  : "border-edge text-muted hover:border-muted/40 hover:text-text"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${style.dot}`} aria-hidden />
              {style.label}
              {level !== "must" ? <span className="text-xs text-muted">or stronger</span> : null}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">{BLURB[strictness]}</p>
    </fieldset>
  );
}
