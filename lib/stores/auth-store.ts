import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UserProfile } from '../api/mobi-assur'

interface AuthState {
  user: UserProfile | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  login: (accessToken: string, refreshToken: string, user: UserProfile) => void
  logout: () => void
  updateUser: (user: UserProfile) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      login: (accessToken, refreshToken, user) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('mobi_access_token', accessToken)
          localStorage.setItem('mobi_refresh_token', refreshToken)
        }
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
        })
      },
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('mobi_access_token')
          localStorage.removeItem('mobi_refresh_token')
        }
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        })
      },
      updateUser: (user) => set({ user }),
    }),
    {
      name: 'mobi-auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
