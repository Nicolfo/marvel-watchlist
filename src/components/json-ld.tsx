/**
 * Emits schema.org JSON-LD.
 *
 * Server-rendered on purpose: structured data is only worth anything if it is
 * in the HTML a crawler receives, not injected after hydration.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // The payload is built from our own catalog, never from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
