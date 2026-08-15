import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { WatchlistProvider } from "@/lib/watchlist/provider";
import { HeaderProgress } from "@/components/header-progress";

export const metadata: Metadata = {
  title: {
    default: "Marvel Watchlist",
    template: "%s · Marvel Watchlist",
  },
  description:
    "Explore every Marvel Studios film and series in a suggested order, and see exactly what you still need to watch before any title.",
};

const NAV = [
  { href: "/", label: "Explore" },
  { href: "/watchlist", label: "My watchlist" },
  { href: "/about", label: "About" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <WatchlistProvider>
          <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 sm:px-6">
            <header className="flex flex-wrap items-center gap-x-6 gap-y-3 py-6">
              <Link href="/" className="group flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-accent font-black tracking-tighter text-white">
                  M
                </span>
                <span className="text-lg font-semibold tracking-tight">
                  Marvel<span className="text-muted"> Watchlist</span>
                </span>
              </Link>

              <nav className="flex items-center gap-1 text-sm">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-md px-3 py-1.5 text-muted transition-colors hover:bg-panel-2 hover:text-text"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="ml-auto">
                <HeaderProgress />
              </div>
            </header>

            <main className="flex-1 pb-16">{children}</main>

            <footer className="border-t border-edge py-6 text-xs text-muted">
              Watch order adapted from{" "}
              <a
                className="text-accent-soft underline underline-offset-2"
                href="https://www.reddit.com/r/marvelstudios/s/Yc9CunxbWr"
                target="_blank"
                rel="noreferrer noopener"
              >
                &ldquo;A smarter MCU watch order&rdquo; by Rocked03
              </a>
              . Fan project — not affiliated with Marvel or The Walt Disney Company.
            </footer>
          </div>
        </WatchlistProvider>
      </body>
    </html>
  );
}
