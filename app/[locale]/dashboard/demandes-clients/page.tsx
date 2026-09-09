'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2, Inbox, MessageSquare, Clock, CheckCircle2, AlertCircle, Filter, FileText, Send } from 'lucide-react'
import { asList, portalClientApi, type ClientRequestItem } from '@/lib/api/mobi-assur'

const STATUSES = ['OUVERT', 'EN_COURS', 'RESOLU', 'REJETE', 'CLOS'] as const

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  OUVERT: { label: 'Ouvert', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200/60' },
  EN_COURS: { label: 'En cours', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/60' },
  RESOLU: { label: 'Résolu', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/60' },
  REJETE: { label: 'Rejeté', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200/60' },
  CLOS: { label: 'Clos', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
}

export default function DemandesClientsPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
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
      toast.success('Demande mise à jour')
      setAdminNote('')
      qc.invalidateQueries({ queryKey: ['admin-client-requests'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8 bg-slate-50/50 min-h-screen">
      <Header title="Demandes clients" subtitle="Gestion centralisée des avenants, résiliations et demandes de support" />

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Support & Requêtes Clientélaires</p>
            <p className="text-xs text-slate-500">Traitez les requêtes des assurés en temps réel</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            className="h-9 w-44 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs focus:border-blue-500 focus:ring-2 focus:ring-blue-600/20 outline-hidden transition-all"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Requests List */}
        <Card className="lg:col-span-5 bg-white/95 backdrop-blur-xl border-slate-200/80 shadow-xs rounded-2xl overflow-hidden flex flex-col h-[750px]">
          <CardHeader className="border-b border-slate-100 pb-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900">File des tickets</CardTitle>
              <span className="text-xs font-semibold text-slate-500 px-2 py-0.5 rounded-full bg-slate-100">
                {items.length} reçu(s)
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                <span className="text-xs font-medium">Chargement des requêtes...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                <Inbox className="h-8 w-8 text-slate-300 mb-1" />
                <p className="text-sm font-semibold text-slate-700">Aucune demande trouvée</p>
                <p className="text-xs text-slate-400">Aucune requête ne correspond aux critères.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((r) => {
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
                            ? 'bg-blue-50/70 border-l-4 border-l-blue-600 shadow-2xs'
                            : 'hover:bg-slate-50/80 border-l-4 border-l-transparent'
                        }`}
                        onClick={() => {
                          setSelected(r)
                          setNewStatus(r.status)
                          setAdminNote(r.admin_note || '')
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                            {r.request_type || 'TICKET'}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                          >
                            {statusCfg.label}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 line-clamp-1">{r.subject}</p>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {r.created_at || 'Aujourd\'hui'}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">#{r.id.slice(0, 8)}</span>
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
        <Card className="lg:col-span-7 bg-white/95 backdrop-blur-xl border-slate-200/80 shadow-xs rounded-2xl overflow-hidden flex flex-col h-[750px]">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 p-8">
              <div className="p-4 bg-slate-100 rounded-full text-slate-400">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Sélectionnez une demande à traiter</p>
              <p className="text-xs text-slate-400 text-center max-w-sm">
                Cliquez sur n'importe quel ticket dans le volet de gauche pour consulter son contenu et modifier son statut.
              </p>
            </div>
          ) : (
            <>
              <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                      {selected.request_type}
                    </span>
                    <CardTitle className="text-lg font-bold text-slate-900 mt-0.5">{selected.subject}</CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-1">
                      Créé le {selected.created_at || 'Date non disponible'}
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
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Message / Description</h4>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                    {selected.body || 'Aucun détail fourni.'}
                  </div>
                </div>

                {/* Existing Admin Note if present */}
                {selected.admin_note && (
                  <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 space-y-1">
                    <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                      Note interne enregistrée
                    </p>
                    <p className="text-xs text-amber-800 leading-relaxed font-medium">{selected.admin_note}</p>
                  </div>
                )}

                {/* Action Form */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Send className="h-3.5 w-3.5 text-blue-600" />
                    Mettre à jour la demande
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1 block">Nouveau Statut</label>
                      <select
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs focus:border-blue-500 focus:ring-2 focus:ring-blue-600/20 outline-hidden"
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_CONFIG[s]?.label || s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1 block">
                        Note interne / Motif du changement
                      </label>
                      <Input
                        placeholder="Ex: Document validé, transmis à l'assureur partenaire..."
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        className="bg-white"
                      />
                    </div>

                    <Button
                      variant="primary"
                      className="w-full mt-2 shadow-sm"
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

