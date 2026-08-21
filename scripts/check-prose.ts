/**
 * Gatekeeper for one house-style rule: no dash used as a dramatic pause.
 *
 *   npm run prose:check
 *
 * It runs as a prebuild step and in CI, over the prose a reader actually sees:
 * the summaries, the UI dictionaries, the README and the docs.
 *
 * The rule is narrow on purpose. An em dash, an en dash, or a spaced hyphen
 * standing in for one ("the catalog itself - title names - stays in English")
 * is the tell this repository does not want, and it is trivial to reintroduce
 * because every writing tool suggests it. What replaces it depends on the
 * sentence: a comma, a colon, a semicolon, brackets, or a full stop.
 *
 * Hyphens inside words (`spoiler-free`, `pt-BR`, `X-23`) and ranges
 * (`120-250`) are untouched, because those are not the pause. Markdown list
 * markers and table rules are skipped for the same reason.
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve, relative } from "node:path";

const ROOT = process.cwd();

/** Every dash a writing tool will happily insert for you. */
const DASHES = ["—", "–", "―", "‒"];

function filesToCheck(): string[] {
  const out = ["README.md"];
  for (const dir of ["docs", "data/summaries", "src/i18n/dictionaries"]) {
    for (const name of readdirSync(resolve(ROOT, dir))) {
      if (name.endsWith(".md") || name.endsWith(".json")) out.push(`${dir}/${name}`);
    }
  }
  return out;
}

/**
 * A line of Markdown that is structure rather than prose: a list item, a table
 * rule, a front-matter fence. Its leading hyphen is not a pause.
 */
function isMarkdownFurniture(line: string): boolean {
  return /^\s*[-*+]\s/.test(line) || /^\s*\|?[\s|:-]+\|?\s*$/.test(line);
}

function main() {
  const problems: string[] = [];

  for (const file of filesToCheck()) {
    const lines = readFileSync(resolve(ROOT, file), "utf8").split("\n");
    lines.forEach((line, i) => {
      const where = `${file}:${i + 1}`;
      for (const dash of DASHES) {
        if (line.includes(dash)) problems.push(`${where}: ${dash} used as a pause`);
      }
      if (isMarkdownFurniture(line)) return;
      // " - " between two words is the same device with a plainer character.
      if (/\S - \S/.test(line)) problems.push(`${where}: " - " used as a pause`);
    });
  }

  for (const problem of problems) console.error(`error:   ${problem}`);

  if (problems.length > 0) {
    console.error(
      `\n${problems.length} dash(es) used as a pause. Use a comma, colon, semicolon,` +
        ` brackets or a full stop instead - whichever the sentence actually wants.`,
    );
    process.exit(1);
  }

  console.log(`ok: ${filesToCheck().length} prose files, no dash used as a pause`);
}

main();
