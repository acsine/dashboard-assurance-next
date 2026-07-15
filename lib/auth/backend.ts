import 'server-only'

import { createHash } from 'node:crypto'
import type { Session } from './session'

interface TokenPair {
  access_token: string
  refresh_token: string
}

interface RefreshEntry {
  promise: Promise<TokenPair>
  expiresAt: number
}

const refreshes = new Map<string, RefreshEntry>()

export function backendUrl(path: string): string {
  const base = process.env.API_URL
  if (!base) throw new Error('API_URL n’est pas configurée')
  return new URL(path, `${base.replace(/\/+$/, '')}/`).toString()
}

function refreshKey(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

async function requestRefresh(refreshToken: string): Promise<TokenPair> {
  const response = await fetch(backendUrl('/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('Échec du renouvellement de session')
  return unwrap<TokenPair>(await response.json())
}

async function refreshAtomically(refreshToken: string): Promise<TokenPair> {
  const key = refreshKey(refreshToken)
  const now = Date.now()
  const current = refreshes.get(key)
  if (current && current.expiresAt > now) return current.promise

  const promise = requestRefresh(refreshToken)
  refreshes.set(key, { promise, expiresAt: now + 10_000 })
  try {
    return await promise
  } catch (error) {
    refreshes.delete(key)
    throw error
  }
}

function authorizedInit(session: Session, init: RequestInit): RequestInit {
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${session.accessToken}`)
  return { ...init, headers, cache: 'no-store' }
}

export async function fetchBackend(
  path: string,
  session: Session,
  init: RequestInit,
): Promise<{ response: Response; session: Session }> {
  let response = await fetch(backendUrl(path), authorizedInit(session, init))
  if (response.status !== 401) return { response, session }

  const pair = await refreshAtomically(session.refreshToken)
  const refreshed = {
    ...session,
    accessToken: pair.access_token,
    refreshToken: pair.refresh_token,
  }
  response = await fetch(backendUrl(path), authorizedInit(refreshed, init))
  return { response, session: refreshed }
}
