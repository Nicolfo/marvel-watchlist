import raw from "@data/summaries.json";
import type { SummaryEntry, SummaryFile } from "./schema";

/**
 * The bundled summaries.
 *
 * Like the graph, this ships with the app rather than being fetched: the whole
 * point of the feature is that a reader can decide to skip a title, and a
 * skip-or-not decision that waits on a network round trip (or on an operator
 * having configured an API key) is a worse one. It is validated against
 * `summaryFileSchema` by `npm run summaries:validate`, which runs in the
 * prebuild and in the test suite, so the cast here is checked upstream rather
 * than at runtime in the browser.
 *
 * This module is safe to import from client code - it holds data and nothing
 * else.
 */

const file = raw as unknown as SummaryFile;

export const SUMMARIES_UPDATED_AT = file.updatedAt;
export const SUMMARIES_NOTE = file.note;

/** How many titles have a summary written, for the About page's data table. */
export const SUMMARY_COUNT = Object.keys(file.items ?? {}).length;

/** The summary for one title, or undefined when nobody has written one yet. */
export function summaryFor(id: string): SummaryEntry | undefined {
  return file.items?.[id];
}

export function hasSummary(id: string): boolean {
  return summaryFor(id) !== undefined;
}

/** Rough reading time, so the reveal can say what it is about to cost. */
export function readingMinutes(entry: SummaryEntry): number {
  const words = [...entry.paragraphs, entry.stinger ?? ""].reduce(
    (total, text) => total + text.split(/\s+/).filter(Boolean).length,
    0,
  );
  return Math.max(1, Math.round(words / 200));
}
