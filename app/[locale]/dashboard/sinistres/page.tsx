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
    <div className="flex flex-col gap-6 p-6">
      <Header title="Sinistres" subtitle="File d'attente portail client" />

      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="text-xs text-gray-500">{items.length} sinistre(s)</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
                <AlertTriangle className="h-8 w-8" />
                <p className="text-sm">Aucun sinistre</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50 max-h-[70vh] overflow-auto">
                {items.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50/80 transition-colors ${
                        selected?.id === s.id ? 'bg-blue-50/60' : ''
                      }`}
                      onClick={() => setSelected(s)}
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-semibold text-slate-800 text-sm">{s.reference}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          {s.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5 truncate">{s.title}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{s.created_at}</p>
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
