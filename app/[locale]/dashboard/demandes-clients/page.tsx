'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import SearchableSelect from '@/components/ui/searchable-select'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Loader2,
  Inbox,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Send,
  Search,
  X,
  Eye,
  Layers,
  HelpCircle
} from 'lucide-react'
import { asList, portalClientApi, type ClientRequestItem } from '@/lib/api/mobi-assur'
import { useTranslations } from 'next-intl'

const STATUSES = ['OUVERT', 'EN_COURS', 'RESOLU', 'REJETE', 'CLOS'] as const

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  OUVERT: { label: 'Ouvert', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200/60' },
  EN_COURS: { label: 'En cours', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/60' },
  RESOLU: { label: 'Résolu', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/60' },
  REJETE: { label: 'Rejeté', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200/60' },
  CLOS: { label: 'Clos', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
}

function formatReadableDate(d?: string | null) {
  if (!d) return '—'
  try {
    const date = new Date(d)
    if (isNaN(date.getTime())) return d
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return d
  }
}

export default function DemandesClientsPage() {
  const t = useTranslations('demandes')
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selected, setSelected] = useState<ClientRequestItem | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [newStatus, setNewStatus] = useState('EN_COURS')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-client-requests', statusFilter],
    queryFn: () => portalClientApi.listRequests(statusFilter || undefined),
  })
  const items = asList<ClientRequestItem>(data)

  const updateMut = useMutation({
    mutationFn: () =>
      portalClientApi.updateRequest(selected!.id, {
        status: newStatus,
        admin_note: adminNote || undefined,
      }),
    onSuccess: () => {
      toast.success('Demande mise à jour avec succès')
      setAdminNote('')
      setSelected(null)
      qc.invalidateQueries({ queryKey: ['admin-client-requests'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const filteredItems = useMemo(() => {
    return items.filter((r) => {
      const matchesStatus = !statusFilter || r.status === statusFilter
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        r.subject.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        (r.request_type || '').toLowerCase().includes(q)
      return matchesStatus && matchesSearch
    })
  }, [items, statusFilter, searchQuery])

  // Macro KPIs
  const totalCount = items.length
  const openCount = items.filter((r) => r.status === 'OUVERT').length
  const inProgressCount = items.filter((r) => r.status === 'EN_COURS').length
  const resolvedCount = items.filter((r) => ['RESOLU', 'CLOS'].includes(r.status)).length

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8 bg-slate-50 min-h-screen">
      <Header
        title={t('title')}
        subtitle={t('subtitle')}
      />

      {/* 4 Macro KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Demandes & Avenants</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalCount}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
            <Layers className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nouvelles Demandes</p>
            <p className="text-2xl font-black text-blue-700 mt-1">{openCount}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
            <HelpCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">En Cours de Traitement</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{inProgressCount}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Demandes Résolues</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{resolvedCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher par sujet, type, N° ticket..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="w-full sm:w-60">
          <SearchableSelect
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            placeholder={`Tous les statuts (${items.length})`}
            options={[
              { value: '', label: `Tous les statuts (${items.length})` },
              ...STATUSES.map((s) => ({
                value: s,
                label: STATUS_CONFIG[s]?.label || s,
              })),
            ]}
          />
        </div>
      </div>

      {/* Full-Width Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-xs font-semibold">Chargement des requêtes...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-2">
            <div className="p-4 bg-slate-50 rounded-full border border-slate-200">
              <Inbox className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-800 mt-2">
              {searchQuery ? 'Aucun ticket correspondant' : 'Aucune demande trouvée'}
            </p>
            <p className="text-xs text-slate-500">
              {searchQuery ? `Aucun résultat pour "${searchQuery}".` : 'Aucune requête ne correspond aux critères.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75">
                  <th className="py-3.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Ticket & Horodatage
                  </th>
                  <th className="py-3.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Type de demande
                  </th>
                  <th className="py-3.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Sujet de la requête
                  </th>
                  <th className="py-3.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="py-3.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredItems.map((r) => {
                  const statusCfg = STATUS_CONFIG[r.status] || {
                    label: r.status,
                    bg: 'bg-slate-100',
                    text: 'text-slate-700',
                    border: 'border-slate-200',
                  }

                  return (
                    <tr
                      key={r.id}
                      onClick={() => {
                        setSelected(r)
                        setNewStatus(r.status)
                        setAdminNote(r.admin_note || '')
                      }}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-5">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-black text-blue-700 group-hover:underline">
                            #{r.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatReadableDate(r.created_at)}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <span className="text-[10px] font-extrabold text-blue-700 px-2 py-0.5 rounded-md bg-blue-100/60 uppercase tracking-wider">
                          {r.request_type || 'TICKET'}
                        </span>
                      </td>

                      <td className="py-4 px-5 max-w-md">
                        <p className="font-bold text-slate-900 truncate">{r.subject}</p>
                        {r.body && <p className="text-[11px] text-slate-500 truncate mt-0.5">{r.body}</p>}
                      </td>

                      <td className="py-4 px-5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-extrabold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                        >
                          {statusCfg.label}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelected(r)
                            setNewStatus(r.status)
                            setAdminNote(r.admin_note || '')
                          }}
                          className="h-8 px-3 text-xs font-bold rounded-xl bg-blue-50/70 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all inline-flex items-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Traiter
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Traitement Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-extrabold text-blue-700 px-2 py-0.5 rounded-md bg-blue-100/60 uppercase tracking-wider">
                  {selected.request_type}
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">{selected.subject}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Créé le {formatReadableDate(selected.created_at)} • Réf: #{selected.id.slice(0, 8).toUpperCase()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              {/* Message Client */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Message / Requête de l'assuré</h4>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                  {selected.body || 'Aucun détail fourni.'}
                </div>
              </div>

              {/* Note interne précédente */}
              {selected.admin_note && (
                <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 space-y-1">
                  <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                    Dernière note interne enregistrée
                  </p>
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">{selected.admin_note}</p>
                </div>
              )}

              {/* Formulaire de mise à jour */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Send className="h-3.5 w-3.5 text-blue-600" />
                  Mettre à jour le statut du ticket
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Nouveau Statut</label>
                    <SearchableSelect
                      value={newStatus}
                      onChange={(val) => setNewStatus(val)}
                      options={STATUSES.map((s) => ({
                        value: s,
                        label: STATUS_CONFIG[s]?.label || s,
                      }))}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      Note interne / Réponse ou motif du changement
                    </label>
                    <Input
                      placeholder="Ex: Document vérifié, avenant CIMA transmis..."
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      className="bg-white text-xs"
                    />
                  </div>

                  <Button
                    variant="primary"
                    className="w-full mt-2 font-bold text-xs"
                    disabled={updateMut.isPending}
                    onClick={() => updateMut.mutate()}
                  >
                    {updateMut.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Enregistrer la mise à jour
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelected(null)}
                className="px-5 text-xs font-bold rounded-xl"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
