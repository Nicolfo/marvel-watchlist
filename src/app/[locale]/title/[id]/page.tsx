import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TitleDetail } from "@/components/title-detail";
import { JsonLd } from "@/components/json-ld";
import { LOCALES } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionary";
import { translate, type Dictionary } from "@/i18n/translate";
import { graphData, getGraph } from "@/lib/graph/catalog";
import { directPrerequisites } from "@/lib/graph/engine";
import { summaryMetaFor } from "@/lib/summaries/catalog";
import { imdbUrl } from "@/lib/streaming";
import { absoluteUrl, alternatesFor, localeUrl, SITE_NAME } from "@/lib/site";
import type { Title } from "@/lib/graph/schema";

/**
 * The catalog and the language list are both fixed at build time, so every
 * detail page is prerendered in every language: 86 titles × 14 locales.
 */
export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    graphData.titles.map((title) => ({ locale: locale.code, id: title.id })),
  );
}

export const dynamicParams = false;

function describe(title: Title, dictionary: Dictionary, locale: string): string {
  const prerequisites = directPrerequisites(getGraph(), title.id).length;
  // The year is passed as a string on purpose. Everywhere else a number handed
  // to `translate` renders in the locale's own digits, which is right inside a
  // Persian sentence - but here it sits directly beside the untranslated
  // English title, and `og:title` writes it in Latin digits, so localising it
  // would leave the two tags disagreeing about the same film.
  const vars = { title: title.title, year: String(title.year), count: prerequisites };

  return prerequisites === 0
    ? translate(dictionary, locale, "meta.title.description.entry", vars)
    : translate(dictionary, locale, "meta.title.description.prereq", vars);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  const dictionary = await getDictionary(locale);
  const title = getGraph().byId.get(id);
  if (!title) return { title: translate(dictionary, locale, "meta.notFound.title") };

  const description = describe(title, dictionary, locale);
  const heading = translate(dictionary, locale, "meta.title.title", {
    title: title.title,
    year: String(title.year),
  });
  const short = `${title.title} (${title.year})`;

  return {
    title: heading,
    description,
    // Without this every title page would inherit the site-wide canonical and
    // Google would treat all 86 as duplicates of the home page - and now also
    // treat the fourteen languages of each as duplicates of one another.
    alternates: alternatesFor(`/title/${title.id}`, locale),
    openGraph: {
      type: "article",
      url: localeUrl(`/title/${title.id}`, locale),
      siteName: SITE_NAME,
      title: short,
      description,
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title: short,
      description,
    },
  };
}

export default async function TitlePage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const graph = getGraph();
  const title = graph.byId.get(id);
  if (!title) notFound();

  // Metadata only - which language the reader will get and how long it is.
  // The prose is fetched from /api/summary/[id] on reveal, because a prop would
  // be serialised into this page's flight payload and put the spoiler in the
  // page source. Falls back to English per title.
  const summary = await summaryMetaFor(id, locale);

  const isSeries = title.kind === "series" || title.kind === "animation";

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": isSeries ? "TVSeries" : "Movie",
          name: title.title,
          url: absoluteUrl(localeUrl(`/title/${title.id}`, locale)),
          datePublished: title.releaseDate ?? undefined,
          inLanguage: locale,
          // Links the entry to its IMDb record, which is how a search engine
          // reconciles "Daredevil" here with "Daredevil" everywhere else.
          sameAs: title.imdbId ? imdbUrl(title) : undefined,
          numberOfSeasons: isSeries ? title.seasons : undefined,
        }}
      />
      {/* The synopsis is fetched by the client from /api/artwork/[id]/meta
          rather than awaited here: resolving it on the server would need a TMDB
          key at request time, which would make all of these dynamic. */}
      <TitleDetail id={id} summary={summary} />
    </>
  );
}
