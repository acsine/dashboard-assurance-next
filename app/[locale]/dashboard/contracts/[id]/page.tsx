'use client'

export const dynamic = 'force-dynamic'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, use } from 'react'
import {
  contractsApi,
  clientsApi,
  suggestCarteRoseSerial,
  proxiedAssetUrl,
  type Payment,
  type PaymentMethod,
} from '@/lib/api/mobi-assur'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { paymentProofRequired, paymentReadyToValidate, paymentSummary } from '@/lib/payments'
import { validateUploadFile } from '@/lib/files/validation'
import Header from '@/components/dashboard/Header'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  FileText,
  Loader2,
  Calendar,
  DollarSign,
  CheckCircle,
  FileSpreadsheet,
  Download,
  ExternalLink,
  Upload,
  XCircle,
  AlertTriangle,
} from 'lucide-react'

function paymentProofUrls(payment: Payment): string[] {
  if (Array.isArray(payment.proof_urls) && payment.proof_urls.length > 0) {
    return payment.proof_urls.filter(Boolean)
  }
  if (payment.proof_url) return [payment.proof_url]
  return []
}

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations('contracts')
  const { id } = use(params)
  const queryClient = useQueryClient()
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ESPECES')
  const [paymentReference, setPaymentReference] = useState('')
  const [proofUrlsText, setProofUrlsText] = useState('')
  const [uploadedProofUrls, setUploadedProofUrls] = useState<string[]>([])
  const [validatingPaymentId, setValidatingPaymentId] = useState<string | null>(null)
  const [receivedReference, setReceivedReference] = useState('')
  const [selectedPaymentForRejection, setSelectedPaymentForRejection] = useState<Payment | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [uploadingProof, setUploadingProof] = useState(false)
  const [carteRoseSerial, setCarteRoseSerial] = useState(() => suggestCarteRoseSerial(id))
  const [carteRoseAssigned, setCarteRoseAssigned] = useState(false)

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

  const collectProofUrls = (): string[] => {
    const fromText = proofUrlsText
      .split(/[\n,;]+/)
      .map((u) => u.trim())
      .filter(Boolean)
    return Array.from(new Set([...uploadedProofUrls, ...fromText]))
  }

  // Add Payment Mutation
  const addPaymentMutation = useMutation({
    mutationFn: (amount: number) => {
      const proofs = collectProofUrls()
      return contractsApi.addPayment(id, {
        amount,
        method: paymentMethod,
        reference_externe: paymentReference.trim() || undefined,
        proof_urls: proofs.length > 0 ? proofs : undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', id] })
      queryClient.invalidateQueries({ queryKey: ['contract-payments', id] })
      toast.success('Paiement enregistré (Statut: PENDING)')
      setShowAddPayment(false)
      setPaymentAmount('')
      setPaymentReference('')
      setProofUrlsText('')
      setUploadedProofUrls([])
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de l\'ajout du paiement')
    },
  })

  // Validate Payment Mutation
  const validatePaymentMutation = useMutation({
    mutationFn: ({
      paymentId,
      received_reference,
    }: {
      paymentId: string
      received_reference?: string
    }) => contractsApi.validatePayment(id, paymentId, { received_reference }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', id] })
      queryClient.invalidateQueries({ queryKey: ['contract-payments', id] })
      setValidatingPaymentId(null)
      setReceivedReference('')
      toast.success('Paiement validé avec succès')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la validation du paiement')
    },
  })

  // Reject Payment Mutation
  const rejectPaymentMutation = useMutation({
    mutationFn: ({
      paymentId,
      reason,
    }: {
      paymentId: string
      reason?: string
    }) => contractsApi.rejectPayment(id, paymentId, { rejection_reason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', id] })
      queryClient.invalidateQueries({ queryKey: ['contract-payments', id] })
      setSelectedPaymentForRejection(null)
      setRejectionReason('')
      toast.success('Paiement rejeté avec succès. L\'assuré a été notifié.')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors du rejet du paiement')
    },
  })

  const assignCarteRoseMutation = useMutation({
    mutationFn: () =>
      contractsApi.addPhysicalDocs(id, {
        doc_type: 'CARTE_ROSE',
        serial_number: carteRoseSerial.trim(),
      }),
    onSuccess: () => {
      setCarteRoseAssigned(true)
      toast.success('Numéro de série de la Carte Rose attribué')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de l’attribution de la Carte Rose')
    },
  })

  // Document Pack generation mutation
  const generatePackMutation = useMutation({
    mutationFn: () => contractsApi.generatePack(id),
    onSuccess: () => {
      toast.success('Classeur Excel téléchargé')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la génération du pack')
    },
  })

  const handleProofUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploadingProof(true)
    try {
      const urls: string[] = []
      for (const file of Array.from(files)) {
        validateUploadFile(file)
        const { url } = await clientsApi.uploadDoc(file)
        urls.push(url)
      }
      setUploadedProofUrls((prev) => [...prev, ...urls])
      toast.success(`${urls.length} preuve(s) téléversée(s)`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Échec du téléversement')
    } finally {
      setUploadingProof(false)
    }
  }

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
    const proofs = collectProofUrls()
    if (paymentProofRequired(paymentMethod) && proofs.length === 0) {
      toast.error('Ajoutez au moins une preuve de paiement (URL ou fichier)')
      return
    }
    addPaymentMutation.mutate(Number(paymentAmount))
  }

  const totalDue = contract?.pttc ?? contract?.prime_ttc ?? 0
  const { paid: totalPaid, balance } = paymentSummary(totalDue, payments)

  if (loadingContract) {
    return (
      <div className="grow flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <Header
        title={`${t('title')} #${id.substring(0, 8).toUpperCase()}`}
        subtitle={t('subtitle')}
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
                  <span className="text-sm font-semibold text-gray-800 mt-1 flex items-center gap-1.5">
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
                    {generatePackMutation.isPending ? 'Génération...' : 'Télécharger le classeur Excel'}
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
                  <div className="space-y-5">
                    <form
                      className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4"
                      onSubmit={(event) => {
                        event.preventDefault()
                        if (carteRoseSerial.trim().length < 3) {
                          toast.error('Le numéro de série doit contenir au moins 3 caractères')
                          return
                        }
                        assignCarteRoseMutation.mutate()
                      }}
                    >
                      <div className="mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            N° série Carte Rose
                          </span>
                          {carteRoseAssigned && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              Attribué
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          Ce numéro est obligatoire avant de générer le pack de documents.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          value={carteRoseSerial}
                          onChange={(event) => {
                            setCarteRoseSerial(event.target.value)
                            setCarteRoseAssigned(false)
                          }}
                          minLength={3}
                          maxLength={50}
                          placeholder="Ex. CR-2026-001234"
                          className="h-10 flex-1 border-blue-200 bg-white text-sm"
                          required
                        />
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          disabled={assignCarteRoseMutation.isPending || carteRoseAssigned}
                          className="h-10 text-white"
                        >
                          {assignCarteRoseMutation.isPending ? 'Attribution...' : 'Attribuer'}
                        </Button>
                      </div>
                    </form>

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
                                contractsApi.downloadDoc(id, doc.id, doc),
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
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        {paymentProofRequired(paymentMethod)
                          ? 'Preuves de paiement (obligatoire)'
                          : 'Preuves de paiement (facultatif pour espèces)'}
                      </span>
                      <Input
                        placeholder="URL(s) séparées par virgule ou ligne"
                        value={proofUrlsText}
                        onChange={(event) => setProofUrlsText(event.target.value)}
                        className="h-10 text-xs border-gray-200"
                      />
                      <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 cursor-pointer hover:text-blue-700">
                        <Upload className="h-3.5 w-3.5" />
                        {uploadingProof ? 'Téléversement…' : 'Joindre un fichier'}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          multiple
                          className="hidden"
                          disabled={uploadingProof}
                          onChange={(e) => {
                            void handleProofUpload(e.target.files)
                            e.target.value = ''
                          }}
                        />
                      </label>
                      {uploadedProofUrls.length > 0 && (
                        <ul className="space-y-1">
                          {uploadedProofUrls.map((url) => (
                            <li key={url}>
                              <a
                                href={proxiedAssetUrl(url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                              >
                                Preuve jointe
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowAddPayment(false)
                          setProofUrlsText('')
                          setUploadedProofUrls([])
                        }}
                      >
                        Annuler
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={addPaymentMutation.isPending || uploadingProof}
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
                    payments.map((payment) => {
                      const proofs = paymentProofUrls(payment)
                      const needsReference =
                        Boolean(payment.has_reference) || Boolean(payment.declared_by_client)
                      const proofRequired = paymentProofRequired(payment.method)
                      const canValidate = paymentReadyToValidate(payment, proofs.length)
                      const isValidatingThis = validatingPaymentId === payment.id
                      return (
                      <div key={payment.id} className="rounded-xl border border-gray-100 p-3 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <strong>{Number(payment.amount).toLocaleString('fr-FR')} FCFA</strong>
                            <span className="ml-2 text-gray-400">{payment.method}</span>
                            {payment.payer_name && (
                              <span className="mt-1 block text-gray-500">Payeur : {payment.payer_name}</span>
                            )}
                            {payment.status === 'SUCCESS' && payment.reference_externe && (
                              <span className="mt-1 block text-emerald-700 font-medium">
                                Réf. validation : <span className="font-mono font-bold">{payment.reference_externe}</span>
                              </span>
                            )}
                          </div>
                          <span className={
                            payment.status === 'SUCCESS'
                              ? 'font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200'
                              : payment.status === 'REJECTED'
                              ? 'font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200'
                              : 'font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200'
                          }>
                            {payment.status === 'REJECTED' ? 'REJETÉ' : payment.status}
                          </span>
                        </div>
                        {payment.status === 'REJECTED' && (
                          <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50/80 border border-rose-200 text-xs text-rose-950 space-y-1">
                            <div className="font-bold flex items-center gap-1.5 text-rose-700">
                              <XCircle className="h-4 w-4" />
                              Paiement rejeté
                            </div>
                            {payment.rejection_reason ? (
                              <p className="text-[11.5px] text-rose-800">
                                <strong>Motif :</strong> {payment.rejection_reason}
                              </p>
                            ) : (
                              <p className="text-[11px] text-rose-600">Aucun motif spécifique précisé.</p>
                            )}
                          </div>
                        )}
                        {!needsReference && proofRequired && (
                        <div className="mt-2 space-y-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            Preuves
                          </span>
                          {proofs.length === 0 ? (
                            <span className="text-[11px] text-red-500 font-medium">
                              Aucune preuve jointe — validation impossible
                            </span>
                          ) : (
                            <ul className="space-y-1">
                              {proofs.map((url, idx) => (
                                <li key={`${payment.id}-proof-${idx}`}>
                                  <a
                                    href={proxiedAssetUrl(url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                                  >
                                    Preuve {idx + 1}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        )}
                        {!needsReference && !proofRequired && proofs.length === 0 && (
                          <p className="mt-2 text-[11px] font-medium text-slate-500">
                            Espèces en agence — justificatif facultatif.
                          </p>
                        )}
                        {!needsReference && !proofRequired && proofs.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            Preuves (facultatif)
                          </span>
                          <ul className="space-y-1">
                            {proofs.map((url, idx) => (
                              <li key={`${payment.id}-proof-${idx}`}>
                                <a
                                  href={proxiedAssetUrl(url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                                >
                                  Preuve {idx + 1}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                        )}
                        {payment.status === 'PENDING' && (
                          <RoleGuard permission="payments:manage" fallback={null}>
                            {isValidatingThis && needsReference ? (
                              <div className="mt-3 space-y-2">
                                <Input
                                  value={receivedReference}
                                  onChange={(e) => setReceivedReference(e.target.value)}
                                  placeholder="Saisissez la référence constatée sur votre compte marchand..."
                                  className="text-xs"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="primary"
                                    disabled={
                                      validatePaymentMutation.isPending || !receivedReference.trim()
                                    }
                                    onClick={() =>
                                      validatePaymentMutation.mutate({
                                        paymentId: payment.id,
                                        received_reference: receivedReference.trim(),
                                      })
                                    }
                                    className="flex-1 text-white bg-emerald-600 hover:bg-emerald-700 font-bold"
                                  >
                                    Confirmer la validation
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
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
                              <div className="mt-3 flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={validatePaymentMutation.isPending || !canValidate}
                                  onClick={() => {
                                    if (needsReference) {
                                      setValidatingPaymentId(payment.id)
                                      setReceivedReference('')
                                      return
                                    }
                                    validatePaymentMutation.mutate({ paymentId: payment.id })
                                  }}
                                  title={
                                    !canValidate
                                      ? 'Preuve ou référence requise pour valider'
                                      : 'Valider ce versement'
                                  }
                                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-xs font-bold text-white transition shadow-xs disabled:opacity-50"
                                >
                                  Valider ce versement
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPaymentForRejection(payment)
                                    setRejectionReason('')
                                  }}
                                  className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3 py-2 text-xs font-bold text-rose-700 transition inline-flex items-center gap-1.5"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Rejeter
                                </button>
                              </div>
                            )}
                          </RoleGuard>
                        )}
                      </div>
                      )
                    })
                  )}
                </div>

                {contract?.status === 'PAYE' ? (
                  <div className="flex items-start gap-2.5 p-4 bg-green-50 border border-green-100 rounded-2xl text-green-700 text-xs font-medium">
                    <CheckCircle className="h-4.5 w-4.5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Contrat Entièrement Réglé</span>
                      <p className="mt-1 leading-relaxed">
                        La prime d&apos;assurance a été créditée. La commission est débloquée pour
                        l&apos;agent qui a prospecté le client.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 border border-amber-100 bg-amber-50/50 rounded-2xl text-xs text-amber-700 font-medium">
                    Versements partiels acceptés jusqu’au règlement du solde. La commission de
                    l&apos;agent prospecteur sera débloquée à la validation du paiement.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal Rejet de Paiement */}
      {selectedPaymentForRejection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <XCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Rejeter ce versement</h3>
                <p className="text-xs text-slate-500">
                  L'assuré sera notifié avec le motif afin de soumettre une nouvelle preuve conforme.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Montant déclaré :</span>
                <span className="font-mono font-black text-rose-700 text-sm">
                  {Number(selectedPaymentForRejection.amount || 0).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Mode de paiement :</span>
                <span className="font-bold text-slate-800">{selectedPaymentForRejection.method}</span>
              </div>
              {selectedPaymentForRejection.payer_name && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Payeur :</span>
                  <span className="font-medium text-slate-800">{selectedPaymentForRejection.payer_name}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Motif du rejet (transmis à l'assuré) :
              </label>
              <Input
                placeholder="Ex: Référence introuvable sur le relevé Orange Money, montant erroné..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="text-xs h-10 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={rejectPaymentMutation.isPending}
                onClick={() => {
                  setSelectedPaymentForRejection(null)
                  setRejectionReason('')
                }}
                className="rounded-xl text-xs font-bold h-10 px-4"
              >
                Annuler
              </Button>
              <Button
                type="button"
                disabled={rejectPaymentMutation.isPending}
                onClick={() => {
                  rejectPaymentMutation.mutate({
                    paymentId: selectedPaymentForRejection.id,
                    reason: rejectionReason.trim() || undefined,
                  })
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold h-10 px-4"
              >
                {rejectPaymentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <XCircle className="h-4 w-4 mr-1.5" />
                )}
                Confirmer le rejet
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
