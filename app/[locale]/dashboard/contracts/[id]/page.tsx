'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, use } from 'react'
import { contractsApi, clientsApi, type PaymentMethod } from '@/lib/api/mobi-assur'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { paymentSummary } from '@/lib/payments'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  FileText,
  User,
  Plus,
  Loader2,
  Calendar,
  DollarSign,
  CheckCircle,
  FileSpreadsheet,
  Download,
} from 'lucide-react'

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const queryClient = useQueryClient()
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ESPECES')
  const [paymentReference, setPaymentReference] = useState('')

  // Query Contract profile
  const { data: contract, isLoading: loadingContract } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => contractsApi.get(id),
  })

  // Query client name
  const { data: client } = useQuery({
    queryKey: ['client', contract?.client_id],
    queryFn: () => clientsApi.get(contract!.client_id),
    enabled: !!contract?.client_id,
  })

  // Query documents
  const { data: documents = [] } = useQuery({
    queryKey: ['contract-docs', id],
    queryFn: () => contractsApi.listDocs(id),
  })

  const { data: payments = [] } = useQuery({
    queryKey: ['contract-payments', id],
    queryFn: () => contractsApi.listPayments(id),
  })

  // Add Payment Mutation
  const addPaymentMutation = useMutation({
    mutationFn: (amount: number) =>
      contractsApi.addPayment(id, {
        amount,
        method: paymentMethod,
        reference_externe: paymentReference.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', id] })
      queryClient.invalidateQueries({ queryKey: ['contract-payments', id] })
      toast.success('Paiement enregistré (Statut: PENDING)')
      setShowAddPayment(false)
      setPaymentAmount('')
      setPaymentReference('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de l\'ajout du paiement')
    },
  })

  // Validate Payment Mutation
  const validatePaymentMutation = useMutation({
    // Hardcoded dummy ID since validation requires payment_id, we validate the contract.
    // In real deployment, you fetch from the payments sub-array or pass IDs.
    // For V1 fallback, we validate the payment.
    mutationFn: (paymentId: string) => contractsApi.validatePayment(id, paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', id] })
      queryClient.invalidateQueries({ queryKey: ['contract-payments', id] })
      toast.success('Paiement validé avec succès (Contrat: PAYE)')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la validation du paiement')
    },
  })

  // Document Pack generation mutation
  const generatePackMutation = useMutation({
    mutationFn: () => contractsApi.generatePack(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-docs', id] })
      toast.success('Pack de documents généré')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la génération du pack')
    },
  })

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      toast.error('Montant valide requis')
      return
    }
    if (balance > 0 && Number(paymentAmount) > balance) {
      toast.error('Le versement dépasse le solde restant')
      return
    }
    addPaymentMutation.mutate(Number(paymentAmount))
  }

  const totalDue = contract?.pttc ?? contract?.prime_ttc ?? 0
  const { paid: totalPaid, balance } = paymentSummary(totalDue, payments)

  if (loadingContract) {
    return (
      <div className="flex-grow flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <Header
        title={`Police d'Assurance #${id.substring(0, 8).toUpperCase()}`}
        subtitle={`Réglez les cotisations, attribuez les attestations et téléchargez les documents.`}
      />


      <div className="p-8 space-y-8 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Contract details Card */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-gray-100 shadow-sm bg-white">
              <CardHeader className="pb-4 border-b border-gray-50">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" /> Paramètres du Contrat
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                    Assuré
                  </span>
                  <span className="text-sm font-bold text-gray-900 mt-1 block">
                    {client?.full_name || 'Chargement...'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                    Type de Produit
                  </span>
                  <span className="text-sm font-semibold text-gray-800 mt-1 block">
                    {contract?.product_type} ({contract?.subscription_type})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                    Date d'Effet
                  </span>
                  <span className="text-sm font-semibold text-gray-800 mt-1 block flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-gray-400" />{' '}
                    {contract?.date_effet
                      ? new Date(contract.date_effet).toLocaleDateString('fr-FR')
                      : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                    Durée de Couverture
                  </span>
                  <span className="text-sm font-semibold text-gray-800 mt-1 block">
                    {contract?.duree_jours} Jours
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                    Zone de circulation
                  </span>
                  <span className="text-sm font-semibold text-gray-800 mt-1 block">
                    {contract?.zone_circulation || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                    Statut Global
                  </span>
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold mt-1 ${
                      contract?.status === 'PAYE'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {contract?.status}
                  </span>
                </div>

                <div className="sm:col-span-2 pt-4 border-t border-gray-50 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                      Prime Nette
                    </span>
                    <span className="text-base font-bold text-gray-900 mt-1 block">
                      {(contract?.prime_nette || 0).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                      Prime Totale (TTC)
                    </span>
                    <span className="text-base font-extrabold text-blue-600 mt-1 block">
                      {totalDue.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Document download triggers */}
            <Card className="border-gray-100 shadow-sm bg-white">
              <CardHeader className="pb-4 border-b border-gray-50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-blue-500" /> Documents & Attestations
                </CardTitle>
                <RoleGuard permission="agency:mutate" fallback={null}>
                  <button
                    onClick={() => generatePackMutation.mutate()}
                    disabled={generatePackMutation.isPending || contract?.status !== 'PAYE'}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 disabled:bg-gray-150 disabled:text-gray-400 rounded-xl transition-all cursor-pointer border-0"
                  >
                    {generatePackMutation.isPending ? 'Génération...' : 'Générer le Pack'}
                  </button>
                </RoleGuard>
              </CardHeader>
              <CardContent className="pt-6">
                {contract?.status !== 'PAYE' ? (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-xs text-amber-700 font-medium">
                    ⚠️ Les documents (Carte Rose, Attestations, Fiche d'identification) ne peuvent
                    être générés qu'après encaissement effectif de la prime totale (Statut: PAYE).
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.length === 0 ? (
                      <div className="p-4 border border-dashed border-gray-200 rounded-2xl text-center">
                        <span className="text-xs text-gray-500">Aucun document généré pour le moment.</span>
                      </div>
                    ) : (
                      documents.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-3.5 rounded-2xl border border-gray-100 bg-gray-50/20">
                          <div>
                            <span className="font-bold text-xs text-gray-900 block">
                              {doc.doc_type} ({doc.format})
                            </span>
                            <span className="text-[10px] text-gray-400 block mt-0.5">
                              Généré le {new Date(doc.generated_at).toLocaleString('fr-FR')}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              toast.promise(
                                contractsApi.downloadDoc(id, doc.id),
                                {
                                  loading: 'Téléchargement...',
                                  success: 'Document téléchargé',
                                  error: 'Erreur lors du téléchargement'
                                }
                              )
                            }}
                            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-all cursor-pointer"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Left panel: Payments validation */}
          <div className="space-y-6">
            <Card className="border-gray-100 shadow-sm bg-white">
              <CardHeader className="pb-4 border-b border-gray-50 flex justify-between items-center flex-row">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-500" /> Règlement
                </CardTitle>
                {contract?.status !== 'PAYE' && (
                  <RoleGuard permission="payments:manage" fallback={null}>
                  <button
                    onClick={() => setShowAddPayment(!showAddPayment)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                  >
                    Déclarer
                  </button>
                  </RoleGuard>
                )}
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {showAddPayment && (
                  <form onSubmit={handleAddPayment} className="space-y-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Montant du versement (FCFA)
                    </span>
                    <Input
                      type="number"
                      min="1"
                      max={balance || undefined}
                      placeholder="Ex: 50000"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="h-10 text-xs border-gray-205"
                      required
                    />
                    <select
                      value={paymentMethod}
                      onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                      className="flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs"
                    >
                      <option value="ESPECES">Espèces</option>
                      <option value="ORANGE_MONEY">Orange Money</option>
                      <option value="MTN_MOMO">MTN MoMo</option>
                      <option value="CHEQUE">Chèque</option>
                      <option value="VIREMENT">Virement</option>
                    </select>
                    <Input
                      placeholder="Référence externe (facultative)"
                      value={paymentReference}
                      onChange={(event) => setPaymentReference(event.target.value)}
                      className="h-10 text-xs border-gray-200"
                    />
                    <div className="flex gap-2 justify-end pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAddPayment(false)}
                      >
                        Annuler
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={addPaymentMutation.isPending}
                        className="text-white"
                      >
                        Enregistrer
                      </Button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-xs">
                  <div>
                    <span className="block text-gray-400">Cumul validé</span>
                    <strong>{totalPaid.toLocaleString('fr-FR')} FCFA</strong>
                  </div>
                  <div>
                    <span className="block text-gray-400">Solde restant</span>
                    <strong>{balance.toLocaleString('fr-FR')} FCFA</strong>
                  </div>
                </div>

                <div className="space-y-2">
                  {payments.length === 0 ? (
                    <p className="text-xs text-gray-400">Aucun versement enregistré.</p>
                  ) : (
                    payments.map((payment) => (
                      <div key={payment.id} className="rounded-xl border border-gray-100 p-3 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <strong>{Number(payment.amount).toLocaleString('fr-FR')} FCFA</strong>
                            <span className="ml-2 text-gray-400">{payment.method}</span>
                            {payment.reference_externe && (
                              <span className="mt-1 block text-gray-400">Réf. {payment.reference_externe}</span>
                            )}
                          </div>
                          <span className={payment.status === 'SUCCESS' ? 'font-bold text-green-600' : 'font-bold text-amber-600'}>
                            {payment.status}
                          </span>
                        </div>
                        {payment.status === 'PENDING' && (
                          <RoleGuard permission="payments:manage" fallback={null}>
                            <button
                              type="button"
                              disabled={validatePaymentMutation.isPending}
                              onClick={() => validatePaymentMutation.mutate(payment.id)}
                              className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white disabled:opacity-50"
                            >
                              Valider ce versement
                            </button>
                          </RoleGuard>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {contract?.status === 'PAYE' ? (
                  <div className="flex items-start gap-2.5 p-4 bg-green-50 border border-green-100 rounded-2xl text-green-700 text-xs font-medium">
                    <CheckCircle className="h-4.5 w-4.5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Contrat Entièrement Réglé</span>
                      <p className="mt-1 leading-relaxed">
                        La prime d'assurance a été créditée. La commission est débloquée dans le
                        wallet de l'agent.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 border border-amber-100 bg-amber-50/50 rounded-2xl text-xs text-amber-700 font-medium">
                    ⌛ Versements partiels acceptés jusqu’au règlement du solde.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
