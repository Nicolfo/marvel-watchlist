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
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, relative } from "node:path";

const ROOT = process.cwd();

/** Every dash a writing tool will happily insert for you. */
const DASHES = ["—", "–", "―", "‒"];

/**
 * The prose this tree actually contains.
 *
 * Every location is optional, because `prebuild` runs this inside the Docker
 * image build as well, and that build context deliberately has no
 * documentation in it: `.dockerignore` drops `docs` and every `*.md` but the
 * README, none of which the server needs to serve the site. Insisting on a
 * directory nobody shipped failed the image build over prose that was not in
 * it, which is how this check first broke CI.
 *
 * Tolerating an absence is not the same as tolerating a no-op, so `main`
 * refuses to pass on an empty list, and the summary line names the count. The
 * `build` job in CI runs against the full checkout and is what actually holds
 * the documentation to the rule.
 */
function filesToCheck(): { files: string[]; skipped: string[] } {
  const files: string[] = [];
  const skipped: string[] = [];

  for (const path of ["README.md", "docs", "data/summaries", "src/i18n/dictionaries"]) {
    if (!existsSync(resolve(ROOT, path))) {
      skipped.push(path);
      continue;
    }
    if (path.endsWith(".md")) {
      files.push(path);
      continue;
    }
    for (const name of readdirSync(resolve(ROOT, path))) {
      if (name.endsWith(".md") || name.endsWith(".json")) files.push(`${path}/${name}`);
    }
  }

  return { files, skipped };
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

  const { files, skipped } = filesToCheck();
  if (files.length === 0) {
    console.error(`error:   no prose found under ${ROOT}; is this the repository root?`);
    process.exit(1);
  }
  for (const skip of skipped) console.log(`note: ${skip} is not in this tree, so it is not checked`);

  for (const file of files) {
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
      `\n${problems.length} dash(es) used as a pause. Use whichever the sentence` +
        ` actually wants: a comma, a colon, a semicolon, brackets or a full stop.`,
    );
    process.exit(1);
  }

  console.log(`ok: ${files.length} prose file(s), no dash used as a pause`);
}

main();
