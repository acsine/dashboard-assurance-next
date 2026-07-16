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

        const preview =
          data.content && data.content !== '[Message Vocal]'
            ? data.content
            : data.content === '[Message Vocal]'
              ? 'Message vocal reçu'
              : 'Nouveau message support'

        push({
          id: data.id?.toString() || `${ticketId}-${Date.now()}`,
          ticketId,
          title: data.sender_name || 'Support',
          body: preview,
          createdAt: data.created_at || new Date().toISOString(),
        })

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
    eventSource.onerror = () => {
      // Le navigateur reconnecte EventSource automatiquement
    }

    return () => {
      eventSource.removeEventListener('new_message', onNewMessage)
      eventSource.removeEventListener('support_ticket_created', onTicketCreated)
      eventSource.close()
    }
  }, [queryClient, push, userId, pathname, router])

  return null
}
