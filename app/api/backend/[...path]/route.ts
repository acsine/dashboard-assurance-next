import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend } from '@/lib/auth/backend'
import { canProxy } from '@/lib/auth/roles'
import {
  readSession,
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
} from '@/lib/auth/session'

const MAX_FILE_BYTES = 10 * 1024 * 1024
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/webm',
  'audio/wav',
])

function backendPath(segments: string[], search: string): string {
  return `/${segments.map(encodeURIComponent).join('/')}${search}`
}

async function requestBody(request: NextRequest): Promise<BodyInit | undefined> {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined
  if (!request.headers.get('content-type')?.includes('multipart/form-data')) {
    const buffer = await request.arrayBuffer()
    return buffer.byteLength ? buffer : undefined
  }

  const data = await request.formData()
  for (const value of data.values()) {
    if (typeof value !== 'string') {
      if (value.size > MAX_FILE_BYTES) throw new Error('Chaque fichier est limité à 10 Mo')
      if (!ALLOWED_MIME.has(value.type)) throw new Error(`Type de fichier interdit : ${value.type || 'inconnu'}`)
    }
  }
  return data
}

async function handler(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const cookieStore = await cookies()
  const session = await readSession(cookieStore.get(SESSION_COOKIE)?.value)
  if (!session) return NextResponse.json({ detail: 'Non authentifié' }, { status: 401 })

  const { path: segments } = await context.params
  const path = backendPath(segments, request.nextUrl.search)
  if (!canProxy(session.user.role, request.method, `/${segments.join('/')}`)) {
    return NextResponse.json({ detail: 'Action interdite pour ce rôle' }, { status: 403 })
  }

  try {
    const headers = new Headers()
    const contentType = request.headers.get('content-type')
    if (contentType && !contentType.includes('multipart/form-data')) headers.set('Content-Type', contentType)
    const { response: backend, session: currentSession } = await fetchBackend(path, session, {
      method: request.method,
      headers,
      body: await requestBody(request),
    })

    const responseHeaders = new Headers()
    for (const name of ['content-type', 'content-disposition', 'cache-control']) {
      const value = backend.headers.get(name)
      if (value) responseHeaders.set(name, value)
    }
    const response = new NextResponse(backend.body, {
      status: backend.status,
      headers: responseHeaders,
    })
    if (currentSession !== session) {
      response.cookies.set(SESSION_COOKIE, await signSession(currentSession), sessionCookieOptions)
    }
    return response
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Erreur de proxy'
    const status = detail.includes('10 Mo') ? 413 : detail.includes('fichier') ? 415 : 502
    const response = NextResponse.json({ detail }, { status })
    if (detail.includes('renouvellement')) {
      response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 })
    }
    return response
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
