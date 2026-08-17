import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale, negotiateLocale } from "@/i18n/config";

/**
 * Puts every visitor on a language.
 *
 * Two jobs:
 *
 * 1. A request with no locale prefix (`/`, `/title/loki` - the URLs this site
 *    had before it spoke more than one language) is redirected to the same path
 *    under a locale. Old links and existing search results therefore keep
 *    working rather than 404ing, which is why this is a redirect and not a
 *    rewrite: the locale belongs in the address bar, so that copying the URL
 *    copies the language too.
 * 2. Which locale that is: the `NEXT_LOCALE` cookie if the reader has chosen
 *    one, otherwise their browser's `Accept-Language`, otherwise English.
 */

const COOKIE = "NEXT_LOCALE";

/**
 * Paths that are not pages and must never be given a language prefix: the API,
 * Next's own assets, and the crawler files, which are single documents for the
 * whole site rather than one per language.
 */
const EXEMPT = /^\/(?:api|_next|favicon\.ico|robots\.txt|sitemap\.xml|og\.png|.*\.[a-z0-9]+$)/i;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (EXEMPT.test(pathname)) return NextResponse.next();

  const [, first] = pathname.split("/");
  if (first && isLocale(first)) return NextResponse.next();

  const cookie = request.cookies.get(COOKIE)?.value;
  const locale =
    cookie && isLocale(cookie)
      ? cookie
      : negotiateLocale(request.headers.get("accept-language")) || DEFAULT_LOCALE;

  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except Next's internals; the handler above does the finer
  // filtering, so the two lists cannot drift apart in a way that 404s a page.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
