'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { prospectsApi, type ConversionRequest, type Prospect } from '@/lib/api/mobi-assur'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { UserCheck, Check, X, Users, Clock } from 'lucide-react'
import { RoleGuard } from '@/components/auth/RoleGuard'

type Tab = 'all' | 'pending'

function conversionDisplayName(req: ConversionRequest): string {
  const payload = (req as ConversionRequest & { payload?: Record<string, unknown> }).payload
  const fromPayload =
    (payload?.full_name as string | undefined) ||
    (payload?.name as string | undefined)
  return (
    req.prospect?.full_name ||
    fromPayload ||
    `Prospect ${(req.prospect_id || req.id).substring(0, 8).toUpperCase()}`
  )
}

function conversionPhone(req: ConversionRequest): string {
  const payload = (req as ConversionRequest & { payload?: Record<string, unknown> }).payload
  return (
    req.prospect?.phone ||
    (payload?.phone as string | undefined) ||
    'N/A'
  )
}

function conversionEmail(req: ConversionRequest): string {
  const payload = (req as ConversionRequest & { payload?: Record<string, unknown> }).payload
  return (
    req.prospect?.email ||
    (payload?.email as string | undefined) ||
    'N/A'
  )
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'NOUVEAU':
      return 'bg-slate-100 text-slate-700'
    case 'CONTACTE':
      return 'bg-blue-50 text-blue-700'
    case 'INTERESSE':
      return 'bg-emerald-50 text-emerald-700'
    case 'EN_ATTENTE_VALIDATION':
      return 'bg-amber-50 text-amber-700'
    case 'PERDU':
      return 'bg-red-50 text-red-700'
    case 'CONVERTI':
    case 'APPROUVEE':
      return 'bg-green-50 text-green-700'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

export default function ProspectsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('all')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectMotif, setRejectMotif] = useState('')
  const [search, setSearch] = useState('')

  const { data: prospects = [], isLoading: loadingProspects } = useQuery({
    queryKey: ['prospects'],
    queryFn: () => prospectsApi.list(),
  })

  const { data: pendingRequests = [], isLoading: loadingPending } = useQuery({
    queryKey: ['pending-conversions'],
    queryFn: () => prospectsApi.listPendingConversions(),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => prospectsApi.approveConversion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-conversions'] })
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
      toast.success('Demande approuvée. Client créé et prospect converti.')
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de l'approbation")
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) =>
      prospectsApi.rejectConversion(id, motif),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-conversions'] })
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
      toast.success('Demande rejetée.')
      setRejectingId(null)
      setRejectMotif('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors du rejet')
    },
  })

  const handleRejectSubmit = (e: React.FormEvent, id: string) => {
    e.preventDefault()
    if (!rejectMotif.trim()) {
      toast.error('Motif de rejet requis')
      return
    }
    rejectMutation.mutate({ id, motif: rejectMotif })
  }

  const safeProspects = Array.isArray(prospects) ? prospects : []
  const safePendingRequests = Array.isArray(pendingRequests) ? pendingRequests : []

  const filteredProspects = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return safeProspects
    return safeProspects.filter((p: Prospect) => {
      const hay = `${p.full_name || ''} ${p.phone || ''} ${p.status || ''} ${p.agent_id || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [safeProspects, search])

  return (
    <div className="flex-1 flex flex-col bg-white">
      <Header
        title="Prospects & Conversions"
        subtitle="Consultez les prospects synchronisés par les agents et validez les demandes de conversion."
      />

      <div className="p-8 space-y-6 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('all')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
              tab === 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Tous les prospects ({safeProspects.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('pending')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
              tab === 'pending'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Conversions en attente ({safePendingRequests.length})
          </button>
        </div>

        {tab === 'all' ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">Prospects de l&apos;agence</h3>
              <Input
                placeholder="Rechercher nom, téléphone, statut…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 text-xs border-gray-200 w-full sm:w-72"
              />
            </div>

            {loadingProspects ? (
              <div className="py-20 text-center text-gray-400 font-medium">
                Chargement des prospects...
              </div>
            ) : filteredProspects.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-semibold">Aucun prospect trouvé</p>
                <p className="text-xs text-gray-500 mt-1">
                  Les prospects apparaîtront ici après synchronisation mobile des agents.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 uppercase tracking-wider">
                      <th className="py-3 pr-4 font-bold">Nom</th>
                      <th className="py-3 pr-4 font-bold">Téléphone</th>
                      <th className="py-3 pr-4 font-bold">Statut</th>
                      <th className="py-3 pr-4 font-bold">Agent</th>
                      <th className="py-3 font-bold">Créé le</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredProspects.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="py-3 pr-4 font-semibold text-slate-900">
                          {p.full_name || 'Sans nom'}
                        </td>
                        <td className="py-3 pr-4 text-slate-600 font-mono">
                          {p.phone || '—'}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadgeClass(
                              p.status,
                            )}`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-500 font-mono">
                          {p.agent_id
                            ? p.agent_id.substring(0, 8).toUpperCase()
                            : '—'}
                        </td>
                        <td className="py-3 text-slate-500">
                          {p.created_at
                            ? new Date(p.created_at).toLocaleDateString('fr-FR')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            {loadingPending ? (
              <div className="py-20 text-center text-gray-400 font-medium">
                Chargement des demandes en cours...
              </div>
            ) : safePendingRequests.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                <UserCheck className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-semibold">Aucune demande en attente</p>
                <p className="text-xs text-gray-500 mt-1">
                  Toutes les conversions prospects de l&apos;agence ont été validées.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {safePendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-5 border border-gray-100 rounded-2xl bg-gray-50/20 flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                        Demande #{req.id.substring(0, 8).toUpperCase()}
                      </span>
                      <h4 className="font-bold text-sm text-gray-900 mt-1">
                        {conversionDisplayName(req)}
                      </h4>
                      <span className="text-xs text-gray-500 block">
                        Téléphone: {conversionPhone(req)} | Email: {conversionEmail(req)}
                      </span>
                      <span className="text-xs text-blue-600 font-semibold block mt-1">
                        Statut Demande: {req.status || 'EN_ATTENTE'}
                      </span>
                    </div>

                    {rejectingId === req.id ? (
                      <form
                        onSubmit={(e) => handleRejectSubmit(e, req.id)}
                        className="flex items-center gap-2 w-full md:w-auto"
                      >
                        <Input
                          placeholder="Motif du rejet..."
                          value={rejectMotif}
                          onChange={(e) => setRejectMotif(e.target.value)}
                          className="h-10 text-xs border-gray-200 w-full md:w-60 bg-white"
                          required
                        />
                        <Button
                          type="submit"
                          variant="destructive"
                          size="sm"
                          disabled={rejectMutation.isPending}
                          isLoading={rejectMutation.isPending}
                        >
                          Valider Rejet
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setRejectingId(null)}
                        >
                          Annuler
                        </Button>
                      </form>
                    ) : (
                      <RoleGuard permission="agency:mutate" fallback={null}>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            onClick={() => approveMutation.mutate(req.id)}
                            disabled={approveMutation.isPending}
                            isLoading={approveMutation.isPending}
                            variant="success"
                            size="sm"
                          >
                            <Check className="h-4 w-4 mr-1.5" />
                            Approuver
                          </Button>
                          <Button
                            onClick={() => setRejectingId(req.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          >
                            <X className="h-4 w-4 mr-1.5" />
                            Rejeter
                          </Button>
                        </div>
                      </RoleGuard>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
