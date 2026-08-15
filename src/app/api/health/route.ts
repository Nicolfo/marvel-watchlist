import { NextResponse } from "next/server";
import { graphData } from "@/lib/graph/catalog";

export const dynamic = "force-dynamic";

/** Liveness/readiness probe target for Kubernetes and docker-compose. */
export function GET() {
  return NextResponse.json({
    status: "ok",
    dataVersion: graphData.dataVersion,
    titles: graphData.titles.length,
    edges: graphData.edges.length,
    uptimeSeconds: Math.round(process.uptime()),
  });
}
