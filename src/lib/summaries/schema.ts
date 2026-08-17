import { z } from "zod";

/**
 * The schema for the files in `data/summaries/` - the detailed, spoiler-heavy
 * plot summaries shown behind the reveal on a title page.
 *
 * One file per language, `<locale>.json`, mirroring `src/i18n/dictionaries/`.
 * English is the base and is expected to be complete; every other language is
 * an overlay that may cover as few titles as its translator has reached, and
 * resolution falls back **per title** rather than per file - see
 * `resolveSummary`. A translator who does five films ships five translated
 * films, not a language that looks broken for the other seventy-five.
 *
 * Kept as separate files from `data/marvel-graph.json` on purpose. The graph is
 * a hand-curated transcription of a community watch-order chart with its own
 * provenance and its own release cadence; these are long-form prose about what
 * actually happens. Mixing tens of thousands of words of plot into the graph
 * would bury the twenty lines of dependency data that the app is really built
 * on, and every summary edit would churn the file the ordering is derived from.
 *
 * The English prose is original writing for this project, not copied from a
 * rights-encumbered source, so it ships under the repository's own licence.
 * Translations contributed here are expected to be original renderings of it on
 * the same terms.
 */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO date (YYYY-MM-DD)");

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be a lowercase kebab-case slug");

export const summaryEntrySchema = z.object({
  /**
   * The summary itself, one string per rendered paragraph. Long enough to
   * genuinely replace watching the thing - the whole point is that a reader can
   * skip a title and still follow the next one - so a one-line logline is
   * rejected rather than quietly shipped as a "detailed" summary.
   */
  paragraphs: z.array(z.string().min(40)).min(1),
  /**
   * What the mid- or post-credits scene sets up. Separated from the plot
   * because it is often the only part of a skippable title that the rest of the
   * franchise actually depends on.
   */
  stinger: z.string().min(10).optional(),
});

export const summaryFileSchema = z.object({
  $schema: z.string().optional(),
  schemaVersion: z.literal(1),
  /**
   * The language this file is written in. Checked against the filename and
   * against the site's locale list, so a `pt.json` that says `"locale": "es"`
   * cannot quietly serve Spanish to Portuguese readers.
   */
  locale: z.string().min(2),
  updatedAt: isoDate,
  note: z.string().min(1),
  /** Keyed by title id, so a missing key simply means "not written yet". */
  items: z.record(slug, summaryEntrySchema),
});

export type SummaryEntry = z.infer<typeof summaryEntrySchema>;
export type SummaryFile = z.infer<typeof summaryFileSchema>;

/**
 * A summary plus the language it is actually in.
 *
 * The second field is the point of the whole structure. When a reader on the
 * Persian site opens a title nobody has translated yet, they get the English
 * text - and the page has to know that, so it can mark the block
 * `lang="en" dir="ltr"` and say so above it. Returning the entry alone would
 * leave the caller guessing.
 */
export interface ResolvedSummary {
  entry: SummaryEntry;
  language: string;
}

/**
 * Everything the title page needs to *describe* a summary without containing
 * one: which language the reader will get, and how long it is.
 *
 * This is the shape that crosses to the client during render. The prose itself
 * is fetched from `/api/summary/[id]` when the reader reveals it - a prop would
 * be serialised into the page's flight payload, putting the spoiler in the page
 * source of a page whose entire premise is that it is not there.
 */
export interface SummaryMeta {
  language: string;
  minutes: number;
}

/**
 * Rough reading time, so the reveal can say what it is about to cost.
 *
 * Uses `Intl.Segmenter` where available rather than splitting on whitespace:
 * Chinese and Japanese do not put spaces between words, and a whitespace count
 * would report a 900-character Japanese summary as "1 min read".
 */
export function readingMinutes(entry: SummaryEntry, locale = "en"): number {
  const text = [...entry.paragraphs, entry.stinger ?? ""].join(" ");
  return Math.max(1, Math.round(countWords(text, locale) / 200));
}

export function countWords(text: string, locale = "en"): number {
  try {
    const segmenter = new Intl.Segmenter(locale, { granularity: "word" });
    let words = 0;
    for (const segment of segmenter.segment(text)) if (segment.isWordLike) words += 1;
    return words;
  } catch {
    return text.split(/\s+/).filter(Boolean).length;
  }
}
