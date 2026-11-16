'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import SearchableSelect from '@/components/ui/searchable-select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Loader2,
  Inbox,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Send,
  Search,
  X,
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
      qc.invalidateQueries({ queryKey: ['admin-client-requests'] })
      // Update selected state locally too
      if (selected) {
        setSelected({
          ...selected,
          status: newStatus,
          admin_note: adminNote || selected.admin_note,
        })
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const filteredItems = items.filter((r) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    const subject = (r.subject || '').toLowerCase()
    const body = (r.body || '').toLowerCase()
    const reqType = (r.request_type || '').toLowerCase()
    const id = (r.id || '').toLowerCase()
    return subject.includes(q) || body.includes(q) || reqType.includes(q) || id.includes(q)
  })

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8 bg-slate-50/50 min-h-screen">
      <Header title={t('title')} subtitle={t('subtitle')} />

      {/* Filter and Search Bar */}
      <div className="relative z-30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white/95 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 pro-shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Support & Requêtes Clientélaires</p>
            <p className="text-xs text-slate-500">Traitez et suivez les tickets des assurés en temps réel</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher par sujet, N° ticket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="w-full sm:w-56">
            <SearchableSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              placeholder="Tous les statuts"
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Requests List */}
        <Card className="lg:col-span-5 bg-white/95 backdrop-blur-xl border-slate-200/80 pro-shadow-sm rounded-2xl overflow-hidden flex flex-col h-[750px]">
          <CardHeader className="border-b border-slate-100 pb-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900">File des tickets</CardTitle>
              <span className="text-xs font-bold text-blue-700 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/60">
                {filteredItems.length} ticket(s)
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                <span className="text-xs font-medium">Chargement des requêtes...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                <Inbox className="h-8 w-8 text-slate-300 mb-1" />
                <p className="text-sm font-bold text-slate-700">
                  {searchQuery ? 'Aucun ticket correspondant' : 'Aucune demande trouvée'}
                </p>
                <p className="text-xs text-slate-400">
                  {searchQuery ? `Aucun résultat pour "${searchQuery}".` : 'Aucune requête ne correspond aux critères.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredItems.map((r) => {
                  const statusCfg = STATUS_CONFIG[r.status] || {
                    label: r.status,
                    bg: 'bg-slate-100',
                    text: 'text-slate-700',
                    border: 'border-slate-200',
                  }
                  const isSelected = selected?.id === r.id

                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        className={`w-full text-left p-4 transition-all flex flex-col gap-2 ${
                          isSelected
                            ? 'bg-blue-50/80 border-l-4 border-l-blue-600 shadow-2xs'
                            : 'hover:bg-slate-50/80 border-l-4 border-l-transparent'
                        }`}
                        onClick={() => {
                          setSelected(r)
                          setNewStatus(r.status)
                          setAdminNote(r.admin_note || '')
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-extrabold text-blue-700 px-2 py-0.5 rounded-md bg-blue-100/60 uppercase tracking-wider">
                            {r.request_type || 'TICKET'}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                          >
                            {statusCfg.label}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 line-clamp-1">{r.subject}</p>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Clock className="h-3 w-3" />
                            {r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : "Aujourd'hui"}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">#{r.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Selected Request Detail */}
        <Card className="lg:col-span-7 bg-white/95 backdrop-blur-xl border-slate-200/80 pro-shadow-sm rounded-2xl overflow-hidden flex flex-col h-[750px]">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 p-8">
              <div className="p-4 bg-slate-100 rounded-full text-slate-400">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-700">Sélectionnez une demande à traiter</p>
              <p className="text-xs text-slate-400 text-center max-w-sm">
                Cliquez sur n'importe quel ticket dans le volet de gauche pour consulter son contenu et modifier son statut.
              </p>
            </div>
          ) : (
            <>
              <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-extrabold text-blue-700 px-2 py-0.5 rounded-md bg-blue-100/60 uppercase tracking-wider">
                      {selected.request_type}
                    </span>
                    <CardTitle className="text-lg font-bold text-slate-900 mt-1">{selected.subject}</CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-1">
                      Créé le {selected.created_at ? new Date(selected.created_at).toLocaleString('fr-FR') : 'Date non disponible'} • N° {selected.id}
                    </CardDescription>
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                      (STATUS_CONFIG[selected.status] || STATUS_CONFIG.OUVERT).bg
                    } ${(STATUS_CONFIG[selected.status] || STATUS_CONFIG.OUVERT).text} ${
                      (STATUS_CONFIG[selected.status] || STATUS_CONFIG.OUVERT).border
                    }`}
                  >
                    {(STATUS_CONFIG[selected.status] || STATUS_CONFIG.OUVERT).label}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-6 flex-1 overflow-y-auto space-y-6">
                {/* Description Body */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Message / Requête du client</h4>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                    {selected.body || 'Aucun détail fourni.'}
                  </div>
                </div>

                {/* Existing Admin Note if present */}
                {selected.admin_note && (
                  <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 space-y-1">
                    <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                      Dernière note interne enregistrée
                    </p>
                    <p className="text-xs text-amber-800 leading-relaxed font-medium">{selected.admin_note}</p>
                  </div>
                )}

                {/* Action Form */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Send className="h-3.5 w-3.5 text-blue-600" />
                    Mettre à jour le statut du ticket
                  </h4>

                  <div className="space-y-3">
                    <div className="relative z-20">
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
                        placeholder="Ex: Document vérifié, contrat mis à jour..."
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
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
