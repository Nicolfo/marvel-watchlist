"use client";

import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/context";
import { LOCALES, isLocale } from "@/i18n/config";

/**
 * The language menu.
 *
 * A plain `<select>` rather than a custom dropdown, on purpose: it is keyboard
 * accessible and screen-reader labelled for free, and on a phone it opens the
 * platform's own picker, which handles fourteen options and fourteen scripts
 * better than anything built out of divs would.
 *
 * Choosing a language rewrites the current path rather than sending the reader
 * home, so switching to Persian from a title page leaves you on that title page
 * in Persian. The choice is also written to the cookie the middleware reads, so
 * the next visit to a bare URL lands in the same language.
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  const change = (next: string) => {
    if (next === locale) return;

    // One year, and Lax so it survives a click from a search result.
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; samesite=lax`;

    const [, first, ...rest] = pathname.split("/");
    const tail = isLocale(first ?? "") ? rest : [first, ...rest].filter(Boolean);
    router.push(`/${[next, ...tail].filter(Boolean).join("/")}`);
  };

  return (
    <label className={`flex items-center gap-1.5 ${className}`}>
      <span className="sr-only">{t("lang.change")}</span>
      <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-muted" fill="none" aria-hidden>
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M2.5 10h15M10 2.5c2 2.4 3 4.9 3 7.5s-1 5.1-3 7.5c-2-2.4-3-4.9-3-7.5s1-5.1 3-7.5z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
      <select
        value={locale}
        onChange={(event) => change(event.target.value)}
        title={t("lang.change")}
        className="max-w-[8.5rem] cursor-pointer truncate rounded-md border border-edge bg-panel px-2 py-1 text-xs text-muted transition-colors hover:text-text focus:text-text"
      >
        {LOCALES.map((entry) => (
          <option key={entry.code} value={entry.code}>
            {entry.name}
          </option>
        ))}
      </select>
    </label>
  );
}
