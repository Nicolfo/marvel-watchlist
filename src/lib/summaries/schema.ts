import { z } from "zod";

/**
 * The schema for `data/summaries.json` - the detailed, spoiler-heavy plot
 * summaries shown behind the reveal on a title page.
 *
 * Kept as a separate file from `data/marvel-graph.json` on purpose. The graph
 * is a hand-curated transcription of a community watch-order chart with its own
 * provenance and its own release cadence; these are long-form prose about what
 * actually happens. Mixing tens of thousands of words of plot into the graph
 * would bury the twenty lines of dependency data that the app is really built
 * on, and every summary edit would churn the file the ordering is derived from.
 *
 * The prose is original writing for this project, not copied from a
 * rights-encumbered source, so it ships under the repository's own licence.
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
  paragraphs: z.array(z.string().min(80)).min(1),
  /**
   * What the mid- or post-credits scene sets up. Separated from the plot
   * because it is often the only part of a skippable title that the rest of the
   * franchise actually depends on.
   */
  stinger: z.string().min(20).optional(),
});

export const summaryFileSchema = z.object({
  $schema: z.string().optional(),
  schemaVersion: z.literal(1),
  updatedAt: isoDate,
  note: z.string().min(1),
  /** Keyed by title id, so a missing key simply means "not written yet". */
  items: z.record(slug, summaryEntrySchema),
});

export type SummaryEntry = z.infer<typeof summaryEntrySchema>;
export type SummaryFile = z.infer<typeof summaryFileSchema>;
