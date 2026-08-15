"use client";

import { useWatchlist } from "@/lib/watchlist/provider";
import { ProgressBar } from "./ui";

export function HeaderProgress() {
  const { ready, progress } = useWatchlist();

  return (
    <div className="w-40" aria-hidden={!ready}>
      <div className="mb-1 flex items-baseline justify-between text-xs text-muted">
        <span>Watched</span>
        <span className="tabular-nums text-text">
          {ready ? `${progress.watched}/${progress.total}` : "—"}
        </span>
      </div>
      <ProgressBar value={ready ? progress.watched : 0} total={progress.total} />
    </div>
  );
}
