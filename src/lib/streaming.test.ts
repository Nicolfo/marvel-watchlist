import { describe, expect, it } from "vitest";
import { getGraph, graphData, phaseOrder } from "./graph/catalog";
import type { Title } from "./graph/schema";
import { hasExactImdbLink, imdbUrl, providersFor, whereToWatchUrl } from "./streaming";
import { generatedPalette, initialsFor } from "./artwork";
import {
  detailsUrl,
  isTmdbImageUrl,
  mediaTypeFor,
  overviewUrl,
  pickBestMatch,
  redact,
  searchUrl,
  tmdbAuth,
  tmdbLanguage,
  type TmdbResult,
} from "./tmdb";
import { LOCALE_CODES } from "@/i18n/config";

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

  const v3 = tmdbAuth("KEY");

  it("queries the right endpoint per kind", () => {
    expect(mediaTypeFor(iron)).toBe("movie");
    expect(mediaTypeFor(title("loki"))).toBe("tv");
    expect(mediaTypeFor(title("what-if"))).toBe("tv");
    expect(searchUrl(iron, v3)).toContain("/search/movie?");
    expect(searchUrl(iron, v3)).toContain("primary_release_year=2008");
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

  it("matches a title TMDB files under another name, via tmdbQuery", () => {
    // "Agent Carter (one-shot)" is the right thing to show a reader, but TMDB
    // has it as "Marvel One-Shot: Agent Carter", and the parenthetical puts
    // the two names outside every substring rule the scorer has. Without the
    // override this loses the poster, the synopsis and the IMDb id together.
    const carter = title("agent-carter-one-shot");
    const results: TmdbResult[] = [
      { id: 3, title: "Marvel One-Shot: Agent Carter", release_date: "2013-09-08", popularity: 12 },
    ];
    expect(carter.tmdbQuery).toBe("Marvel One-Shot: Agent Carter");
    expect(pickBestMatch(carter, results)?.id).toBe(3);
    // URLSearchParams spells a space "+", so compare against what it builds
    // rather than against encodeURIComponent's "%20".
    expect(searchUrl(carter, v3)).toContain(new URLSearchParams({ query: carter.tmdbQuery! }).toString());

    // The sibling one-shots carry no override and must not need one: their
    // display title sits inside TMDB's, which the substring rule already
    // covers. If that stops being true the override is the fix, not a looser
    // scorer.
    const consultant = title("the-consultant");
    expect(consultant.tmdbQuery).toBeUndefined();
    expect(
      pickBestMatch(consultant, [
        { id: 4, title: "Marvel One-Shot: The Consultant", release_date: "2011-09-13", popularity: 8 },
      ])?.id,
    ).toBe(4);
  });

  it("still refuses a wrong film when an override points at one", () => {
    // The override changes what we ask for, not how strict we are about the
    // answer, so a careless one degrades to generated art rather than pairing
    // a title with someone else's poster and IMDb link.
    const carter = title("agent-carter-one-shot");
    expect(
      pickBestMatch(carter, [{ id: 5, title: "Captain America", release_date: "2013-01-01", popularity: 900 }]),
    ).toBeNull();
  });

  it("handles tv-shaped payloads that use name/first_air_date", () => {
    const loki = title("loki");
    const results: TmdbResult[] = [{ id: 7, name: "Loki", first_air_date: "2021-06-09" }];
    expect(pickBestMatch(loki, results)?.id).toBe(7);
  });
});

describe("tmdb credentials", () => {
  const iron = title("iron-man");
  const token = tmdbAuth("eyJhbGciOiJIUzI1NiJ9.token");
  const key = tmdbAuth("s3cret");

  it("keeps a v4 read access token out of the URL entirely", () => {
    expect(searchUrl(iron, token)).not.toContain("token");
    expect(detailsUrl(1726, "movie", token)).not.toContain("token");
    expect(token.headers.Authorization).toBe("Bearer eyJhbGciOiJIUzI1NiJ9.token");
  });

  it("falls back to the query parameter a v3 key requires", () => {
    expect(searchUrl(iron, key)).toContain("api_key=s3cret");
    expect(key.headers).toEqual({});
  });

  it("redacts the credential from anything loggable", () => {
    expect(redact(`404 for ${searchUrl(iron, key)}`, key)).not.toContain("s3cret");
    expect(redact("404 for /search/movie", token)).toBe("404 for /search/movie");
  });
});

describe("isTmdbImageUrl", () => {
  it("accepts the image CDN and nothing else", () => {
    expect(isTmdbImageUrl("https://image.tmdb.org/t/p/w500/abc.jpg")).toBe(true);
    expect(isTmdbImageUrl("https://evil.example/x.jpg")).toBe(false);
    // No open redirect via a lookalike host.
    expect(isTmdbImageUrl("https://image.tmdb.org.evil.example/t/p/x.jpg")).toBe(false);
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

describe("tmdbLanguage", () => {
  it("passes through the codes TMDB already understands", () => {
    expect(tmdbLanguage("fa")).toBe("fa");
    expect(tmdbLanguage("ja")).toBe("ja");
    expect(tmdbLanguage("pt-BR")).toBe("pt-BR");
  });

  it("maps zh-Hans, which is a script subtag TMDB does not know", () => {
    // Sending "zh-Hans" gets a silent English answer rather than an error, so
    // this mapping is the difference between a translated synopsis and not.
    expect(tmdbLanguage("zh-Hans")).toBe("zh-CN");
  });

  it("passes a region-qualified tag through, since TMDB uses the region", () => {
    expect(tmdbLanguage("en-GB")).toBe("en-GB");
    expect(tmdbLanguage("de-AT")).toBe("de-AT");
  });

  it("strips a script subtag, which TMDB does not understand", () => {
    expect(tmdbLanguage("zh-Hant")).toBe("zh");
    expect(tmdbLanguage("sr-Latn")).toBe("sr");
  });

  it("produces a plausible tag for every locale the site offers", () => {
    for (const code of LOCALE_CODES) {
      expect(tmdbLanguage(code), code).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
    }
  });
});

describe("overviewUrl", () => {
  it("asks TMDB for the language, and keeps a v3 key out of the path", () => {
    const auth = tmdbAuth("eyJhbGciOi.token");
    const url = overviewUrl(84958, "tv", auth, "fa");
    expect(url).toContain("/tv/84958");
    expect(url).toContain("language=fa");
    // A v4 token travels in a header, so it must not appear in the URL.
    expect(url).not.toContain("eyJhbGciOi");
  });

  it("hits the plain details endpoint, not external_ids", () => {
    // external_ids carries the IMDb id and no overview; asking it for a
    // translation would silently return nothing at all.
    const auth = tmdbAuth("eyJhbGciOi.token");
    expect(overviewUrl(1726, "movie", auth, "es")).not.toContain("external_ids");
    expect(detailsUrl(84958, "tv", auth)).toContain("external_ids");
  });
});
