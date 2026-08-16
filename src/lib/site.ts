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
