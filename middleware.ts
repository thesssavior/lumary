// middleware.ts
import type { NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'

// 1️⃣ Setup next-intl middleware
const intlMiddleware = createIntlMiddleware({
  locales: ['ko', 'en'],
  defaultLocale: 'ko',
  localePrefix: 'always',
  localeDetection: true,
})

// Only using next-intl middleware now
export async function middleware(request: NextRequest) {
  return await intlMiddleware(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (your static image folder)
     * Matcher needs to run on the root for locale detection.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images).*?)'
  ],
}
