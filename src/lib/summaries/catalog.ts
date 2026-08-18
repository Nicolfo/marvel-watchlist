import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { readingMinutes, type ResolvedSummary, type SummaryEntry, type SummaryFile, type SummaryMeta } from "./schema";

/**
 * Loading and resolving the plot summaries.
 *
 * **Server-side only, on purpose.** The summaries are the largest text in the
 * repository - the English file alone is tens of thousands of words - and this
 * module used to be imported by a client component, which meant shipping the
 * whole corpus to every browser to display one title's worth of it. With a file
 * per language that would have become fourteen corpora.
 *
 * So resolution happens here, on the server. The title page renders from
 * `summaryMetaFor` - language and reading time, no prose - and the text itself
 * is served by `/api/summary/[id]` when a reader actually reveals it. Passing
 * the prose down as a prop would have been the other obvious move, and it leaks:
 * React serialises props into the flight payload, so the spoiler ends up in the
 * page source of a page built around it not being there.
 *
 * Importers are written out one per line rather than built from a template
 * string, so the bundler can see exactly which files are reachable and split
 * them apart, the same way the dictionaries are loaded.
 */

const loaders: Record<string, () => Promise<{ default: unknown }>> = {
  en: () => import("@data/summaries/en.json"),
  es: () => import("@data/summaries/es.json"),
  "pt-BR": () => import("@data/summaries/pt-BR.json"),
  fr: () => import("@data/summaries/fr.json"),
  de: () => import("@data/summaries/de.json"),
  it: () => import("@data/summaries/it.json"),
};

/** The languages a summary can currently be written in. */
export const SUMMARY_LOCALES = Object.keys(loaders);

/**
 * The cast is checked upstream rather than here: `npm run summaries:validate`
 * parses every one of these files against `summaryFileSchema` in the prebuild,
 * in CI and in the test suite. Re-parsing on each request would buy nothing and
 * cost a zod pass per page render.
 */
async function load(locale: string): Promise<SummaryFile | null> {
  const loader = loaders[locale];
  if (!loader) return null;
  return (await loader()).default as SummaryFile;
}

/**
 * The summary for one title in one language, falling back to English.
 *
 * The fallback is **per title, not per file**. A locale with three translated
 * films serves those three in that language and the rest in English, rather
 * than being ignored until somebody finishes all eighty. That is the normal
 * state of a community translation, so it is the state the resolver is built
 * around.
 *
 * Returns `undefined` only when nobody has written the summary in any language -
 * which for an unreleased title is the correct and permanent answer.
 */
export async function resolveSummary(
  id: string,
  locale: string,
): Promise<ResolvedSummary | undefined> {
  if (isLocale(locale) && locale !== DEFAULT_LOCALE) {
    const translated = (await load(locale))?.items?.[id];
    if (translated) return { entry: translated, language: locale };
  }

  const english = (await load(DEFAULT_LOCALE))?.items?.[id];
  return english ? { entry: english, language: DEFAULT_LOCALE } : undefined;
}

/**
 * Whether a summary exists for this title, and what to say about it - without
 * handing the caller the prose. This is what the title page renders with.
 */
export async function summaryMetaFor(
  id: string,
  locale: string,
): Promise<SummaryMeta | undefined> {
  const resolved = await resolveSummary(id, locale);
  if (!resolved) return undefined;
  return {
    language: resolved.language,
    // Measured in the language the text is actually in: Chinese and Japanese
    // put no spaces between words, so counting the English way would call a
    // long summary a one-minute read.
    minutes: readingMinutes(resolved.entry, resolved.language),
  };
}

/** Every id that has a summary in the given language, without the prose. */
export async function summarisedIds(locale: string): Promise<string[]> {
  const file = await load(locale);
  return file ? Object.keys(file.items ?? {}) : [];
}

/**
 * How many titles a reader in this language can actually read a summary for.
 *
 * The union of the language's own entries and English's, because a reader gets
 * a summary either way - that is what the fallback is for, and reporting only
 * the translated count would tell a Persian reader "3 summaries" when eighty
 * are in front of them.
 */
export async function summaryCount(locale: string): Promise<number> {
  const [own, english] = await Promise.all([
    summarisedIds(locale),
    summarisedIds(DEFAULT_LOCALE),
  ]);
  return new Set([...own, ...english]).size;
}

/** Metadata for the About page and the validator. */
export async function summaryFileFor(locale: string): Promise<SummaryFile | null> {
  return load(locale);
}

export type { ResolvedSummary, SummaryEntry, SummaryMeta };
