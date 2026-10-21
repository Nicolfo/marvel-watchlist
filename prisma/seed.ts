/**
 * Loads data/marvel-graph.json into Postgres: `npm run db:seed`
 *
 * Idempotent: upserts titles and replaces the edge set, so re-running it
 * after editing the JSON is the supported way to ship a data update.
 */
import { PrismaClient } from "@prisma/client";
import { loadGraphData } from "../scripts/load-graph";

const prisma = new PrismaClient();

async function main() {
  const data = loadGraphData();

  await prisma.dataset.upsert({
    where: { version: data.dataVersion },
    create: {
      version: data.dataVersion,
      updatedAt: new Date(data.updatedAt),
      sourceUrl: data.source.url,
    },
    update: { updatedAt: new Date(data.updatedAt), sourceUrl: data.source.url },
  });

  for (const title of data.titles) {
    const fields = {
      title: title.title,
      year: title.year,
      releaseDate: title.releaseDate ? new Date(title.releaseDate) : null,
      kind: title.kind,
      phase: title.phase,
      saga: title.saga,
      seasons: title.seasons ?? null,
      runtimeMinutes: title.runtimeMinutes ?? null,
      orderGroup: title.orderGroup ?? 0,
      note: title.note ?? null,
    };
    await prisma.title.upsert({
      where: { id: title.id },
      create: { id: title.id, ...fields },
      update: fields,
    });
  }

  // A show split into seasons is removed below, and its watch entries would go
  // with it (they cascade). Copy each one onto every season first, the same
  // expansion the browser watchlist applies in `migrate`.
  const seasons = new Map<string, string[]>();
  for (const title of data.titles) {
    if (!title.show) continue;
    seasons.set(title.show, [...(seasons.get(title.show) ?? []), title.id]);
  }
  for (const [show, ids] of seasons) {
    const entries = await prisma.watchEntry.findMany({ where: { titleId: show } });
    await prisma.watchEntry.createMany({
      data: entries.flatMap((entry: { userId: string; watchedAt: Date }) =>
        ids.map((titleId) => ({ userId: entry.userId, titleId, watchedAt: entry.watchedAt })),
      ),
      skipDuplicates: true,
    });
  }

  // Titles removed from the dataset should disappear rather than linger.
  const keep = data.titles.map((title) => title.id);
  await prisma.title.deleteMany({ where: { id: { notIn: keep } } });

  // Edges have no stable identity of their own, so replace them wholesale.
  await prisma.dependency.deleteMany({});
  await prisma.dependency.createMany({
    data: data.edges.map((edge) => ({
      fromId: edge.from,
      toId: edge.to,
      type: edge.type,
      provisional: edge.provisional ?? false,
      note: edge.note ?? null,
    })),
  });

  console.log(
    `seeded ${data.titles.length} titles and ${data.edges.length} dependencies ` +
      `(dataset ${data.dataVersion})`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
