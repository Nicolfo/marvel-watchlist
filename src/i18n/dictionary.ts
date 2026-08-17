import { DEFAULT_LOCALE } from "./config";
import type { Dictionary } from "./translate";

/**
 * Loads one locale's dictionary.
 *
 * The importers are written out one per line rather than built from a template
 * string so the bundler can see exactly which files are reachable and split
 * them into separate chunks. A dynamic `import(\`./dictionaries/${code}.json\`)`
 * would make every locale a dependency of every page, which is how a 14-language
 * site ends up shipping fourteen dictionaries to a reader who asked for one.
 *
 * Only a server component calls this. The chosen dictionary crosses to the
 * client once, through `<I18nProvider>`, so the browser receives the language
 * it is actually rendering and nothing else.
 */
const loaders: Record<string, () => Promise<{ default: Dictionary }>> = {
  en: () => import("./dictionaries/en.json"),
  es: () => import("./dictionaries/es.json"),
  "pt-BR": () => import("./dictionaries/pt-BR.json"),
  fr: () => import("./dictionaries/fr.json"),
  de: () => import("./dictionaries/de.json"),
  it: () => import("./dictionaries/it.json"),
  tr: () => import("./dictionaries/tr.json"),
  ru: () => import("./dictionaries/ru.json"),
  hi: () => import("./dictionaries/hi.json"),
  "zh-Hans": () => import("./dictionaries/zh-Hans.json"),
  ja: () => import("./dictionaries/ja.json"),
  ko: () => import("./dictionaries/ko.json"),
  ar: () => import("./dictionaries/ar.json"),
  fa: () => import("./dictionaries/fa.json"),
};

/**
 * English is merged underneath every other locale.
 *
 * A key a translator has not reached yet therefore renders as English rather
 * than as a raw `detail.pointsInto`. A half-translated page is a normal state
 * for a site with fourteen languages, and it should look like a site with some
 * English on it, not like a broken one.
 */
export async function getDictionary(locale: string): Promise<Dictionary> {
  const base = (await loaders[DEFAULT_LOCALE]!()).default;
  const load = loaders[locale];
  if (!load || locale === DEFAULT_LOCALE) return base;
  return { ...base, ...(await load()).default };
}
