import type { MetadataRoute } from "next";
import { graphData } from "@/lib/graph/catalog";
import { absoluteUrl } from "@/lib/site";

/**
 * Every page the site has, generated from the catalog so a new title is in the
 * sitemap the moment it is in data/marvel-graph.json.
 *
 * `lastModified` tracks the dataset rather than the build, so rebuilding
 * without a data change does not tell crawlers 89 pages just changed.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(graphData.updatedAt);

  return [
    { url: absoluteUrl("/"), lastModified, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/about"), lastModified, changeFrequency: "yearly", priority: 0.5 },
    // Real page, but its value is in a visitor's own localStorage - nothing a
    // crawler sees. Listed, ranked low.
    { url: absoluteUrl("/watchlist"), lastModified, changeFrequency: "yearly", priority: 0.3 },
    ...graphData.titles.map((title) => ({
      url: absoluteUrl(`/title/${title.id}`),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
