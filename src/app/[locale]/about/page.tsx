import type { Metadata } from "next";
import { AboutBody } from "@/components/about-body";
import { getDictionary } from "@/i18n/dictionary";
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

export default function AboutPage() {
  return <AboutBody />;
}
