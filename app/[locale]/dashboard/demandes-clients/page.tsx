'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2, Inbox } from 'lucide-react'
import { asList, portalClientApi, type ClientRequestItem } from '@/lib/api/mobi-assur'

const STATUSES = ['OUVERT', 'EN_COURS', 'RESOLU', 'REJETE', 'CLOS'] as const

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
    <div className="flex flex-col gap-6 p-6">
      <Header title="Demandes clients" subtitle="Avenants, résiliations, support" />

      <select
        className="h-10 w-48 rounded-xl border border-gray-200 bg-white px-3 text-sm"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
      >
        <option value="">Tous</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
                <Inbox className="h-8 w-8" />
                <p className="text-sm">Aucune demande</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50 max-h-[70vh] overflow-auto">
                {items.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50/80 ${
                        selected?.id === r.id ? 'bg-blue-50/60' : ''
                      }`}
                      onClick={() => setSelected(r)}
                    >
                      <div className="flex justify-between gap-2">
                        <span className="text-[10px] font-bold text-blue-700 uppercase">
                          {r.request_type}
                        </span>
                        <span className="text-[10px] font-bold text-amber-700">{r.status}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">{r.subject}</p>
                      <p className="text-[11px] text-gray-400">{r.created_at}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-5 space-y-3">
            {!selected ? (
              <p className="text-sm text-gray-400 text-center py-8">Sélectionnez une demande</p>
            ) : (
              <>
                <h2 className="font-bold text-slate-900">{selected.subject}</h2>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{selected.body}</p>
                {selected.admin_note && (
                  <p className="text-xs bg-amber-50 text-amber-900 rounded-lg p-2">
                    Note BO : {selected.admin_note}
                  </p>
                )}
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
                  placeholder="Note admin"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                />
                <Button
                  className="w-full"
                  disabled={updateMut.isPending}
                  onClick={() => updateMut.mutate()}
                >
                  {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mettre à jour'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
