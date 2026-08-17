import type { MetadataRoute } from "next";
import { graphData } from "@/lib/graph/catalog";
import { LOCALE_CODES } from "@/i18n/config";
import { absoluteUrl, localeUrl } from "@/lib/site";

/**
 * Every page the site has, in every language it speaks, generated from the
 * catalog so a new title is in the sitemap the moment it is in
 * data/marvel-graph.json.
 *
 * Each entry carries the `alternates.languages` map, which is what tells a
 * crawler that `/fa/title/loki` and `/ja/title/loki` are one page in two
 * languages rather than two pages competing for the same query.
 *
 * `lastModified` tracks the dataset rather than the build, so rebuilding
 * without a data change does not tell crawlers that a thousand pages moved.
 */

function languagesFor(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const code of LOCALE_CODES) languages[code] = absoluteUrl(localeUrl(path, code));
  return languages;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(graphData.updatedAt);

  const pages: Array<{ path: string; changeFrequency: "weekly" | "monthly" | "yearly"; priority: number }> = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/about", changeFrequency: "yearly", priority: 0.5 },
    // Real page, but its value is in a visitor's own localStorage - nothing a
    // crawler sees. Listed, ranked low.
    { path: "/watchlist", changeFrequency: "yearly", priority: 0.3 },
    ...graphData.titles.map((title) => ({
      path: `/title/${title.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];

  return pages.flatMap((page) =>
    LOCALE_CODES.map((code) => ({
      url: absoluteUrl(localeUrl(page.path, code)),
      lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: { languages: languagesFor(page.path) },
    })),
  );
}
