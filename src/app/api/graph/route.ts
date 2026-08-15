import { NextResponse } from "next/server";
import { graphData } from "@/lib/graph/catalog";

/**
 * The whole dataset, for anyone who wants to build on it. Static: the catalog
 * only changes when a new build ships.
 */
export function GET() {
  return NextResponse.json(graphData, {
    headers: { "cache-control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
