"use client";

import { createContext, useContext } from "react";

/**
 * Carries one bit from server to client: is there any real artwork to ask for?
 *
 * The server knows (it can see both the baked-in file and TMDB_API_KEY); the
 * client cannot, and must not - the key itself never crosses this boundary,
 * only the yes/no. When it is false the poster components skip their `<img>`
 * entirely rather than firing a request per title that would all 404.
 */
const ArtworkContext = createContext(false);

export function ArtworkProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  return <ArtworkContext.Provider value={enabled}>{children}</ArtworkContext.Provider>;
}

export function useArtworkEnabled(): boolean {
  return useContext(ArtworkContext);
}
