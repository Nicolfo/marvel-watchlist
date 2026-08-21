/**
 * Gatekeeper for the dictionaries. Run it after editing anything under
 * src/i18n/dictionaries:
 *
 *   npm run i18n:validate
 *
 * It runs as a prebuild step and in CI. What it catches, in the order it
 * matters:
 *
 * 1. A placeholder that a translation dropped, renamed or invented. This is the
 *    one that actually breaks a page: `{count}` typo'd as `{cont}` renders the
 *    literal text "{cont}" to a reader, and a `{link}` slot that a translator
 *    removed silently deletes the link from the sentence.
 * 2. Keys English has that a locale does not, reported as coverage, not as an
 *    error, because English is merged underneath every locale and a partial
 *    translation is a normal, shippable state.
 * 3. Keys a locale has that English does not, excluding the plural forms a
 *    language legitimately needs more of than English (Russian's `.few`,
 *    Arabic's `.two`), because those are the point, not a mistake.
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_LOCALE, LOCALES } from "../src/i18n/config";

const DIR = resolve(process.cwd(), "src/i18n/dictionaries");

/** Every CLDR plural category, so `key.few` is recognised as a form of `key`. */
const PLURAL_SUFFIXES = ["zero", "one", "two", "few", "many", "other"];

type Dict = Record<string, string>;

function read(code: string): Dict {
  return JSON.parse(readFileSync(resolve(DIR, `${code}.json`), "utf8")) as Dict;
}

function placeholders(value: string): Set<string> {
  return new Set([...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!));
}

/** `detail.catchUp.one` → `detail.catchUp`; anything else is returned as-is. */
function baseKey(key: string): string {
  const dot = key.lastIndexOf(".");
  if (dot === -1) return key;
  return PLURAL_SUFFIXES.includes(key.slice(dot + 1)) ? key.slice(0, dot) : key;
}

function main() {
  const english = read(DEFAULT_LOCALE);
  const englishKeys = new Set(Object.keys(english));
  const englishBases = new Map<string, Set<string>>();
  for (const [key, value] of Object.entries(english)) {
    const base = baseKey(key);
    const existing = englishBases.get(base);
    if (existing) for (const name of placeholders(value)) existing.add(name);
    else englishBases.set(base, placeholders(value));
  }

  const errors: string[] = [];
  const coverage: string[] = [];

  // A dictionary on disk that no locale declares is dead weight nobody will
  // ever see; a locale declared with no dictionary is a crash at build time.
  const onDisk = new Set(
    readdirSync(DIR)
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.replace(/\.json$/, "")),
  );
  for (const locale of LOCALES) {
    if (!onDisk.has(locale.code)) {
      errors.push(`locale "${locale.code}" is declared in config.ts but has no dictionary file`);
    }
  }
  for (const code of onDisk) {
    if (!LOCALES.some((locale) => locale.code === code)) {
      errors.push(`dictionaries/${code}.json is not declared in config.ts, so nothing loads it`);
    }
  }

  for (const locale of LOCALES) {
    if (!onDisk.has(locale.code)) continue;
    const dict = read(locale.code);
    const keys = Object.keys(dict);

    for (const [key, value] of Object.entries(dict)) {
      const base = baseKey(key);
      const expected = englishBases.get(base);

      if (!expected) {
        errors.push(`${locale.code}: key "${key}" does not exist in ${DEFAULT_LOCALE}.json`);
        continue;
      }

      for (const name of placeholders(value)) {
        if (!expected.has(name)) {
          errors.push(
            `${locale.code}: "${key}" uses {${name}}, which "${base}" does not have in ${DEFAULT_LOCALE}.json`,
          );
        }
      }

      if (typeof value !== "string" || value.trim().length === 0) {
        errors.push(`${locale.code}: "${key}" is empty`);
      }
    }

    if (locale.code !== DEFAULT_LOCALE) {
      // Measured over English's keys, not the locale's own. Russian carries
      // more plural forms than English has, and counting its keys would report
      // it as more than 100% translated.
      const done = new Set<string>();
      for (const key of keys) {
        if (dict[key] === english[key]) continue;
        const base = baseKey(key);
        for (const englishKey of englishKeys) {
          if (baseKey(englishKey) === base) done.add(englishKey);
        }
      }
      const percent = Math.round((done.size / englishKeys.size) * 100);
      coverage.push(
        `  ${locale.code.padEnd(8)} ${String(percent).padStart(3)}%  ` +
          `(${done.size}/${englishKeys.size} English strings covered)`,
      );
    }
  }

  for (const error of errors) console.error(`error:   ${error}`);
  console.log(`Translation coverage:\n${coverage.join("\n")}`);

  if (errors.length > 0) {
    console.error(`\n${errors.length} error(s) in ${DIR}`);
    process.exit(1);
  }

  console.log(
    `\nok: ${LOCALES.length} locales, ${englishKeys.size} keys, ` +
      `${LOCALES.filter((locale) => locale.rtl).length} right-to-left`,
  );
}

main();
