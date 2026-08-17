import type { Metadata } from "next";
import { WatchlistManager } from "@/components/watchlist-manager";
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
    title: translate(dictionary, locale, "meta.watchlist.title"),
    description: translate(dictionary, locale, "meta.watchlist.description"),
    alternates: alternatesFor("/watchlist", locale),
  };
}

export default function WatchlistPage() {
  return <WatchlistManager />;
}
