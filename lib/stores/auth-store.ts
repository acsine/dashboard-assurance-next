import { create } from 'zustand'
import { UserProfile } from '../api/mobi-assur'

interface AuthState {
  user: UserProfile | null
  isAuthenticated: boolean
  isHydrated: boolean
  login: (user: UserProfile) => void
  logout: () => void
  updateUser: (user: UserProfile) => void
  setHydrated: (value: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isHydrated: false,
  login: (user) => set({ user, isAuthenticated: true, isHydrated: true }),
  logout: () => set({ user: null, isAuthenticated: false, isHydrated: true }),
  updateUser: (user) => set({ user }),
  setHydrated: (isHydrated) => set({ isHydrated }),
}))
