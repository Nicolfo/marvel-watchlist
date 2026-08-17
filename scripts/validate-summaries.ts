/**
 * Gatekeeper for the spoiler summaries. Run it after editing anything under
 * data/summaries/:
 *
 *   npm run summaries:validate
 *
 * It runs as a prebuild step and in CI. English is the base and is held to a
 * completeness standard; every other language is an overlay that may be as
 * partial as its translator has got, because resolution falls back per title -
 * so a thin translation is reported as coverage, never as an error.
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { isReleased } from "../src/lib/graph/engine";
import { countWords, summaryFileSchema } from "../src/lib/summaries/schema";
import { DEFAULT_LOCALE, isLocale } from "../src/i18n/config";
import { SUMMARY_LOCALES } from "../src/lib/summaries/catalog";
import { loadGraphData } from "./load-graph";
import type { Title } from "../src/lib/graph/schema";

export const SUMMARIES_DIR = resolve(process.cwd(), "data/summaries");

/**
 * Released titles deliberately left unsummarised in English. Writing one of
 * these up from a trailer would produce exactly the confident, wrong text this
 * feature must not have, so they wait for someone who has actually watched
 * them. Listing them here means an *undeclared* gap still fails the build.
 */
const PENDING = new Set(["spider-man-brand-new-day", "wonder-man"]);

/**
 * A four-minute one-shot is fully covered in a paragraph; a film or a
 * multi-season series is not. The floor scales so neither is judged by the
 * other's standard.
 */
function minimumWords(kind: Title["kind"]): number {
  return kind === "one-shot" || kind === "short" ? 60 : 120;
}

function main() {
  const graph = loadGraphData();
  const titles = new Map(graph.titles.map((title) => [title.id, title]));

  const files = readdirSync(SUMMARIES_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.replace(/\.json$/, ""));

  const errors: string[] = [];
  const warnings: string[] = [];
  const coverage: string[] = [];

  // A file nobody loads is dead weight; a loader with no file is a build crash.
  for (const code of files) {
    if (!SUMMARY_LOCALES.includes(code)) {
      errors.push(`data/summaries/${code}.json is not registered in src/lib/summaries/catalog.ts`);
    }
    if (!isLocale(code)) {
      errors.push(`data/summaries/${code}.json is not a language the site offers`);
    }
  }
  for (const code of SUMMARY_LOCALES) {
    if (!files.includes(code)) {
      errors.push(`catalog.ts loads "${code}" but data/summaries/${code}.json does not exist`);
    }
  }
  if (!files.includes(DEFAULT_LOCALE)) {
    errors.push(`data/summaries/${DEFAULT_LOCALE}.json is missing - it is the fallback for every other language`);
  }

  const englishIds = new Set<string>();

  for (const code of files) {
    const path = resolve(SUMMARIES_DIR, `${code}.json`);
    const parsed = summaryFileSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(`${code}: ${issue.path.join(".") || "(root)"}: ${issue.message}`);
      }
      continue;
    }

    // A pt.json that declares itself Spanish would quietly serve the wrong
    // language to every Portuguese reader, and nothing else would notice.
    if (parsed.data.locale !== code) {
      errors.push(`${code}.json declares "locale": "${parsed.data.locale}" - they must match`);
    }

    for (const [id, entry] of Object.entries(parsed.data.items)) {
      const title = titles.get(id);
      if (!title) {
        errors.push(`${code}: "${id}" does not match any title in the graph`);
        continue;
      }
      // A title nobody can have watched has no plot to summarise, so text under
      // its id is either a guess or a leak. Neither belongs in the dataset.
      if (!isReleased(title)) {
        errors.push(`${code}: "${id}" is not released yet, so it must not have a summary`);
      }
      if (code !== DEFAULT_LOCALE && !englishIds.has(id) && files.includes(DEFAULT_LOCALE)) {
        // Not fatal - a translated summary is still readable - but it means the
        // base is missing one, which is where a reader in any other language
        // will land.
        warnings.push(`${code}: "${id}" is translated but has no English original`);
      }

      // Counted with Intl.Segmenter, so Chinese and Japanese - which put no
      // spaces between words - are measured rather than dismissed as one word.
      const words = countWords(entry.paragraphs.join(" "), code);
      if (words < minimumWords(title.kind)) {
        warnings.push(`${code}: "${id}" is only ${words} words - too thin to skip the title on`);
      }
    }

    const ids = Object.keys(parsed.data.items);
    if (code === DEFAULT_LOCALE) {
      for (const id of ids) englishIds.add(id);

      const missing = graph.titles
        .filter((title) => isReleased(title) && !englishIds.has(title.id) && !PENDING.has(title.id))
        .map((title) => title.id);
      for (const id of missing) {
        errors.push(`${DEFAULT_LOCALE}: "${id}" is released but has no summary and is not declared pending`);
      }
    }

    const releasedCount = graph.titles.filter((title) => isReleased(title)).length;
    const percent = Math.round((ids.length / releasedCount) * 100);
    coverage.push(
      `  ${code.padEnd(8)} ${String(percent).padStart(3)}%  (${ids.length}/${releasedCount} released titles)` +
        (code === DEFAULT_LOCALE ? "  ← base, everything else falls back to it" : ""),
    );
  }

  for (const warning of warnings) console.warn(`warning: ${warning}`);
  for (const error of errors) console.error(`error:   ${error}`);

  console.log(`Summary coverage:\n${coverage.sort().join("\n")}`);

  if (errors.length > 0) {
    console.error(`\n${errors.length} error(s) in ${SUMMARIES_DIR}`);
    process.exit(1);
  }

  console.log(
    `\nok: ${files.length} language(s), ${englishIds.size} titles summarised in ${DEFAULT_LOCALE}, ` +
      `${PENDING.size} declared pending, ${warnings.length} warning(s)`,
  );
}

main();
