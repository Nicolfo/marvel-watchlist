import raw from "@data/summaries.json";
import { describe, expect, it } from "vitest";
import { getGraph } from "../graph/catalog";
import { isReleased } from "../graph/engine";
import { hasSummary, readingMinutes, summaryFor, SUMMARY_COUNT } from "./catalog";
import { summaryFileSchema } from "./schema";

const graph = getGraph();
const parsed = summaryFileSchema.parse(raw);

/**
 * Released titles deliberately left unsummarised. Writing one of these up from
 * a trailer and a synopsis would produce exactly the confident, wrong text this
 * feature must not have, so they wait for someone who has actually watched
 * them. Listing them here means an *undeclared* gap still fails the suite.
 */
const PENDING = ["spider-man-brand-new-day", "wonder-man"];

/**
 * A four-minute one-shot is fully covered in a paragraph; a film or a
 * multi-season series is not. The floor scales so neither is judged by the
 * other's standard.
 */
function minimumWords(kind: string): number {
  return kind === "one-shot" || kind === "short" ? 60 : 120;
}

describe("summaries dataset", () => {
  it("matches the schema", () => {
    // `parse` above throws on a violation; this asserts the shape the app then
    // relies on without a runtime check of its own.
    expect(parsed.schemaVersion).toBe(1);
    expect(Object.keys(parsed.items).length).toBeGreaterThan(0);
  });

  it("only summarises titles that exist in the graph", () => {
    for (const id of Object.keys(parsed.items)) {
      expect(graph.byId.get(id), `unknown title "${id}"`).toBeDefined();
    }
  });

  it("never summarises something nobody can have watched yet", () => {
    for (const id of Object.keys(parsed.items)) {
      const title = graph.byId.get(id)!;
      expect(isReleased(title), `"${id}" is unreleased`).toBe(true);
    }
  });

  it("covers every released title except the ones declared pending", () => {
    const missing = graph.titles
      .filter((title) => isReleased(title) && !hasSummary(title.id))
      .map((title) => title.id)
      .sort();
    expect(missing).toEqual([...PENDING].sort());
  });

  it("writes summaries long enough to actually skip a title on", () => {
    for (const [id, entry] of Object.entries(parsed.items)) {
      const words = entry.paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
      expect(words, `"${id}" is only ${words} words`).toBeGreaterThanOrEqual(
        minimumWords(graph.byId.get(id)!.kind),
      );
    }
  });
});

describe("summaryFor", () => {
  it("returns the entry for a known title", () => {
    const entry = summaryFor("iron-man");
    expect(entry?.paragraphs.length).toBeGreaterThan(0);
    expect(readingMinutes(entry!)).toBeGreaterThanOrEqual(1);
  });

  it("returns undefined rather than throwing for anything else", () => {
    expect(summaryFor("not-a-title")).toBeUndefined();
    expect(hasSummary("not-a-title")).toBe(false);
    // Unreleased titles are a normal miss, not an error.
    expect(hasSummary("avengers-secret-wars")).toBe(false);
  });

  it("counts what it holds", () => {
    expect(SUMMARY_COUNT).toBe(Object.keys(parsed.items).length);
  });
});
