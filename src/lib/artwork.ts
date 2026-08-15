import artworkFile from "@data/artwork.json";
import type { Title } from "./graph/schema";

/**
 * Artwork resolution.
 *
 * Tier 1: a real poster from TMDB - either baked into the image by
 *         `npm run artwork:fetch`, or resolved at request time from a
 *         TMDB_API_KEY in the server's environment.
 * Tier 2: a generated poster derived from the title itself.
 *
 * Tier 2 is not a grey placeholder box - it is a deterministic, designed
 * treatment (hue from the title id, palette family from the phase), so a clone
 * with no API key still looks finished rather than broken.
 *
 * This module is safe to import from client code: it holds only the baked-in
 * file and pure drawing helpers. The runtime lookup - and the API key it needs
 * - lives in `artwork-server.ts`, which the browser never sees.
 */

export interface ArtworkEntry {
  posterUrl?: string;
  backdropUrl?: string;
  imdbId?: string;
  tmdbId?: number;
  overview?: string;
}

interface ArtworkFile {
  schemaVersion: number;
  generatedAt: string | null;
  items: Record<string, ArtworkEntry>;
}

const file = artworkFile as unknown as ArtworkFile;

export const ARTWORK_GENERATED_AT = file.generatedAt;
export const HAS_REAL_ARTWORK = Object.keys(file.items ?? {}).length > 0;

export function artworkFor(id: string): ArtworkEntry | undefined {
  return file.items?.[id];
}

/**
 * Where a browser asks for a title's artwork. The server decides behind this
 * URL whether that means baked-in artwork, a live TMDB lookup, or a 404 that
 * leaves the generated art in place.
 */
export function artworkSrc(id: string, variant: "poster" | "backdrop"): string {
  return `/api/artwork/${encodeURIComponent(id)}/${variant}`;
}

/** Stable 32-bit hash so a title always renders the same colours. */
function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Each phase gets a well-separated hue band, so the grid reads as eras at a
 * glance. Bands are kept far apart on the wheel - adjacent phases that differ
 * by only a few degrees are indistinguishable once the scrim is over them.
 */
const PHASE_HUES: Record<string, [number, number]> = {
  "Phase One": [348, 366], // crimson
  "Phase Two": [26, 44], // amber
  "Phase Three": [276, 300], // violet
  "Phase Four": [168, 192], // teal
  "Phase Five": [210, 232], // blue
  "Phase Six": [316, 338], // magenta
  "Marvel Television": [58, 82], // olive/gold
  Netflix: [0, 14], // blood red
  Animation: [248, 268], // indigo
  "Fox / Legacy": [196, 212], // steel
};

export interface GeneratedPalette {
  from: string;
  via: string;
  to: string;
  glow: string;
}

export function generatedPalette(title: Title): GeneratedPalette {
  const [low, high] = PHASE_HUES[title.phase] ?? [220, 260];
  const seed = hash(title.id);
  const hue = (low + (seed % Math.max(1, high - low))) % 360;
  const drift = (hue + 28 + (seed % 17)) % 360;
  return {
    from: `hsl(${hue} 68% 34%)`,
    via: `hsl(${drift} 62% 21%)`,
    to: `hsl(${(drift + 14) % 360} 55% 10%)`,
    glow: `hsl(${hue} 85% 62%)`,
  };
}

/** Big, legible mark for the generated poster: initials of the title. */
export function initialsFor(title: Title): string {
  const words = title.title
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0 && !/^(the|of|and|a|an|on|in|to|way|at)$/i.test(word));
  const letters = words.slice(0, 3).map((word) => word[0]!.toUpperCase());
  return letters.join("") || title.title.slice(0, 2).toUpperCase();
}
