'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useSupportNotificationsStore } from '@/lib/stores/support-notifications-store'

/**
 * Abonnement SSE global (dashboard) pour les messages / tickets support.
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

        // Ignorer ses propres messages
        if (userId && data.sender_id?.toString() === userId.toString()) return

        pushInboundFromMessage(data, { currentUserId: userId })

        const preview =
          data.content && data.content !== '[Message Vocal]'
            ? data.content
            : data.content === '[Message Vocal]'
              ? 'Message vocal reçu'
              : 'Nouveau message support'

        // Toast seulement hors page support (évite le spam)
        if (!pathname?.includes('/support')) {
          toast.message(`Message de ${data.sender_name || 'agent'}`, {
            description: preview,
            action: {
              label: 'Ouvrir',
              onClick: () => {
                const locale = pathname?.split('/')[1] || 'fr'
                router.push(`/${locale}/dashboard/support`)
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
        push({
          id: `ticket-${ticketId}`,
          ticketId,
          title: 'Nouveau ticket support',
          body: data.subject || 'Ticket ouvert par un agent',
          createdAt: data.created_at || new Date().toISOString(),
        })
        if (!pathname?.includes('/support')) {
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
  }, [queryClient, push, pushInboundFromMessage, userId, pathname, router])

  return null
}
