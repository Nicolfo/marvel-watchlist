/**
 * Emits the dataset as plain Postgres INSERTs: `npm run graph:export:sql`
 *
 * Equivalent to `npm run db:seed` but dependency-free, for DBAs who would
 * rather run a .sql file than a Node script.
 */
import { loadGraphData } from "./load-graph";

const data = loadGraphData();
const lit = (value: string | null) =>
  value === null ? "NULL" : `'${value.replace(/'/g, "''")}'`;
const num = (value: number | undefined) => (value === undefined ? "NULL" : String(value));

const lines: string[] = [
  `-- Marvel watch-order graph, dataset ${data.dataVersion} (${data.updatedAt})`,
  `-- Source: ${data.source.name} by ${data.source.author}, ${data.source.url}`,
  "BEGIN;",
  "",
  `INSERT INTO "Dataset" (version, "updatedAt", "sourceUrl") VALUES (${lit(
    data.dataVersion,
  )}, ${lit(data.updatedAt)}, ${lit(data.source.url)})`,
  `  ON CONFLICT (version) DO UPDATE SET "updatedAt" = EXCLUDED."updatedAt";`,
  "",
];

for (const title of data.titles) {
  lines.push(
    `INSERT INTO "Title" (id, title, year, "releaseDate", kind, phase, saga, seasons, "runtimeMinutes", note) VALUES (` +
      [
        lit(title.id),
        lit(title.title),
        String(title.year),
        title.releaseDate ? `${lit(title.releaseDate)}::date` : "NULL",
        lit(title.kind),
        lit(title.phase),
        lit(title.saga),
        num(title.seasons),
        num(title.runtimeMinutes),
        lit(title.note ?? null),
      ].join(", ") +
      `) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, year = EXCLUDED.year, ` +
      `"releaseDate" = EXCLUDED."releaseDate", kind = EXCLUDED.kind, phase = EXCLUDED.phase, ` +
      `saga = EXCLUDED.saga, seasons = EXCLUDED.seasons, "runtimeMinutes" = EXCLUDED."runtimeMinutes", ` +
      `note = EXCLUDED.note;`,
  );
}

lines.push("", `DELETE FROM "Dependency";`, "");

for (const edge of data.edges) {
  lines.push(
    `INSERT INTO "Dependency" ("fromId", "toId", type, provisional, note) VALUES (` +
      [
        lit(edge.from),
        lit(edge.to),
        lit(edge.type),
        String(edge.provisional ?? false),
        lit(edge.note ?? null),
      ].join(", ") +
      `);`,
  );
}

lines.push(
  "",
  "COMMIT;",
  "",
  "-- Transitive prerequisites without a graph database:",
  "-- WITH RECURSIVE prereq(id) AS (",
  "--   SELECT \"fromId\" FROM \"Dependency\" WHERE \"toId\" = 'avengers-endgame'",
  "--   UNION",
  "--   SELECT d.\"fromId\" FROM \"Dependency\" d JOIN prereq p ON d.\"toId\" = p.id",
  "-- ) SELECT t.* FROM \"Title\" t JOIN prereq USING (id) ORDER BY t.\"releaseDate\";",
  "",
);

process.stdout.write(lines.join("\n"));
