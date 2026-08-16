import type { MetadataRoute } from "next";
import { absoluteUrl, SITE_URL } from "@/lib/site";

/**
 * Replaces the static public/robots.txt so the sitemap URL stays in step with
 * NEXT_PUBLIC_SITE_URL instead of being hardcoded in a file nobody updates.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Not pages: the artwork endpoints redirect to a CDN and the rest return
      // JSON. Nothing here is worth a crawl budget.
      disallow: "/api/",
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
