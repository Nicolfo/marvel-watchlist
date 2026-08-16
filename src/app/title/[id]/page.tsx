import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TitleDetail } from "@/components/title-detail";
import { graphData, getGraph } from "@/lib/graph/catalog";

/** The catalog is fixed at build time, so every detail page is prerendered. */
export function generateStaticParams() {
  return graphData.titles.map((title) => ({ id: title.id }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const title = getGraph().byId.get(id);
  if (!title) return { title: "Unknown title" };
  return {
    title: title.title,
    description: `What to watch before ${title.title} (${title.year}), and what it unlocks.`,
  };
}

export default async function TitlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getGraph().byId.has(id)) notFound();
  // The synopsis is fetched by the client from /api/artwork/[id]/meta rather
  // than awaited here: resolving it on the server would need a TMDB key at
  // request time, which would make this page - and all 86 of them - dynamic.
  return <TitleDetail id={id} />;
}
