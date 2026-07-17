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

export type InboundMessageLike = {
  id?: string
  ticket_id?: string
  sender_id?: string
  sender_name?: string
  content?: string
  created_at?: string
}

type SupportNotificationsState = {
  items: SupportNotification[]
  unreadCount: number
  push: (item: Omit<SupportNotification, 'read'>) => void
  pushInboundFromMessage: (
    message: InboundMessageLike,
    opts?: { currentUserId?: string | null; skipTicketId?: string | null },
  ) => void
  markAllRead: () => void
  markTicketRead: (ticketId: string) => void
  clear: () => void
}

function previewBody(content?: string): string {
  if (!content) return 'Nouveau message support'
  if (content === '[Message Vocal]' || content === '[Signalement vocal]') {
    return 'Message vocal reçu'
  }
  return content
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
  pushInboundFromMessage: (message, opts) => {
    const ticketId = message.ticket_id?.toString()
    if (!ticketId) return
    if (opts?.skipTicketId && opts.skipTicketId === ticketId) return
    const senderId = message.sender_id?.toString()
    if (
      opts?.currentUserId &&
      senderId &&
      senderId === opts.currentUserId.toString()
    ) {
      return
    }
    const id = message.id?.toString() || `${ticketId}-${Date.now()}`
    get().push({
      id,
      ticketId,
      title: message.sender_name || 'Support',
      body: previewBody(message.content),
      createdAt: message.created_at || new Date().toISOString(),
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
