import { describe, expect, it } from "vitest";
import { graphDataSchema, checkIntegrity, findCycles } from "./schema";
import raw from "@data/marvel-graph.json";
import { getGraph, graphData } from "./catalog";
import {
  buildGraph,
  computeProgress,
  directPrerequisites,
  edgeMatches,
  isReady,
  missingPrerequisites,
  nextUp,
  prerequisitesFor,
  readyToWatch,
  releaseOrder,
  suggestedOrder,
  unlockedBy,
} from "./engine";

describe("dataset", () => {
  it("matches the schema", () => {
    const result = graphDataSchema.safeParse(raw);
    expect(result.error?.issues ?? []).toEqual([]);
    expect(result.success).toBe(true);
  });

  it("has no integrity errors", () => {
    const errors = checkIntegrity(graphData).filter((issue) => issue.level === "error");
    expect(errors).toEqual([]);
  });

  it("is acyclic", () => {
    expect(findCycles(graphData)).toEqual([]);
  });

  it("rejects a split show that cannot be read as one show", () => {
    const season = (id: string, show: string, n: number) => ({
      ...graphData.titles[0],
      id,
      title: id,
      show,
      season: n,
    });
    const messages = checkIntegrity({
      ...graphData,
      titles: [
        ...graphData.titles,
        season("demo-season-1", "demo", 1),
        season("demo-season-3", "demo", 3),
        season("clash-season-1", "iron-man", 1),
        { ...graphData.titles[0], id: "half", title: "Half", show: "half-show" },
      ],
    })
      .filter((issue) => issue.level === "error")
      .map((issue) => issue.message);
    expect(messages).toContain(`"demo" seasons must be numbered 1 to 2 without gaps`);
    expect(messages).toContain(`"demo-season-3" needs a must edge from "demo-season-1"`);
    expect(messages).toContain(`show id "iron-man" is also a title id`);
    expect(messages).toContain(`"half" must set both "show" and "season", or neither`);
  });
});

