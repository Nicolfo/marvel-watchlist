import raw from "@data/marvel-graph.json";
import { buildGraph, type Graph } from "./engine";
import type { GraphData } from "./schema";

/**
 * The bundled dataset.
 *
 * The JSON file is the source of truth and ships with the app, so the whole
 * catalog is available on both server and client without a round trip - which
 * is what lets the localStorage watchlist stay instant. It is validated
 * against `graphDataSchema` by `npm run graph:validate` (which also runs as a
 * prebuild step and in the test suite), so the cast here is checked upstream
 * rather than at runtime in the browser.
 */
export const graphData = raw as unknown as GraphData;

let cached: Graph | null = null;

export function getGraph(): Graph {
  cached ??= buildGraph(graphData);
  return cached;
}

export const SOURCE = graphData.source;
export const DATA_VERSION = graphData.dataVersion;
export const EDGE_TYPE_META = graphData.edgeTypes;

export function edgeTypeMeta(type: string) {
  return EDGE_TYPE_META.find((meta) => meta.id === type);
}

/** Phases in the order they should be presented, derived from the data. */
export function phaseOrder(): string[] {
  const seen = new Map<string, string>();
  for (const title of graphData.titles) {
    const key = title.releaseDate ?? "9999-99-99";
    const current = seen.get(title.phase);
    if (!current || key < current) seen.set(title.phase, key);
  }
  return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([phase]) => phase);
}
