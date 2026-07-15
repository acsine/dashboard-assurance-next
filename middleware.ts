import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'
import { readSession, SESSION_COOKIE } from './lib/auth/session'
import { can } from './lib/auth/roles'

const intlMiddleware = createMiddleware(routing)

export default async function middleware(request: NextRequest) {
  const dashboardMatch = request.nextUrl.pathname.match(/^\/([^/]+)\/dashboard(?:\/|$)/)
  if (dashboardMatch) {
    const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value)
    if (!session || !can(session.user.role, 'portal:access')) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = `/${dashboardMatch[1]}/login`
      loginUrl.search = ''
      return NextResponse.redirect(loginUrl)
    }
  }
  return intlMiddleware(request)
}

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
}
