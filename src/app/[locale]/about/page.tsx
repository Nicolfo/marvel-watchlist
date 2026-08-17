import type { Metadata } from "next";
import { AboutBody } from "@/components/about-body";
import { getDictionary } from "@/i18n/dictionary";
import { summaryCount } from "@/lib/summaries/catalog";
import { translate } from "@/i18n/translate";
import { alternatesFor } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);

  return {
    title: translate(dictionary, locale, "meta.about.title"),
    description: translate(dictionary, locale, "meta.about.description"),
    alternates: alternatesFor("/about", locale),
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // The union of this language's summaries and English's: the fallback means a
  // reader can read all of them, so reporting only the translated count would
  // understate what is actually in front of them.
  return <AboutBody summaryCount={await summaryCount(locale)} />;
}
