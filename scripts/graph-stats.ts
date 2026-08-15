/** Prints the suggested order and a few sanity stats: `npm run graph:stats`. */
import { buildGraph, suggestedOrder, computeProgress } from "../src/lib/graph/engine";
import { loadGraphData } from "./load-graph";

const data = loadGraphData();
const graph = buildGraph(data);
const progress = computeProgress(graph, new Set());

console.log(`dataset ${data.dataVersion} (updated ${data.updatedAt})`);
console.log(`${progress.total} titles / ${data.edges.length} edges\n`);

for (const [kind, stats] of Object.entries(progress.byKind).sort()) {
  console.log(`  ${kind.padEnd(12)} ${stats.total}`);
}

console.log("\nSuggested order (all edge types):\n");
suggestedOrder(graph, "could").forEach((title, index) => {
  const rank = String(index + 1).padStart(3, " ");
  console.log(`${rank}. ${title.title} (${title.year}) [${title.kind}]`);
});
