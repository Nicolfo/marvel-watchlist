import { describe, expect, it } from "vitest";
import { currentTitlePath } from "./proxy";

describe("currentTitlePath", () => {
  it("sends a split show to its first season, with or without a locale", () => {
    expect(currentTitlePath("/it/title/daredevil")).toBe("/it/title/daredevil-season-1");
    expect(currentTitlePath("/title/agents-of-shield")).toBe("/title/agents-of-shield-season-1");
    expect(currentTitlePath("/en/title/the-punisher/")).toBe("/en/title/the-punisher-season-1");
  });

  it("leaves current titles and other pages alone", () => {
    expect(currentTitlePath("/en/title/the-defenders")).toBe("/en/title/the-defenders");
    expect(currentTitlePath("/en/title/daredevil-season-2")).toBe("/en/title/daredevil-season-2");
    expect(currentTitlePath("/en/watchlist")).toBe("/en/watchlist");
  });
});
