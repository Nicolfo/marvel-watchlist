"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * One remembered bit: does this reader want detailed summaries opened for them?
 *
 * The default is emphatically no. A spoiler summary that appears without being
 * asked for cannot be un-read, so the safe state is the one you get before any
 * preference exists, before storage has been read, and if storage throws.
 *
 * Kept out of the watchlist state deliberately. That state is exported,
 * imported and destined for a server once accounts exist; this is a local
 * display preference for one browser, and putting it in the export would mean
 * sharing a watchlist file also shares how you like to be spoiled.
 */

export const SPOILER_PREFERENCE_KEY = "marvel-watchlist:spoilers:v1";

interface SpoilerContextValue {
  /** False until storage has been read, so nothing reveals on the first paint. */
  ready: boolean;
  /** Open every detailed summary by default. */
  alwaysShow: boolean;
  setAlwaysShow(value: boolean): void;
}

const SpoilerContext = createContext<SpoilerContextValue>({
  ready: false,
  alwaysShow: false,
  setAlwaysShow: () => {},
});

function read(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SPOILER_PREFERENCE_KEY) === "always";
  } catch {
    // Private mode, blocked storage, a hand-edited value: fall back to the
    // choice that cannot spoil anyone.
    return false;
  }
}

export function SpoilerProvider({ children }: { children: React.ReactNode }) {
  const [alwaysShow, setState] = useState(false);
  const [ready, setReady] = useState(false);

  // Read after mount rather than during render: the pages are prerendered, and
  // the server has no localStorage, so reading it inline would hydrate-mismatch.
  useEffect(() => {
    setState(read());
    setReady(true);
  }, []);

  const setAlwaysShow = useCallback((value: boolean) => {
    setState(value);
    try {
      if (value) window.localStorage.setItem(SPOILER_PREFERENCE_KEY, "always");
      else window.localStorage.removeItem(SPOILER_PREFERENCE_KEY);
    } catch {
      /* the in-memory preference still holds for this session */
    }
  }, []);

  return (
    <SpoilerContext.Provider value={{ ready, alwaysShow, setAlwaysShow }}>
      {children}
    </SpoilerContext.Provider>
  );
}

export function useSpoilerPreference(): SpoilerContextValue {
  return useContext(SpoilerContext);
}
