import type { Edge, EdgeType, GraphData, Title } from "./schema";

/**
 * How strict the user wants to be about prerequisites. The chart's three arrow
 * colours are cumulative: "must" is the minimum viable path, "could" is the
 * completionist path.
 */
export type Strictness = "must" | "should" | "could";

const RANK: Record<EdgeType, number> = { must: 3, should: 2, could: 1 };

export function edgeMatches(type: EdgeType, level: Strictness): boolean {
  return RANK[type] >= RANK[level];
}

export interface Graph {
  data: GraphData;
  titles: Title[];
  byId: Map<string, Title>;
  /** prerequisites of a title (incoming edges) */
  incoming: Map<string, Edge[]>;
  /** titles unlocked by a title (outgoing edges) */
  outgoing: Map<string, Edge[]>;
}

export function buildGraph(data: GraphData): Graph {
  const byId = new Map<string, Title>();
  for (const title of data.titles) byId.set(title.id, title);

  const incoming = new Map<string, Edge[]>();
  const outgoing = new Map<string, Edge[]>();
  for (const title of data.titles) {
    incoming.set(title.id, []);
    outgoing.set(title.id, []);
  }
  for (const edge of data.edges) {
    incoming.get(edge.to)?.push(edge);
    outgoing.get(edge.from)?.push(edge);
  }

  return { data, titles: data.titles, byId, incoming, outgoing };
}

/**
 * Sort key used to break ties in the topological order: order group first,
 * then release date, then title. Undated titles sort last within their group.
 */
function orderKey(title: Title): string {
  return `${title.orderGroup ?? 0}|${title.releaseDate ?? "9999-99-99"}|${title.title}`;
}

/**
 * The suggested order: a topological sort of the dependency graph, with ties
 * broken by release date. Every title appears after everything that points
 * into it, so you can watch straight down the list and never be spoiled or
 * lost. Edges below `level` are ignored, which lets a "must only" viewer get a
 * shorter, looser ordering than a completionist.
 */
export function suggestedOrder(graph: Graph, level: Strictness = "could"): Title[] {
  const indegree = new Map<string, number>();
  const relevantOut = new Map<string, string[]>();

  for (const title of graph.titles) {
    indegree.set(title.id, 0);
    relevantOut.set(title.id, []);
  }
  for (const edge of graph.data.edges) {
    if (!edgeMatches(edge.type, level)) continue;
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
    relevantOut.get(edge.from)?.push(edge.to);
  }

  // Kahn's algorithm with a deterministic "earliest release first" tie-break.
  const ready = graph.titles
    .filter((t) => (indegree.get(t.id) ?? 0) === 0)
    .sort((a, b) => orderKey(a).localeCompare(orderKey(b)));

  const result: Title[] = [];
  while (ready.length > 0) {
    const next = ready.shift()!;
    result.push(next);
    for (const id of relevantOut.get(next.id) ?? []) {
      const remaining = (indegree.get(id) ?? 0) - 1;
      indegree.set(id, remaining);
      if (remaining === 0) {
        const title = graph.byId.get(id)!;
        // Insert in sorted position rather than re-sorting the whole array.
        const at = ready.findIndex((t) => orderKey(t).localeCompare(orderKey(title)) > 0);
        if (at === -1) ready.push(title);
        else ready.splice(at, 0, title);
      }
    }
  }

  // Defensive: a cycle would strand titles. Validation rejects cycles, but if
  // bad data ever ships we still want to render every title.
  if (result.length !== graph.titles.length) {
    const placed = new Set(result.map((t) => t.id));
    for (const title of graph.titles) if (!placed.has(title.id)) result.push(title);
  }

  return result;
}

export interface PrerequisiteStep {
  title: Title;
  /** The strongest edge type on the path that pulled this title in. */
  via: EdgeType;
  /** True when this is a direct prerequisite rather than a transitive one. */
  direct: boolean;
  watched: boolean;
}

/**
 * Every title you need to have watched before `id`, transitively, in suggested
 * order. Watched titles prune the traversal - their own prerequisites are
 * assumed satisfied, which is what makes the "what's left before I can watch
 * this" answer shrink as you tick things off.
 */
