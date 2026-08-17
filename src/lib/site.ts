import { DEFAULT_LOCALE, LOCALE_CODES } from "@/i18n/config";

/**
 * The site's public origin.
 *
 * Canonical URLs, the sitemap and Open Graph tags all have to be absolute, so
 * they need to know where the site actually lives. Overridable per deployment
 * (set NEXT_PUBLIC_SITE_URL at build time) so a fork or a staging host does not
 * advertise the production domain as its canonical.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://marvel.nicolfo.it").replace(
  /\/+$/,
  "",
);

export const SITE_NAME = "Marvel Watchlist";

export const SITE_DESCRIPTION =
  "Explore every Marvel Studios film and series in a suggested order, and see exactly what you still need to watch before any title.";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** A locale-prefixed path: `("/title/loki", "fa")` → `/fa/title/loki`. */
export function localeUrl(path: string, locale: string): string {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean}`;
}

/**
 * Canonical plus `hreflang` alternates for one page in one language.
 *
 * Every translation of a page has to name every other translation, or a search
 * engine treats fourteen versions of the same page as fourteen competing pages
 * rather than one page in fourteen languages. `x-default` points at the English
 * copy, which is what a crawler with no language preference should be shown.
 */
export function alternatesFor(path: string, locale: string) {
  const languages: Record<string, string> = {};
  for (const code of LOCALE_CODES) languages[code] = localeUrl(path, code);
  languages["x-default"] = localeUrl(path, DEFAULT_LOCALE);

  return { canonical: localeUrl(path, locale), languages };
}
