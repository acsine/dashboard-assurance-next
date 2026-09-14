'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, CreditCard, Bell, AlertTriangle, CheckCircle2, DollarSign, Eye, Check, ExternalLink } from 'lucide-react'
import { asList, portalClientApi, contractsApi, proxiedAssetUrl } from '@/lib/api/mobi-assur'
import { RoleGuard } from '@/components/auth/RoleGuard'
import Link from 'next/link'

function paymentProofUrls(payment: Record<string, any>): string[] {
  if (Array.isArray(payment.proof_urls) && payment.proof_urls.length > 0) {
    return payment.proof_urls.filter(Boolean)
  }
  if (typeof payment.proof_url === 'string' && payment.proof_url) return [payment.proof_url]
  return []
}

export default function PaiementsDeclaresPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['pending-client-payments'],
    queryFn: () => portalClientApi.pendingPayments(),
  })
  const failuresQ = useQuery({
    queryKey: ['payment-failures'],
    queryFn: () => portalClientApi.paymentFailures(),
  })
  const items = asList<Record<string, unknown>>(data)
  const failures = asList<Record<string, unknown>>(failuresQ.data)

  const [validatingPaymentId, setValidatingPaymentId] = useState<string | null>(null)
  const [receivedReference, setReceivedReference] = useState('')

  const remindMut = useMutation({
    mutationFn: () => portalClientApi.runReminders(),
    onSuccess: (res) => {
      toast.success(`${res?.notifications_created ?? 0} relance(s) générée(s)`)
      qc.invalidateQueries({ queryKey: ['pending-client-payments'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const validateMut = useMutation({
    mutationFn: ({
      contractId,
      paymentId,
      receivedReference,
    }: {
      contractId: string
      paymentId: string
      receivedReference: string
    }) =>
      contractsApi.validatePayment(contractId, paymentId, {
        received_reference: receivedReference,
      }),
    onSuccess: () => {
      toast.success('Paiement validé avec succès')
      qc.invalidateQueries({ queryKey: ['pending-client-payments'] })
      setValidatingPaymentId(null)
      setReceivedReference('')
    },
    onError: (e: any) => {
      toast.error(e.message || 'Erreur lors de la validation du paiement')
    },
  })

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8 bg-slate-50/50 min-h-screen">
      <Header
        title="Paiements déclarés"
        subtitle="File globale des déclarations Mobile Money, virements et règlements clients"
      />

      <div className="flex items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Gestion des Encaissements</p>
            <p className="text-xs text-slate-500">Validez les déclarations et relancez les échéances en retard</p>
          </div>
        </div>
        <Button
          variant="outline"
          isLoading={remindMut.isPending}
          disabled={remindMut.isPending}
          onClick={() => remindMut.mutate()}
          className="shadow-sm"
        >
          {!remindMut.isPending && <Bell className="h-4 w-4 mr-2" />}
          Lancer relances (J-30/15/7)
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Pending Payments Table */}
        <Card className="lg:col-span-2 bg-white/95 backdrop-blur-xl border-slate-200/80 shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Déclarations en attente</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {items.length} paiement(s) nécessitant vérification
                </CardDescription>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
                En attente
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                <span className="text-xs font-medium">Chargement des transactions...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                <div className="p-3 bg-slate-100 rounded-full text-slate-400 mb-1">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Aucun paiement en attente</p>
                <p className="text-xs text-slate-400">Toutes les déclarations reçues ont été traitées.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">Montant</th>
                      <th className="px-4 py-3">Méthode</th>
                      <th className="px-4 py-3">Référence</th>
                      <th className="px-4 py-3">Payeur</th>
                      <th className="px-4 py-3">Contrat</th>
                      <th className="px-4 py-3">Preuves</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {items.map((p) => {
                      const proofs = paymentProofUrls(p)
                      const isThisValidating = validatingPaymentId === String(p.id)

                      return (
                        <tr key={String(p.id)} className="hover:bg-slate-50/70 transition-colors align-middle">
                          <td className="px-4 py-3.5 font-bold text-slate-900">
                            {Number(p.amount || 0).toLocaleString('fr-FR')} <span className="text-xs text-slate-500 font-normal">XAF</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {String(p.method || 'Mobile Money')}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs">
                            {p.reference_externe ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                                {String(p.reference_externe)}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-slate-800">
                            {String(p.payer_name || 'Client anonyme')}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs">
                            {p.contract_id ? (
                              <Link
                                href={`/dashboard/contracts/${String(p.contract_id)}`}
                                className="text-blue-600 hover:underline font-semibold"
                              >
                                {String(p.contract_id).slice(0, 8)}...
                              </Link>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-xs">
                            {proofs.length === 0 ? (
                              <span className="text-slate-400">Aucune</span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {proofs.map((url, idx) => (
                                  <a
                                    key={idx}
                                    href={proxiedAssetUrl(url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                                  >
                                    Preuve {idx + 1}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                            {String(p.created_at || '—')}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex justify-end items-center gap-2">
                              {isThisValidating ? (
                                <div className="flex flex-col gap-1 text-left min-w-[200px] bg-slate-50 p-2 rounded-lg border border-slate-200">
                                  <span className="text-[10px] text-slate-500 font-semibold">Référence de paiement reçue :</span>
                                  <Input
                                    className="h-8 text-xs font-mono bg-white"
                                    placeholder="Ex: Ref transaction"
                                    value={receivedReference}
                                    onChange={(e) => setReceivedReference(e.target.value)}
                                    disabled={validateMut.isPending}
                                  />
                                  <div className="flex gap-1.5 mt-1">
                                    <Button
                                      size="sm"
                                      variant="success"
                                      className="h-7 text-[11px] flex-1 text-white"
                                      disabled={validateMut.isPending || !receivedReference.trim()}
                                      isLoading={validateMut.isPending}
                                      onClick={() => {
                                        validateMut.mutate({
                                          contractId: String(p.contract_id),
                                          paymentId: String(p.id),
                                          receivedReference: receivedReference.trim(),
                                        })
                                      }}
                                    >
                                      Confirmer
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-[11px] flex-1"
                                      disabled={validateMut.isPending}
                                      onClick={() => {
                                        setValidatingPaymentId(null)
                                        setReceivedReference('')
                                      }}
                                    >
                                      Annuler
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {p.contract_id && (
                                    <Link
                                      href={`/dashboard/contracts/${String(p.contract_id)}`}
                                      className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 px-2.5 py-1 rounded-lg transition-colors font-medium bg-white"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      Détails
                                    </Link>
                                  )}
                                  <RoleGuard permission="payments:manage" fallback={null}>
                                    <Button
                                      size="sm"
                                      variant="success"
                                      className="text-white h-8"
                                      onClick={() => {
                                        setValidatingPaymentId(String(p.id))
                                        setReceivedReference('')
                                      }}
                                    >
                                      <Check className="h-3.5 w-3.5 mr-1" />
                                      Valider
                                    </Button>
                                  </RoleGuard>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Failures Panel */}
        <Card className="bg-white/95 backdrop-blur-xl border-slate-200/80 shadow-xs rounded-2xl overflow-hidden flex flex-col">
          <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              <CardTitle className="text-base font-bold text-slate-900">Échecs Mobile Money</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Anomalies et rejets de transactions récents
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 flex-1">
            {failures.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center text-slate-400">
                <CreditCard className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-600">Aucun échec récent</p>
                <p className="text-[11px] text-slate-400 mt-1">Les passerelles de paiement fonctionnent normalement.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {failures.map((f) => (
                  <div
                    key={String(f.id)}
                    className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-100 text-xs flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between font-semibold text-rose-950">
                      <span>{String(f.provider || 'Opérateur')}</span>
                      <span className="font-mono">{Number(f.amount || 0).toLocaleString('fr-FR')} XAF</span>
                    </div>
                    <p className="text-rose-700 font-medium text-[11px] leading-relaxed">
                      {String(f.error_message || 'Erreur indéterminée')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
