'use client'

import { create } from 'zustand'

export type SupportNotification = {
  id: string
  ticketId: string
  title: string
  body: string
  createdAt: string
  read: boolean
}

type SupportNotificationsState = {
  items: SupportNotification[]
  unreadCount: number
  push: (item: Omit<SupportNotification, 'read'>) => void
  markAllRead: () => void
  markTicketRead: (ticketId: string) => void
  clear: () => void
}

export const useSupportNotificationsStore = create<SupportNotificationsState>((set, get) => ({
  items: [],
  unreadCount: 0,
  push: (item) => {
    const existing = get().items.find((n) => n.id === item.id)
    if (existing) return
    const next = [{ ...item, read: false }, ...get().items].slice(0, 40)
    set({
      items: next,
      unreadCount: next.filter((n) => !n.read).length,
    })
  },
  markAllRead: () => {
    const next = get().items.map((n) => ({ ...n, read: true }))
    set({ items: next, unreadCount: 0 })
  },
  markTicketRead: (ticketId) => {
    const next = get().items.map((n) =>
      n.ticketId === ticketId ? { ...n, read: true } : n,
    )
    set({
      items: next,
      unreadCount: next.filter((n) => !n.read).length,
    })
  },
  clear: () => set({ items: [], unreadCount: 0 }),
}))
