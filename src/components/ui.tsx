import type { EdgeType, Title } from "@/lib/graph/schema";

export const EDGE_STYLES: Record<EdgeType, { label: string; dot: string; text: string; ring: string }> = {
  must: { label: "Must watch", dot: "bg-must", text: "text-must", ring: "ring-must/40" },
  should: { label: "Should watch", dot: "bg-should", text: "text-should", ring: "ring-should/40" },
  could: { label: "Could watch", dot: "bg-could", text: "text-could", ring: "ring-could/40" },
};

export const KIND_LABELS: Record<Title["kind"], string> = {
  film: "Film",
  series: "Series",
  special: "Special",
  short: "Short",
  "one-shot": "One-shot",
  animation: "Animation",
  collection: "Collection",
};

export function Badge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-edge px-2 py-0.5 text-[11px] font-medium text-muted ${className}`}
    >
      {children}
    </span>
  );
}

export function EdgeBadge({ type, provisional }: { type: EdgeType; provisional?: boolean }) {
  const style = EDGE_STYLES[type];
  return (
    <Badge className={style.text}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden />
      {style.label}
      {provisional ? <span className="text-muted">· predicted</span> : null}
    </Badge>
  );
}

export function ProgressBar({
  value,
  total,
  className = "",
}: {
  value: number;
  total: number;
  className?: string;
}) {
  const percent = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-panel-2 ${className}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`${value} of ${total} watched`}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-accent to-accent-soft transition-[width] duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function TitleMeta({ title }: { title: Title }) {
  return (
    <span className="text-xs text-muted">
      {KIND_LABELS[title.kind]} · {title.year}
      {title.seasons ? ` · ${title.seasons} season${title.seasons > 1 ? "s" : ""}` : ""}
      {title.runtimeMinutes ? ` · ${title.runtimeMinutes} min` : ""}
    </span>
  );
}
