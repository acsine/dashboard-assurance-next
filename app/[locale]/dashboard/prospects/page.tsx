'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { prospectsApi } from '@/lib/api/mobi-assur'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { UserCheck, Check, X, AlertCircle } from 'lucide-react'

export default function ProspectsPage() {
  const queryClient = useQueryClient()
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectMotif, setRejectMotif] = useState('')

  // Query prospects pending conversion
  const { data: pendingRequests = [], isLoading } = useQuery({
    queryKey: ['pending-conversions'],
    queryFn: () => prospectsApi.listPendingConversions(),
  })

  // Approve Conversion
  const approveMutation = useMutation({
    mutationFn: (id: string) => prospectsApi.approveConversion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-conversions'] })
      toast.success('Demande approuvée. Client créé et prospect converti.')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de l\'approbation')
    },
  })

  // Reject Conversion
  const rejectMutation = useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) =>
      prospectsApi.rejectConversion(id, motif),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-conversions'] })
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

  const safePendingRequests = Array.isArray(pendingRequests) ? pendingRequests : []

  return (
    <div className="flex-1 flex flex-col bg-white">

      <Header
        title="Validation des Conversions Prospects"
        subtitle="Approuvez les demandes de conversion prospect en client soumises par les agents."
      />

      <div className="p-8 space-y-6 flex-1">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          {isLoading ? (
            <div className="py-20 text-center text-gray-400 font-medium">
              Chargement des demandes en cours...
            </div>
          ) : safePendingRequests.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <UserCheck className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-semibold">Aucune demande en attente</p>
              <p className="text-xs text-gray-500 mt-1">
                Toutes les conversions prospects de l'agence ont été validées.
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
                      {req.prospect?.full_name || 'Prospect Anonyme'}
                    </h4>
                    <span className="text-xs text-gray-500 block">
                      Téléphone: {req.prospect?.phone || 'N/A'} | Email:{' '}
                      {req.prospect?.email || 'N/A'}
                    </span>
                    <span className="text-xs text-blue-600 font-semibold block mt-1">
                      Statut Demande: {req.status}
                    </span>
                  </div>

                  {/* Reject Motif Form overlay */}
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
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
