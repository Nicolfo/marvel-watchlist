/**
 * Which languages the site speaks.
 *
 * Adding one is two steps: drop a `src/i18n/dictionaries/<code>.json` next to
 * the others (copy `en.json` and translate the values), then add a row here.
 * Everything else (the routes, the sitemap, the hreflang tags, the language
 * menu) is derived from this list, so nothing has to be kept in step by hand.
 * `npm run i18n:validate` will tell you if the new file is missing a key.
 */

export const DEFAULT_LOCALE = "en";

export interface LocaleMeta {
  /** BCP 47 tag, also the URL segment: /fa/title/loki. */
  code: string;
  /** The language's name in that language, never in English. A language menu
   *  written in a language you cannot read is useless to the person who needs
   *  it most. */
  name: string;
  /** English name, for `title` attributes and documentation. */
  englishName: string;
  /** Right-to-left script. */
  rtl?: boolean;
}

export const LOCALES: LocaleMeta[] = [
  { code: "en", name: "English", englishName: "English" },
  { code: "es", name: "Español", englishName: "Spanish" },
  { code: "pt-BR", name: "Português (Brasil)", englishName: "Portuguese (Brazil)" },
  { code: "fr", name: "Français", englishName: "French" },
  { code: "de", name: "Deutsch", englishName: "German" },
  { code: "it", name: "Italiano", englishName: "Italian" },
  { code: "tr", name: "Türkçe", englishName: "Turkish" },
  { code: "ru", name: "Русский", englishName: "Russian" },
  { code: "hi", name: "हिन्दी", englishName: "Hindi" },
  { code: "zh-Hans", name: "简体中文", englishName: "Chinese (Simplified)" },
  { code: "ja", name: "日本語", englishName: "Japanese" },
  { code: "ko", name: "한국어", englishName: "Korean" },
  { code: "ar", name: "العربية", englishName: "Arabic", rtl: true },
  { code: "fa", name: "فارسی", englishName: "Persian", rtl: true },
];

export const LOCALE_CODES = LOCALES.map((locale) => locale.code);

export type Locale = string;

const byCode = new Map(LOCALES.map((locale) => [locale.code.toLowerCase(), locale]));

export function localeMeta(code: string): LocaleMeta | undefined {
  return byCode.get(code.toLowerCase());
}

export function isLocale(code: string): boolean {
  return byCode.has(code.toLowerCase());
}

/** `dir` for the `<html>` element. */
export function directionOf(code: string): "ltr" | "rtl" {
  return localeMeta(code)?.rtl ? "rtl" : "ltr";
}

/**
 * Picks the best supported locale for an `Accept-Language` header.
 *
 * Deliberately hand-rolled rather than pulled from a package: the whole job is
 * "split on commas, sort by q, match exact then by primary subtag", and a
 * dependency that ships a full CLDR table to do it would outweigh the rest of
 * the i18n layer put together.
 *
 * Matching is two-pass so that `pt-PT` prefers `pt-BR` over falling all the way
 * back to English, while `en-GB` still lands on `en`.
 */
export function negotiateLocale(header: string | null | undefined): string {
  if (!header) return DEFAULT_LOCALE;

  const wanted = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((param) => param.trim().startsWith("q="));
      const quality = q ? Number.parseFloat(q.split("=")[1] ?? "1") : 1;
      return { tag: tag.trim().toLowerCase(), quality: Number.isNaN(quality) ? 0 : quality };
    })
    .filter((entry) => entry.tag.length > 0 && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const entry of wanted) {
    const exact = byCode.get(entry.tag);
    if (exact) return exact.code;
  }

  for (const entry of wanted) {
    const primary = entry.tag.split("-")[0];
    const match = LOCALES.find((locale) => locale.code.toLowerCase().split("-")[0] === primary);
    if (match) return match.code;
  }

  return DEFAULT_LOCALE;
}
