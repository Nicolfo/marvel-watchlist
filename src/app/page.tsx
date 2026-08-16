import { Explorer } from "@/components/explorer";
import { JsonLd } from "@/components/json-ld";
import { getGraph, graphData } from "@/lib/graph/catalog";
import { suggestedOrder } from "@/lib/graph/engine";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export default function HomePage() {
  // The real computed order, not the order titles happen to sit in the data
  // file - the list below claims to be the suggested order, so it must be.
  const order = suggestedOrder(getGraph(), "should");

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": `${SITE_URL}/#website`,
              url: SITE_URL,
              name: SITE_NAME,
              description: SITE_DESCRIPTION,
              inLanguage: "en",
            },
            {
              // The catalog itself, so the ordering - the thing this site is
              // actually for - is legible as data and not just as markup.
              "@type": "ItemList",
              name: "Marvel films and series in suggested watch order",
              numberOfItems: graphData.titles.length,
              itemListOrder: "https://schema.org/ItemListOrderAscending",
              itemListElement: order.slice(0, 30).map((title, index) => ({
                "@type": "ListItem",
                position: index + 1,
                url: absoluteUrl(`/title/${title.id}`),
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