export function prerequisitesFor(
  graph: Graph,
  id: string,
  watched: ReadonlySet<string>,
  level: Strictness = "should",
): PrerequisiteStep[] {
  const found = new Map<string, { via: EdgeType; direct: boolean }>();
  const queue: Array<{ id: string; direct: boolean }> = [{ id, direct: true }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of graph.incoming.get(current.id) ?? []) {
      if (!edgeMatches(edge.type, level)) continue;
      const existing = found.get(edge.from);
      const via = existing && RANK[existing.via] > RANK[edge.type] ? existing.via : edge.type;
      const direct = (existing?.direct ?? false) || current.direct;
      const isNew = !existing;
      found.set(edge.from, { via, direct });
      // Already-watched titles are satisfied, so we don't walk past them.
      if (isNew && !watched.has(edge.from)) {
        queue.push({ id: edge.from, direct: false });
      }
    }
  }

  const order = suggestedOrder(graph, level);
  const position = new Map(order.map((t, i) => [t.id, i]));

  return [...found.entries()]
    .map(([titleId, meta]) => ({
      title: graph.byId.get(titleId)!,
      via: meta.via,
      direct: meta.direct,
      watched: watched.has(titleId),
    }))
    .sort((a, b) => (position.get(a.title.id) ?? 0) - (position.get(b.title.id) ?? 0));
}

/** Prerequisites that are still unwatched - the "you're missing these" list. */
export function missingPrerequisites(
  graph: Graph,
  id: string,
  watched: ReadonlySet<string>,
  level: Strictness = "should",
): PrerequisiteStep[] {
  return prerequisitesFor(graph, id, watched, level).filter((step) => !step.watched);
}

/** Direct prerequisites only, i.e. the arrows pointing straight into a title. */
export function directPrerequisites(graph: Graph, id: string): Edge[] {
  return [...(graph.incoming.get(id) ?? [])].sort((a, b) => RANK[b.type] - RANK[a.type]);
}

/** What watching this title opens up next. */
export function unlockedBy(graph: Graph, id: string): Edge[] {
  return [...(graph.outgoing.get(id) ?? [])].sort((a, b) => RANK[b.type] - RANK[a.type]);
}

export function isReady(
  graph: Graph,
  id: string,
  watched: ReadonlySet<string>,
  level: Strictness = "should",
): boolean {
  return missingPrerequisites(graph, id, watched, level).length === 0;
}

/** Titles you can start right now: unwatched, with every prerequisite met. */
export function readyToWatch(
  graph: Graph,
  watched: ReadonlySet<string>,
  level: Strictness = "should",
): Title[] {
  return suggestedOrder(graph, level).filter(
    (title) =>
      !watched.has(title.id) &&
      (graph.incoming.get(title.id) ?? [])
        .filter((edge) => edgeMatches(edge.type, level))
        .every((edge) => watched.has(edge.from)),
  );
}

/** The next unwatched title in suggested order, whatever its state. */
export function nextUp(
  graph: Graph,
  watched: ReadonlySet<string>,
  level: Strictness = "should",
): Title | null {
  return readyToWatch(graph, watched, level)[0] ?? null;
}

export interface Progress {
  total: number;
  watched: number;
  percent: number;
  byKind: Record<string, { total: number; watched: number }>;
  byPhase: Record<string, { total: number; watched: number }>;
}

export function computeProgress(graph: Graph, watched: ReadonlySet<string>): Progress {
  const byKind: Progress["byKind"] = {};
  const byPhase: Progress["byPhase"] = {};
  let watchedCount = 0;

  for (const title of graph.titles) {
    const done = watched.has(title.id);
    if (done) watchedCount += 1;
    byKind[title.kind] ??= { total: 0, watched: 0 };
    byKind[title.kind].total += 1;
    if (done) byKind[title.kind].watched += 1;
    byPhase[title.phase] ??= { total: 0, watched: 0 };
    byPhase[title.phase].total += 1;
    if (done) byPhase[title.phase].watched += 1;
  }

  return {
    total: graph.titles.length,
    watched: watchedCount,
    percent: graph.titles.length === 0 ? 0 : Math.round((watchedCount / graph.titles.length) * 100),
    byKind,
    byPhase,
  };
}

export function isReleased(title: Title, now: Date = new Date()): boolean {
  if (!title.releaseDate) return false;
  return title.releaseDate <= now.toISOString().slice(0, 10);
}
