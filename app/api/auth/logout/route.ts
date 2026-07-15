import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { backendUrl } from '@/lib/auth/backend'
import {
  readSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from '@/lib/auth/session'

export async function POST() {
  const cookieStore = await cookies()
  const session = await readSession(cookieStore.get(SESSION_COOKIE)?.value)

  if (session) {
    await fetch(backendUrl('/auth/logout'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: session.refreshToken }),
      cache: 'no-store',
    }).catch(() => undefined)
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 })
  return response
}
