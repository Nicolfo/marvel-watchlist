import { NextResponse } from "next/server";
import { resolveArtwork, resolveOverview } from "@/lib/artwork-server";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { isTmdbImageUrl } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

/**
 * Artwork for one title, as an image the browser can point an `<img>` at.
 *
 * This is a redirect rather than a proxy: the pod resolves *which* TMDB image
 * to use (the part that needs the API key) and then sends the browser to
 * image.tmdb.org for the bytes, which need no key. So the credential stays
 * server-side and we do not pay to stream megabytes of posters through the app.
 *
 * A 404 is a normal outcome, not an error: it means "no artwork for this
 * title", and the client falls back to its generated poster art.
 */

const IMAGE_VARIANTS = new Set(["poster", "backdrop"]);
/**
 * `meta` returns JSON rather than a redirect. It exists so the title page can
 * be prerendered: the synopsis comes from the same keyed TMDB lookup as the
 * artwork, and awaiting it during render would make every title page dynamic.
 * It takes a `?lang=` parameter, because TMDB has the synopsis in many
 * languages and a Persian page should show the Persian one.
 */
const META_VARIANT = "meta";

/** Long enough to matter, short enough that a newly added poster shows up. */
const HIT_CACHE = "public, max-age=86400, stale-while-revalidate=604800";
/** Misses are cached too, so a keyless deployment asks once and then stops. */
const MISS_CACHE = "public, max-age=3600";

function notFound(): NextResponse {
  return new NextResponse(null, { status: 404, headers: { "Cache-Control": MISS_CACHE } });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; variant: string }> },
) {
  const { id, variant } = await params;
  if (variant !== META_VARIANT && !IMAGE_VARIANTS.has(variant)) return notFound();

  if (variant === META_VARIANT) {
    // TMDB is translated, so the synopsis is per-language. The locale rides in
    // as a query parameter rather than being read from the path, because this
    // endpoint sits outside the [locale] segment because it serves images to every
    // language and only this one variant cares which.
    const locale = new URL(request.url).searchParams.get("lang") ?? DEFAULT_LOCALE;
    const { text, language } = await resolveOverview(id, locale);

    // Only the fields safe to hand a browser: never the credential, and not
    // the raw entry, so adding a field to ArtworkEntry cannot leak it by default.
    return NextResponse.json(
      { overview: text, language },
      { headers: { "Cache-Control": text ? HIT_CACHE : MISS_CACHE } },
    );
  }

  const art = await resolveArtwork(id);

  const url = variant === "poster" ? art?.posterUrl : art?.backdropUrl;

  // Never redirect anywhere but the TMDB image CDN, whatever a data file says.
  if (!url || !isTmdbImageUrl(url)) return notFound();

  return new NextResponse(null, {
    status: 307,
    headers: { Location: url, "Cache-Control": HIT_CACHE },
  });
}
