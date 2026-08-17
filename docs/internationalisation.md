# Languages, and how the site speaks them

The interface is available in **14 languages**, including right-to-left layouts
for **Arabic** and **Persian**.

| | |
| --- | --- |
| English | `en` |
| Español | `es` |
| Português (Brasil) | `pt-BR` |
| Français | `fr` |
| Deutsch | `de` |
| Italiano | `it` |
| Türkçe | `tr` |
| Русский | `ru` |
| हिन्दी | `hi` |
| 简体中文 | `zh-Hans` |
| 日本語 | `ja` |
| 한국어 | `ko` |
| العربية | `ar` — right to left |
| فارسی | `fa` — right to left |

## What is translated, and what is not

**The interface is.** Navigation, buttons, filters, headings, the About page,
page titles and meta descriptions, `aria-label`s, and the phase names
(*Phase One* → *فاز یک*).

**The catalog is not.** Title names stay as they are, and so do the 80 detailed
plot summaries. These are data rather than UI copy: a machine-translated film
title helps nobody find the film, and a machine-translated plot summary would be
worse than the English one it replaced. A non-English reader who opens a summary
is told, in their own language, that what follows is English — see
`spoiler.englishOnly`.

A summary block is marked `lang="en" dir="ltr"` so an English paragraph inside a
Persian page is laid out and pronounced as English rather than being flipped.

## URLs

The language is a path prefix: `/fa/title/loki`, `/ja/about`, `/en`.

That is a deliberate choice over a cookie-only switch. It means a link someone
shares opens in the language they shared it in, each translation is a distinct
URL a search engine can index, and the language survives a page reload with no
JavaScript involved.

Old, unprefixed URLs still work. `src/middleware.ts` redirects `/title/loki` to
`/<locale>/title/loki`, keeping the path, so existing links and search results
land in the right place rather than 404ing.

Which locale a bare URL resolves to, in order:

1. the `NEXT_LOCALE` cookie, if the reader has chosen a language;
2. their browser's `Accept-Language`, negotiated by quality value, with a
   fallback on the primary subtag — `pt-PT` lands on `pt-BR` rather than falling
   all the way to English;
3. English.

`/api/*`, `/_next/*`, `robots.txt` and `sitemap.xml` are never prefixed.

## SEO

Every page carries a canonical for its own language plus `hreflang` alternates
naming all fourteen, with `x-default` on English. Without those, a crawler reads
fourteen translations of one page as fourteen pages competing for one query. The
sitemap lists every locale of every page with the same alternates map — 1,232
URLs, generated from the catalog and the locale list, so neither can drift.

## Right to left

`<html dir>` is set from the locale, and the layout uses **logical** Tailwind
utilities (`ms`/`me`, `ps`/`pe`, `start`/`end`, `text-start`) rather than
physical ones (`ml`/`mr`, `left`/`right`). The whole chrome mirrors itself with
no second stylesheet: the drawer slides in from the right, the burger moves to
the right, the progress pill moves to the left.

Three things deliberately do **not** mirror, because they are not prose:

- the brand wordmark, the IMDb chip and the platform chips (`dir="ltr"`),
- the source URL and the exported JSON textarea,
- the progress ring, which is a clock face and winds the same way everywhere.

The external-link arrow *does* mirror (`rtl:-scale-x-100`), because an arrow
pointing away from its label has to point left when the label reads right to
left.

## Numbers

`t()` formats any numeric value it interpolates for the locale, so a Persian
reader sees ۱۲ rather than a Latin 12 dropped into their own script. Grouping is
off: every number here is a small count or a release year, and grouping turns
2008 into "2,008".

One exception, in `src/app/[locale]/title/[id]/page.tsx`: the year in a page
title and meta description is passed as a *string*. It sits directly beside the
untranslated English film title there, and `og:title` writes it in Latin digits,
so localising it would leave the two tags disagreeing about the same film.

## Plurals

`t()` selects the plural form with `Intl.PluralRules`, not `n === 1`:

- Russian needs `one` / `few` / `many` — 1 сезон, 3 сезона, 7 сезонов;
- Arabic needs six categories, and uses `two` for a genuine dual — موسمان;
- Chinese, Japanese and Korean need exactly one form and must never be given an
  English-shaped "1 item / 2 items" split.

Write the forms as sibling keys:

```jsonc
"titleMeta.seasons.one":   "{count} season",
"titleMeta.seasons.other": "{count} seasons"
```

Lookup falls back `key.<category>` → `key.other` → `key`, so a translator who
supplies only `other` still gets sensible output.

## Sentences with a link or bold run in them

Use one dictionary value with a `{slot}` in it and the `Rich` component, never
three concatenated fragments:

```tsx
<Rich
  text={t("about.watchlist.body", { key: "…" })}
  slots={{ link: <Link href={path("/watchlist")}>…</Link> }}
/>
```

Concatenation silently assumes every language puts the link in the same place.
German moves the verb, Japanese moves the object, and Persian runs the other way
entirely. A `{slot}` lets the translator put it where their grammar needs it.

## Adding a language

1. Copy `src/i18n/dictionaries/en.json` to `<code>.json` and translate the
   values. Leave the keys and the `{placeholders}` exactly as they are.
2. Add a row to `LOCALES` in `src/i18n/config.ts`, with the language's name
   **in that language** — a menu written in a script you cannot read is useless
   to the person who most needs it — and `rtl: true` if it reads right to left.
3. Add the importer line in `src/i18n/dictionary.ts`.
4. Run `npm run i18n:validate`.

Untranslated keys fall back to English rather than rendering a raw
`detail.pointsInto`, so a partially translated language is a shippable state.

## `npm run i18n:validate`

Runs in the prebuild and in CI. It fails the build on:

- a placeholder a translation dropped, renamed or invented — `{cont}` for
  `{count}` prints literal text to a reader, and a dropped `{link}` silently
  deletes a link from a sentence;
- a key that does not exist in `en.json`, ignoring the extra plural forms a
  language legitimately needs;
- an empty string;
- a locale declared in `config.ts` with no dictionary file, or a dictionary file
  no locale declares.

It reports per-language coverage as information rather than as an error. Nothing
sits at 100%: strings like "IMDb", "Netflix", "Menu" and "Film" are identical in
several languages, and matching English is the correct translation there.