describe("suggestedOrder", () => {
  const graph = getGraph();

  it("includes every title exactly once", () => {
    const order = suggestedOrder(graph);
    expect(order).toHaveLength(graph.titles.length);
    expect(new Set(order.map((t) => t.id)).size).toBe(graph.titles.length);
  });

  it("places every prerequisite before its dependant", () => {
    const order = suggestedOrder(graph, "could");
    const index = new Map(order.map((t, i) => [t.id, i]));
    for (const edge of graphData.edges) {
      expect(index.get(edge.from)!).toBeLessThan(index.get(edge.to)!);
    }
  });

  it("opens on Iron Man and keeps the finale late", () => {
    const order = suggestedOrder(graph, "could");
    const index = new Map(order.map((t, i) => [t.id, i]));
    expect(order[0].id).toBe("iron-man");
    expect(index.get("avengers-doomsday")!).toBeLessThan(index.get("avengers-secret-wars")!);
  });

  it("keeps non-MCU side material out of the opening stretch", () => {
    // The 1992 X-Men cartoon is the oldest title in the set; without an
    // orderGroup it would lead the whole list on release date alone.
    const order = suggestedOrder(graph, "could");
    const index = new Map(order.map((t, i) => [t.id, i]));
    expect(index.get("x-men-the-animated-series")!).toBeGreaterThan(index.get("iron-man")!);
    // The Fox films used to be two bundled entries; they are six real titles
    // now, and every one of them still has to stay out of the MCU spine.
    for (const id of ["x-men", "x2-x-men-united", "x-men-days-of-future-past", "deadpool", "logan", "deadpool-2"]) {
      expect(index.get(id), id).toBeGreaterThan(index.get("avengers-endgame")!);
    }
  });

  it.each(["must", "should", "could"] as const)(
    "starts Luke Cage before Iron Fist at %s strictness",
    (level) => {
      const ids = suggestedOrder(graph, level).map((title) => title.id);
      expect(ids.indexOf("luke-cage-season-1")).toBeLessThan(ids.indexOf("iron-fist-season-1"));
      // A later-season crossover must not become a prerequisite for starting
      // Luke Cage. Release-date tie-breaking can order these entry points.
      expect(
        prerequisitesFor(graph, "luke-cage-season-1", new Set(), level).map((step) => step.title.id),
      ).not.toContain("iron-fist-season-1");
    },
  );

  it.each(["must", "should", "could"] as const)(
    "interleaves the Defenders Saga by season in release order at %s strictness",
    (level) => {
      const ids = suggestedOrder(graph, level).map((title) => title.id);
      const saga = graph.titles
        .filter((title) => title.phase === "Netflix")
        .sort((a, b) => a.releaseDate!.localeCompare(b.releaseDate!))
        .map((title) => title.id);
      expect(saga).toContain("the-defenders");
      expect(saga.length).toBeGreaterThan(10);
      const placed = ids.filter((id) => saga.includes(id));
      expect(placed).toEqual(saga);
      // The case that made the split necessary: one Daredevil entry could
      // not sit on both sides of The Defenders.
      expect(ids.indexOf("daredevil-season-2")).toBeLessThan(ids.indexOf("the-defenders"));
      expect(ids.indexOf("the-defenders")).toBeLessThan(ids.indexOf("daredevil-season-3"));
    },
  );

  it.each(["must", "should", "could"] as const)(
    "keeps Agents of S.H.I.E.L.D. in season order around the films at %s strictness",
    (level) => {
      const ids = suggestedOrder(graph, level).map((title) => title.id);
      const seasons = [1, 2, 3, 4, 5, 6, 7].map((n) => ids.indexOf(`agents-of-shield-season-${n}`));
      expect(seasons.every((at) => at >= 0)).toBe(true);
      expect([...seasons].sort((a, b) => a - b)).toEqual(seasons);
      // Season three opens on the world Age of Ultron left behind, and season
      // seven needs Agent Carter, so neither can drift ahead of them.
      expect(seasons[2]).toBeGreaterThan(ids.indexOf("avengers-age-of-ultron"));
      expect(seasons[2]).toBeGreaterThan(ids.indexOf("guardians-of-the-galaxy"));
      if (level === "could") {
        // The crossover films land inside seasons one and two. A completionist
        // watches the films first rather than be spoiled by the episodes after.
        expect(seasons[0]).toBeGreaterThan(ids.indexOf("captain-america-the-winter-soldier"));
        expect(seasons[1]).toBeGreaterThan(ids.indexOf("avengers-age-of-ultron"));
        expect(seasons[6]).toBeGreaterThan(ids.indexOf("agent-carter"));
      } else {
        // Otherwise each season sits at its premiere, ahead of the film that
        // crosses over with it, and the note says where to pause.
        expect(seasons[0]).toBeLessThan(ids.indexOf("captain-america-the-winter-soldier"));
        expect(seasons[1]).toBeLessThan(ids.indexOf("avengers-age-of-ultron"));
      }
    },
  );

  it.each(["must", "should", "could"] as const)(
    "places legacy films before the Avengers finale at %s strictness",
    (level) => {
      const ids = suggestedOrder(graph, level).map((title) => title.id);
      const doomsday = ids.indexOf("avengers-doomsday");
      expect(ids[0]).toBe("iron-man");
      for (const title of graph.titles.filter((title) => title.phase === "Fox / Legacy")) {
        expect(ids.indexOf(title.id), title.id).toBeLessThan(doomsday);
        expect(ids.indexOf(title.id), title.id).toBeGreaterThan(ids.indexOf("avengers-endgame"));
      }
      expect(ids.indexOf("deadpool-and-wolverine")).toBeLessThan(doomsday);
      expect(doomsday).toBeLessThan(ids.indexOf("avengers-secret-wars"));
      // Sorting groups must continue to yield to selected story dependencies.
      for (const edge of graphData.edges.filter((edge) => edgeMatches(edge.type, level))) {
        expect(ids.indexOf(edge.from), `${edge.from} -> ${edge.to}`).toBeLessThan(ids.indexOf(edge.to));
      }
    },
  );

  it("breaks ties by order group, then release date, then title", () => {
    // With no edges every title is ready at once, so the emitted order is
    // exactly the tie-break rule.
    const synthetic = buildGraph({
      ...graphData,
      edges: [],
      titles: [
        { ...graphData.titles[0], id: "side", title: "Side", releaseDate: "1990-01-01", orderGroup: 1 },
        { ...graphData.titles[0], id: "undated", title: "Undated", releaseDate: null },
        { ...graphData.titles[0], id: "late", title: "Late", releaseDate: "2020-01-01" },
        { ...graphData.titles[0], id: "early", title: "Early", releaseDate: "2010-01-01" },
      ],
    });
    expect(suggestedOrder(synthetic, "could").map((t) => t.id)).toEqual([
      "early",
      "late",
      "undated", // undated sorts last within its group...
      "side", // ...but a higher order group sorts after all of it.
    ]);
  });

  it("respects strictness: a 'could' edge does not constrain a 'must' ordering", () => {
    const mustOrder = suggestedOrder(graph, "must");
    const index = new Map(mustOrder.map((t, i) => [t.id, i]));
    for (const edge of graphData.edges.filter((e) => e.type === "must")) {
      expect(index.get(edge.from)!).toBeLessThan(index.get(edge.to)!);
    }
  });
});

