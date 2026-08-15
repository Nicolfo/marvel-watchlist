"use client";

import { useState } from "react";
import { artworkFor, generatedPalette, initialsFor } from "@/lib/artwork";
import type { Title } from "@/lib/graph/schema";

/**
 * A title's poster. Uses real TMDB artwork when it has been fetched, and
 * otherwise draws a designed poster from the title's own data. Also the
 * runtime fallback: if a remote image 404s, it degrades to the generated art
 * rather than a broken-image icon.
 */
export function Poster({
  title,
  className = "",
  sizes = "(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px",
  priority = false,
}: {
  title: Title;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const art = artworkFor(title.id);
  const [failed, setFailed] = useState(false);
  const palette = generatedPalette(title);
  const showImage = Boolean(art?.posterUrl) && !failed;

  return (
    <div
      className={`relative isolate overflow-hidden rounded-xl bg-panel-2 ${className}`}
      style={{
        backgroundImage: `linear-gradient(155deg, ${palette.from}, ${palette.via} 55%, ${palette.to})`,
        // Lets the generated mark size itself against the poster, so the same
        // component works at 32px and at 172px without clipping.
        containerType: "inline-size",
      }}
    >
      {showImage ? (
        // Plain <img>: artwork is optional and remote, and this keeps the
        // standalone container free of an image-optimisation dependency.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={art!.posterUrl}
          alt=""
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          sizes={sizes}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <GeneratedPosterArt title={title} glow={palette.glow} />
      )}
    </div>
  );
}

/**
 * Purely graphic - no title or year text. Every caller already labels the
 * poster next to it, and drawing the title twice made the two collide.
 */
function GeneratedPosterArt({ title, glow }: { title: Title; glow: string }) {
  return (
    <div className="absolute inset-0" aria-hidden>
      {/* Corner glow + diagonal sheen give the flat gradient some depth. */}
      <div
        className="absolute -left-1/4 -top-1/4 h-2/3 w-2/3 rounded-full opacity-45 blur-2xl"
        style={{ background: glow }}
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "repeating-linear-gradient(115deg, #fff 0 1px, transparent 1px 11px)",
        }}
        aria-hidden
      />

      <div className="absolute inset-0 grid place-items-center p-[6%]">
        <span
          className="select-none whitespace-nowrap text-center font-black leading-none tracking-tighter text-white/85"
          style={{
            // Scales with the poster width; the divisor keeps 3-letter marks
            // inside the frame.
            fontSize: `${Math.min(34, 96 / Math.max(initialsFor(title).length, 1))}cqw`,
            textShadow: "0 2px 28px rgba(0,0,0,0.5)",
          }}
        >
          {initialsFor(title)}
        </span>
      </div>

      <div
        className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10"
        aria-hidden
      />
    </div>
  );
}
