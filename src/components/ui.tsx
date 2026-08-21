"use client";

import { useI18n } from "@/i18n/context";
import type { EdgeType, Title } from "@/lib/graph/schema";

/**
 * Colours stay module constants, because they are not language. The labels that used
 * to live beside them are now dictionary keys, looked up at render time, so
 * "Must watch" can be "باید ببینید" without the colour mapping knowing.
 */
export const EDGE_STYLES: Record<EdgeType, { dot: string; text: string; ring: string }> = {
  must: { dot: "bg-must", text: "text-must", ring: "ring-must/40" },
  should: { dot: "bg-should", text: "text-should", ring: "ring-should/40" },
  could: { dot: "bg-could", text: "text-could", ring: "ring-could/40" },
};

/** Translation keys for the two data-driven vocabularies the UI displays. */
export function kindKey(kind: Title["kind"]): string {
  return `kind.${kind}`;
}

export function edgeKey(type: EdgeType): string {
  return `edge.${type}`;
}

/**
 * Phase names come from the dataset, not from the dictionary, so a phase nobody
 * has translated yet falls back to the English name in the data rather than
 * rendering a raw `phase.Phase Seven` key.
 */
export function usePhaseLabel(): (phase: string) => string {
  const { t } = useI18n();
  return (phase: string) => {
    const translated = t(`phase.${phase}`);
    return translated === `phase.${phase}` ? phase : translated;
  };
}

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
  const { t } = useI18n();
  return (
    <Badge className={style.text}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden />
      {t(edgeKey(type))}
      {provisional ? <span className="text-muted">{t("edge.predicted")}</span> : null}
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
  const { t } = useI18n();
  const percent = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-panel-2 ${className}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={t("card.progressAria", { value, total })}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-accent to-accent-soft transition-[width] duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function TitleMeta({ title }: { title: Title }) {
  const { t, n } = useI18n();
  const parts = [t(kindKey(title.kind)), n(title.year)];
  if (title.seasons) parts.push(t("titleMeta.seasons", { count: title.seasons }));
  if (title.runtimeMinutes) parts.push(t("titleMeta.minutes", { count: title.runtimeMinutes }));

  return <span className="text-xs text-muted">{parts.join(" · ")}</span>;
}
