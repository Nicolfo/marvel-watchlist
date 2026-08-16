"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useWatchlist } from "@/lib/watchlist/provider";
import { ProgressBar } from "./ui";

/**
 * The application chrome.
 *
 * On phones this is an app bar plus a slide-in drawer, so the whole viewport
 * below 56px belongs to content. On large screens the same bar carries the nav
 * inline and the drawer never exists.
 */

const NAV = [
  { href: "/", label: "Explore", icon: GridIcon },
  { href: "/watchlist", label: "My watchlist", icon: CheckIcon },
  { href: "/about", label: "About", icon: InfoIcon },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  // Navigating from inside the drawer should dismiss it.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);

    // Stop the page behind the drawer scrolling with the drawer's own gestures.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      // Send focus back where it came from, not to the top of the document.
      burgerRef.current?.focus();
    };
  }, [open]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky-bar sticky top-0 z-40 border-b border-edge pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-3 sm:px-6">
          <button
            ref={burgerRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="app-drawer"
            className="-ml-1 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-text transition-colors hover:bg-panel-2 lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <Link href="/" className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent text-sm font-black tracking-tighter text-white">
              M
            </span>
            <span className="truncate text-base font-semibold tracking-tight">
              Marvel<span className="text-muted"> Watchlist</span>
            </span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 text-sm lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 transition-colors hover:bg-panel-2 hover:text-text ${
                  pathname === item.href ? "bg-panel-2 text-text" : "text-muted"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto shrink-0">
            <ProgressPill />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-3 pb-12 sm:px-6">{children}</main>

      <footer className="mx-auto w-full max-w-6xl border-t border-edge px-3 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-xs text-muted sm:px-6">
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

      <Drawer open={open} onClose={() => setOpen(false)} pathname={pathname} panelRef={panelRef} />
    </div>
  );
}

function Drawer({
  open,
  onClose,
  pathname,
  panelRef,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
  panelRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { ready, progress } = useWatchlist();

  return (
    <div
      className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        id="app-drawer"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        tabIndex={-1}
        className={`absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col border-r border-edge bg-panel pt-[env(safe-area-inset-top)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center gap-2 px-3">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-accent text-sm font-black tracking-tighter text-white">
            M
          </span>
          <span className="text-base font-semibold tracking-tight">Marvel Watchlist</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="-mr-1 ml-auto grid h-11 w-11 place-items-center rounded-lg text-muted transition-colors hover:bg-panel-2 hover:text-text"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav className="mt-2 flex flex-col gap-1 px-2">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-base transition-colors ${
                  active ? "bg-panel-2 text-text" : "text-muted hover:bg-panel-2/60 hover:text-text"
                }`}
              >
                <Icon />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-edge p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="text-muted">Watched</span>
            <span className="tabular-nums">
              {ready ? `${progress.watched}/${progress.total}` : "—"}
            </span>
          </div>
          <ProgressBar value={ready ? progress.watched : 0} total={progress.total} />
        </div>
      </div>
    </div>
  );
}

/** Compact progress for the app bar: a ring on phones, ring + count above. */
function ProgressPill() {
  const { ready, progress } = useWatchlist();
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const filled = ready ? (progress.percent / 100) * circumference : 0;

  return (
    <Link
      href="/watchlist"
      aria-label={
        ready ? `${progress.watched} of ${progress.total} watched` : "Watchlist progress"
      }
      className="flex items-center gap-2 rounded-full border border-edge px-2 py-1 transition-colors hover:border-accent-soft"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 -rotate-90" aria-hidden>
        <circle cx="12" cy="12" r={radius} fill="none" stroke="var(--color-edge)" strokeWidth="3" />
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          className="transition-[stroke-dasharray] duration-500"
        />
      </svg>
      <span className="text-xs tabular-nums text-muted">
        {ready ? `${progress.watched}/${progress.total}` : "—"}
      </span>
    </Link>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden>
      <rect x="1" y="1" width="6" height="6" rx="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" aria-hidden>
      <path
        d="M4 10.5l4 4L16 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 9v5M10 6.2v.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
