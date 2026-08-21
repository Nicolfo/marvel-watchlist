"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, directionOf } from "./config";
import { formatNumber, translate, type Dictionary, type Vars } from "./translate";

/**
 * Carries the active locale and its dictionary to the client components.
 *
 * Almost every component in this app is a client component, and the watchlist
 * is interactive from the first paint, so the strings have to cross the boundary
 * somewhere. They cross once, here, at the root layout, rather than each
 * component reaching for a global.
 */

interface I18nContextValue {
  locale: string;
  dir: "ltr" | "rtl";
  t(key: string, vars?: Vars): string;
  /** Locale-aware digits: Persian and Arabic get their own numerals. */
  n(value: number): string;
}

const fallback: I18nContextValue = {
  locale: DEFAULT_LOCALE,
  dir: "ltr",
  t: (key) => key,
  n: (value) => String(value),
};

const I18nContext = createContext<I18nContextValue>(fallback);

export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: string;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dir: directionOf(locale),
      t: (key, vars) => translate(dictionary, locale, key, vars),
      n: (input) => formatNumber(locale, input),
    }),
    [dictionary, locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

/**
 * Builds a locale-prefixed href. Every internal link goes through this, so a
 * reader who is three pages into the Persian site stays on the Persian site.
 */
export function useLocalePath(): (path: string) => string {
  const { locale } = useI18n();
  return (path: string) => localePath(locale, path);
}

export function localePath(locale: string, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}
