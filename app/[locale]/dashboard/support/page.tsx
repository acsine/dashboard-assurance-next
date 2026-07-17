'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { proxiedAssetUrl, supportApi } from '@/lib/api/mobi-assur'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { MessageSquare, Send, Play, Pause, Volume2, Clock, CheckCircle } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useSupportNotificationsStore } from '@/lib/stores/support-notifications-store'
import { can } from '@/lib/auth/roles'

function formatAgentReference(agentId?: string, agentEmail?: string): string {
  if (agentEmail) return agentEmail
  if (!agentId) return 'Non renseigné'
  return agentId.length > 8 ? agentId.substring(0, 8).toUpperCase() : agentId.toUpperCase()
}

export default function SupportPage() {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const currentUserId = useAuthStore((s) => s.user?.id)
  const currentRole = useAuthStore((s) => s.user?.role)
  const canReply =
    can(currentRole, 'agency:mutate') || can(currentRole, 'agency:prepare')
  const markTicketRead = useSupportNotificationsStore((s) => s.markTicketRead)
  const pushInboundFromMessage = useSupportNotificationsStore(
    (s) => s.pushInboundFromMessage,
  )
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => supportApi.listTickets(),
    refetchInterval: 20_000,
  })

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedTicketId],
    queryFn: () =>
      selectedTicketId ? supportApi.getMessages(selectedTicketId) : Promise.resolve([]),
    enabled: !!selectedTicketId,
    refetchInterval: selectedTicketId ? 12_000 : false,
  })

  const sendMessageMutation = useMutation({
    mutationFn: ({ ticketId, content }: { ticketId: string; content: string }) =>
      supportApi.sendMessage(ticketId, content),
    onSuccess: () => {
      setMessageText('')
      queryClient.invalidateQueries({ queryKey: ['messages', selectedTicketId] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur d'envoi")
    },
  })

  // Deep-link ?ticket=...
  useEffect(() => {
    const ticketFromUrl = searchParams.get('ticket')
    if (ticketFromUrl) {
      setSelectedTicketId(ticketFromUrl)
      markTicketRead(ticketFromUrl)
    }
  }, [searchParams, markTicketRead])

  useEffect(() => {
    if (selectedTicketId) markTicketRead(selectedTicketId)
  }, [selectedTicketId, markTicketRead])

  // Accusé de lecture serveur dès que le fil est affiché.
  useEffect(() => {
    if (!selectedTicketId || !currentUserId || messages.length === 0) return
    const hasUnreadInbound = messages.some(
      (m) =>
        !m.read_at &&
        m.sender_id?.toString() !== currentUserId.toString(),
    )
    if (!hasUnreadInbound) return
    void supportApi.markMessagesRead(selectedTicketId).catch(() => undefined)
  }, [selectedTicketId, currentUserId, messages])

  // Filet cloche : poll messages des tickets non sélectionnés (si SSE KO).
  // Premier passage = amorçage (pas de badge), puis uniquement les nouveaux ids.
  const seenMessageIdsRef = useRef<Set<string>>(new Set())
  const bellPrimedRef = useRef(false)
  useEffect(() => {
    if (tickets.length === 0) return
    let cancelled = false
    const syncOtherTickets = async () => {
      const others = tickets.filter((t) => t.id !== selectedTicketId)
      for (const ticket of others.slice(0, 12)) {
        try {
          const msgs = await supportApi.getMessages(ticket.id)
          if (cancelled) return
          for (const m of msgs) {
            const id = m.id?.toString()
            if (!id) continue
            if (!bellPrimedRef.current) {
              seenMessageIdsRef.current.add(id)
              continue
            }
            if (seenMessageIdsRef.current.has(id)) continue
            seenMessageIdsRef.current.add(id)
            pushInboundFromMessage(
              { ...m, ticket_id: m.ticket_id || ticket.id },
              {
                currentUserId: currentUserId,
                skipTicketId: selectedTicketId,
              },
            )
          }
        } catch {
          // ignore per-ticket errors
        }
      }
      bellPrimedRef.current = true
    }
    void syncOtherTickets()
    const timer = setInterval(() => void syncOtherTickets(), 15_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [tickets, selectedTicketId, currentUserId, pushInboundFromMessage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicketId || !messageText.trim()) return
    sendMessageMutation.mutate({ ticketId: selectedTicketId, content: messageText })
  }

  const togglePlayAudio = (url: string) => {
    const fullUrl = proxiedAssetUrl(url)

    if (playingAudioUrl === url) {
      audioRef.current?.pause()
      setPlayingAudioUrl(null)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      const audio = new Audio(fullUrl)
      audio.play().catch(() => toast.error('Lecture audio impossible'))
      audio.onended = () => setPlayingAudioUrl(null)
      audioRef.current = audio
      setPlayingAudioUrl(url)
    }
  }

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId)

  return (
    <div className="flex-1 flex flex-col bg-slate-50 h-screen overflow-hidden">
      <Header
        title="Support & Assistance Agents"
        subtitle="Échangez en direct avec vos agents sur le terrain et écoutez leurs signalements vocaux."
      />

      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        <Card className="w-80 border-slate-200 shadow-sm flex flex-col bg-white">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Tickets Actifs
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {ticketsLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">Chargement...</div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">Aucun ticket de support</div>
            ) : (
              tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex flex-col gap-1 border-0 cursor-pointer ${
                    selectedTicketId === t.id ? 'bg-blue-50/50 border-r-4 border-blue-600' : ''
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="font-semibold text-xs text-slate-900 truncate w-3/4">
                      {t.subject}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        t.status === 'OUVERT'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-green-50 text-green-600'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  {t.description && (
                    <p className="text-[11px] text-slate-500 truncate w-full">{t.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(t.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="font-mono">
                      {formatAgentReference(t.agent_id, t.agent_email)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="flex-1 border-slate-200 shadow-sm flex flex-col bg-white overflow-hidden">
          {selectedTicket ? (
            <>
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                <div>
                  <h4 className="text-sm font-bold text-slate-950">{selectedTicket.subject}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Canal :{' '}
                    <span className="font-semibold text-blue-600">{selectedTicket.channel}</span> •
                    Agent :{' '}
                    <span className="font-semibold font-mono">
                      {formatAgentReference(selectedTicket.agent_id, selectedTicket.agent_email)}
                    </span>
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Support Actif
                </span>
              </div>

              <div className="flex-1 p-6 overflow-y-auto bg-slate-55 space-y-4">
                {selectedTicket.description && (
                  <div className="flex justify-start">
                    <div className="max-w-[70%] bg-slate-100 border border-slate-200 text-slate-800 p-3 rounded-2xl rounded-tl-none">
                      <span className="text-[9px] font-bold text-slate-400 block mb-1">
                        DESCRIPTION TICKET
                      </span>
                      <p className="text-xs leading-relaxed">{selectedTicket.description}</p>
                    </div>
                  </div>
                )}

                {messagesLoading ? (
                  <div className="py-20 text-center text-xs text-slate-400">
                    Chargement de la discussion...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-400">
                    Aucun message pour l&apos;instant. Répondez à l&apos;agent ci-dessous.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = currentUserId
                      ? m.sender_id?.toString() === currentUserId.toString()
                      : selectedTicket.agent_id
                        ? m.sender_id?.toString() !== selectedTicket.agent_id.toString()
                        : false
                    const audioUrl = m.voice_playback_url || m.voice_url
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-2xl ${
                            isMe
                              ? 'bg-blue-600 text-white rounded-tr-none'
                              : 'bg-slate-100 border border-slate-200 text-slate-800 rounded-tl-none'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider block ${
                                isMe ? 'text-blue-200' : 'text-slate-400'
                              }`}
                            >
                              {m.sender_name}
                            </span>
                            <span
                              className={`text-[8px] block ${
                                isMe ? 'text-blue-300' : 'text-slate-400'
                              }`}
                            >
                              {new Date(m.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          {m.content &&
                            m.content !== '[Message Vocal]' &&
                            m.content !== '[Signalement vocal]' && (
                              <p className="text-xs leading-relaxed">{m.content}</p>
                            )}

                          {isMe && m.read_at && (
                            <p className="mt-1 text-[10px] font-semibold text-green-400 text-right">
                              Lu
                            </p>
                          )}

                          {audioUrl && (
                            <div className="mt-2 flex items-center gap-2 bg-black/5 p-2 rounded-xl border border-black/10">
                              <button
                                onClick={() => togglePlayAudio(audioUrl)}
                                className="h-8 w-8 rounded-full bg-blue-500 hover:bg-blue-400 text-white flex items-center justify-center cursor-pointer border-0 active:scale-95 transition-all"
                              >
                                {playingAudioUrl === audioUrl ? (
                                  <Pause className="h-3.5 w-3.5 fill-current" />
                                ) : (
                                  <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                                )}
                              </button>
                              <div className="flex-1">
                                <span className="text-[10px] font-bold block">Message Vocal</span>
                                <span className="text-[8px] opacity-70 block">
                                  Cliquez pour écouter
                                </span>
                              </div>
                              <Volume2 className="h-4 w-4 text-blue-500 opacity-80" />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {canReply && (
                <form
                  onSubmit={handleSend}
                  className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50/50"
                >
                  <Input
                    placeholder="Tapez votre réponse ici..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1 h-11 text-xs border-slate-200 rounded-xl bg-white"
                    disabled={sendMessageMutation.isPending}
                  />
                  <button
                    type="submit"
                    disabled={sendMessageMutation.isPending || !messageText.trim()}
                    className="h-11 px-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10 cursor-pointer border-0 flex items-center justify-center disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 p-8">
              <MessageSquare className="h-16 w-16 text-slate-200 mb-4" />
              <h4 className="text-sm font-bold text-slate-700">Aucune conversation sélectionnée</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Sélectionnez un ticket dans la liste latérale pour débuter l&apos;assistance en
                direct.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
