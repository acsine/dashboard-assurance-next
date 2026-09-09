'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2, AlertTriangle, ShieldAlert, FileText, CheckCircle2, Clock, Filter, Send } from 'lucide-react'
import { asList, sinistresApi, type SinistreItem } from '@/lib/api/mobi-assur'

const STATUSES = ['DECLARE', 'EN_COURS', 'COMPLEMENT', 'VALIDE', 'REJETE', 'CLOS'] as const

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DECLARE: { label: 'Déclaré', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200/60' },
  EN_COURS: { label: 'En cours', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/60' },
  COMPLEMENT: { label: 'Complément', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200/60' },
  VALIDE: { label: 'Validé', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/60' },
  REJETE: { label: 'Rejeté', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200/60' },
  CLOS: { label: 'Clos', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
}

export default function SinistresPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<SinistreItem | null>(null)
  const [note, setNote] = useState('')
  const [newStatus, setNewStatus] = useState('EN_COURS')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-sinistres', statusFilter],
    queryFn: () => sinistresApi.list(statusFilter || undefined),
  })
  const items = asList<SinistreItem>(data)

  const detailQ = useQuery({
    queryKey: ['admin-sinistre', selected?.id],
    queryFn: () => sinistresApi.get(selected!.id),
    enabled: !!selected?.id,
  })

  const updateMut = useMutation({
    mutationFn: () =>
      sinistresApi.updateStatus(selected!.id, { status: newStatus, note: note || undefined }),
    onSuccess: () => {
      toast.success('Statut du sinistre mis à jour')
      setNote('')
      qc.invalidateQueries({ queryKey: ['admin-sinistres'] })
      qc.invalidateQueries({ queryKey: ['admin-sinistre', selected?.id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const detail = detailQ.data || selected

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8 bg-slate-50/50 min-h-screen">
      <Header
        title="Gestion des Sinistres"
        subtitle="File d'attente et instruction des déclarations de sinistres du portail client"
      />

      <div className="flex items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Instruction des Sinistres</p>
            <p className="text-xs text-slate-500">Examinez les pièces justificatives et mettez à jour l'état d'avancement</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            className="h-9 w-44 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs focus:border-blue-500 focus:ring-2 focus:ring-blue-600/20 outline-hidden transition-all"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tous les statuts ({items.length})</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sinistres Queue */}
        <Card className="lg:col-span-5 bg-white/95 backdrop-blur-xl border-slate-200/80 shadow-xs rounded-2xl overflow-hidden flex flex-col h-[750px]">
          <CardHeader className="border-b border-slate-100 pb-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900">File des sinistres</CardTitle>
              <span className="text-xs font-semibold text-slate-500 px-2 py-0.5 rounded-full bg-slate-100">
                {items.length} dossier(s)
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                <span className="text-xs font-medium">Chargement des dossiers...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                <AlertTriangle className="h-8 w-8 text-slate-300 mb-1" />
                <p className="text-sm font-semibold text-slate-700">Aucun sinistre trouvé</p>
                <p className="text-xs text-slate-400">Aucun dossier ne correspond aux filtres.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((s) => {
                  const statusCfg = STATUS_CONFIG[s.status] || {
                    label: s.status,
                    bg: 'bg-slate-100',
                    text: 'text-slate-700',
                    border: 'border-slate-200',
                  }
                  const isSelected = selected?.id === s.id

                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        className={`w-full text-left p-4 transition-all flex flex-col gap-2 ${
                          isSelected
                            ? 'bg-blue-50/70 border-l-4 border-l-blue-600 shadow-2xs'
                            : 'hover:bg-slate-50/80 border-l-4 border-l-transparent'
                        }`}
                        onClick={() => {
                          setSelected(s)
                          setNewStatus(s.status)
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">{s.reference}</span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                          >
                            {statusCfg.label}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 line-clamp-1">{s.title}</p>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {s.created_at || 'Date inconnue'}
                          </span>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Selected Sinistre Details */}
        <Card className="lg:col-span-7 bg-white/95 backdrop-blur-xl border-slate-200/80 shadow-xs rounded-2xl overflow-hidden flex flex-col h-[750px]">
          {!detail ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 p-8">
              <div className="p-4 bg-slate-100 rounded-full text-slate-400">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Sélectionnez un sinistre à instruire</p>
              <p className="text-xs text-slate-400 text-center max-w-sm">
                Cliquez sur un dossier dans le volet de gauche pour consulter sa description, son suivi et ses pièces jointes.
              </p>
            </div>
          ) : (
            <>
              <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="font-mono text-xs font-bold text-blue-600">{detail.reference}</span>
                    <CardTitle className="text-lg font-bold text-slate-900 mt-0.5">{detail.title}</CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-1">
                      Déclaré le {detail.created_at || 'Non renseigné'}
                    </CardDescription>
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                      (STATUS_CONFIG[detail.status] || STATUS_CONFIG.DECLARE).bg
                    } ${(STATUS_CONFIG[detail.status] || STATUS_CONFIG.DECLARE).text} ${
                      (STATUS_CONFIG[detail.status] || STATUS_CONFIG.DECLARE).border
                    }`}
                  >
                    {(STATUS_CONFIG[detail.status] || STATUS_CONFIG.DECLARE).label}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-6 flex-1 overflow-y-auto space-y-6">
                {/* Description Body */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description du sinistre</h4>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-sm text-slate-800 leading-relaxed font-medium">
                    {detail.description || 'Aucune description fournie.'}
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Historique d'instruction</h4>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-3">
                    {(detail.timeline || []).map((t, i) => (
                      <div key={i} className="text-xs border-l-2 border-blue-500 pl-3 py-0.5 space-y-0.5">
                        <div className="flex items-center gap-2 font-semibold text-slate-800">
                          <span>{t.from_status || '—'}</span>
                          <span className="text-slate-400">→</span>
                          <span className="text-blue-700 font-bold">{t.to_status}</span>
                        </div>
                        {t.note && <p className="text-slate-600 font-medium">{t.note}</p>}
                        <p className="text-[10px] text-slate-400">{t.changed_at}</p>
                      </div>
                    ))}
                    {(detail.timeline || []).length === 0 && (
                      <p className="text-xs text-slate-400">Aucun historique enregistré pour ce dossier.</p>
                    )}
                  </div>
                </div>

                {/* Documents */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Pièces justificatives</h4>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                    <ul className="space-y-2">
                      {(detail.documents || []).map((d) => (
                        <li key={d.id} className="text-xs flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                          <span className="font-semibold text-slate-800 truncate max-w-[280px]">
                            {d.file_name || d.doc_type}
                          </span>
                          <a
                            href={d.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 underline"
                          >
                            Consulter
                          </a>
                        </li>
                      ))}
                      {(detail.documents || []).length === 0 && (
                        <li className="text-xs text-slate-400">Aucun document joint.</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Action Form */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Send className="h-3.5 w-3.5 text-blue-600" />
                    Mettre à jour le statut du dossier
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
                        Motif / Note d'instruction
                      </label>
                      <Input
                        placeholder="Ex: Pièce d'expertise validée, complément demandé..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
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

