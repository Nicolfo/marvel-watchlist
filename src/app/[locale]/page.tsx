import { Explorer } from "@/components/explorer";
import { JsonLd } from "@/components/json-ld";
import { getDictionary } from "@/i18n/dictionary";
import { translate } from "@/i18n/translate";
import { getGraph, graphData } from "@/lib/graph/catalog";
import { suggestedOrder } from "@/lib/graph/engine";
import { absoluteUrl, localeUrl, SITE_NAME, SITE_URL } from "@/lib/site";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);

  // The real computed order, not the order titles happen to sit in the data
  // file, since the list below claims to be the suggested order.
  const order = suggestedOrder(getGraph(), "should");

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              // Per-language id, so fourteen translations are not advertised as
              // fourteen conflicting descriptions of one entity.
              "@id": `${SITE_URL}/${locale}/#website`,
              url: absoluteUrl(localeUrl("/", locale)),
              name: SITE_NAME,
              description: translate(dictionary, locale, "meta.home.description"),
              inLanguage: locale,
            },
            {
              // The catalog itself, so the ordering (the thing this site is
              // actually for) is legible as data and not just as markup.
              "@type": "ItemList",
              name: translate(dictionary, locale, "meta.home.title"),
              numberOfItems: graphData.titles.length,
              itemListOrder: "https://schema.org/ItemListOrderAscending",
              itemListElement: order.slice(0, 30).map((title, index) => ({
                "@type": "ListItem",
                position: index + 1,
                url: absoluteUrl(localeUrl(`/title/${title.id}`, locale)),
                name: title.title,
              })),
            },
          ],
        }}
      />
      <Explorer />
    </>
  );
}
