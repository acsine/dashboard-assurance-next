'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { walletApi, type WithdrawalRequest } from '@/lib/api/mobi-assur'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Wallet,
  Check,
  X,
  Loader2,
  Target,
  Award,
  Search,
  User,
  Phone,
  Mail,
  Hash,
  ExternalLink,
} from 'lucide-react'
import { validateUploadFile } from '@/lib/files/validation'
import { RoleGuard } from '@/components/auth/RoleGuard'

function statusBadgeClass(status: string) {
  switch (status) {
    case 'EN_ATTENTE':
      return 'bg-amber-50 text-amber-700'
    case 'COMPLETE':
      return 'bg-emerald-50 text-emerald-700'
    case 'REJETE':
      return 'bg-red-50 text-red-700'
    case 'ANNULE':
      return 'bg-slate-100 text-slate-600'
    default:
      return 'bg-gray-50 text-gray-600'
  }
}

function AgentDetailsBlock({ w }: { w: WithdrawalRequest }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-bold text-blue-700 uppercase tracking-wider">
        <User className="h-3.5 w-3.5" />
        Agent demandeur
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Nom</span>
          <span className="font-bold text-slate-900">
            {w.agent_name || 'Non renseigné'}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Code agent</span>
          <span className="font-mono font-semibold text-slate-800">
            {w.agent_code || w.agent_id.substring(0, 8).toUpperCase()}
          </span>
        </div>
        <div className="flex items-start gap-1.5">
          <Phone className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Téléphone</span>
            <span className="text-slate-800">{w.agent_phone || '—'}</span>
          </div>
        </div>
        <div className="flex items-start gap-1.5">
          <Mail className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">E-mail</span>
            <span className="text-slate-800 break-all">{w.agent_email || '—'}</span>
          </div>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Méthode de retrait</span>
          <span className="font-semibold text-slate-800">{w.method || '—'}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Demandé le</span>
          <span className="text-slate-800">
            {w.requested_at
              ? new Date(w.requested_at).toLocaleString('fr-FR')
              : '—'}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-blue-100/80">
        <div className="rounded-lg bg-white/70 px-3 py-2">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Disponible</span>
          <span className="font-extrabold text-emerald-700 text-sm">
            {(w.available_balance ?? 0).toLocaleString('fr-FR')} FCFA
          </span>
        </div>
        <div className="rounded-lg bg-white/70 px-3 py-2">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Gel retrait</span>
          <span className="font-extrabold text-amber-700 text-sm">
            {(w.pending_withdrawal_balance ?? 0).toLocaleString('fr-FR')} FCFA
          </span>
        </div>
        <div className="rounded-lg bg-white/70 px-3 py-2">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Pending pipeline</span>
          <span className="font-extrabold text-slate-700 text-sm">
            {(w.pending_balance ?? 0).toLocaleString('fr-FR')} FCFA
          </span>
        </div>
      </div>
    </div>
  )
}

