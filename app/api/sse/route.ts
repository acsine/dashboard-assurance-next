import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { fetchBackend } from '@/lib/auth/backend'
import {
  readSession,
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
} from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = await cookies()
  const session = await readSession(cookieStore.get(SESSION_COOKIE)?.value)
  if (!session) return NextResponse.json({ detail: 'Non authentifié' }, { status: 401 })

  try {
    const { response: backend, session: currentSession } = await fetchBackend(
      '/agents/notifications/stream',
      session,
      { method: 'GET', headers: { Accept: 'text/event-stream' } },
    )
    const response = new NextResponse(backend.body, {
      status: backend.status,
      headers: {
        'Content-Type': backend.headers.get('content-type') ?? 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
    if (currentSession !== session) {
      response.cookies.set(SESSION_COOKIE, await signSession(currentSession), sessionCookieOptions)
    }
    return response
  } catch {
    return NextResponse.json({ detail: 'Flux indisponible' }, { status: 502 })
  }
}
