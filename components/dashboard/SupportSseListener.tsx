'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useSupportNotificationsStore } from '@/lib/stores/support-notifications-store'
import { useTranslations } from 'next-intl'

/**
 * Abonnement SSE passif global (dashboard) pour les notifications temps réel.
 * Le frontend écoute uniquement le flux Server-Sent Events émises par le backend.
 */
export function SupportSseListener() {
  const t = useTranslations('supportSse')
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
  const tRef = useRef(t)
  pathnameRef.current = pathname
  userIdRef.current = userId
  routerRef.current = router
  tRef.current = t

  // Connexion SSE passive : écoute les événements diffusés par le backend
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
        queryClient.invalidateQueries({ queryKey: ['messages'] })
        queryClient.invalidateQueries({ queryKey: ['conversation-messages'] })
        queryClient.invalidateQueries({ queryKey: ['support-conversations'] })

        const me = userIdRef.current
        if (me && data.sender_id?.toString() === me.toString()) return

        const before = useSupportNotificationsStore.getState().items.length
        pushInboundFromMessage(data, { currentUserId: me })
        const after = useSupportNotificationsStore.getState().items.length
        if (after <= before) return

        const preview =
          data.content && data.content !== '[Message Vocal]'
            ? data.content
            : data.content === '[Message Vocal]'
              ? tRef.current('voice')
              : tRef.current('newMessage')

        const path = pathnameRef.current
        if (!path?.includes('/support')) {
          toast.message(tRef.current('from', { name: data.sender_name || tRef.current('agent') }), {
            description: preview,
            action: {
              label: tRef.current('open'),
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
        queryClient.invalidateQueries({ queryKey: ['support-conversations'] })
        const before = useSupportNotificationsStore.getState().items.length
        push({
          id: `ticket-${ticketId}`,
          ticketId,
          title: tRef.current('newTicket'),
          body: data.subject || tRef.current('ticketBody'),
          createdAt: data.created_at || new Date().toISOString(),
        })
        const after = useSupportNotificationsStore.getState().items.length
        if (after <= before) return
        if (!pathnameRef.current?.includes('/support')) {
          toast.info(tRef.current('newTicket'), {
            description: data.subject,
          })
        }
      } catch (err) {
        console.error('SSE support_ticket_created parse error', err)
      }
    }

    const onMessageRead = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { ticket_id?: string }
        const ticketId = data.ticket_id?.toString()
        if (!ticketId) return
        queryClient.invalidateQueries({ queryKey: ['tickets'] })
        queryClient.invalidateQueries({ queryKey: ['messages'] })
        queryClient.invalidateQueries({ queryKey: ['conversation-messages'] })
        queryClient.invalidateQueries({ queryKey: ['support-conversations'] })
      } catch (err) {
        console.error('SSE message_read parse error', err)
      }
    }

    eventSource.addEventListener('new_message', onNewMessage)
    eventSource.addEventListener('support_ticket_created', onTicketCreated)
    eventSource.addEventListener('message_read', onMessageRead)

    eventSource.onerror = () => {
      if (eventSource.readyState !== EventSource.CLOSED) return
      void fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' })
        .then(async (response) => {
          if (response.status === 401) {
            const { forceSessionExpiredLogout } = await import(
              '@/lib/auth/session-expired'
            )
            await forceSessionExpiredLogout(
              'Session expirée. Veuillez vous reconnecter.',
            )
          }
        })
        .catch(() => undefined)
    }

    return () => {
      eventSource.removeEventListener('new_message', onNewMessage)
      eventSource.removeEventListener('support_ticket_created', onTicketCreated)
      eventSource.removeEventListener('message_read', onMessageRead)
      eventSource.close()
    }
  }, [queryClient, push, pushInboundFromMessage])

  return null
}