export default function WalletPage() {
  const queryClient = useQueryClient()
  const pathname = usePathname()
  const locale = pathname?.split('/')[1] || 'fr'
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'objectives'>('withdrawals')

  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [paymentRef, setPaymentRef] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [proofsFiles, setProofsFiles] = useState<FileList | null>(null)

  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectMotif, setRejectMotif] = useState('')

  const [historySearch, setHistorySearch] = useState('')
  const [debouncedHistorySearch, setDebouncedHistorySearch] = useState('')
  const [historyStatus, setHistoryStatus] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedHistorySearch(historySearch.trim()), 300)
    return () => clearTimeout(t)
  }, [historySearch])

  const { data: withdrawals = [], isLoading: isLoadingWithdrawals } = useQuery({
    queryKey: ['pending-withdrawals'],
    queryFn: () => walletApi.listPendingWithdrawals(),
  })

  const { data: withdrawalHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['withdrawal-history', debouncedHistorySearch, historyStatus],
    queryFn: () =>
      walletApi.listWithdrawalHistory({
        q: debouncedHistorySearch || undefined,
        status: historyStatus || undefined,
      }),
    enabled: activeTab === 'withdrawals',
  })

  const { data: agentWallets = [], isLoading: isLoadingWallets } = useQuery({
    queryKey: ['agent-wallets'],
    queryFn: () => walletApi.listAgentWallets(),
    enabled: activeTab === 'objectives',
  })

  const invalidateWithdrawals = () => {
    queryClient.invalidateQueries({ queryKey: ['pending-withdrawals'] })
    queryClient.invalidateQueries({ queryKey: ['withdrawal-history'] })
  }

  const approveMutation = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      walletApi.approveWithdrawalWithProofs(id, formData),
    onSuccess: () => {
      invalidateWithdrawals()
      toast.success('Retrait validé avec succès (Solde débité)')
      setApprovingId(null)
      resetApproveForm()
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de l'approbation")
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) =>
      walletApi.rejectWithdrawal(id, motif),
    onSuccess: () => {
      invalidateWithdrawals()
      toast.success('Demande de retrait rejetée (Solde inchangé)')
      setRejectingId(null)
      setRejectMotif('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors du rejet')
    },
  })

  const resetApproveForm = () => {
    setPaymentRef('')
    setPaymentDate('')
    setAdminNotes('')
    setSignatureFile(null)
    setProofsFiles(null)
  }

  const handleApproveSubmit = (e: React.FormEvent, id: string) => {
    e.preventDefault()
    if (!paymentRef || !paymentDate || !signatureFile || !proofsFiles || proofsFiles.length === 0) {
      toast.error('Veuillez remplir tous les champs obligatoires et joindre les fichiers')
      return
    }
    try {
      validateUploadFile(signatureFile)
      Array.from(proofsFiles).forEach(validateUploadFile)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fichier invalide')
      return
    }

    const formData = new FormData()
    formData.append('payment_reference', paymentRef)
    formData.append('payment_date', paymentDate)
    if (adminNotes) formData.append('admin_notes', adminNotes)
    formData.append('signature', signatureFile)

    for (let i = 0; i < proofsFiles.length; i++) {
      formData.append('proofs', proofsFiles[i])
    }

    approveMutation.mutate({ id, formData })
  }

  const handleRejectSubmit = (e: React.FormEvent, id: string) => {
    e.preventDefault()
    if (!rejectMotif.trim()) {
      toast.error('Motif requis')
      return
    }
    rejectMutation.mutate({ id, motif: rejectMotif })
  }

  const safeWithdrawals = Array.isArray(withdrawals) ? withdrawals : []
  const safeHistory = Array.isArray(withdrawalHistory) ? withdrawalHistory : []
  const safeAgentWallets = Array.isArray(agentWallets) ? agentWallets : []

  return (
    <div className="flex-1 flex flex-col bg-white">
      <Header
        title="Gestion Financière"
        subtitle="Validez les décaissements et suivez la progression financière des agents."
      />

      <div className="p-8 space-y-6 flex-1">
        <div className="flex gap-4 border-b border-gray-100 pb-px">
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`pb-4 text-sm font-bold tracking-tight border-b-2 px-1 transition-all cursor-pointer ${
              activeTab === 'withdrawals'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Validation des Retraits ({safeWithdrawals.length})
          </button>
          <button
            onClick={() => setActiveTab('objectives')}
            className={`pb-4 text-sm font-bold tracking-tight border-b-2 px-1 transition-all cursor-pointer ${
              activeTab === 'objectives'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Progression des Agents
          </button>
        </div>

        {activeTab === 'withdrawals' ? (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
                Demandes en attente
              </h3>
              {isLoadingWithdrawals ? (
                <div className="py-20 text-center text-gray-400 font-medium">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-3" />
                  Chargement des demandes en cours...
                </div>
              ) : safeWithdrawals.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <Wallet className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-semibold">Aucune demande de retrait</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Toutes les commissions demandées ont été traitées.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {safeWithdrawals.map((w) => (
                    <div
                      key={w.id}
                      className="p-5 border border-gray-100 rounded-2xl bg-gray-50/20 flex flex-col gap-5"
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="space-y-1 flex-1">
                          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                            Demande #{w.id.substring(0, 8).toUpperCase()}
                          </span>
                          <h4 className="font-bold text-sm text-gray-900 mt-1">
                            Montant demandé :{' '}
                            <span className="text-blue-600 font-extrabold">
                              {Number(w.amount).toLocaleString('fr-FR')} FCFA
                            </span>
                          </h4>
                          <span className="text-xs text-slate-600 block font-semibold">
                            {w.agent_name || 'Agent'}
                            {w.agent_code ? ` · ${w.agent_code}` : ''}
                            {w.agent_phone ? ` · ${w.agent_phone}` : ''}
                          </span>
                          <span
                            className={`inline-flex mt-2 text-[10px] px-2 py-0.5 rounded font-bold uppercase ${statusBadgeClass(w.status)}`}
                          >
                            {w.status}
                          </span>
                        </div>

                        <div className="flex gap-2 shrink-0">
                          {approvingId !== w.id && rejectingId !== w.id && (
                            <RoleGuard permission="agency:mutate" fallback={null}>
                              <>
                                <Button
                                  onClick={() => {
                                    setRejectingId(null)
                                    setApprovingId(w.id)
                                  }}
                                  variant="success"
                                  size="sm"
                                >
                                  <Check className="h-4 w-4 mr-1.5" />
                                  Approuver
                                </Button>
                                <Button
                                  onClick={() => {
                                    setApprovingId(null)
                                    setRejectingId(w.id)
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                >
                                  <X className="h-4 w-4 mr-1.5" />
                                  Rejeter
                                </Button>
                              </>
                            </RoleGuard>
                          )}
                        </div>
                      </div>

                      <AgentDetailsBlock w={w} />

                      {approvingId === w.id && (
                        <form
                          onSubmit={(e) => handleApproveSubmit(e, w.id)}
                          className="p-5 border border-gray-100 bg-white rounded-2xl space-y-4"
                        >
                          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">
                            Preuves de Paiement & Signature Admin
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                                Référence du Transfert / Paiement *
                              </label>
                              <Input
                                placeholder="Ex: TXN12345678"
                                value={paymentRef}
                                onChange={(e) => setPaymentRef(e.target.value)}
                                className="h-10 text-xs border-gray-200"
                                required
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                                Date du Paiement *
                              </label>
                              <Input
                                type="date"
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                className="h-10 text-xs border-gray-200"
                                required
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                                Signature de l&apos;Admin (Image) *
                              </label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                  setSignatureFile(e.target.files ? e.target.files[0] : null)
                                }
                                className="flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs focus-visible:outline-none"
                                required
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                                Reçus / Preuves de paiement (Plusieurs fichiers admis) *
                              </label>
                              <input
                                type="file"
                                multiple
                                onChange={(e) => setProofsFiles(e.target.files)}
                                className="flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs focus-visible:outline-none"
                                required
                              />
                            </div>

                            <div className="space-y-1 sm:col-span-2">
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                                Notes / Commentaires de l&apos;Admin
                              </label>
                              <Input
                                placeholder="Ex: Virement Mobile Money effectué..."
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                className="h-10 text-xs border-gray-200"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end pt-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setApprovingId(null)
                                resetApproveForm()
                              }}
                            >
                              Annuler
                            </Button>
                            <Button
                              type="submit"
                              variant="primary"
                              size="sm"
                              disabled={approveMutation.isPending}
                              isLoading={approveMutation.isPending}
                              className="text-white flex items-center gap-1.5"
                            >
                              Confirmer l&apos;Approbation
                            </Button>
                          </div>
                        </form>
                      )}

                      {rejectingId === w.id && (
                        <form
                          onSubmit={(e) => handleRejectSubmit(e, w.id)}
                          className="p-4 border border-gray-100 bg-white rounded-2xl flex items-center gap-3"
                        >
                          <Input
                            placeholder="Motif du rejet de la demande..."
                            value={rejectMotif}
                            onChange={(e) => setRejectMotif(e.target.value)}
                            className="h-10 text-xs border-gray-205 w-full bg-white"
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
                            onClick={() => {
                              setRejectingId(null)
                              setRejectMotif('')
                            }}
                          >
                            Annuler
                          </Button>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Historique des retraits
                </h3>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      type="search"
                      placeholder="Rechercher un agent, téléphone, code…"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="h-9 pl-8 text-xs border-gray-200"
                    />
                  </div>
                  <select
                    value={historyStatus}
                    onChange={(e) => setHistoryStatus(e.target.value)}
                    className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs text-slate-700"
                  >
                    <option value="">Tous les statuts</option>
                    <option value="EN_ATTENTE">EN_ATTENTE</option>
                    <option value="COMPLETE">COMPLETE</option>
                    <option value="REJETE">REJETE</option>
                    <option value="ANNULE">ANNULE</option>
                  </select>
                </div>
              </div>

              {isLoadingHistory ? (
                <div className="py-12 text-center text-gray-400">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500 mb-2" />
                  <p className="text-xs">Chargement de l&apos;historique…</p>
                </div>
              ) : safeHistory.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <Hash className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-semibold">Aucun retrait trouvé</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Modifiez la recherche ou le filtre de statut.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-1 px-1">
                  <table className="w-full min-w-[900px] text-left border-separate border-spacing-0">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-3 pr-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="pb-3 pr-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Agent
                        </th>
                        <th className="pb-3 pr-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Montant
                        </th>
                        <th className="pb-3 pr-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Méthode
                        </th>
                        <th className="pb-3 pr-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Réf. paiement
                        </th>
                        <th className="pb-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Statut
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {safeHistory.map((h) => (
                        <tr
                          key={h.id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40"
                        >
                          <td className="py-3 pr-4 text-xs text-slate-600 whitespace-nowrap">
                            {h.requested_at
                              ? new Date(h.requested_at).toLocaleString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </td>
                          <td className="py-3 pr-4">
                            <span className="font-semibold text-xs text-slate-900 block">
                              {h.agent_name || '—'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {h.agent_code || h.agent_id.substring(0, 8).toUpperCase()}
                              {h.agent_phone ? ` · ${h.agent_phone}` : ''}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-xs font-extrabold text-slate-900 whitespace-nowrap">
                            {Number(h.amount).toLocaleString('fr-FR')} FCFA
                          </td>
                          <td className="py-3 pr-4 text-xs text-slate-600">{h.method || '—'}</td>
                          <td className="py-3 pr-4 text-xs text-slate-600 font-mono">
                            {h.payment_reference || '—'}
                          </td>
                          <td className="py-3">
                            <span
                              className={`inline-flex text-[10px] px-2 py-0.5 rounded font-bold uppercase ${statusBadgeClass(h.status)}`}
                            >
                              {h.status}
                            </span>
                            {h.rejection_reason && (
                              <span className="block text-[10px] text-red-500 mt-1 max-w-[180px] truncate">
                                {h.rejection_reason}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Fixation des objectifs centralisée
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Les objectifs (journalier, hebdo, mensuel, activités) se gèrent uniquement dans
                  la page <strong>Objectifs agents</strong> — plus de doublon ici.
                </p>
              </div>
              <Link
                href={`/${locale}/dashboard/objectives`}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10 shrink-0"
              >
                <Target className="h-4 w-4" />
                Gérer les objectifs
                <ExternalLink className="h-3.5 w-3.5 opacity-80" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
            {isLoadingWallets ? (
              <div className="py-20 text-center text-gray-400 font-medium">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-3" />
                Chargement de la progression des agents...
              </div>
            ) : safeAgentWallets.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                <Target className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-semibold">Aucun agent terrain enregistré</p>
                <p className="text-xs text-gray-500 mt-1">
                  Créez des comptes d&apos;agents terrain pour suivre leur progression.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full min-w-[1100px] text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-3 pr-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[140px]">
                        Agent
                      </th>
                      <th className="pb-3 pr-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[110px]">
                        Disponible
                      </th>
                      <th className="pb-3 pr-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[110px]">
                        En attente
                      </th>
                      <th className="pb-3 pr-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[160px]">
                        Détail pending
                      </th>
                      <th className="pb-3 pr-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                        Comm. mois
                      </th>
                      <th className="pb-3 pr-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[110px]">
                        Objectifs mois
                      </th>
                      <th className="pb-3 pr-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                        Réalisé
                      </th>
                      <th className="pb-3 pl-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[140px]">
                        Accomplissement
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeAgentWallets.map((w) => {
                      const progressPct = Number(w.monthly_progress_pct ?? 0)
                      const isTargetReached = progressPct >= 100
                      const progressColor = isTargetReached
                        ? 'bg-emerald-500 shadow-emerald-500/20'
                        : progressPct >= 50
                          ? 'bg-amber-500 shadow-amber-500/20'
                          : 'bg-blue-500 shadow-blue-500/20'
                      const pipeline = w.pending_breakdown?.pipeline ?? 0
                      const awaiting = w.pending_breakdown?.awaiting_payment ?? 0
                      const monthCommissions = Number(w.current_month_commissions ?? 0)

                      return (
                        <tr
                          key={w.agent_id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors"
                        >
                          <td className="py-4 pr-6 align-top">
                            <span className="font-bold text-sm text-gray-900 block truncate max-w-[160px]">
                              {w.agent_name}
                            </span>
                            <span className="text-[10px] text-gray-400 block font-mono">
                              ID: {w.agent_id.substring(0, 8).toUpperCase()}
                            </span>
                            <span className="text-[11px] text-gray-500 block mt-0.5 truncate max-w-[160px]">
                              {w.agent_phone || 'Pas de téléphone'}
                            </span>
                          </td>
                          <td className="py-4 pr-6 align-top whitespace-nowrap">
                            <span className="font-extrabold text-sm text-emerald-700 block">
                              {(w.available_balance ?? 0).toLocaleString('fr-FR')} FCFA
                            </span>
                          </td>
                          <td className="py-4 pr-6 align-top whitespace-nowrap">
                            <span className="font-extrabold text-sm text-amber-700 block">
                              {(w.pending_balance ?? 0).toLocaleString('fr-FR')} FCFA
                            </span>
                          </td>
                          <td className="py-4 pr-6 align-top">
                            <div className="space-y-2 text-[11px] min-w-[150px]">
                              <div>
                                <span className="text-gray-400 block">Pipeline</span>
                                <strong className="text-slate-800 whitespace-nowrap">
                                  {pipeline.toLocaleString('fr-FR')} FCFA
                                </strong>
                              </div>
                              <div>
                                <span className="text-gray-400 block">À valider</span>
                                <strong className="text-slate-800 whitespace-nowrap">
                                  {awaiting.toLocaleString('fr-FR')} FCFA
                                </strong>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 pr-6 align-top whitespace-nowrap">
                            <span className="font-extrabold text-sm text-slate-800 block">
                              {monthCommissions.toLocaleString('fr-FR')} FCFA
                            </span>
                          </td>
                          <td className="py-4 pr-6 align-top">
                            <div className="flex flex-col gap-1.5 text-xs min-w-[100px]">
                              <div className="whitespace-nowrap">
                                <span className="text-gray-500">Prospects</span>
                                <span className="font-bold text-slate-800 ml-1.5">
                                  {w.objective_prospects?.toLocaleString('fr-FR') ?? '—'}
                                </span>
                              </div>
                              <div className="whitespace-nowrap">
                                <span className="text-gray-500">Clients</span>
                                <span className="font-bold text-slate-800 ml-1.5">
                                  {w.objective_clients?.toLocaleString('fr-FR') ?? '—'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 pr-6 align-top">
                            <div className="flex flex-col gap-1.5 text-xs min-w-[110px]">
                              <div className="whitespace-nowrap">
                                <span className="text-gray-500">Prospects</span>
                                <strong className="text-slate-800 ml-1.5">
                                  {w.prospects_this_month ?? 0}/{w.objective_prospects ?? 0}
                                </strong>
                              </div>
                              <div className="whitespace-nowrap">
                                <span className="text-gray-500">Clients</span>
                                <strong className="text-slate-800 ml-1.5">
                                  {w.clients_this_month ?? 0}/{w.objective_clients ?? 0}
                                </strong>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 pl-2 align-top">
                            <div className="space-y-1.5 w-[130px]">
                              <div className="flex justify-between items-center text-xs gap-2">
                                <span className="font-extrabold text-slate-900">{progressPct}%</span>
                                {isTargetReached ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md shrink-0">
                                    <Award className="h-3 w-3" />
                                    Atteint
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-gray-400 font-medium shrink-0">
                                    En cours
                                  </span>
                                )}
                              </div>
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${Math.min(progressPct, 100)}%` }}
                                  className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
