/**
 * Gatekeeper for the spoiler summaries. Run it after editing
 * data/summaries.json:
 *
 *   npm run summaries:validate
 *
 * It runs as a prebuild step and in CI alongside the graph validator, so a
 * summary keyed to a title id that does not exist - or one written for a film
 * nobody has seen yet - cannot reach a release.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isReleased } from "../src/lib/graph/engine";
import { summaryFileSchema } from "../src/lib/summaries/schema";
import { loadGraphData } from "./load-graph";

export const SUMMARIES_PATH = resolve(process.cwd(), "data/summaries.json");

function main() {
  const graph = loadGraphData();
  const raw = JSON.parse(readFileSync(SUMMARIES_PATH, "utf8"));
  const parsed = summaryFileSchema.safeParse(raw);

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      console.error(`error:   ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    console.error(`\n${parsed.error.issues.length} error(s) in ${SUMMARIES_PATH}`);
    process.exit(1);
  }

  const titles = new Map(graph.titles.map((title) => [title.id, title]));
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [id, entry] of Object.entries(parsed.data.items)) {
    const title = titles.get(id);
    if (!title) {
      errors.push(`summary "${id}" does not match any title in the graph`);
      continue;
    }
    // A title nobody can have watched has no plot to summarise, so text under
    // its id is either a guess or a leak. Neither belongs in the dataset.
    if (!isReleased(title)) {
      errors.push(`"${id}" is not released yet, so it must not have a summary`);
    }
    // A four-minute one-shot is fully covered in a paragraph; a film or a
    // multi-season series is not. The floor scales so neither is judged by the
    // other's standard.
    const floor = title.kind === "one-shot" || title.kind === "short" ? 60 : 120;
    const words = entry.paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
    if (words < floor) {
      warnings.push(`"${id}" is only ${words} words - too thin to skip the title on`);
    }
  }

  const missing = graph.titles.filter(
    (title) => isReleased(title) && !(title.id in parsed.data.items),
  );

  for (const warning of warnings) console.warn(`warning: ${warning}`);
  for (const error of errors) console.error(`error:   ${error}`);

  if (errors.length > 0) {
    console.error(`\n${errors.length} error(s) in ${SUMMARIES_PATH}`);
    process.exit(1);
  }

  const covered = Object.keys(parsed.data.items).length;
  console.log(
    `ok: ${covered}/${graph.titles.length} titles summarised, ` +
      `${missing.length} released title(s) still to write, ${warnings.length} warning(s)`,
  );
}

main();
