import { describe, expect, it } from "vitest";
import en from "@/i18n/dictionaries/en.json";
import ru from "@/i18n/dictionaries/ru.json";
import ar from "@/i18n/dictionaries/ar.json";
import fa from "@/i18n/dictionaries/fa.json";
import ja from "@/i18n/dictionaries/ja.json";
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_CODES,
  directionOf,
  isLocale,
  negotiateLocale,
} from "./config";
import { formatNumber, translate, type Dictionary } from "./translate";
import { localePath } from "./context";
import { alternatesFor, localeUrl } from "@/lib/site";

const english = en as Dictionary;

describe("locale configuration", () => {
  it("has a unique code per locale and includes the default", () => {
    expect(new Set(LOCALE_CODES).size).toBe(LOCALE_CODES.length);
    expect(LOCALE_CODES).toContain(DEFAULT_LOCALE);
  });

  it("marks both right-to-left languages, Persian included", () => {
    expect(directionOf("fa")).toBe("rtl");
    expect(directionOf("ar")).toBe("rtl");
    expect(directionOf("en")).toBe("ltr");
    expect(directionOf("ja")).toBe("ltr");
    expect(LOCALES.filter((locale) => locale.rtl).map((locale) => locale.code).sort()).toEqual([
      "ar",
      "fa",
    ]);
  });

  it("names every language in its own language, never in English", () => {
    // A menu written in a language you cannot read is useless to the reader who
    // needs it most, so this is a real requirement rather than a nicety.
    expect(LOCALES.find((locale) => locale.code === "fa")!.name).toBe("فارسی");
    expect(LOCALES.find((locale) => locale.code === "ja")!.name).toBe("日本語");
    expect(LOCALES.find((locale) => locale.code === "ru")!.name).toBe("Русский");
  });

  it("recognises locale codes case-insensitively", () => {
    expect(isLocale("fa")).toBe(true);
    expect(isLocale("zh-hans")).toBe(true);
    expect(isLocale("klingon")).toBe(false);
  });
});

describe("negotiateLocale", () => {
  it("prefers an exact match", () => {
    expect(negotiateLocale("fa-IR,fa;q=0.9,en;q=0.5")).toBe("fa");
    expect(negotiateLocale("zh-Hans")).toBe("zh-Hans");
  });

  it("falls back to the primary subtag rather than to English", () => {
    // pt-PT is not offered; landing a Portuguese speaker on pt-BR beats
    // dropping them into English.
    expect(negotiateLocale("pt-PT,pt;q=0.9")).toBe("pt-BR");
    expect(negotiateLocale("en-GB")).toBe("en");
  });

  it("honours quality values rather than header order", () => {
    expect(negotiateLocale("de;q=0.2,ko;q=0.9")).toBe("ko");
  });

  it("defaults to English for anything it cannot place", () => {
    expect(negotiateLocale(null)).toBe(DEFAULT_LOCALE);
    expect(negotiateLocale("")).toBe(DEFAULT_LOCALE);
    expect(negotiateLocale("xx-YY")).toBe(DEFAULT_LOCALE);
    // q=0 means "explicitly not this one".
    expect(negotiateLocale("fa;q=0")).toBe(DEFAULT_LOCALE);
  });
});

describe("translate", () => {
  it("interpolates placeholders", () => {
    expect(translate(english, "en", "card.details", { title: "Loki" })).toBe("Loki details");
  });

  it("returns the key itself when a string is missing, so gaps are visible", () => {
    expect(translate(english, "en", "nope.not.here")).toBe("nope.not.here");
  });

  it("leaves an unsupplied placeholder alone rather than printing undefined", () => {
    expect(translate(english, "en", "card.details")).toBe("{title} details");
  });

  it("picks English plural forms", () => {
    expect(translate(english, "en", "titleMeta.seasons", { count: 1 })).toBe("1 season");
    expect(translate(english, "en", "titleMeta.seasons", { count: 3 })).toBe("3 seasons");
  });

  it("picks Russian one/few/many, which an n === 1 check would get wrong", () => {
    const dict = { ...english, ...(ru as Dictionary) };
    expect(translate(dict, "ru", "titleMeta.seasons", { count: 1 })).toBe("1 сезон");
    expect(translate(dict, "ru", "titleMeta.seasons", { count: 3 })).toBe("3 сезона");
    expect(translate(dict, "ru", "titleMeta.seasons", { count: 7 })).toBe("7 сезонов");
  });

  it("picks Arabic dual and few forms", () => {
    const dict = { ...english, ...(ar as Dictionary) };
    expect(translate(dict, "ar", "titleMeta.seasons", { count: 1 })).toBe("موسم واحد");
    expect(translate(dict, "ar", "titleMeta.seasons", { count: 2 })).toBe("موسمان");
    expect(translate(dict, "ar", "titleMeta.seasons", { count: 3 })).toContain("مواسم");
  });

  it("uses the single form for Japanese instead of an English-shaped split", () => {
    const dict = { ...english, ...(ja as Dictionary) };
    expect(translate(dict, "ja", "titleMeta.seasons", { count: 1 })).toBe("全 1 シーズン");
    expect(translate(dict, "ja", "titleMeta.seasons", { count: 5 })).toBe("全 5 シーズン");
  });

  it("falls back along key.category → key.other → key", () => {
    const sparse: Dictionary = { "x.other": "{count} things" };
    expect(translate(sparse, "ru", "x", { count: 3 })).toBe("3 things");
    expect(translate({ x: "{count} flat" }, "en", "x", { count: 3 })).toBe("3 flat");
  });

  it("localises digits inside interpolated numbers", () => {
    const dict = { ...english, ...(fa as Dictionary) };
    // Persian readers get Persian numerals, not Latin ones dropped into their
    // own script.
    expect(translate(dict, "fa", "titleMeta.minutes", { count: 12 })).toContain("۱۲");
  });

  it("never groups digits, because a year is not a quantity", () => {
    expect(formatNumber("en", 2008)).toBe("2008");
    expect(formatNumber("de", 2008)).toBe("2008");
  });

  it("degrades to the raw value for a malformed tag instead of throwing", () => {
    expect(formatNumber("not a locale", 5)).toBe("5");
    expect(translate(english, "not a locale", "titleMeta.seasons", { count: 1 })).toBe("1 season");
  });
});

describe("locale-prefixed URLs", () => {
  it("prefixes every internal path", () => {
    expect(localePath("fa", "/")).toBe("/fa");
    expect(localePath("fa", "/title/loki")).toBe("/fa/title/loki");
    expect(localeUrl("/", "ja")).toBe("/ja");
    expect(localeUrl("/about", "ja")).toBe("/ja/about");
  });

  it("gives every page a canonical and a full set of hreflang alternates", () => {
    const alternates = alternatesFor("/title/loki", "fa");
    expect(alternates.canonical).toBe("/fa/title/loki");
    // Every language must name every other, or a crawler reads fourteen
    // translations as fourteen competing pages.
    for (const code of LOCALE_CODES) {
      expect(alternates.languages[code]).toBe(`/${code}/title/loki`);
    }
    expect(alternates.languages["x-default"]).toBe(`/${DEFAULT_LOCALE}/title/loki`);
  });
});
