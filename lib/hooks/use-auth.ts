import { useEffect } from 'react'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useAuthStore } from '../stores/auth-store'

export function useAuth(requireAuth = true) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, user, accessToken, logout } = useAuthStore()

  useEffect(() => {
    if (typeof window === 'undefined') return

    // If auth is required but the user is not authenticated
    if (requireAuth && !isAuthenticated) {
      router.push('/login')
    }

    // If user is already authenticated and visits login page
    if (!requireAuth && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, requireAuth, router, pathname])

  return { isAuthenticated, user, accessToken, logout }
}
