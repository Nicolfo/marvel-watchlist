"use client";

import { useI18n } from "@/i18n/context";
import { BuyMeACoffeeButton } from "./buy-me-a-coffee";

export function SupportSection({ href }: { href: string | null }) {
  const { t } = useI18n();

  return (
    <section
      id="support"
      aria-labelledby="support-heading"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-muted">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
            <path
              d="M5 8h12v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Zm12 1h1a3 3 0 1 1 0 6h-1M8 3v2m4-2v2M3 21h16"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div>
          <h2 id="support-heading" className="text-sm font-medium text-text">
            {t("support.heading")}
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">{t("support.body")}</p>
        </div>
      </div>
      {href ? (
        <BuyMeACoffeeButton href={href} className="self-start sm:self-auto" />
      ) : (
        <div className="flex shrink-0 flex-col items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            disabled
            aria-describedby="support-coming-soon"
            className="min-h-11 cursor-not-allowed rounded-lg border border-edge px-3 py-2 text-xs font-medium text-muted"
          >
            {t("support.cta")}
          </button>
          <p id="support-coming-soon" className="text-xs text-muted">
            {t("support.comingSoon")}
          </p>
        </div>
      )}
    </section>
  );
}
