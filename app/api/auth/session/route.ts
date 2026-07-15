import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { readSession, SESSION_COOKIE } from '@/lib/auth/session'

export async function GET() {
  const cookieStore = await cookies()
  const session = await readSession(cookieStore.get(SESSION_COOKIE)?.value)
  if (!session) return NextResponse.json({ detail: 'Session absente ou expirée' }, { status: 401 })
  return NextResponse.json({ user: session.user }, { headers: { 'Cache-Control': 'no-store' } })
}
