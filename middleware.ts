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

// 👇 Match routes for i18n (and auth if needed)
export const config = {
  // Apply i18n middleware only to page routes (excluding API routes, Next.js internals, and static files)
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'
  ],
};
