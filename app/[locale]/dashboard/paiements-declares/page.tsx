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
  MessageCircle,
  ShieldCheck,
  ZoomIn,
  Car,
  FileText,
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

function TargetContractDetailsCard({
  contractId,
  payment,
}: {
  contractId: string
  payment: Record<string, any>
}) {
  const { data: contract, isLoading } = useQuery({
    queryKey: ['target-contract', contractId],
    queryFn: () => contractsApi.get(contractId),
    enabled: !!contractId,
    staleTime: 60_000,
  })

  const firstVehicle = (contract as any)?.vehicles?.[0]?.vehicle
  const vehicleMarque = payment.vehicle_marque || firstVehicle?.marque || (contract as any)?.marque
  const vehicleModele = payment.vehicle_modele || firstVehicle?.modele || (contract as any)?.modele
  const vehicleImmat = payment.vehicle_immat || firstVehicle?.immatriculation || (contract as any)?.immatriculation
  const vehicleFull = [vehicleMarque, vehicleModele].filter(Boolean).join(' ')

  const contractNumber =
    payment.contract_number ||
    (contract as any)?.contract_number ||
    `POL-${contractId.slice(0, 8).toUpperCase()}`
  const productType = payment.product_type || (contract as any)?.product_type || 'Automobile'
  const subscriptionType = payment.subscription_type || (contract as any)?.subscription_type || 'Annuelle'
  const pttc = payment.pttc ?? (contract as any)?.pttc ?? (contract as any)?.prime_ttc ?? payment.amount

  return (
    <div className="rounded-2xl border border-blue-200/90 bg-linear-to-br from-blue-50/70 to-indigo-50/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs">
            <Car className="h-4 w-4" />
          </span>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-900 block">
              Contrat Cible & Véhicule Assuré
            </span>
            <span className="text-[10px] text-blue-700 font-medium">Police à déverrouiller</span>
          </div>
        </div>

        <span className="font-mono text-xs font-black bg-blue-700 text-white px-2.5 py-1 rounded-lg shadow-2xs">
          {contractNumber}
        </span>
      </div>

      {/* Détails Véhicule & Formule */}
      <div className="rounded-xl bg-white/95 p-3 border border-blue-100 shadow-2xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">Véhicule assuré :</span>
          <div className="text-right">
            <span className="font-extrabold text-slate-900 block">
              {vehicleFull || (isLoading ? 'Chargement du véhicule...' : 'Véhicule Automobile')}
            </span>
            {vehicleImmat && (
              <span className="font-mono text-[11px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block mt-0.5">
                {vehicleImmat}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
          <span className="text-slate-500 font-medium">Formule souscrite :</span>
          <span className="font-bold text-slate-800">
            {productType} · {subscriptionType}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-slate-500 font-medium">Prime TTC prévue :</span>
          <span className="font-mono font-black text-slate-900">
            {Number(pttc || 0).toLocaleString('fr-FR')} XAF
          </span>
        </div>
      </div>

      {/* ID Système discret & Lien vers le contrat */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5 px-1">
        <span className="font-mono text-[10px] text-slate-400">ID: {contractId.slice(0, 8)}...</span>
        <Link
          href={`/dashboard/contracts/${contractId}`}
          target="_blank"
          className="font-bold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center gap-1 text-[11px]"
        >
          Ouvrir la fiche contrat <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
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

  const [selectedPaymentForValidation, setSelectedPaymentForValidation] = useState<Record<string, any> | null>(null)
  const [selectedPaymentForRejection, setSelectedPaymentForRejection] = useState<Record<string, any> | null>(null)
  const [lastValidatedPayment, setLastValidatedPayment] = useState<Record<string, any> | null>(null)
  const [receivedReference, setReceivedReference] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null)

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
    onSuccess: (_, variables) => {
      toast.success('Paiement validé avec succès ! Contrat activé et attestations CIMA disponibles.')
      qc.invalidateQueries({ queryKey: ['pending-client-payments'] })
      qc.invalidateQueries({ queryKey: ['contracts'] })
      if (selectedPaymentForValidation) {
        setLastValidatedPayment({
          ...selectedPaymentForValidation,
          validated_reference: variables.receivedReference,
        })
      }
      setSelectedPaymentForValidation(null)
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
      setSelectedPaymentForRejection(null)
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
                          <td className="px-4 py-3.5 text-xs">
                            {p.contract_id ? (
                              <div className="space-y-1">
                                {Boolean(p.vehicle_immat || p.vehicle_marque) ? (
                                  <div>
                                    <span className="font-bold text-slate-900 block truncate max-w-[160px]">
                                      {[p.vehicle_marque, p.vehicle_modele].filter(Boolean).map(String).join(' ')}
                                    </span>
                                    {Boolean(p.vehicle_immat) ? (
                                      <span className="font-mono text-[10px] font-extrabold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60 inline-block mt-0.5">
                                        {String(p.vehicle_immat)}
                                      </span>
                                    ) : null}
                                  </div>
                                ) : null}
                                <Link
                                  href={`/dashboard/contracts/${String(p.contract_id)}`}
                                  className="text-blue-600 hover:text-blue-800 hover:underline font-mono font-semibold block text-[11px]"
                                >
                                  {p.contract_number ? String(p.contract_number) : `${String(p.contract_id).slice(0, 8).toUpperCase()}...`}
                                </Link>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-xs">
                            {proofs.length === 0 ? (
                              <span className="text-slate-400 italic">Aucune</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 max-w-[160px]">
                                {proofs.map((url, idx) => (
                                  <button
                                    type="button"
                                    key={idx}
                                    onClick={() => setPreviewProofUrl(proxiedAssetUrl(url))}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 transition-colors cursor-pointer"
                                  >
                                    <FileCheck className="h-3 w-3 text-emerald-600" />
                                    Preuve {idx + 1}
                                    <ZoomIn className="h-2.5 w-2.5 opacity-60" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                            {p.created_at ? new Date(String(p.created_at)).toLocaleDateString('fr-FR') : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex justify-end items-center gap-1.5">
                              {p.contract_id ? (
                                <Link
                                  href={`/dashboard/contracts/${String(p.contract_id)}`}
                                  className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors font-semibold bg-white"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Détails
                                </Link>
                              ) : null}
                              <RoleGuard permission="payments:manage" fallback={null}>
                                <Button
                                  size="sm"
                                  variant="success"
                                  className="text-white h-8 text-xs font-bold"
                                  onClick={() => {
                                    setSelectedPaymentForValidation(p)
                                    setReceivedReference(String(p.reference_externe || ''))
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
                                    setSelectedPaymentForRejection(p)
                                    setRejectionReason('')
                                  }}
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1" />
                                  Rejeter
                                </Button>
                              </RoleGuard>
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

      {/* Modal de Confirmation de Validation ProMax */}
      {selectedPaymentForValidation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Confirmation de Validation du Paiement</h3>
                  <p className="text-xs text-slate-500">Contrôle de conformité avant déverrouillage de la police</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPaymentForValidation(null)}
                className="text-slate-400 hover:text-slate-600 p-1 text-lg font-bold"
              >
                ×
              </button>
            </div>

            {/* Récapitulatif du versement */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Montant à valider :</span>
                <span className="text-lg font-black text-slate-900 font-mono">
                  {Number(selectedPaymentForValidation.amount || 0).toLocaleString('fr-FR')} XAF
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Nom du payeur :</span>
                <span className="font-bold text-slate-800">{String(selectedPaymentForValidation.payer_name || 'Non renseigné')}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Mode de paiement :</span>
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                  {String(selectedPaymentForValidation.method || 'Mobile Money')}
                </span>
              </div>
            </div>

            {/* Contrat et Véhicule Cible ProMax */}
            {selectedPaymentForValidation.contract_id ? (
              <TargetContractDetailsCard
                contractId={String(selectedPaymentForValidation.contract_id)}
                payment={selectedPaymentForValidation}
              />
            ) : null}

            {/* Preuves jointes */}
            {(() => {
              const proofs = paymentProofUrls(selectedPaymentForValidation)
              if (proofs.length === 0) return null
              return (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 block">Preuve(s) de versement transmise(s) :</span>
                  <div className="flex flex-wrap gap-2">
                    {proofs.map((url, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setPreviewProofUrl(proxiedAssetUrl(url))}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-xs font-bold text-emerald-800 hover:bg-emerald-100 border border-emerald-300 transition-colors"
                      >
                        <FileCheck className="h-4 w-4 text-emerald-600" />
                        Examiner la preuve {idx + 1}
                        <ZoomIn className="h-3 w-3 opacity-70" />
                      </button>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Saisie / vérification de référence */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Référence / ID de transaction constatée sur votre compte *
              </label>
              <Input
                placeholder="Ex: CI240518.1720.A12345"
                value={receivedReference}
                onChange={(e) => setReceivedReference(e.target.value)}
                className="text-xs font-mono font-bold bg-white h-10 border-slate-300 focus:border-emerald-600 focus:ring-emerald-600/20"
              />
              <p className="text-[11px] text-slate-500">
                Pré-remplie avec la référence déclarée par le client. Vous pouvez la corriger d'après votre SMS marchand.
              </p>
            </div>

            {/* Avertissement CIMA */}
            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-900 leading-relaxed font-medium">
              ⚡ <strong>Activation immédiate :</strong> La validation passe le contrat au statut <strong>PAYE / ACTIF</strong>, génère les attestations CIMA officielles et déverrouille le compte de l'assuré sur l'application mobile.
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={validateMut.isPending}
                onClick={() => setSelectedPaymentForValidation(null)}
                className="rounded-xl text-xs font-bold"
              >
                Annuler
              </Button>
              <Button
                type="button"
                disabled={validateMut.isPending || !receivedReference.trim()}
                onClick={() => {
                  validateMut.mutate({
                    contractId: String(selectedPaymentForValidation.contract_id),
                    paymentId: String(selectedPaymentForValidation.id),
                    receivedReference: receivedReference.trim(),
                  })
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs px-5"
              >
                {validateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <ShieldCheck className="h-4 w-4 mr-1.5" />}
                Confirmer et Activer la police
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Rejet du Paiement */}
      {selectedPaymentForRejection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-rose-950 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-rose-600" />
                Rejeter la déclaration de paiement
              </h3>
              <button
                type="button"
                onClick={() => setSelectedPaymentForRejection(null)}
                className="text-slate-400 hover:text-slate-600 p-1 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Contrat cible :</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedPaymentForRejection.contract_number || `POL-${String(selectedPaymentForRejection.contract_id).slice(0, 8).toUpperCase()}`}
                </span>
              </div>
              {(selectedPaymentForRejection.vehicle_marque || selectedPaymentForRejection.vehicle_immat) && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Véhicule :</span>
                  <span className="font-bold text-slate-900">
                    {[selectedPaymentForRejection.vehicle_marque, selectedPaymentForRejection.vehicle_modele].filter(Boolean).join(' ')}
                    {selectedPaymentForRejection.vehicle_immat ? ` (${selectedPaymentForRejection.vehicle_immat})` : ''}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Montant déclaré :</span>
                <span className="font-mono font-extrabold text-rose-700">
                  {Number(selectedPaymentForRejection.amount || 0).toLocaleString('fr-FR')} XAF
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Motif du rejet (facultatif) :</label>
              <Input
                placeholder="Ex: Référence introuvable sur le relevé Orange Money..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="text-xs bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={rejectMut.isPending}
                onClick={() => setSelectedPaymentForRejection(null)}
                className="rounded-xl text-xs font-bold"
              >
                Annuler
              </Button>
              <Button
                type="button"
                disabled={rejectMut.isPending}
                onClick={() => {
                  rejectMut.mutate({
                    contractId: String(selectedPaymentForRejection.contract_id),
                    paymentId: String(selectedPaymentForRejection.id),
                    reason: rejectionReason.trim() || undefined,
                  })
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                {rejectMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <XCircle className="h-4 w-4 mr-1.5" />}
                Confirmer le rejet
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Succès & Alerte WhatsApp Assuré */}
      {lastValidatedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">Police CIMA Activée avec Succès !</h3>
              <p className="text-xs text-slate-500 mt-1">
                Le règlement de {Number(lastValidatedPayment.amount || 0).toLocaleString('fr-FR')} XAF pour le contrat{' '}
                <span className="font-mono font-bold text-slate-800">
                  {lastValidatedPayment.contract_number || String(lastValidatedPayment.contract_id).slice(0, 8).toUpperCase()}
                </span>
                {lastValidatedPayment.vehicle_immat ? ` (${lastValidatedPayment.vehicle_immat})` : ''} a été validé avec succès.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-left text-xs text-emerald-950 space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Contrat actif & compte débloqué
              </p>
              <p className="text-[11px] text-emerald-800">
                Vous pouvez maintenant envoyer une confirmation directe à l'assuré sur WhatsApp.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLastValidatedPayment(null)}
                className="w-full sm:flex-1 rounded-xl text-xs font-bold"
              >
                Fermer
              </Button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Bonjour ${lastValidatedPayment.payer_name || 'cher assuré'}, votre paiement de ${Number(lastValidatedPayment.amount || 0).toLocaleString('fr-FR')} XAF (Réf: ${lastValidatedPayment.validated_reference || ''}) a été validé avec succès par BETHEL ASSURANCES. Votre contrat est désormais actif et vos attestations CIMA sont disponibles sur votre application !`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:flex-1 inline-flex items-center justify-center h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <MessageCircle className="h-4 w-4 mr-1.5" />
                Alerter WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Visualisation Preuve */}
      {previewProofUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setPreviewProofUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewProofUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 p-1 font-bold text-lg"
            >
              × Fermer
            </button>
            <img
              src={previewProofUrl}
              alt="Preuve de paiement"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/20 bg-white"
            />
          </div>
        </div>
      )}
    </div>
  )
}
