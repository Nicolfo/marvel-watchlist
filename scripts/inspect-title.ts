/**
 * One title's arrows, for checking the dataset against the source chart:
 *
 *   npm run graph:inspect avengers-endgame
 *   npm run graph:inspect "civil war"
 *
 * Direct arrows only, in and out, never the transitive walk. That is
 * deliberate: the chart draws exactly the direct ones, so a box in the image
 * and the output here should list the same arrows, and anything transitive
 * would be noise you cannot compare against.
 *
 * Each arrow prints the colour it is drawn in rather than only its id, because
 * that is the thing you are actually comparing. The chart merges arrows of the
 * same colour into one arrowhead, so the question a box answers is "which
 * colours arrive here", not "how many arrows".
 *
 * `npm run graph:validate` proves the dataset is well formed. It cannot tell
 * you an arrow is the wrong strength, since every value is well formed. This
 * is the tool for that half.
 */
import { buildGraph, directPrerequisites, unlockedBy } from "../src/lib/graph/engine";
import type { Edge, EdgeType, Title } from "../src/lib/graph/schema";
import { loadGraphData } from "./load-graph";

/** What the arrow looks like on the chart, which is what you are comparing. */
const COLOUR: Record<EdgeType, string> = { must: "red", should: "blue", could: "green" };

const data = loadGraphData();
const graph = buildGraph(data);
const query = process.argv.slice(2).join(" ").trim();

if (!query) {
  console.error("usage: npm run graph:inspect <title id or part of a name>");
  process.exit(1);
}

function find(q: string): Title[] {
  const exact = graph.byId.get(q);
  if (exact) return [exact];
  const needle = q.toLowerCase();
  return graph.titles.filter(
    (t) => t.id.includes(needle) || t.title.toLowerCase().includes(needle),
  );
}

const matches = find(query);
if (matches.length === 0) {
  console.error(`no title matches "${query}"`);
  process.exit(1);
}
if (matches.length > 1) {
  console.error(`"${query}" matches ${matches.length} titles:\n`);
  for (const t of matches) console.error(`  ${t.id.padEnd(40)} ${t.title}`);
  process.exit(1);
}

const title = matches[0]!;
const label = (t: Title) => `${t.title} (${t.year})`;

/** `must (red)`, padded so the ids below it line up. */
function strength(edge: Edge): string {
  const flags = [edge.provisional ? "dashed" : null].filter(Boolean).join(", ");
  return `${edge.type} (${COLOUR[edge.type]}${flags ? `, ${flags}` : ""})`.padEnd(22);
}

function show(heading: string, edges: Edge[], otherId: (e: Edge) => string) {
  console.log(`\n${heading}`);
  if (edges.length === 0) {
    console.log("  nothing");
    return;
  }
  // Strongest first, so a box with one red and three greens reads at a glance.
  const rank: Record<EdgeType, number> = { must: 0, should: 1, could: 2 };
  for (const edge of [...edges].sort((a, b) => rank[a.type] - rank[b.type])) {
    const other = graph.byId.get(otherId(edge))!;
    console.log(`  ${strength(edge)} ${otherId(edge).padEnd(38)} ${label(other)}`);
    if (edge.note) console.log(`  ${" ".repeat(61)} ${edge.note}`);
  }
}

const incoming = directPrerequisites(graph, title.id);
const outgoing = unlockedBy(graph, title.id);

console.log(`${label(title)}  [${title.kind}]`);
console.log(`${title.id}   ${title.phase} / ${title.saga}`);
if (title.note) console.log(`note: ${title.note}`);

show(`Arrows into it (${incoming.length}):`, incoming, (e) => e.from);
show(`Arrows out of it (${outgoing.length}):`, outgoing, (e) => e.to);

// The one line to check against the image. Same-colour arrows merge into a
// single arrowhead there, so the count of arrows in and the count of
// arrowheads on the chart will not match, but the set of colours must.
const colours = [...new Set(incoming.map((e) => COLOUR[e.type]))].sort();
console.log(
  colours.length
    ? `\nOn the chart, this box takes ${colours.join(" and ")} arrowheads and no others.`
    : "\nOn the chart, no arrow points into this box.",
);
// An arrow carrying a note is one somebody added by hand, so it is not on the
// chart and must not be looked for there.
const ours = [...incoming, ...outgoing].filter((e) => e.note).length;
if (ours > 0) {
  console.log(
    `${ours} of the arrows above ${ours === 1 ? "carries a note and is" : "carry a note and are"}` +
      " not the chart's. Read it before looking for them there.",
  );
}
console.log(`Chart: ${data.source.url}`);
