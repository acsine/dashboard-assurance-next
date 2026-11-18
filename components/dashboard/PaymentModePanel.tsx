'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  settingsApi, 
  type PaymentConfig, 
  type PaymentMethodItem 
} from '@/lib/api/mobi-assur'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  FileText, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  Zap,
  Plus,
  Trash2,
  Banknote,
  Check,
  X,
  ToggleLeft,
  ToggleRight
} from 'lucide-react'

const METHOD_TYPES = [
  { value: 'ORANGE_MONEY', label: 'Orange Money (Cameroun)', icon: Smartphone, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { value: 'MTN_MOMO', label: 'MTN Mobile Money', icon: Smartphone, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'VIREMENT', label: 'Virement / Compte Bancaire', icon: Building2, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'ESPECES', label: 'Versement Espèces au Guichet', icon: Banknote, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { value: 'CHEQUE', label: 'Chèque Bancaire Certifié', icon: FileText, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { value: 'AUTRE', label: 'Autre Moyen de Paiement', icon: CreditCard, color: 'text-slate-600 bg-slate-50 border-slate-200' },
]

export function PaymentModePanel() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<PaymentConfig>({
    queryKey: ['payment-config'],
    queryFn: () => settingsApi.getPaymentConfig(),
  })

  const [mode, setMode] = useState<'MANUAL' | 'API_DIRECT'>('MANUAL')
  const [instructions, setInstructions] = useState('')

  // Formulaire d'ajout d'un nouveau moyen de paiement
  const [isAdding, setIsAdding] = useState(false)
  const [newType, setNewType] = useState('ORANGE_MONEY')
  const [newLabel, setNewLabel] = useState('')
  const [newAccountNumber, setNewAccountNumber] = useState('')
  const [newAccountName, setNewAccountName] = useState('')
  const [newMethodInstructions, setNewMethodInstructions] = useState('')

  useEffect(() => {
    if (data) {
      setMode(data.payment_gateway_mode || 'MANUAL')
      setInstructions(
        data.manual_payment_instructions ||
          'Veuillez effectuer le dépôt sur le compte marchand indiqué puis renseigner la référence de transaction et téléverser la preuve.'
      )
    }
  }, [data])

  // Mutation mise à jour du mode principal et des consignes globales
  const updateConfigMutation = useMutation({
    mutationFn: () =>
      settingsApi.updatePaymentConfig({
        payment_gateway_mode: mode,
        manual_payment_instructions: instructions.trim(),
      }),
    onSuccess: () => {
      toast.success('Configuration générale des paiements enregistrée')
      qc.invalidateQueries({ queryKey: ['payment-config'] })
      qc.invalidateQueries({ queryKey: ['pricing-settings'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erreur lors de l'enregistrement")
    },
  })

  // Mutation ajout d'un moyen de paiement
  const addMethodMutation = useMutation({
    mutationFn: () =>
      settingsApi.addPaymentMethod({
        type: newType,
        label: newLabel.trim(),
        account_number: newAccountNumber.trim(),
        account_name: newAccountName.trim() || undefined,
        instructions: newMethodInstructions.trim() || undefined,
        is_active: true,
      }),
    onSuccess: () => {
      toast.success('Moyen de paiement ajouté avec succès')
      setIsAdding(false)
      setNewLabel('')
      setNewAccountNumber('')
      setNewAccountName('')
      setNewMethodInstructions('')
      qc.invalidateQueries({ queryKey: ['payment-config'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erreur lors de l'ajout du compte")
    },
  })

  // Mutation activation / désactivation
  const toggleMethodMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      settingsApi.updatePaymentMethod(id, { is_active }),
    onSuccess: () => {
      toast.success('Statut du moyen de paiement mis à jour')
      qc.invalidateQueries({ queryKey: ['payment-config'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur de mise à jour')
    },
  })

  // Mutation suppression d'un moyen de paiement
  const deleteMethodMutation = useMutation({
    mutationFn: (id: string) => settingsApi.deletePaymentMethod(id),
    onSuccess: () => {
      toast.success('Moyen de paiement supprimé')
      qc.invalidateQueries({ queryKey: ['payment-config'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la suppression')
    },
  })

  const manualMethods = data?.manual_payment_methods || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLabel.trim()) {
      toast.error('Veuillez renseigner un intitulé (ex: Orange Money Marchand)')
      return
    }
    if (!newAccountNumber.trim()) {
      toast.error('Veuillez renseigner le numéro de compte, code marchand ou RIB')
      return
    }
    addMethodMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200/80 shadow-xs">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Mode de Paiement Actif du Portail & Application
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Configurez le mode actif (Manuel ou API direct) et gérez dynamiquement les comptes de versement pour les clients et agents.
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={() => updateConfigMutation.mutate()}
              disabled={updateConfigMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              {updateConfigMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Enregistrer le mode actif
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Sélection Mode : Manuel vs API Direct */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option 1: Mode Manuel Déclaré (Par défaut) */}
            <div
              onClick={() => setMode('MANUAL')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                mode === 'MANUAL'
                  ? 'border-blue-600 bg-blue-50/30 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      mode === 'MANUAL'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        Mode Manuel Déclaré
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Par Défaut
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Sans passerelle API — Transferts comptes marchands, banques et guichets
                    </p>
                  </div>
                </div>
                <div
                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    mode === 'MANUAL'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300'
                  }`}
                >
                  {mode === 'MANUAL' && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs text-slate-600 space-y-1.5">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  Les clients et agents choisissent le compte configuré par l'admin
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  Renseignement automatique du montant de la prime
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  Saisie de référence et date de versement avec preuve facultative
                </p>
              </div>
            </div>

            {/* Option 2: Mode API Direct */}
            <div
              onClick={() => setMode('API_DIRECT')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                mode === 'API_DIRECT'
                  ? 'border-blue-600 bg-blue-50/30 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      mode === 'API_DIRECT'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        Mode API Direct (Automatique)
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Passerelle en ligne instantanée via API marchande
                    </p>
                  </div>
                </div>
                <div
                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    mode === 'API_DIRECT'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300'
                  }`}
                >
                  {mode === 'API_DIRECT' && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs text-slate-600 space-y-1.5">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  Paiement en direct sur le mobile de l'assuré (Push USSD)
                </p>
                <p className="flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  Désactivé par défaut (nécessite des clés d'API marchandes actives)
                </p>
                <p className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  Confirmation par Webhook backend automatisée
                </p>
              </div>
            </div>
          </div>

          {/* Consignes Générales */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-2">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              Consignes Générales affichées sur l'application client & agent
            </label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              placeholder="Instructions de paiement..."
              className="bg-white rounded-xl text-xs font-medium"
            />
          </div>

          {/* Section Gestion Dynamique des Comptes de Paiement Manuel */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  Comptes & Moyens de Paiement Manuel Configurés
                </h3>
                <p className="text-xs text-slate-500">
                  Ajoutez, désactivez ou supprimez les comptes récepteurs (Orange Money, MTN MoMo, Banques, etc.). Ce sont ces comptes qui s'affichent lors de la déclaration de paiement.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setIsAdding(!isAdding)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                {isAdding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {isAdding ? 'Fermer le formulaire' : 'Ajouter un compte'}
              </Button>
            </div>

            {/* Formulaire Inline d'Ajout */}
            {isAdding && (
              <form
                onSubmit={handleAddSubmit}
                className="p-5 rounded-2xl bg-emerald-50/40 border border-emerald-200 space-y-4 transition-all"
              >
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                    <Plus className="h-4 w-4 text-emerald-600" />
                    Nouveau Moyen de Paiement
                  </h4>
                  <span className="text-[11px] text-emerald-700">Tous les champs avec * sont obligatoires</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                      Type de Moyen de Paiement *
                    </label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {METHOD_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                      Intitulé / Nom Affiché *
                    </label>
                    <Input
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="ex: Afriland First Bank, Orange Money Agence..."
                      className="bg-white rounded-xl text-xs font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                      Numéro de Compte / Code Marchand / RIB *
                    </label>
                    <Input
                      value={newAccountNumber}
                      onChange={(e) => setNewAccountNumber(e.target.value)}
                      placeholder="ex: 690000000 ou CM21 10005 00001..."
                      className="bg-white rounded-xl text-xs font-medium font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                      Nom du Titulaire / Bénéficiaire (Optionnel)
                    </label>
                    <Input
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="ex: ASSURANCES DU CAMEROUN SA"
                      className="bg-white rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                      Instructions Particulières pour ce Moyen de Paiement
                    </label>
                    <Input
                      value={newMethodInstructions}
                      onChange={(e) => setNewMethodInstructions(e.target.value)}
                      placeholder="ex: Dépôt marchand sans frais. Conserver le SMS ou reçu de caisse."
                      className="bg-white rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsAdding(false)}
                    className="text-xs rounded-xl"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={addMethodMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    {addMethodMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Confirmer l'ajout
                  </Button>
                </div>
              </form>
            )}

            {/* Liste des comptes existants */}
            {manualMethods.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">
                  Aucun compte de paiement manuel configuré pour le moment.
                </p>
                <Button
                  onClick={() => setIsAdding(true)}
                  variant="outline"
                  className="mt-3 text-xs rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Ajouter un premier compte
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {manualMethods.map((m) => {
                  const typeDef = METHOD_TYPES.find((t) => t.value === m.type) || METHOD_TYPES[5]
                  const IconComp = typeDef.icon

                  return (
                    <div
                      key={m.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        m.is_active
                          ? 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                          : 'border-slate-200/60 bg-slate-50/70 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-xl border ${typeDef.color} shrink-0`}>
                            <IconComp className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-bold text-slate-900">
                                {m.label}
                              </h4>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  m.is_active
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                              >
                                {m.is_active ? 'Actif' : 'Désactivé'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-mono mt-1 font-semibold">
                              {m.account_number}
                            </p>
                            {m.account_name && (
                              <p className="text-[11px] text-slate-600 mt-0.5">
                                Bénéficiaire : <span className="font-semibold">{m.account_name}</span>
                              </p>
                            )}
                            {m.instructions && (
                              <p className="text-[10px] text-slate-500 mt-1 italic line-clamp-2">
                                {m.instructions}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions : Activer/Désactiver & Supprimer */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            title={m.is_active ? 'Désactiver ce compte' : 'Activer ce compte'}
                            onClick={() =>
                              toggleMethodMutation.mutate({
                                id: m.id,
                                is_active: !m.is_active,
                              })
                            }
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
                          >
                            {m.is_active ? (
                              <ToggleRight className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="h-5 w-5 text-slate-400" />
                            )}
                          </button>
                          <button
                            type="button"
                            title="Supprimer ce compte"
                            onClick={() => {
                              if (confirm(`Confirmez-vous la suppression du moyen de paiement "${m.label}" ?`)) {
                                deleteMethodMutation.mutate(m.id)
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
