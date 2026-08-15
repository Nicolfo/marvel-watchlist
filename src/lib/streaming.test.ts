import { describe, expect, it } from "vitest";
import { getGraph, graphData, phaseOrder } from "./graph/catalog";
import type { Title } from "./graph/schema";
import { hasExactImdbLink, imdbUrl, providersFor, whereToWatchUrl } from "./streaming";
import { generatedPalette, initialsFor } from "./artwork";
import { mediaTypeFor, pickBestMatch, searchUrl, type TmdbResult } from "../../scripts/tmdb";

const graph = getGraph();
const title = (id: string): Title => graph.byId.get(id)!;

describe("imdbUrl", () => {
  it("links straight to the title when we know its id", () => {
    expect(imdbUrl(title("iron-man"))).toBe("https://www.imdb.com/title/tt0371746/");
    expect(hasExactImdbLink(title("iron-man"))).toBe(true);
  });

  it("falls back to a search that still lands somewhere useful", () => {
    const withoutId = title("vision-quest");
    expect(hasExactImdbLink(withoutId)).toBe(false);
    const url = imdbUrl(withoutId);
    expect(url).toContain("imdb.com/find/");
    expect(url).toContain("VisionQuest");
  });

  it("searches the right section for series vs films", () => {
    expect(imdbUrl(title("vision-quest"))).toContain("ttype=tv");
    expect(imdbUrl(title("avengers-doomsday"))).toContain("ttype=ft");
  });

  it("only ever stores well-formed IMDb ids", () => {
    for (const entry of graphData.titles) {
      if (entry.imdbId) expect(entry.imdbId).toMatch(/^tt\d{7,9}$/);
    }
  });

  it("never reuses an IMDb id across two titles", () => {
    const ids = graphData.titles.map((t) => t.imdbId).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("streaming providers", () => {
  it("resolves known platform tags", () => {
    expect(providersFor(title("iron-man")).map((p) => p.name)).toContain("Disney+");
  });

  it("ignores unknown tags rather than rendering a dead chip", () => {
    expect(providersFor({ ...title("iron-man"), providers: ["nope"] })).toEqual([]);
  });

  it("always has a region-aware fallback", () => {
    expect(whereToWatchUrl(title("loki"))).toContain("justwatch.com");
  });

  it("url-encodes titles with punctuation", () => {
    expect(whereToWatchUrl(title("thunderbolts"))).not.toContain(" ");
    expect(imdbUrl(title("she-hulk-attorney-at-law"))).not.toContain(" ");
  });
});

describe("generated artwork", () => {
  it("is deterministic per title", () => {
    expect(generatedPalette(title("loki"))).toEqual(generatedPalette(title("loki")));
  });

  it("differs between titles", () => {
    expect(generatedPalette(title("loki"))).not.toEqual(generatedPalette(title("hawkeye")));
  });

  it("builds readable initials, skipping filler words", () => {
    expect(initialsFor(title("avengers-endgame"))).toBe("AE");
    expect(initialsFor(title("the-avengers"))).toBe("A");
    expect(initialsFor(title("guardians-of-the-galaxy"))).toBe("GG");
  });

  it("never returns an empty mark", () => {
    for (const entry of graphData.titles) {
      expect(initialsFor(entry).length).toBeGreaterThan(0);
    }
  });
});

describe("TMDB matching", () => {
  const iron = title("iron-man");

  it("queries the right endpoint per kind", () => {
    expect(mediaTypeFor(iron)).toBe("movie");
    expect(mediaTypeFor(title("loki"))).toBe("tv");
    expect(mediaTypeFor(title("what-if"))).toBe("tv");
    expect(searchUrl(iron, "KEY")).toContain("/search/movie?");
    expect(searchUrl(iron, "KEY")).toContain("primary_release_year=2008");
  });

  it("prefers an exact name and year match", () => {
    const results: TmdbResult[] = [
      { id: 1, title: "Iron Man", release_date: "1951-01-01", popularity: 90 },
      { id: 2, title: "Iron Man", release_date: "2008-05-02", popularity: 40 },
    ];
    expect(pickBestMatch(iron, results)?.id).toBe(2);
  });

  it("refuses to match an unrelated title however popular", () => {
    const results: TmdbResult[] = [
      { id: 9, title: "Some Other Film", release_date: "2008-01-01", popularity: 5000 },
    ];
    expect(pickBestMatch(iron, results)).toBeNull();
  });

  it("returns null on no results rather than guessing", () => {
    expect(pickBestMatch(iron, [])).toBeNull();
  });

  it("handles tv-shaped payloads that use name/first_air_date", () => {
    const loki = title("loki");
    const results: TmdbResult[] = [{ id: 7, name: "Loki", first_air_date: "2021-06-09" }];
    expect(pickBestMatch(loki, results)?.id).toBe(7);
  });
});

describe("phaseOrder", () => {
  it("leads with the MCU spine, not the oldest side material", () => {
    const phases = phaseOrder();
    expect(phases[0]).toBe("Phase One");
    expect(phases.indexOf("Phase Two")).toBeLessThan(phases.indexOf("Phase Three"));
    expect(phases.indexOf("Animation")).toBeGreaterThan(phases.indexOf("Phase One"));
  });

  it("lists every phase present in the data exactly once", () => {
    const phases = phaseOrder();
    expect(new Set(phases).size).toBe(phases.length);
    expect(new Set(phases)).toEqual(new Set(graphData.titles.map((t) => t.phase)));
  });
});
