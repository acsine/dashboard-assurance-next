'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2, AlertTriangle } from 'lucide-react'
import { asList, sinistresApi, type SinistreItem } from '@/lib/api/mobi-assur'

const STATUSES = ['DECLARE', 'EN_COURS', 'COMPLEMENT', 'VALIDE', 'REJETE', 'CLOS'] as const

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
      toast.success('Statut mis à jour')
      setNote('')
      qc.invalidateQueries({ queryKey: ['admin-sinistres'] })
      qc.invalidateQueries({ queryKey: ['admin-sinistre', selected?.id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const detail = detailQ.data || selected

  return (
    <div className="flex-1 flex flex-col bg-transparent">
      <Header title="Gestion des Sinistres" subtitle="File d'attente et instruction des déclarations de sinistres du portail client" />

      <div className="p-6 sm:p-8 space-y-6 flex-1">
        <div className="bg-white/95 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 pro-shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <select
              className="h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-xs font-semibold text-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tous les statuts ({items.length})</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <span className="text-xs font-bold text-slate-500">{items.length} dossier(s) trouvé(s)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-slate-200/80 bg-white/95 backdrop-blur-xl pro-shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
                  <AlertTriangle className="h-10 w-10 text-slate-300 mb-1" />
                  <p className="text-sm font-extrabold text-slate-800">Aucun dossier de sinistre</p>
                  <p className="text-xs text-slate-500">Aucune déclaration ne correspond aux critères.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 max-h-[70vh] overflow-auto">
                  {items.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className={`w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                          selected?.id === s.id ? 'bg-blue-50/80 border-l-4 border-blue-700' : ''
                        }`}
                        onClick={() => setSelected(s)}
                      >
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-sm">{s.reference}</span>
                          <span className="text-[11px] font-extrabold uppercase tracking-wide text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full">
                            {s.status}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700 mt-1 truncate">{s.title}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">Déclaré le : {s.created_at}</p>
                      </button>
                    </li>
                  ))}
                </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-5 space-y-4">
            {!detail ? (
              <p className="text-sm text-gray-400 py-8 text-center">Sélectionnez un sinistre</p>
            ) : (
              <>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{detail.reference}</h2>
                  <p className="text-sm text-slate-600">{detail.title}</p>
                  {detail.description && (
                    <p className="text-sm text-slate-500 mt-2">{detail.description}</p>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Timeline</p>
                  <ul className="space-y-2 max-h-40 overflow-auto">
                    {(detail.timeline || []).map((t, i) => (
                      <li key={i} className="text-xs border-l-2 border-blue-200 pl-3">
                        <span className="font-semibold">{t.from_status || '—'} → {t.to_status}</span>
                        {t.note && <span className="text-gray-500"> — {t.note}</span>}
                        <div className="text-gray-400">{t.changed_at}</div>
                      </li>
                    ))}
                    {(detail.timeline || []).length === 0 && (
                      <li className="text-xs text-gray-400">Pas encore d&apos;historique chargé</li>
                    )}
                  </ul>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Documents</p>
                  <ul className="space-y-1">
                    {(detail.documents || []).map((d) => (
                      <li key={d.id} className="text-xs text-blue-700 truncate">
                        <a href={d.file_url} target="_blank" rel="noreferrer">
                          {d.file_name || d.doc_type}
                        </a>
                      </li>
                    ))}
                    {(detail.documents || []).length === 0 && (
                      <li className="text-xs text-gray-400">Aucune pièce</li>
                    )}
                  </ul>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Changer le statut</p>
                  <select
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <Input
                    placeholder="Motif / note (rejet, complément…)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Button
                    className="w-full"
                    disabled={updateMut.isPending}
                    onClick={() => updateMut.mutate()}
                  >
                    {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
