'use client'

import { useAuthStore } from '@/lib/stores/auth-store'

let loggingOut = false

const KNOWN_LOCALES = new Set([
  'fr',
  'en',
  'de',
  'es',
  'it',
  'pt',
  'zh',
  'ja',
  'ar',
  'sw',
])

function loginPath(): string {
  if (typeof window === 'undefined') return '/fr/login'
  const segment = window.location.pathname.split('/').filter(Boolean)[0]
  const locale = segment && KNOWN_LOCALES.has(segment) ? segment : 'fr'
  return `/${locale}/login`
}

/**
 * Déconnexion effective sur expiration de session :
 * store auth vidé, cookie session effacé, redirection hard vers login.
 */
export async function forceSessionExpiredLogout(
  message = 'Session expirée. Veuillez vous reconnecter.',
): Promise<void> {
  if (typeof window === 'undefined') return
  if (loggingOut) return
  loggingOut = true

  try {
    useAuthStore.getState().logout()
    try {
      sessionStorage.setItem('mobi_auth_toast', message)
    } catch {
      /* ignore */
    }
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    }).catch(() => undefined)
  } finally {
    window.location.assign(loginPath())
  }
}

export function consumeAuthToast(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const msg = sessionStorage.getItem('mobi_auth_toast')
    if (msg) sessionStorage.removeItem('mobi_auth_toast')
    return msg
  } catch {
    return null
  }
}
