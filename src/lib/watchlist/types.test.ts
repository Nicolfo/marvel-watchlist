import { describe, expect, it } from "vitest";
import { getGraph, LEGACY_SHOW_IDS } from "@/lib/graph/catalog";
import { migrate } from "./types";

describe("migrate", () => {
  it("expands a show that was split into seasons into every season", () => {
    const state = migrate({
      entries: [
        { titleId: "iron-man", watchedAt: "2024-01-01T00:00:00.000Z" },
        { titleId: "daredevil", watchedAt: "2024-02-01T00:00:00.000Z" },
      ],
      strictness: "must",
    });
    expect(state.entries).toEqual([
      { titleId: "iron-man", watchedAt: "2024-01-01T00:00:00.000Z" },
      { titleId: "daredevil-season-1", watchedAt: "2024-02-01T00:00:00.000Z" },
      { titleId: "daredevil-season-2", watchedAt: "2024-02-01T00:00:00.000Z" },
      { titleId: "daredevil-season-3", watchedAt: "2024-02-01T00:00:00.000Z" },
    ]);
    expect(state.strictness).toBe("must");
  });

  it("does not duplicate a season that is already listed", () => {
    const state = migrate({
      entries: [
        { titleId: "agents-of-shield-season-1", watchedAt: "2024-01-01T00:00:00.000Z" },
        { titleId: "agents-of-shield", watchedAt: "2024-03-01T00:00:00.000Z" },
      ],
    });
    const ids = state.entries.map((entry) => entry.titleId);
    expect(ids).toHaveLength(7);
    expect(new Set(ids).size).toBe(7);
    // The earlier, explicit entry keeps its own timestamp.
    expect(state.entries[0]).toEqual({
      titleId: "agents-of-shield-season-1",
      watchedAt: "2024-01-01T00:00:00.000Z",
    });
  });

  it("is idempotent, so loading a migrated list changes nothing", () => {
    const once = migrate({ entries: [{ titleId: "the-punisher", watchedAt: "2024-01-01T00:00:00.000Z" }] });
    expect(migrate(once).entries).toEqual(once.entries);
  });

  it("maps every retired show id to current titles only", () => {
    const graph = getGraph();
    expect([...LEGACY_SHOW_IDS.keys()].sort()).toEqual(
      ["agents-of-shield", "daredevil", "iron-fist", "jessica-jones", "luke-cage", "the-punisher"],
    );
    for (const [show, seasons] of LEGACY_SHOW_IDS) {
      expect(graph.byId.has(show), show).toBe(false);
      for (const id of seasons) expect(graph.byId.has(id), id).toBe(true);
    }
  });
});
