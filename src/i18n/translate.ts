import { DEFAULT_LOCALE } from "./config";

/**
 * The translation function, kept pure and free of React so it can be unit
 * tested and used from both server and client components.
 *
 * A dictionary is a flat map of dotted keys to strings. Flat rather than
 * nested because the only structural question anyone ever asks of it is "does
 * every locale have the same keys?", and that is a set comparison on a flat map
 * rather than a recursive walk.
 */

export type Dictionary = Record<string, string>;

/** Values interpolated into `{placeholders}`. */
export type Vars = Record<string, string | number>;

/**
 * Plural categories, resolved with `Intl.PluralRules` rather than an
 * `n === 1` check.
 *
 * The naive check is wrong in most of the languages here: Russian needs one /
 * few / many, Arabic needs six categories, and Chinese, Japanese and Korean
 * need exactly one form and should never be handed an English-shaped "1 item /
 * 2 items" split. A key with plural forms is written as `key.one`, `key.other`
 * and so on, and lookup falls back along the chain
 * `key.<category>` → `key.other` → `key`, so a translator who only supplies
 * `other` still gets sensible output rather than a missing string.
 */
function pluralKey(dict: Dictionary, key: string, locale: string, count: number): string {
  let category: string;
  try {
    category = new Intl.PluralRules(locale).select(count);
  } catch {
    // An exotic or malformed tag should degrade to English rules, not throw
    // during a render.
    category = new Intl.PluralRules(DEFAULT_LOCALE).select(count);
  }

  for (const candidate of [`${key}.${category}`, `${key}.other`, key]) {
    if (candidate in dict) return candidate;
  }
  return key;
}

/**
 * Numbers are formatted for the locale on the way in, so `{count}` renders as
 * ۱۲ on a Persian page without every call site remembering to pre-format it.
 * The same value still drives plural selection, because the selection happens
 * on the number before this runs.
 */
function interpolate(
  template: string,
  vars: Vars | undefined,
  locale: string,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (!(name in vars)) return match;
    const value = vars[name];
    return typeof value === "number" ? formatNumber(locale, value) : String(value);
  });
}

/**
 * Looks up `key`, filling in `{placeholders}` from `vars`.
 *
 * When `vars.count` is a number the key is treated as pluralised. A missing key
 * returns the key itself: visible in the UI, obvious in a screenshot, and
 * caught by `npm run i18n:validate` long before that - which beats rendering an
 * empty space that nobody notices for six months.
 */
export function translate(
  dict: Dictionary,
  locale: string,
  key: string,
  vars?: Vars,
): string {
  const resolved =
    typeof vars?.count === "number" ? pluralKey(dict, key, locale, vars.count) : key;

  const template = dict[resolved];
  if (template === undefined) return key;
  return interpolate(template, vars, locale);
}

/**
 * Locale-aware digits, so Persian and Arabic readers get ۱۲ and ١٢ rather than
 * Latin numerals dropped into the middle of their own script.
 *
 * Grouping is off. Every number this app shows is either a small count or a
 * release year, and grouping turns "2008" into "2,008" - which is wrong for a
 * year in every language that has the separator.
 */
export function formatNumber(locale: string, value: number): string {
  try {
    return new Intl.NumberFormat(locale, { useGrouping: false }).format(value);
  } catch {
    return String(value);
  }
}
