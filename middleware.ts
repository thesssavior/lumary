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
  matcher: ['/', '/(ko|en)/:path*']
}
