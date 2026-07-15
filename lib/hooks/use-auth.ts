import { useEffect } from 'react'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useAuthStore } from '../stores/auth-store'

export function useAuth(requireAuth = true) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isHydrated, user, login, logout, setHydrated } = useAuthStore()

  useEffect(() => {
    if (isHydrated) return
    fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Session absente')
        const data = await response.json()
        login(data.user)
      })
      .catch(() => {
        logout()
        if (requireAuth) router.replace('/login')
      })
      .finally(() => setHydrated(true))
  }, [isHydrated, login, logout, requireAuth, router, setHydrated])

  useEffect(() => {
    if (!isHydrated) return
    if (requireAuth && !isAuthenticated) router.replace('/login')
    if (!requireAuth && isAuthenticated) router.replace('/dashboard')
  }, [isAuthenticated, isHydrated, requireAuth, router, pathname])

  return { isAuthenticated, isHydrated, user, logout }
}
