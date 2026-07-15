import { NextResponse } from 'next/server'
import { z } from 'zod'
import { backendUrl } from '@/lib/auth/backend'
import { isRole, PORTAL_ROLES } from '@/lib/auth/roles'
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  type Session,
} from '@/lib/auth/session'

const credentialsSchema = z.object({
  login: z.string().trim().min(1),
  password: z.string().min(1),
  country_code: z.string().length(2).optional(),
})

type BackendLogin = {
  access_token: string
  refresh_token: string
  role: string
  user_id: string
  agency_id: string
  full_name: string
}

export async function POST(request: Request) {
  try {
    const credentials = credentialsSchema.parse(await request.json())
    const backend = await fetch(backendUrl('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      cache: 'no-store',
    })
    const payload = await backend.json().catch(() => null)
    if (!backend.ok) return NextResponse.json(payload ?? { detail: 'Connexion refusée' }, { status: backend.status })

    const data = (payload?.data ?? payload) as BackendLogin
    if (
      !data.access_token ||
      !data.refresh_token ||
      !data.user_id ||
      !data.agency_id ||
      !isRole(data.role)
    ) {
      return NextResponse.json({ detail: 'Réponse d’authentification invalide' }, { status: 502 })
    }
    if (!PORTAL_ROLES.includes(data.role)) {
      await fetch(backendUrl('/auth/logout'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${data.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: data.refresh_token }),
      }).catch(() => undefined)
      return NextResponse.json({ detail: 'Ce rôle n’est pas autorisé sur le portail' }, { status: 403 })
    }

    const session: Session = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      user: {
        id: data.user_id,
        agency_id: data.agency_id,
        full_name: data.full_name,
        role: data.role,
        is_active: true,
      },
    }
    const response = NextResponse.json({ user: session.user })
    response.cookies.set(SESSION_COOKIE, await signSession(session), sessionCookieOptions)
    return response
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Requête invalide'
    const status = error instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ detail }, { status })
  }
}
