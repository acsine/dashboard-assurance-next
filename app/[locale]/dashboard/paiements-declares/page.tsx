'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  Loader2,
  CreditCard,
  Bell,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Eye,
  Check,
  ExternalLink,
  XCircle,
  Search,
  X,
  FileCheck,
} from 'lucide-react'
import { asList, portalClientApi, contractsApi, proxiedAssetUrl } from '@/lib/api/mobi-assur'
import { RoleGuard } from '@/components/auth/RoleGuard'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

function paymentProofUrls(payment: Record<string, any>): string[] {
  if (Array.isArray(payment.proof_urls) && payment.proof_urls.length > 0) {
    return payment.proof_urls.filter(Boolean)
  }
  if (typeof payment.proof_url === 'string' && payment.proof_url) return [payment.proof_url]
  return []
}

export default function PaiementsDeclaresPage() {
  const t = useTranslations('paiements')
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
  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null)
  const [receivedReference, setReceivedReference] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

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

  const rejectMut = useMutation({
    mutationFn: ({
      contractId,
      paymentId,
      reason,
    }: {
      contractId: string
      paymentId: string
      reason?: string
    }) =>
      contractsApi.rejectPayment(contractId, paymentId, {
        rejection_reason: reason,
      }),
    onSuccess: () => {
      toast.success('Paiement rejeté avec succès')
      qc.invalidateQueries({ queryKey: ['pending-client-payments'] })
      setRejectingPaymentId(null)
      setRejectionReason('')
    },
    onError: (e: any) => {
      toast.error(e.message || 'Erreur lors du rejet du paiement')
    },
  })

  const filteredItems = items.filter((p) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    const payer = String(p.payer_name || '').toLowerCase()
    const ref = String(p.reference_externe || '').toLowerCase()
    const contractId = String(p.contract_id || '').toLowerCase()
    const method = String(p.method || '').toLowerCase()
    const amount = String(p.amount || '')
    return (
      payer.includes(q) ||
      ref.includes(q) ||
      contractId.includes(q) ||
      method.includes(q) ||
      amount.includes(q)
    )
  })

  const totalPendingAmount = items.reduce(
    (acc, curr) => acc + Number(curr.amount || 0),
    0
  )

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8 bg-slate-50/50 min-h-screen">
      <Header title={t('title')} subtitle={t('subtitle')} />

      {/* Top action and quick stats bar */}
      <div className="relative z-30 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white/95 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 pro-shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Gestion des Encaissements & Preuves</p>
            <p className="text-xs text-slate-500">
              {items.length} paiement(s) déclaré(s) • Total en attente :{' '}
              <span className="font-extrabold text-blue-700">
                {totalPendingAmount.toLocaleString('fr-FR')} XAF
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher payeur, réf, contrat..."
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

          <Button
            variant="outline"
            isLoading={remindMut.isPending}
            disabled={remindMut.isPending}
            onClick={() => remindMut.mutate()}
            className="rounded-xl text-xs font-bold"
          >
            {!remindMut.isPending && <Bell className="h-4 w-4 mr-2" />}
            Lancer relances (J-30/15/7)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Pending Payments Table */}
        <Card className="lg:col-span-2 bg-white/95 backdrop-blur-xl border-slate-200/80 pro-shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Déclarations en attente</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {filteredItems.length} paiement(s) affiché(s) sur {items.length} en attente
                </CardDescription>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
                En attente de validation
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                <span className="text-xs font-medium">Chargement des transactions...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                <div className="p-3 bg-slate-100 rounded-full text-slate-400 mb-1">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {searchQuery ? 'Aucun paiement correspondant' : 'Aucun paiement en attente'}
                </p>
                <p className="text-xs text-slate-400">
                  {searchQuery
                    ? `Aucun résultat pour "${searchQuery}".`
                    : 'Toutes les déclarations reçues ont été traitées.'}
                </p>
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
                    {filteredItems.map((p) => {
                      const proofs = paymentProofUrls(p)
                      const isThisValidating = validatingPaymentId === String(p.id)
                      const isThisRejecting = rejectingPaymentId === String(p.id)

                      return (
                        <tr key={String(p.id)} className="hover:bg-slate-50/70 transition-colors align-middle">
                          <td className="px-4 py-3.5 font-extrabold text-slate-900">
                            {Number(p.amount || 0).toLocaleString('fr-FR')}{' '}
                            <span className="text-[11px] text-slate-500 font-normal">XAF</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {String(p.method || 'Mobile Money')}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs">
                            {p.reference_externe ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-100">
                                {String(p.reference_externe)}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-800">
                            {String(p.payer_name || 'Client anonyme')}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs">
                            {p.contract_id ? (
                              <Link
                                href={`/dashboard/contracts/${String(p.contract_id)}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline font-semibold"
                              >
                                {String(p.contract_id).slice(0, 8).toUpperCase()}...
                              </Link>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-xs">
                            {proofs.length === 0 ? (
                              <span className="text-slate-400 italic">Aucune</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 max-w-[160px]">
                                {proofs.map((url, idx) => (
                                  <a
                                    key={idx}
                                    href={proxiedAssetUrl(url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 transition-colors"
                                  >
                                    <FileCheck className="h-3 w-3 text-emerald-600" />
                                    Preuve {idx + 1}
                                    <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                            {p.created_at ? new Date(String(p.created_at)).toLocaleDateString('fr-FR') : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex justify-end items-center gap-2">
                              {isThisValidating ? (
                                <div className="flex flex-col gap-1.5 text-left min-w-[220px] bg-slate-50 p-3 rounded-xl border border-blue-200 shadow-sm animate-in fade-in-50">
                                  <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                                    Référence de transaction reçue :
                                  </span>
                                  <Input
                                    className="h-8 text-xs font-mono bg-white"
                                    placeholder="Ex: N° transaction MoMo/OM"
                                    value={receivedReference}
                                    onChange={(e) => setReceivedReference(e.target.value)}
                                    disabled={validateMut.isPending}
                                  />
                                  <div className="flex gap-1.5 mt-1">
                                    <Button
                                      size="sm"
                                      variant="success"
                                      className="h-7 text-[11px] flex-1 text-white font-bold"
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
                              ) : isThisRejecting ? (
                                <div className="flex flex-col gap-1.5 text-left min-w-[220px] bg-rose-50/80 p-3 rounded-xl border border-rose-200 shadow-sm animate-in fade-in-50">
                                  <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider">
                                    Motif du rejet (facultatif) :
                                  </span>
                                  <Input
                                    className="h-8 text-xs bg-white border-rose-200"
                                    placeholder="Ex: Référence invalide, non reçu"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    disabled={rejectMut.isPending}
                                  />
                                  <div className="flex gap-1.5 mt-1">
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-7 text-[11px] flex-1 font-bold bg-rose-600 hover:bg-rose-700 text-white"
                                      disabled={rejectMut.isPending}
                                      isLoading={rejectMut.isPending}
                                      onClick={() => {
                                        rejectMut.mutate({
                                          contractId: String(p.contract_id),
                                          paymentId: String(p.id),
                                          reason: rejectionReason.trim() || undefined,
                                        })
                                      }}
                                    >
                                      Rejeter
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-[11px] flex-1"
                                      disabled={rejectMut.isPending}
                                      onClick={() => {
                                        setRejectingPaymentId(null)
                                        setRejectionReason('')
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
                                      className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors font-semibold bg-white"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      Détails
                                    </Link>
                                  )}
                                  <RoleGuard permission="payments:manage" fallback={null}>
                                    <Button
                                      size="sm"
                                      variant="success"
                                      className="text-white h-8 text-xs font-bold"
                                      onClick={() => {
                                        setValidatingPaymentId(String(p.id))
                                        setRejectingPaymentId(null)
                                        setReceivedReference('')
                                      }}
                                    >
                                      <Check className="h-3.5 w-3.5 mr-1" />
                                      Valider
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                                      onClick={() => {
                                        setRejectingPaymentId(String(p.id))
                                        setValidatingPaymentId(null)
                                        setRejectionReason('')
                                      }}
                                    >
                                      <XCircle className="h-3.5 w-3.5 mr-1" />
                                      Rejeter
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
        <Card className="bg-white/95 backdrop-blur-xl border-slate-200/80 pro-shadow-sm rounded-2xl overflow-hidden flex flex-col">
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
