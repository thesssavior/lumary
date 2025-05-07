import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'

// i18n middleware
const intlMiddleware = createIntlMiddleware({
  locales: ['ko', 'en'],
  defaultLocale: 'ko',
  localePrefix: 'always',
  localeDetection: true
})

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Skip internal or static files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.match(/\.(png|mjs)$/)
  ) {
    return NextResponse.next();
  }
  const host = request.headers.get('host') || ''

  // 🔁 Redirect old domain to new domain
  if (host.includes('ytsummarize-production.up.railway.app')) {
    const url = request.nextUrl.clone()
    url.host = 'lumary.me'
    return NextResponse.redirect(url)
  }

  // 🌐 Run i18n handling
  return intlMiddleware(request)
}

export const config = {
  matcher: ['/((?!.*\\..*).*)'], // match all except static files with extensions
};


