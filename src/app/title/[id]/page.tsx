import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TitleDetail } from "@/components/title-detail";
import { resolveArtwork } from "@/lib/artwork-server";
import { getGraph } from "@/lib/graph/catalog";

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
  // Resolved here so the synopsis renders in the HTML, and so the TMDB
  // credential stays on the server. Cached, so this is a no-op after the first
  // view of a title.
  const art = await resolveArtwork(id);
  return <TitleDetail id={id} overview={art?.overview} />;
}
