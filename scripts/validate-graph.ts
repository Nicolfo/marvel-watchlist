/**
 * Gatekeeper for the dataset. Run it after editing data/marvel-graph.json:
 *
 *   npm run graph:validate
 *
 * It runs as a prebuild step and in CI, so a typo'd title id or an accidental
 * dependency cycle can never reach a release.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { checkIntegrity, graphDataSchema } from "../src/lib/graph/schema";
import { buildGraph, suggestedOrder } from "../src/lib/graph/engine";
import { loadGraphData, DATA_PATH } from "./load-graph";

const WRITE_JSON_SCHEMA = process.argv.includes("--emit-schema");

function main() {
  const data = loadGraphData();
  const issues = checkIntegrity(data);
  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warning");

  for (const warning of warnings) console.warn(`warning: ${warning.message}`);
  for (const error of errors) console.error(`error:   ${error.message}`);

  if (errors.length > 0) {
    console.error(`\n${errors.length} error(s) in ${DATA_PATH}`);
    process.exit(1);
  }

  // A successful topological sort proves the ordering the app relies on exists.
  const graph = buildGraph(data);
  const order = suggestedOrder(graph, "could");
  if (order.length !== data.titles.length) {
    console.error("error:   suggested order did not cover every title");
    process.exit(1);
  }

  if (WRITE_JSON_SCHEMA) {
    const path = resolve(process.cwd(), "data/marvel-graph.schema.json");
    writeFileSync(path, `${JSON.stringify(z.toJSONSchema(graphDataSchema), null, 2)}\n`);
    console.log(`wrote ${path}`);
  }

  console.log(
    `ok: ${data.titles.length} titles, ${data.edges.length} edges, ` +
      `data version ${data.dataVersion}, ${warnings.length} warning(s)`,
  );
}

main();
