import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ArtworkProvider } from "@/lib/artwork-context";
import { SpoilerProvider } from "@/lib/spoiler-context";
import { WatchlistProvider } from "@/lib/watchlist/provider";
import { AppShell } from "@/components/app-shell";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * Deliberately not `force-dynamic`. The shell reads nothing request-scoped, so
 * every page under it prerenders; the one runtime-dependent bit - whether a
 * TMDB key is configured - is fetched by ArtworkProvider from
 * /api/artwork/status instead of being rendered in.
 */

export const metadata: Metadata = {
  // Makes every relative URL below - canonicals, OG images - resolve to an
  // absolute one. Without it Next emits relative OG tags, which crawlers and
  // link unfurlers both ignore.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME}: every Marvel film and series in a suggested order`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Marvel",
    "MCU",
    "watch order",
    "viewing order",
    "Marvel Cinematic Universe",
    "what to watch first",
    "Marvel timeline",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: "/",
    title: `${SITE_NAME}: every Marvel film and series in a suggested order`,
    description: SITE_DESCRIPTION,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: SITE_NAME }],
    locale: "en",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME}: every Marvel film and series in a suggested order`,
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // `cover` lets the app bar and footer paint into the notch and home-indicator
  // areas; the safe-area insets in the shell keep content clear of them.
  viewportFit: "cover",
  themeColor: "#05070d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ArtworkProvider>
          <SpoilerProvider>
            <WatchlistProvider>
              <AppShell>{children}</AppShell>
            </WatchlistProvider>
          </SpoilerProvider>
        </ArtworkProvider>
      </body>
    </html>
  );
}
