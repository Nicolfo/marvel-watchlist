import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TitleDetail } from "@/components/title-detail";
import { JsonLd } from "@/components/json-ld";
import { graphData, getGraph } from "@/lib/graph/catalog";
import { directPrerequisites } from "@/lib/graph/engine";
import { imdbUrl } from "@/lib/streaming";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import type { Title } from "@/lib/graph/schema";

/** The catalog is fixed at build time, so every detail page is prerendered. */
export function generateStaticParams() {
  return graphData.titles.map((title) => ({ id: title.id }));
}

export const dynamicParams = false;

function describe(title: Title): string {
  const prerequisites = directPrerequisites(getGraph(), title.id).length;
  return prerequisites === 0
    ? `${title.title} (${title.year}) needs nothing before it, a valid entry point into the Marvel Cinematic Universe. See what watching it unlocks.`
    : `What to watch before ${title.title} (${title.year}), in order, and what it unlocks. ${prerequisites} title${prerequisites > 1 ? "s" : ""} lead directly into it.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const title = getGraph().byId.get(id);
  if (!title) return { title: "Unknown title" };

  const description = describe(title);
  const path = `/title/${title.id}`;

  return {
    title: `${title.title} (${title.year}): what to watch first`,
    description,
    // Without this every title page would inherit the site-wide canonical of
    // "/" and Google would treat all 86 as duplicates of the home page.
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      siteName: SITE_NAME,
      title: `${title.title} (${title.year})`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title.title} (${title.year})`,
      description,
    },
  };
}

export default async function TitlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const graph = getGraph();
  const title = graph.byId.get(id);
  if (!title) notFound();

  const isSeries = title.kind === "series" || title.kind === "animation";

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": isSeries ? "TVSeries" : "Movie",
          name: title.title,
          url: absoluteUrl(`/title/${title.id}`),
          datePublished: title.releaseDate ?? undefined,
          // Links the entry to its IMDb record, which is how a search engine
          // reconciles "Daredevil" here with "Daredevil" everywhere else.
          sameAs: title.imdbId ? imdbUrl(title) : undefined,
          numberOfSeasons: isSeries ? title.seasons : undefined,
        }}
      />
      {/* The synopsis is fetched by the client from /api/artwork/[id]/meta
          rather than awaited here: resolving it on the server would need a TMDB
          key at request time, which would make all 86 of these dynamic. */}
      <TitleDetail id={id} />
    </>
  );
}
