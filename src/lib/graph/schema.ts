import { z } from "zod";

/**
 * The dataset schema. This is the single source of truth for the shape of
 * `data/marvel-graph.json` - the validation script, the Prisma seed, the
 * Cypher/SQL exporters and the app itself all derive from it.
 */

export const TITLE_KINDS = [
  "film",
  "series",
  "special",
  "short",
  "one-shot",
  "animation",
  "collection",
] as const;

export const EDGE_TYPES = ["must", "should", "could"] as const;

export type TitleKind = (typeof TITLE_KINDS)[number];
export type EdgeType = (typeof EDGE_TYPES)[number];

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO date (YYYY-MM-DD)");

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be a lowercase kebab-case slug");

export const titleSchema = z.object({
  id: slug,
  title: z.string().min(1),
  year: z.number().int().min(1930).max(2100),
  /** `null` means announced but undated. */
  releaseDate: isoDate.nullable(),
  kind: z.enum(TITLE_KINDS),
  phase: z.string().min(1),
  saga: z.string().min(1),
  seasons: z.number().int().positive().optional(),
  runtimeMinutes: z.number().int().positive().optional(),
  /**
   * Primary tie-break bucket for the suggested order; release date orders
   * titles within a bucket. Defaults to 0 (the MCU spine). Raise it for
   * side material - legacy Fox films, non-MCU animation - that would
   * otherwise lead the list purely by being old.
   */
  orderGroup: z.number().int().min(0).optional(),
  note: z.string().optional(),
});

export const edgeSchema = z.object({
  /** The prerequisite. */
  from: slug,
  /** The title that depends on it. */
  to: slug,
  type: z.enum(EDGE_TYPES),
  /**
   * Chart's dashed arrows: a prediction based on pre-release knowledge rather
   * than something anyone has actually watched yet.
   */
  provisional: z.boolean().optional(),
  note: z.string().optional(),
});

export const edgeTypeMetaSchema = z.object({
  id: z.enum(EDGE_TYPES),
  label: z.string(),
  description: z.string(),
  weight: z.number().int(),
});

export const graphDataSchema = z.object({
  $schema: z.string().optional(),
  schemaVersion: z.literal(1),
  dataVersion: z.string(),
  updatedAt: isoDate,
  source: z.object({
    name: z.string(),
    author: z.string(),
    url: z.url(),
    note: z.string(),
  }),
  edgeTypes: z.array(edgeTypeMetaSchema).length(3),
  titles: z.array(titleSchema).min(1),
  edges: z.array(edgeSchema),
});

export type Title = z.infer<typeof titleSchema>;
export type Edge = z.infer<typeof edgeSchema>;
export type EdgeTypeMeta = z.infer<typeof edgeTypeMetaSchema>;
export type GraphData = z.infer<typeof graphDataSchema>;

export type ValidationIssue = { level: "error" | "warning"; message: string };

/**
 * Structural checks that a per-field schema cannot express: unique ids,
 * dangling edge endpoints, duplicate/self edges and dependency cycles.
 */
export function checkIntegrity(data: GraphData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();

  for (const title of data.titles) {
    if (ids.has(title.id)) {
      issues.push({ level: "error", message: `duplicate title id "${title.id}"` });
    }
    ids.add(title.id);
    if (title.releaseDate && !title.releaseDate.startsWith(String(title.year))) {
      issues.push({
        level: "warning",
        message: `"${title.id}" has year ${title.year} but releaseDate ${title.releaseDate}`,
      });
    }
  }

  const seen = new Set<string>();
  for (const edge of data.edges) {
    const key = `${edge.from}->${edge.to}`;
    if (!ids.has(edge.from)) {
      issues.push({ level: "error", message: `edge ${key} references unknown title "${edge.from}"` });
    }
    if (!ids.has(edge.to)) {
      issues.push({ level: "error", message: `edge ${key} references unknown title "${edge.to}"` });
    }
    if (edge.from === edge.to) {
      issues.push({ level: "error", message: `edge ${key} is a self-loop` });
    }
    if (seen.has(key)) {
      issues.push({ level: "error", message: `duplicate edge ${key}` });
    }
    seen.add(key);
  }

  for (const cycle of findCycles(data)) {
    issues.push({ level: "error", message: `dependency cycle: ${cycle.join(" -> ")}` });
  }

  const connected = new Set<string>();
  for (const edge of data.edges) {
    connected.add(edge.from);
    connected.add(edge.to);
  }
  for (const id of ids) {
    if (!connected.has(id)) {
      issues.push({
        level: "warning",
        message: `"${id}" has no dependencies in either direction (fully standalone)`,
      });
    }
  }

  return issues;
}

/** Depth-first cycle detection; returns each cycle as a list of ids. */
export function findCycles(data: GraphData): string[][] {
  const out = new Map<string, string[]>();
  for (const edge of data.edges) {
    const list = out.get(edge.from);
    if (list) list.push(edge.to);
    else out.set(edge.from, [edge.to]);
  }

  const cycles: string[][] = [];
  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];

  const visit = (id: string) => {
    const current = state.get(id);
    if (current === "done") return;
    if (current === "visiting") {
      const start = stack.indexOf(id);
      cycles.push([...stack.slice(start), id]);
      return;
    }
    state.set(id, "visiting");
    stack.push(id);
    for (const next of out.get(id) ?? []) visit(next);
    stack.pop();
    state.set(id, "done");
  };

  for (const title of data.titles) visit(title.id);
  return cycles;
}
