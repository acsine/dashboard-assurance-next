'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { supportApi } from '@/lib/api/mobi-assur'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useSupportNotificationsStore } from '@/lib/stores/support-notifications-store'

/**
 * Abonnement SSE global (dashboard) pour les messages / tickets support.
 * Filet HTTP : poll des tickets ouverts si le SSE Vercel est coupé / multi-worker.
 */
export function SupportSseListener() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const userId = useAuthStore((s) => s.user?.id)
  const push = useSupportNotificationsStore((s) => s.push)
  const pushInboundFromMessage = useSupportNotificationsStore(
    (s) => s.pushInboundFromMessage,
  )

  const pathnameRef = useRef(pathname)
  const userIdRef = useRef(userId)
  const routerRef = useRef(router)
  pathnameRef.current = pathname
  userIdRef.current = userId
  routerRef.current = router

  // SSE : connexion stable (ne pas recréer à chaque navigation)
  useEffect(() => {
    const eventSource = new EventSource('/api/sse', { withCredentials: true })

    const onNewMessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as {
          id?: string
          ticket_id?: string
          sender_id?: string
          sender_name?: string
          content?: string
          created_at?: string
        }
        const ticketId = data.ticket_id?.toString()
        if (!ticketId) return

        queryClient.invalidateQueries({ queryKey: ['tickets'] })
        queryClient.invalidateQueries({ queryKey: ['messages', ticketId] })

        const me = userIdRef.current
        if (me && data.sender_id?.toString() === me.toString()) return

        const before = useSupportNotificationsStore.getState().items.length
        pushInboundFromMessage(data, { currentUserId: me })
        const after = useSupportNotificationsStore.getState().items.length
        // Toast seulement si nouvelle notif (évite doublons canal backoffice)
        if (after <= before) return

        const preview =
          data.content && data.content !== '[Message Vocal]'
            ? data.content
            : data.content === '[Message Vocal]'
              ? 'Message vocal reçu'
              : 'Nouveau message support'

        const path = pathnameRef.current
        if (!path?.includes('/support')) {
          toast.message(`Message de ${data.sender_name || 'agent'}`, {
            description: preview,
            action: {
              label: 'Ouvrir',
              onClick: () => {
                const locale = path?.split('/')[1] || 'fr'
                routerRef.current.push(`/${locale}/dashboard/support`)
              },
            },
          })
        }
      } catch (err) {
        console.error('SSE new_message parse error', err)
      }
    }

    const onTicketCreated = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as {
          id?: string
          subject?: string
          created_at?: string
        }
        const ticketId = data.id?.toString()
        if (!ticketId) return
        queryClient.invalidateQueries({ queryKey: ['tickets'] })
        const before = useSupportNotificationsStore.getState().items.length
        push({
          id: `ticket-${ticketId}`,
          ticketId,
          title: 'Nouveau ticket support',
          body: data.subject || 'Ticket ouvert par un agent',
          createdAt: data.created_at || new Date().toISOString(),
        })
        const after = useSupportNotificationsStore.getState().items.length
        if (after <= before) return
        if (!pathnameRef.current?.includes('/support')) {
          toast.info('Nouveau ticket support', {
            description: data.subject,
          })
        }
      } catch (err) {
        console.error('SSE support_ticket_created parse error', err)
      }
    }

    eventSource.addEventListener('new_message', onNewMessage)
    eventSource.addEventListener('support_ticket_created', onTicketCreated)
    const onMessageRead = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { ticket_id?: string }
        const ticketId = data.ticket_id?.toString()
        if (!ticketId) return
        queryClient.invalidateQueries({ queryKey: ['messages', ticketId] })
      } catch (err) {
        console.error('SSE message_read parse error', err)
      }
    }
    eventSource.addEventListener('message_read', onMessageRead)
    eventSource.onerror = () => {
      // Le navigateur reconnecte EventSource automatiquement
    }

    return () => {
      eventSource.removeEventListener('new_message', onNewMessage)
      eventSource.removeEventListener('support_ticket_created', onTicketCreated)
      eventSource.removeEventListener('message_read', onMessageRead)
      eventSource.close()
    }
  }, [queryClient, push, pushInboundFromMessage])

  // Filet cloche dashboard-wide (SSE KO sur Vercel multi-worker / timeout)
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const seen = new Set<string>()
    let primed = false

    const sync = async () => {
      try {
        const tickets = await supportApi.listTickets()
        if (cancelled) return
        const open = tickets
          .filter((t) => t.status === 'OUVERT')
          .slice(0, 15)
        for (const ticket of open) {
          try {
            const msgs = await supportApi.getMessages(ticket.id)
            if (cancelled) return
            for (const m of msgs) {
              const id = m.id?.toString()
              if (!id) continue
              if (!primed) {
                seen.add(id)
                continue
              }
              if (seen.has(id)) continue
              seen.add(id)
              pushInboundFromMessage(
                { ...m, ticket_id: m.ticket_id || ticket.id },
                { currentUserId: userId },
              )
            }
          } catch {
            // ignore per-ticket
          }
        }
        primed = true
      } catch {
        // ignore list errors
      }
    }

    void sync()
    const timer = setInterval(() => void sync(), 20_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [userId, pushInboundFromMessage])

  return null
}
