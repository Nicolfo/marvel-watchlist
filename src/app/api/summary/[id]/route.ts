import { NextResponse } from "next/server";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { getGraph } from "@/lib/graph/catalog";
import { resolveSummary } from "@/lib/summaries/catalog";

export const dynamic = "force-dynamic";

/**
 * The detailed plot summary for one title, in one language.
 *
 * This endpoint exists so the spoiler text is in **neither** the page nor the
 * JavaScript bundle until a reader actually asks for it.
 *
 * Both of the obvious alternatives leak it. Looking the summary up inside the
 * client component puts the entire corpus - every title, and with translations
 * every language - into a chunk the browser downloads on arrival. Passing it
 * down from the server component as a prop is worse in a different way: React
 * serialises props into the flight payload, so the text sits in the page source
 * of a page whose whole design promise is that it does not.
 *
 * Fetching it on reveal is the only version where "the text is not in the
 * document until you ask for it" is literally true, and it is why the title
 * page passes down the *metadata* - language and reading time - and nothing
 * else.
 *
 * Falls back to English per title; the response says which language it is
 * actually in, so the caller can tag it and warn.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // The id lands straight off a URL and is used to index a record, so it is
  // checked against the catalog rather than trusted.
  if (!getGraph().byId.has(id)) {
    return new NextResponse(null, { status: 404 });
  }

  const locale = new URL(request.url).searchParams.get("lang") ?? DEFAULT_LOCALE;
  const resolved = await resolveSummary(id, locale);
  if (!resolved) return new NextResponse(null, { status: 404 });

  return NextResponse.json(
    {
      paragraphs: resolved.entry.paragraphs,
      stinger: resolved.entry.stinger ?? null,
      language: resolved.language,
    },
    {
      // The summaries are a build-time dataset, so this is as cacheable as the
      // page itself - but it must never be cached by anything shared, since a
      // reader who never opens one should never have it fetched on their behalf.
      headers: { "Cache-Control": "private, max-age=86400" },
    },
  );
}
