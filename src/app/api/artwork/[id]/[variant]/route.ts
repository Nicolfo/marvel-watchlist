import { NextResponse } from "next/server";
import { resolveArtwork } from "@/lib/artwork-server";
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
 * A 404 is a normal outcome, not an error - it means "no artwork for this
 * title", and the client falls back to its generated poster art.
 */

const IMAGE_VARIANTS = new Set(["poster", "backdrop"]);
/**
 * `meta` returns JSON rather than a redirect. It exists so the title page can
 * be prerendered: the synopsis comes from the same keyed TMDB lookup as the
 * artwork, and awaiting it during render would make all 86 title pages dynamic.
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
  _request: Request,
  { params }: { params: Promise<{ id: string; variant: string }> },
) {
  const { id, variant } = await params;
  if (variant !== META_VARIANT && !IMAGE_VARIANTS.has(variant)) return notFound();

  const art = await resolveArtwork(id);

  if (variant === META_VARIANT) {
    // Only the fields safe to hand a browser - never the credential, and not
    // the raw entry, so adding a field to ArtworkEntry cannot leak it by default.
    return NextResponse.json(
      { overview: art?.overview ?? null },
      { headers: { "Cache-Control": art?.overview ? HIT_CACHE : MISS_CACHE } },
    );
  }

  const url = variant === "poster" ? art?.posterUrl : art?.backdropUrl;

  // Never redirect anywhere but the TMDB image CDN, whatever a data file says.
  if (!url || !isTmdbImageUrl(url)) return notFound();

  return new NextResponse(null, {
    status: 307,
    headers: { Location: url, "Cache-Control": HIT_CACHE },
  });
}
