'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { walletApi } from '@/lib/api/mobi-assur'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Wallet, Check, X, FileText, Loader2, Upload, Target, Edit, TrendingUp, Award } from 'lucide-react'

export default function WalletPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'objectives'>('withdrawals')

  // State controls for approving
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [paymentRef, setPaymentRef] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [proofsFiles, setProofsFiles] = useState<FileList | null>(null)

  // State controls for rejecting
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectMotif, setRejectMotif] = useState('')

  // State controls for objectives
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null)
  const [newObjective, setNewObjective] = useState('')

  // Query pending withdrawals
  const { data: withdrawals = [], isLoading: isLoadingWithdrawals } = useQuery({
    queryKey: ['pending-withdrawals'],
    queryFn: () => walletApi.listPendingWithdrawals(),
  })

  // Query agent wallets
  const { data: agentWallets = [], isLoading: isLoadingWallets } = useQuery({
    queryKey: ['agent-wallets'],
    queryFn: () => walletApi.listAgentWallets(),
    enabled: activeTab === 'objectives',
  })

  // Approve Withdrawal Mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: FormData }) => {
      const token = localStorage.getItem('mobi_access_token')
      const res = await fetch(
        `https://gestion-d-assurance-v1-ten.vercel.app/wallet/withdrawals/${id}/approve`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Erreur lors de la validation du retrait')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-withdrawals'] })
      toast.success('Retrait validé avec succès (Solde débité)')
      setApprovingId(null)
      resetApproveForm()
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de l\'approbation')
    },
  })

  // Reject Withdrawal Mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) =>
      walletApi.rejectWithdrawal(id, motif),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-withdrawals'] })
      toast.success('Demande de retrait rejetée (Solde inchangé)')
      setRejectingId(null)
      setRejectMotif('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors du rejet')
    },
  })

  // Update Agent Objective Mutation
  const updateObjectiveMutation = useMutation({
    mutationFn: ({ agentId, objective }: { agentId: string; objective: number }) =>
      walletApi.setAgentObjective(agentId, objective),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-wallets'] })
      toast.success('Objectif de l\'agent mis à jour avec succès')
      setEditingAgentId(null)
      setNewObjective('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la mise à jour de l\'objectif')
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

  const handleObjectiveSubmit = (e: React.FormEvent, agentId: string) => {
    e.preventDefault()
    const parsed = parseFloat(newObjective)
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Veuillez saisir un montant d\'objectif valide supérieur à 0')
      return
    }
    updateObjectiveMutation.mutate({ agentId, objective: parsed })
  }

  const startEditing = (agentId: string, currentObjective: number) => {
    setEditingAgentId(agentId)
    setNewObjective(currentObjective.toString())
  }

  const safeWithdrawals = Array.isArray(withdrawals) ? withdrawals : []
  const safeAgentWallets = Array.isArray(agentWallets) ? agentWallets : []

  return (
    <div className="flex-1 flex flex-col bg-white">
      <Header
        title="Gestion Financière et Objectifs"
        subtitle="Validez les décaissements de commissions et fixez les objectifs mensuels des agents terrain."
      />

      <div className="p-8 space-y-6 flex-1">
        {/* Navigation Tabs */}
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
            Objectifs & Progression des Agents
          </button>
        </div>

        {activeTab === 'withdrawals' ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            {isLoadingWithdrawals ? (
              <div className="py-20 text-center text-gray-400 font-medium">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-3" />
                Chargement des demandes en cours...
              </div>
            ) : safeWithdrawals.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
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
                    className="p-5 border border-gray-100 rounded-2xl bg-gray-50/20 flex flex-col gap-6"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                          Demande #{w.id.substring(0, 8).toUpperCase()}
                        </span>
                        <h4 className="font-bold text-sm text-gray-900 mt-1">
                          Montant demandé :{' '}
                          <span className="text-blue-600 font-extrabold">
                            {w.amount.toLocaleString('fr-FR')} FCFA
                          </span>
                        </h4>
                        <span className="text-xs text-gray-500 block">
                          Agent ID: {w.agent_id.substring(0, 8).toUpperCase()}
                        </span>
                        <span className="text-xs text-amber-600 font-semibold block mt-1">
                          Statut: {w.status}
                        </span>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        {approvingId !== w.id && rejectingId !== w.id && (
                          <>
                            <Button
                              onClick={() => setApprovingId(w.id)}
                              variant="success"
                              size="sm"
                            >
                              <Check className="h-4 w-4 mr-1.5" />
                              Approuver
                            </Button>
                            <Button
                              onClick={() => setRejectingId(w.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            >
                              <X className="h-4 w-4 mr-1.5" />
                              Rejeter
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Approve Form Panel */}
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
                              Signature de l'Admin (Image) *
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
                              Notes / Commentaires de l'Admin
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
                          <Button type="button" variant="ghost" size="sm" onClick={resetApproveForm}>
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
                            Confirmer l'Approbation
                          </Button>
                        </div>
                      </form>
                    )}

                    {/* Reject Form Panel */}
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
        ) : (
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
                  Créez des comptes d'agents terrain pour définir leurs objectifs.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Agent Apporteur
                      </th>
                      <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Commissions ce mois
                      </th>
                      <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Objectif minimum
                      </th>
                      <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Niveau d'accomplissement
                      </th>
                      <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeAgentWallets.map((w) => {
                      const isTargetReached = w.monthly_progress_pct >= 100
                      const progressColor = isTargetReached
                        ? 'bg-emerald-500 shadow-emerald-500/20'
                        : w.monthly_progress_pct >= 50
                        ? 'bg-amber-500 shadow-amber-500/20'
                        : 'bg-blue-500 shadow-blue-500/20'

                      return (
                        <tr
                          key={w.agent_id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors"
                        >
                          <td className="py-5">
                            <span className="font-bold text-sm text-gray-900 block">
                              {w.agent_name}
                            </span>
                            <span className="text-[10px] text-gray-400 block font-mono">
                              ID: {w.agent_id.substring(0, 8).toUpperCase()}
                            </span>
                            <span className="text-[11px] text-gray-500 block mt-0.5">
                              {w.agent_phone || 'Pas de téléphone'}
                            </span>
                          </td>
                          <td className="py-5">
                            <span className="font-extrabold text-sm text-slate-800 block">
                              {w.current_month_commissions.toLocaleString('fr-FR')} FCFA
                            </span>
                          </td>
                          <td className="py-5">
                            {editingAgentId === w.agent_id ? (
                              <form
                                onSubmit={(e) => handleObjectiveSubmit(e, w.agent_id)}
                                className="flex items-center gap-1.5 max-w-[180px]"
                              >
                                <Input
                                  type="number"
                                  value={newObjective}
                                  onChange={(e) => setNewObjective(e.target.value)}
                                  className="h-8 text-xs border-gray-200 py-1 px-2"
                                  required
                                  autoFocus
                                />
                                <button
                                  type="submit"
                                  disabled={updateObjectiveMutation.isPending}
                                  className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer border-0"
                                  title="Sauvegarder"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingAgentId(null)}
                                  className="p-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer border-0"
                                  title="Annuler"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </form>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-600">
                                  {w.monthly_objective.toLocaleString('fr-FR')} FCFA
                                </span>
                                <button
                                  onClick={() => startEditing(w.agent_id, w.monthly_objective)}
                                  className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-gray-50 transition-colors cursor-pointer border-0"
                                  title="Modifier l'objectif"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-5">
                            <div className="space-y-1.5 max-w-[200px]">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-extrabold text-slate-900">
                                  {w.monthly_progress_pct}%
                                </span>
                                {isTargetReached ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                                    <Award className="h-3 w-3" />
                                    Atteint
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-gray-400 font-medium">
                                    En cours
                                  </span>
                                )}
                              </div>
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${w.monthly_progress_pct}%` }}
                                  className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-5 text-right">
                            <Button
                              onClick={() => startEditing(w.agent_id, w.monthly_objective)}
                              variant="outline"
                              size="sm"
                              className="text-xs border-gray-200 hover:bg-gray-50 hover:text-slate-800"
                            >
                              Fixer l'Objectif
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

