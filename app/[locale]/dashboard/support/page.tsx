'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { proxiedAssetUrl, supportApi } from '@/lib/api/mobi-assur'
import Header from '@/components/dashboard/Header'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  MessageSquare,
  Send,
  Play,
  Pause,
  Volume2,
  Clock,
  CheckCircle,
  Phone,
  Search,
} from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useSupportNotificationsStore } from '@/lib/stores/support-notifications-store'
import { can, ROLES } from '@/lib/auth/roles'
import { SupportContactsPanel } from '@/components/dashboard/SupportContactsPanel'

function formatParticipantLabel(name?: string | null, email?: string | null, code?: string | null) {
  if (name?.trim()) return name.trim()
  if (email?.trim()) return email.trim()
  if (code?.trim()) return code.trim()
  return 'Interlocuteur'
}

export default function SupportPage() {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const currentUserId = useAuthStore((s) => s.user?.id)
  const currentRole = useAuthStore((s) => s.user?.role)
  const canReply =
    can(currentRole, 'agency:mutate') || can(currentRole, 'agency:prepare')
  const canManageContacts = currentRole === ROLES.ADMIN
  const markTicketRead = useSupportNotificationsStore((s) => s.markTicketRead)
  const pushInboundFromMessage = useSupportNotificationsStore(
    (s) => s.pushInboundFromMessage,
  )
  const [leftTab, setLeftTab] = useState<'tickets' | 'contacts'>('tickets')
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [messageText, setMessageText] = useState('')
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['support-conversations', debouncedSearch],
    queryFn: () => supportApi.listConversations(debouncedSearch || undefined),
    refetchInterval: 20_000,
  })

  // Résolution deep-link ?ticket=… → discussion agent
  const { data: tickets = [] } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => supportApi.listTickets(),
    refetchInterval: 60_000,
  })

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['conversation-messages', selectedAgentId],
    queryFn: () =>
      selectedAgentId
        ? supportApi.getConversationMessages(selectedAgentId)
        : Promise.resolve([]),
    enabled: !!selectedAgentId,
    refetchInterval: selectedAgentId ? 12_000 : false,
  })

  const sendMessageMutation = useMutation({
    mutationFn: ({ agentId, content }: { agentId: string; content: string }) =>
      supportApi.sendConversationMessage(agentId, content),
    onSuccess: () => {
      setMessageText('')
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', selectedAgentId] })
      queryClient.invalidateQueries({ queryKey: ['support-conversations'] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur d'envoi")
    },
  })

  useEffect(() => {
    const ticketFromUrl = searchParams.get('ticket')
    const agentFromUrl = searchParams.get('agent')
    if (agentFromUrl) {
      setSelectedAgentId(agentFromUrl)
      return
    }
    if (ticketFromUrl) {
      const ticket = tickets.find((t) => t.id === ticketFromUrl)
      if (ticket?.agent_id) {
        setSelectedAgentId(ticket.agent_id)
        markTicketRead(ticketFromUrl)
      } else {
        const viaLatest = conversations.find((c) => c.latest_ticket_id === ticketFromUrl)
        if (viaLatest) {
          setSelectedAgentId(viaLatest.participant_id)
          markTicketRead(ticketFromUrl)
        }
      }
    }
  }, [searchParams, tickets, conversations, markTicketRead])

  useEffect(() => {
    if (!selectedAgentId) return
    const conv = conversations.find((c) => c.participant_id === selectedAgentId)
    if (conv?.latest_ticket_id) markTicketRead(conv.latest_ticket_id)
  }, [selectedAgentId, conversations, markTicketRead])

  useEffect(() => {
    if (!selectedAgentId || !currentUserId || messages.length === 0) return
    const hasUnreadInbound = messages.some(
      (m) =>
        !m.read_at &&
        m.sender_id?.toString() !== currentUserId.toString(),
    )
    if (!hasUnreadInbound) return
    void supportApi.markConversationRead(selectedAgentId).then(() => {
      queryClient.invalidateQueries({ queryKey: ['support-conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', selectedAgentId] })
    }).catch(() => undefined)
  }, [selectedAgentId, currentUserId, messages, queryClient])

  const seenMessageIdsRef = useRef<Set<string>>(new Set())
  const bellPrimedRef = useRef(false)
  useEffect(() => {
    if (conversations.length === 0) return
    let cancelled = false
    const syncOtherConversations = async () => {
      const others = conversations.filter((c) => c.participant_id !== selectedAgentId)
      for (const conv of others.slice(0, 12)) {
        try {
          const msgs = await supportApi.getConversationMessages(conv.participant_id)
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
              { ...m, ticket_id: m.ticket_id || conv.latest_ticket_id || conv.participant_id },
              {
                currentUserId: currentUserId,
                skipTicketId: selectedAgentId
                  ? conversations.find((c) => c.participant_id === selectedAgentId)
                      ?.latest_ticket_id
                  : null,
              },
            )
          }
        } catch {
          // ignore
        }
      }
      bellPrimedRef.current = true
    }
    void syncOtherConversations()
    const timer = setInterval(() => void syncOtherConversations(), 15_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [conversations, selectedAgentId, currentUserId, pushInboundFromMessage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAgentId || !messageText.trim()) return
    sendMessageMutation.mutate({ agentId: selectedAgentId, content: messageText })
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

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.participant_id === selectedAgentId) || null,
    [conversations, selectedAgentId],
  )

  return (
    <div className="flex-1 flex flex-col bg-slate-50 h-screen overflow-hidden">
      <Header
        title="Support & Assistance Agents"
        subtitle="Une discussion par agent — recherchez un interlocuteur et suivez les messages non lus."
      />

      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        <Card className="w-80 border-slate-200 shadow-sm flex flex-col bg-white overflow-hidden">
          {canManageContacts && (
            <div className="flex border-b border-slate-100">
              <button
                type="button"
                onClick={() => setLeftTab('tickets')}
                className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider border-0 cursor-pointer ${
                  leftTab === 'tickets'
                    ? 'bg-white text-blue-700 border-b-2 border-blue-600'
                    : 'bg-slate-50 text-slate-500'
                }`}
              >
                Discussions
              </button>
              <button
                type="button"
                onClick={() => setLeftTab('contacts')}
                className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider border-0 cursor-pointer ${
                  leftTab === 'contacts'
                    ? 'bg-white text-blue-700 border-b-2 border-blue-600'
                    : 'bg-slate-50 text-slate-500'
                }`}
              >
                <span className="inline-flex items-center justify-center gap-1">
                  <Phone className="h-3 w-3" /> Numéros
                </span>
              </button>
            </div>
          )}

          {leftTab === 'contacts' && canManageContacts ? (
            <SupportContactsPanel />
          ) : (
            <>
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Discussions
                </h3>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type="search"
                    placeholder="Rechercher un agent…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-8 text-xs border-slate-200 rounded-lg bg-white"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {conversationsLoading ? (
                  <div className="p-8 text-center text-xs text-slate-400">Chargement...</div>
                ) : conversations.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    {debouncedSearch
                      ? 'Aucun agent trouvé pour cette recherche'
                      : 'Aucune discussion'}
                  </div>
                ) : (
                  conversations.map((c) => {
                    const isSelected = selectedAgentId === c.participant_id
                    const unread = c.unread_count || 0
                    return (
                      <button
                        key={c.participant_id}
                        type="button"
                        onClick={() => setSelectedAgentId(c.participant_id)}
                        className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex flex-col gap-1 border-0 cursor-pointer ${
                          isSelected ? 'bg-blue-50/50 border-r-4 border-blue-600' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start w-full gap-2">
                          <span className="font-semibold text-xs text-slate-900 truncate flex-1">
                            {formatParticipantLabel(
                              c.participant_name,
                              c.participant_email,
                              c.participant_code,
                            )}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {unread > 0 && (
                              <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                                {unread > 99 ? '99+' : unread}
                              </span>
                            )}
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                c.open_ticket_count > 0 || c.status === 'OUVERT'
                                  ? 'bg-red-50 text-red-600'
                                  : 'bg-green-50 text-green-600'
                              }`}
                            >
                              {c.open_ticket_count > 0 ? 'OUVERT' : c.status}
                            </span>
                          </div>
                        </div>
                        {c.participant_code && (
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            {c.participant_code}
                            {c.participant_email ? ` · ${c.participant_email}` : ''}
                          </p>
                        )}
                        {c.last_message_preview && (
                          <p className="text-[11px] text-slate-500 truncate w-full">
                            {c.last_message_preview}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                          <Clock className="h-3 w-3" />
                          <span>
                            {c.last_activity_at
                              ? new Date(c.last_activity_at).toLocaleString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </span>
                          <span>•</span>
                          <span>
                            {c.ticket_count} fil{c.ticket_count > 1 ? 's' : ''}
                          </span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </>
          )}
        </Card>

        <Card className="flex-1 border-slate-200 shadow-sm flex flex-col bg-white overflow-hidden">
          {selectedConversation ? (
            <>
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                <div>
                  <h4 className="text-sm font-bold text-slate-950">
                    {formatParticipantLabel(
                      selectedConversation.participant_name,
                      selectedConversation.participant_email,
                      selectedConversation.participant_code,
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedConversation.participant_type === 'CLIENT' ? 'Client' : 'Agent'}
                    {selectedConversation.participant_code
                      ? ` · ${selectedConversation.participant_code}`
                      : ''}
                    {selectedConversation.participant_email
                      ? ` · ${selectedConversation.participant_email}`
                      : ''}
                    {selectedConversation.subject
                      ? ` · ${selectedConversation.subject}`
                      : ''}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Discussion active
                </span>
              </div>

              <div className="flex-1 p-6 overflow-y-auto bg-slate-55 space-y-4">
                {messagesLoading ? (
                  <div className="py-20 text-center text-xs text-slate-400">
                    Chargement de la discussion...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-400">
                    Aucun message pour l&apos;instant. Répondez ci-dessous.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = currentUserId
                      ? m.sender_id?.toString() === currentUserId.toString()
                      : m.sender_id?.toString() !== selectedConversation.participant_id
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
                                type="button"
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
                Sélectionnez un agent dans la liste pour ouvrir sa discussion.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
