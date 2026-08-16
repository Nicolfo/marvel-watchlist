import type { Metadata, Viewport } from "next";
import "./globals.css";
import { artworkEnabled } from "@/lib/artwork-server";
import { ArtworkProvider } from "@/lib/artwork-context";
import { WatchlistProvider } from "@/lib/watchlist/provider";
import { AppShell } from "@/components/app-shell";

/**
 * TMDB_API_KEY is read at request time, so the shell cannot be prerendered at
 * build time - that is the whole point of resolving artwork at runtime: setting
 * the key must take effect on a pod restart, not on an image rebuild.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Marvel Watchlist",
    template: "%s · Marvel Watchlist",
  },
  description:
    "Explore every Marvel Studios film and series in a suggested order, and see exactly what you still need to watch before any title.",
  appleWebApp: { capable: true, title: "Marvel Watchlist", statusBarStyle: "black-translucent" },
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
        <ArtworkProvider enabled={artworkEnabled()}>
          <WatchlistProvider>
            <AppShell>{children}</AppShell>
          </WatchlistProvider>
        </ArtworkProvider>
      </body>
    </html>
  );
}
