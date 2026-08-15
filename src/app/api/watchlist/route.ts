import { NextResponse } from "next/server";

/**
 * Placeholder for the account-backed watchlist.
 *
 * `RemoteWatchlistAdapter` in src/lib/watchlist/local-storage-adapter.ts already
 * speaks this contract:
 *
 *   GET    /api/watchlist -> WatchlistState
 *   PUT    /api/watchlist <- WatchlistState
 *   DELETE /api/watchlist
 *
 * Implementing it means: add auth, resolve the session to a `User`, and read or
 * write `WatchEntry` rows with the Prisma schema in prisma/schema.prisma. The
 * UI needs no changes beyond swapping the adapter passed to <WatchlistProvider>.
 */
const NOT_IMPLEMENTED = {
  error: "not_implemented",
  message:
    "Watchlists are stored in the browser today. Sign-in and server-side sync are not enabled on this deployment.",
} as const;

export function GET() {
  return NextResponse.json(NOT_IMPLEMENTED, { status: 501 });
}

export function PUT() {
  return NextResponse.json(NOT_IMPLEMENTED, { status: 501 });
}

export function DELETE() {
  return NextResponse.json(NOT_IMPLEMENTED, { status: 501 });
}
