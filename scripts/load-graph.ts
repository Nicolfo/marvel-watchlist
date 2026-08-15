import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { graphDataSchema, type GraphData } from "../src/lib/graph/schema";

export const DATA_PATH = resolve(process.cwd(), "data/marvel-graph.json");

/** Reads and schema-validates the dataset, throwing a readable error if invalid. */
export function loadGraphData(path: string = DATA_PATH): GraphData {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const result = graphDataSchema.safeParse(raw);
  if (!result.success) {
    const lines = result.error.issues.map(
      (issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`,
    );
    throw new Error(`${path} does not match the schema:\n${lines.join("\n")}`);
  }
  return result.data;
}
