import { create } from 'zustand'

interface SidebarState {
  isMobileOpen: boolean
  setIsMobileOpen: (isOpen: boolean) => void
  toggleMobileOpen: () => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isMobileOpen: false,
  setIsMobileOpen: (isOpen) => set({ isMobileOpen: isOpen }),
  toggleMobileOpen: () => set((state) => ({ isMobileOpen: !state.isMobileOpen })),
}))
