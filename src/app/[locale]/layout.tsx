import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { ArtworkProvider } from "@/lib/artwork-context";
import { SpoilerProvider } from "@/lib/spoiler-context";
import { WatchlistProvider } from "@/lib/watchlist/provider";
import { AppShell } from "@/components/app-shell";
import { I18nProvider } from "@/i18n/context";
import { getDictionary } from "@/i18n/dictionary";
import { LOCALES, directionOf, isLocale } from "@/i18n/config";
import { alternatesFor, SITE_NAME, SITE_URL } from "@/lib/site";
import { translate } from "@/i18n/translate";

/**
 * The root layout. It lives under `[locale]` rather than at `app/` because
 * `<html lang>` and `<html dir>` are the two attributes that make a translated
 * page actually work: they drive font selection, hyphenation, quotation marks,
 * screen-reader voice and, for Arabic and Persian, which way the entire layout
 * runs. None of that can be decided above the segment that knows the language.
 *
 * Still deliberately not `force-dynamic`: the shell reads nothing
 * request-scoped, so all fourteen languages of every page prerender.
 */

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale: locale.code }));
}

/** Only the languages we actually have. Anything else is a 404, not a guess. */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);
  const t = (key: string) => translate(dictionary, locale, key);

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t("meta.home.title"),
      template: `%s · ${SITE_NAME}`,
    },
    description: t("meta.home.description"),
    applicationName: SITE_NAME,
    keywords: [
      "Marvel",
      "MCU",
      "watch order",
      "viewing order",
      "Marvel Cinematic Universe",
      "what to watch first",
      "Marvel timeline",
    ],
    alternates: alternatesFor("/", locale),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url: `/${locale}`,
      title: t("meta.home.title"),
      description: t("meta.home.description"),
      images: [{ url: "/og.png", width: 1200, height: 630, alt: SITE_NAME }],
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title: t("meta.home.title"),
      description: t("meta.home.description"),
      images: ["/og.png"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "black-translucent" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#05070d",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dictionary = await getDictionary(locale);

  return (
    <html lang={locale} dir={directionOf(locale)}>
      <body className="antialiased">
        <I18nProvider locale={locale} dictionary={dictionary}>
          <ArtworkProvider>
            <SpoilerProvider>
              <WatchlistProvider>
                <AppShell>{children}</AppShell>
              </WatchlistProvider>
            </SpoilerProvider>
          </ArtworkProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
