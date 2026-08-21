"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * Carries one bit to the client: is there any real artwork to ask for?
 *
 * The server knows (it can see both the baked-in file and TMDB_API_KEY); the
 * client cannot, and must not: the key itself never crosses this boundary,
 * only the yes/no.
 *
 * It is fetched rather than rendered in, so the pages wrapping this provider
 * can be prerendered. `process.env` is not a dynamic API in Next: on a static
 * page it is read at *build* time, so passing the flag down from a server
 * component would freeze it at whatever it was when the image was built, and the
 * exact thing runtime resolution exists to avoid.
 *
 * Defaults to false, so a keyless deployment never fires a request per poster
 * that would only 404. Posters fade in once the answer arrives; the generated
 * art is already on screen underneath either way.
 */
const ArtworkContext = createContext(false);

export function ArtworkProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/artwork/status")
      .then((response) => (response.ok ? response.json() : { enabled: false }))
      .then((data: { enabled?: boolean }) => {
        if (!cancelled) setEnabled(Boolean(data.enabled));
      })
      .catch(() => {
        /* leave artwork off: generated posters are already rendered */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <ArtworkContext.Provider value={enabled}>{children}</ArtworkContext.Provider>;
}

export function useArtworkEnabled(): boolean {
  return useContext(ArtworkContext);
}
