/**
 * Emits the dataset as Neo4j Cypher: `npm run graph:export:cypher > graph.cypher`
 *
 * The app does not need a graph database (see docs/adr-001-storage.md), but the
 * dataset *is* a graph, so this exporter exists for anyone who wants to explore
 * it in Neo4j, or as a migration path if the edge set ever outgrows Postgres.
 */
import { loadGraphData } from "./load-graph";

const data = loadGraphData();
const q = (value: string) => `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

const lines: string[] = [
  `// Marvel watch-order graph, dataset ${data.dataVersion} (${data.updatedAt})`,
  `// Source: ${data.source.name} by ${data.source.author} - ${data.source.url}`,
  "",
  "CREATE CONSTRAINT title_id IF NOT EXISTS FOR (t:Title) REQUIRE t.id IS UNIQUE;",
  "",
  "MATCH (t:Title) DETACH DELETE t;",
  "",
];

for (const title of data.titles) {
  const props = [
    `id: ${q(title.id)}`,
    `title: ${q(title.title)}`,
    `year: ${title.year}`,
    `releaseDate: ${title.releaseDate ? q(title.releaseDate) : "null"}`,
    `kind: ${q(title.kind)}`,
    `phase: ${q(title.phase)}`,
    `saga: ${q(title.saga)}`,
  ];
  if (title.seasons !== undefined) props.push(`seasons: ${title.seasons}`);
  if (title.runtimeMinutes !== undefined) props.push(`runtimeMinutes: ${title.runtimeMinutes}`);
  if (title.note !== undefined) props.push(`note: ${q(title.note)}`);
  lines.push(`CREATE (:Title {${props.join(", ")}});`);
}

lines.push("");

for (const edge of data.edges) {
  const relType = `${edge.type.toUpperCase()}_WATCH`;
  lines.push(
    `MATCH (a:Title {id: ${q(edge.from)}}), (b:Title {id: ${q(edge.to)}}) ` +
      `CREATE (a)-[:${relType} {provisional: ${edge.provisional ?? false}}]->(b);`,
  );
}

lines.push(
  "",
  "// Everything you still need to watch before <id>, transitively:",
  "// MATCH (p:Title)-[:MUST_WATCH|SHOULD_WATCH*]->(t:Title {id: 'avengers-endgame'})",
  "// RETURN DISTINCT p.title ORDER BY p.releaseDate;",
  "",
);

process.stdout.write(lines.join("\n"));
