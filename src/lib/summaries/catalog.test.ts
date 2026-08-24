import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getGraph } from "../graph/catalog";
import { isReleased } from "../graph/engine";
import { DEFAULT_LOCALE, isLocale, LOCALE_CODES } from "@/i18n/config";
import { resolveSummary, summarisedIds, summaryCount, SUMMARY_LOCALES } from "./catalog";
import { countWords, readingMinutes, summaryFileSchema, type SummaryFile } from "./schema";

const graph = getGraph();
const DIR = resolve(process.cwd(), "data/summaries");

function read(code: string): SummaryFile {
  return summaryFileSchema.parse(JSON.parse(readFileSync(resolve(DIR, `${code}.json`), "utf8")));
}

const files = readdirSync(DIR)
  .filter((name) => name.endsWith(".json"))
  .map((name) => name.replace(/\.json$/, ""));

/**
 * Released titles deliberately left unsummarised in English. See the note in
 * scripts/validate-summaries.ts. Listing them means an *undeclared* gap fails.
 */
const PENDING = ["spider-man-brand-new-day", "wonder-man", "punisher-special-presentation"];

describe("summaries dataset", () => {
  it("has a file for every registered language and vice versa", () => {
    expect(files.sort()).toEqual([...SUMMARY_LOCALES].sort());
  });

  it("always has the English base, since everything falls back to it", () => {
    expect(files).toContain(DEFAULT_LOCALE);
  });

  it("names a language it actually declares, matching its filename", () => {
    for (const code of files) {
      expect(read(code).locale, `${code}.json`).toBe(code);
      expect(isLocale(code), `${code} is not a site locale`).toBe(true);
    }
  });

  it("only summarises titles that exist and have been released", () => {
    for (const code of files) {
      for (const id of Object.keys(read(code).items)) {
        const title = graph.byId.get(id);
        expect(title, `${code}: unknown title "${id}"`).toBeDefined();
        expect(isReleased(title!), `${code}: "${id}" is unreleased`).toBe(true);
      }
    }
  });

  it("covers every released title in English except the ones declared pending", () => {
    const english = read(DEFAULT_LOCALE);
    const missing = graph.titles
      .filter((title) => isReleased(title) && !(title.id in english.items))
      .map((title) => title.id)
      .sort();
    expect(missing).toEqual([...PENDING].sort());
  });

  it("keeps every translation level with the English base", () => {
    // Every language shipped so far is a complete translation of the base, so a
    // gap here is a title added to English and not yet translated, which the
    // resolver survives, falling back per title, but which somebody should fix.
    const english = Object.keys(read(DEFAULT_LOCALE).items).sort();
    for (const code of files.filter((name) => name !== DEFAULT_LOCALE)) {
      expect(Object.keys(read(code).items).sort(), `${code}.json`).toEqual(english);
    }
  });

  it("writes English summaries long enough to actually skip a title on", () => {
    for (const [id, entry] of Object.entries(read(DEFAULT_LOCALE).items)) {
      const kind = graph.byId.get(id)!.kind;
      const floor = kind === "one-shot" || kind === "short" ? 60 : 120;
      // Counted with Intl.Segmenter so a space-free script is measured, not
      // dismissed as a single word.
      const words = countWords(entry.paragraphs.join(" "), DEFAULT_LOCALE);
      expect(words, `"${id}" is only ${words} words`).toBeGreaterThanOrEqual(floor);
    }
  });

  it("does not let a translation lose a paragraph on the way over", () => {
    // Translations are held against their own original rather than the floor
    // above, because a word is not the same size in every language: a complete
    // Korean summary lands near 0.7x the English word count, a Turkish one near
    // 0.8x, and judging either by an English-calibrated floor flags finished
    // work. Half the original is far below anything density explains, and is
    // what a dropped paragraph actually looks like.
    const english = read(DEFAULT_LOCALE).items;
    for (const code of files.filter((name) => name !== DEFAULT_LOCALE)) {
      for (const [id, entry] of Object.entries(read(code).items)) {
        const original = countWords(english[id].paragraphs.join(" "), DEFAULT_LOCALE);
        const words = countWords(entry.paragraphs.join(" "), code);
        expect(words, `${code}: "${id}" is ${words} words against ${original} in English`).toBeGreaterThanOrEqual(
          original * 0.5,
        );
      }
    }
  });
});

