import { NextResponse } from "next/server";
import { artworkEnabled } from "@/lib/artwork-server";

export const dynamic = "force-dynamic";

/**
 * Whether it is worth a browser asking for artwork at all.
 *
 * This exists so the pages themselves can stay static. `artworkEnabled()` reads
 * TMDB_API_KEY, and `process.env` is not a dynamic API in Next: on a
 * prerendered page it is evaluated at *build* time and baked in, so a key set
 * on the running server would never take effect. Asking for it over the wire
 * keeps that one bit request-time while everything around it is prerendered.
 */
export function GET() {
  return NextResponse.json(
    { enabled: artworkEnabled() },
    // Must not be cached: flipping the key should take effect on a restart,
    // not whenever a stale copy happens to expire. The body is ~20 bytes.
    { headers: { "cache-control": "no-store" } },
  );
}
