import { jwtVerify, SignJWT } from 'jose'
import { isRole, type Role } from './roles'

export const SESSION_COOKIE = 'mobi_session'
export const SESSION_MAX_AGE = 60 * 60 * 12

export interface SessionUser {
  id: string
  agency_id: string
  full_name: string
  role: Role
  email?: string
  phone?: string
  is_active: boolean
}

export interface Session {
  accessToken: string
  refreshToken: string
  user: SessionUser
}

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET
  if (!value || value.length < 32) {
    throw new Error('SESSION_SECRET doit contenir au moins 32 caractères')
  }
  return new TextEncoder().encode(value)
}

export async function signSession(session: Session): Promise<string> {
  return new SignJWT({ session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret())
}

export async function readSession(token?: string | null): Promise<Session | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] })
    const session = payload.session as Session | undefined
    if (
      !session?.accessToken ||
      !session.refreshToken ||
      !session.user?.id ||
      !session.user.agency_id ||
      !isRole(session.user.role) ||
      !session.user.is_active
    ) {
      return null
    }
    return session
  } catch {
    return null
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE,
}