describe("prerequisites", () => {
  const graph = getGraph();

  it("walks the chain transitively", () => {
    const ids = prerequisitesFor(graph, "avengers-endgame", new Set(), "must").map(
      (step) => step.title.id,
    );
    expect(ids).toContain("avengers-infinity-war");
    expect(ids).toContain("captain-america-civil-war");
    // Four levels up: Endgame <- Infinity War <- Civil War <- Winter Soldier
    // <- The First Avenger. The Avengers used to stand here and no longer
    // qualifies: the chart draws Age of Ultron -> Civil War as "should", so at
    // must-only strictness the chain up the Avengers branch stops before it.
    expect(ids).toContain("captain-america-the-first-avenger");
  });

  it("marks direct prerequisites", () => {
    const steps = prerequisitesFor(graph, "avengers-endgame", new Set(), "must");
    const infinityWar = steps.find((s) => s.title.id === "avengers-infinity-war");
    const firstAvenger = steps.find((s) => s.title.id === "captain-america-the-first-avenger");
    expect(infinityWar?.direct).toBe(true);
    expect(firstAvenger?.direct).toBe(false);
  });

  it("stops walking past titles you have already watched", () => {
    // Endgame's only must-prerequisite is Infinity War, so ticking Infinity War
    // off must collapse the whole chain behind it rather than just one step.
    // This used to run on Secret Wars and Doomsday, which stopped being a deep
    // chain once Endgame -> Doomsday was corrected to "could".
    const cold = missingPrerequisites(graph, "avengers-endgame", new Set(), "must");
    expect(cold.length).toBeGreaterThan(3);
    expect(cold.map((s) => s.title.id)).toContain("captain-america-the-first-avenger");

    const warm = missingPrerequisites(
      graph,
      "avengers-endgame",
      new Set(["avengers-infinity-war"]),
      "must",
    );
    expect(warm).toEqual([]);
  });

  it("keeps a prerequisite that is still reachable by another branch", () => {
    // Civil War reaches The First Avenger through the Winter Soldier *and*
    // through Age of Ultron -> The Avengers, so watching one branch is not
    // enough. This used to run on Vol. 3 and the first Guardians, whose second
    // branch went through the Holiday Special, an arrow the chart draws green.
    const missing = missingPrerequisites(
      graph,
      "captain-america-civil-war",
      new Set(["captain-america-the-winter-soldier"]),
      "should",
    ).map((s) => s.title.id);
    expect(missing).toContain("captain-america-the-first-avenger");
  });

  it("returns prerequisites in suggested order", () => {
    const steps = prerequisitesFor(graph, "avengers-endgame", new Set(), "must");
    const order = suggestedOrder(graph, "must");
    const index = new Map(order.map((t, i) => [t.id, i]));
    const positions = steps.map((s) => index.get(s.title.id)!);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("a title with no incoming edges is immediately ready", () => {
    expect(isReady(graph, "iron-man", new Set(), "could")).toBe(true);
    expect(isReady(graph, "avengers-endgame", new Set(), "must")).toBe(false);
  });

  it("becomes ready once the missing list is watched", () => {
    const watched = new Set(
      missingPrerequisites(graph, "wandavision", new Set(), "must").map((s) => s.title.id),
    );
    expect(isReady(graph, "wandavision", watched, "must")).toBe(true);
  });

  it("reports what a title unlocks", () => {
    const unlocked = unlockedBy(graph, "wandavision").map((e) => e.to);
    expect(unlocked).toContain("agatha-all-along");
    expect(directPrerequisites(graph, "agatha-all-along").map((e) => e.from)).toEqual([
      "wandavision",
    ]);
  });
});

describe("releaseOrder", () => {
  const graph = getGraph();

  it("lists every title by premiere date, ignoring order groups and dependencies", () => {
    const order = releaseOrder(graph);
    expect(order).toHaveLength(graph.titles.length);
    const dates = order.map((title) => title.releaseDate ?? "9999-99-99");
    expect([...dates].sort()).toEqual(dates);
    // What the reader asked for: the Fox films at their real dates, not in a
    // block before the finale.
    const ids = order.map((title) => title.id);
    expect(ids[0]).toBe("x-men-the-animated-series");
    expect(ids.indexOf("x-men")).toBeLessThan(ids.indexOf("iron-man"));
    expect(ids.indexOf("logan")).toBeLessThan(ids.indexOf("the-defenders"));
    expect(ids.at(-1)).toBe("vision-quest"); // undated sorts last
  });

  it("drives Ready and Next up without dropping prerequisites", () => {
    expect(nextUp(graph, new Set(), "must", "release")?.id).toBe("x-men-the-animated-series");
    const ready = readyToWatch(graph, new Set(), "must", "release").map((title) => title.id);
    expect(ready).toContain("x-men");
    expect(ready).not.toContain("x2-x-men-united");
  });
});

describe("readyToWatch", () => {
  const graph = getGraph();

  it("offers entry points when nothing is watched", () => {
    const ready = readyToWatch(graph, new Set(), "must").map((t) => t.id);
    expect(ready).toContain("iron-man");
    expect(ready).not.toContain("avengers-endgame");
  });

  it("grows as prerequisites get ticked off", () => {
    const before = readyToWatch(graph, new Set(), "must").map((t) => t.id);
    const after = readyToWatch(graph, new Set(["iron-man"]), "must").map((t) => t.id);
    expect(after).toContain("iron-man-2");
    expect(before).not.toContain("iron-man-2");
  });
});

describe("computeProgress", () => {
  it("counts overall and per-phase progress", () => {
    const graph = getGraph();
    const progress = computeProgress(graph, new Set(["iron-man", "iron-man-2"]));
    expect(progress.total).toBe(graph.titles.length);
    expect(progress.watched).toBe(2);
    expect(progress.byPhase["Phase One"].watched).toBe(2);
    expect(progress.percent).toBeGreaterThan(0);
  });

  it("handles an empty watchlist", () => {
    const progress = computeProgress(getGraph(), new Set());
    expect(progress.watched).toBe(0);
    expect(progress.percent).toBe(0);
  });
});

describe("buildGraph", () => {
  it("indexes edges in both directions", () => {
    const graph = buildGraph(graphData);
    expect(graph.byId.get("loki")?.title).toBe("Loki");
    expect(graph.incoming.get("iron-man")).toEqual([]);
    expect(graph.outgoing.get("iron-man")!.length).toBeGreaterThan(0);
  });
});