describe("resolveSummary", () => {
  it("returns the translation when the language has one", async () => {
    const resolved = await resolveSummary("iron-man", "it");
    expect(resolved?.language).toBe("it");
    // Real Italian, not the English text sitting under an "it" label.
    expect(resolved?.entry.paragraphs[0]).toContain("Tony Stark");
    expect(resolved?.entry.paragraphs[0]).toContain("miliardario");
  });

  it("falls back to English per title, not per file", async () => {
    // A title a translation has not reached must still produce a readable
    // summary rather than an empty panel, which is the whole point of the
    // structure, and it stays true however far along a translation is. Italian
    // happens to be complete now, so this asserts the rule over whatever it has
    // not reached rather than over one hand-picked title.
    const italian = Object.keys(read("it").items);
    const untranslated = graph.titles.filter(
      (title) => isReleased(title) && !italian.includes(title.id) && !PENDING.includes(title.id),
    );

    for (const title of untranslated) {
      const resolved = await resolveSummary(title.id, "it");
      expect(resolved, `no fallback for ${title.id}`).toBeDefined();
      expect(resolved!.language, title.id).toBe(DEFAULT_LOCALE);
    }
  });

  it("reports the language it actually returned, so the page can tag it", async () => {
    // Without this the caller cannot know whether to mark the block lang="en"
    // dir="ltr" inside a right-to-left page, which is exactly the case that
    // matters for Persian and Arabic, so they are the ones checked here.
    expect((await resolveSummary("thor", "it"))!.language).toBe("it");
    expect((await resolveSummary("thor", "fa"))!.language).toBe("fa");
    expect((await resolveSummary("thor", "ar"))!.language).toBe("ar");
  });

  it("offers a summary file in every language the site offers", () => {
    // This used to be a fallback test, with Persian standing in for a site
    // language nobody had translated yet. Every one of them ships a file now,
    // so what is left to check is that it stays that way: a locale added to
    // i18n/config.ts without a summary file falls back to English silently,
    // and this is what makes that silence visible.
    expect(LOCALE_CODES.filter((code) => !SUMMARY_LOCALES.includes(code))).toEqual([]);
  });

  it("ignores a locale the site does not offer rather than throwing", async () => {
    const resolved = await resolveSummary("iron-man", "klingon");
    expect(resolved?.language).toBe(DEFAULT_LOCALE);
  });

  it("returns undefined only when nobody has written it in any language", async () => {
    expect(await resolveSummary("avengers-secret-wars", "it")).toBeUndefined();
    expect(await resolveSummary("wonder-man", "en")).toBeUndefined();
    expect(await resolveSummary("not-a-title", "en")).toBeUndefined();
  });
});

describe("summaryCount", () => {
  it("counts what a reader can actually read, not just the translated part", async () => {
    // A reader gets a summary either way, so the count is the union of the
    // language's own entries and English's, because a partial translation must not
    // report a number smaller than what is actually in front of the reader.
    const english = await summarisedIds(DEFAULT_LOCALE);
    expect(await summaryCount("it")).toBe(english.length);
    expect(await summaryCount("en")).toBe(english.length);
    // A language with nothing of its own still reports what English gives it.
    expect(await summaryCount("klingon")).toBe(english.length);
  });
});

describe("readingMinutes", () => {
  it("is at least a minute and scales with length", async () => {
    const short = { paragraphs: ["word ".repeat(50)] };
    const long = { paragraphs: ["word ".repeat(1200)] };
    expect(readingMinutes(short)).toBe(1);
    expect(readingMinutes(long)).toBeGreaterThan(readingMinutes(short));
  });

  it("measures a space-free script instead of calling it one word", () => {
    // Whitespace splitting reports this as a single word and so as a 1 min
    // read; Intl.Segmenter sees the actual words.
    const japanese = { paragraphs: ["彼は街を歩いて店に入り、友人と話してから家に帰った。".repeat(40)] };
    expect(countWords(japanese.paragraphs[0]!, "ja")).toBeGreaterThan(100);
    expect(readingMinutes(japanese, "ja")).toBeGreaterThan(1);
  });
});
