'use client'

import { useState, useTransition } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/dashboard/Header'
import SearchableSelect from '@/components/ui/searchable-select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  Building2,
  Loader2,
  Trash2,
  CheckCircle2,
  XCircle,
  FileText,
  Phone,
  User,
  ShieldCheck,
  Calendar,
  Search,
  UserPlus,
  Target,
  Plus,
} from 'lucide-react'
import {
  nichesApi,
  asList,
  type Niche,
  type NicheAgreement,
  type NicheObjective,
} from '@/lib/api/mobi-assur'
import { useAuthStore } from '@/lib/stores/auth-store'
import { can } from '@/lib/auth/roles'
import { useTranslations } from 'next-intl'
import { PhoneField } from '@/components/ui/phone-field'
import { parseValidPhone, DEFAULT_PHONE_COUNTRY } from '@/lib/phone'
import type { CountryCode } from 'libphonenumber-js'
import { ObjectiveEditor } from '@/components/niches/ObjectiveEditor'
import { useRouter } from '@/i18n/navigation'

const emptyForm = {
  name: '',
  description: '',
  category: '',
  location: '',
  contact_name: '',
  contact_phone: '',
  contact_country: DEFAULT_PHONE_COUNTRY as CountryCode,
  special_bonus_amount: '0',
  bonus_type: 'FCFA' as 'FCFA' | 'POINTS',
}

const labelClass = 'text-[10px] font-bold text-gray-500 uppercase tracking-wider block'
const thClass = 'pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider'
const trClass = 'border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors'

export default function NichesPage() {
  const t = useTranslations('niches')
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const canManage = can(user?.role, 'settings:manage')

  const [activeTab, setActiveTab] = useState<'niches' | 'agreements'>('niches')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Form states for Niche CRUD
  const [form, setForm] = useState(emptyForm)
  const [edit, setEdit] = useState<Niche | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedNicheAgreements, setSelectedNicheAgreements] = useState<NicheAgreement[] | null>(null)

  // Modal states for Validate / Reject
  const [validatingAgreement, setValidatingAgreement] = useState<NicheAgreement | null>(null)
  const [validationNotes, setValidationNotes] = useState('')

  const [rejectingAgreement, setRejectingAgreement] = useState<NicheAgreement | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [editingTemplatesNiche, setEditingTemplatesNiche] = useState<Niche | null>(null)
  const [templateDrafts, setTemplateDrafts] = useState<NicheObjective[]>([])
  const [assignNavNicheId, setAssignNavNicheId] = useState<string | null>(null)
  const [isAssignNavPending, startAssignNav] = useTransition()

  const openAssignPage = (nicheId: string) => {
    setAssignNavNicheId(nicheId)
    startAssignNav(() => {
      router.push(`/dashboard/niches/${nicheId}/assign`)
    })
  }

  // Query Niches Catalogue
  const { data: nichesData, isLoading: isNichesLoading } = useQuery({
    queryKey: ['niches'],
    queryFn: () => nichesApi.list(),
  })

  // Query All Agreements (Backoffice workflow)
  const { data: agreementsData, isLoading: isAgreementsLoading } = useQuery({
    queryKey: ['niche-agreements', statusFilter],
    queryFn: () => nichesApi.listAllAgreements(statusFilter || undefined),
  })

  const createMutation = useMutation({
    mutationFn: () => {
      let contact_phone: string | null = form.contact_phone || null
      if (form.contact_phone.trim()) {
        const parsed = parseValidPhone(form.contact_phone, form.contact_country)
        if (!parsed) throw new Error('Le numéro de téléphone est invalide pour ce code pays')
        contact_phone = parsed.e164
      }
      return nichesApi.create({
        name: form.name.trim(),
        description: form.description || null,
        category: form.category || null,
        location: form.location || null,
        contact_name: form.contact_name || null,
        contact_phone,
        special_bonus_amount: Number(form.special_bonus_amount) || 0,
        bonus_type: form.bonus_type,
        is_active: true,
      })
    },
    onSuccess: (created) => {
      toast.success('Niche créée. Attribuez maintenant un agent.')
      const createdNiche = created as Niche
      setShowForm(false)
      queryClient.invalidateQueries({ queryKey: ['niches'] })
      setForm(emptyForm)
      setAssignNavNicheId(createdNiche.id)
      startAssignNav(() => {
        router.push(`/dashboard/niches/${createdNiche.id}/assign`)
      })
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur'),
  })

  const updateMutation = useMutation({
    mutationFn: () => {
      let contact_phone: string | null = form.contact_phone || null
      if (form.contact_phone.trim()) {
        const parsed = parseValidPhone(form.contact_phone, form.contact_country)
        if (!parsed) throw new Error('Le numéro de téléphone est invalide pour ce code pays')
        contact_phone = parsed.e164
      }
      return nichesApi.update(edit!.id, {
        name: form.name.trim(),
        description: form.description || null,
        category: form.category || null,
        location: form.location || null,
        contact_name: form.contact_name || null,
        contact_phone,
        special_bonus_amount: Number(form.special_bonus_amount) || 0,
        bonus_type: form.bonus_type,
      })
    },
    onSuccess: () => {
      toast.success('Niche mise à jour')
      setEdit(null)
      setShowForm(false)
      setForm(emptyForm)
      queryClient.invalidateQueries({ queryKey: ['niches'] })
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => nichesApi.delete(id),
    onSuccess: () => {
      toast.success('Niche supprimée')
      queryClient.invalidateQueries({ queryKey: ['niches'] })
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur'),
  })

  const validateMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      nichesApi.validateAgreement(id, notes),
    onSuccess: () => {
      toast.success('Accord validé avec succès ! Prime débloquée pour l\'agent.')
      setValidatingAgreement(null)
      setValidationNotes('')
      queryClient.invalidateQueries({ queryKey: ['niche-agreements'] })
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur lors de la validation'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      nichesApi.rejectAgreement(id, reason),
    onSuccess: () => {
      toast.success('Accord rejeté.')
      setRejectingAgreement(null)
      setRejectionReason('')
      queryClient.invalidateQueries({ queryKey: ['niche-agreements'] })
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur lors du rejet'),
  })

  const saveTemplatesMutation = useMutation({
    mutationFn: () =>
      nichesApi.putObjectiveTemplates(
        editingTemplatesNiche!.id,
        templateDrafts.map((objective, index) => ({
          ...objective,
          code: objective.code.trim().toUpperCase(),
          label: objective.label.trim(),
          sort_order: index,
        })),
      ),
    onSuccess: () => {
      toast.success('Modèles d’objectifs enregistrés')
      setEditingTemplatesNiche(null)
      queryClient.invalidateQueries({ queryKey: ['niches'] })
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur lors de l’enregistrement'),
  })

  const openTemplates = async (niche: Niche) => {
    setEditingTemplatesNiche(niche)
    try {
      const result = await nichesApi.listObjectiveTemplates(niche.id)
      setTemplateDrafts(asList<NicheObjective>(result))
    } catch (error: any) {
      setEditingTemplatesNiche(null)
      toast.error(error?.message || 'Impossible de charger les objectifs')
    }
  }

  const openEdit = (n: Niche) => {
    setEdit(n)
    setShowForm(true)
    setForm({
      name: n.name,
      description: n.description || '',
      category: n.category || '',
      location: n.location || '',
      contact_name: n.contact_name || '',
      contact_phone: n.contact_phone || '',
      contact_country: DEFAULT_PHONE_COUNTRY,
      special_bonus_amount: String(n.special_bonus_amount ?? 0),
      bonus_type: n.bonus_type || 'FCFA',
    })
  }

  const resetForm = () => {
    setEdit(null)
    setShowForm(false)
    setForm(emptyForm)
  }

  const showAgreements = async (id: string) => {
    try {
      const res = await nichesApi.agreements(id)
      setSelectedNicheAgreements(asList(res))
    } catch (err: any) {
      toast.error(err.message || 'Impossible de charger les conventions pour cette niche')
    }
  }

  const niches = asList<Niche>(nichesData)
  const agreements = asList<NicheAgreement>(agreementsData)

  const pendingAgreementsCount = agreements.filter(
    (a) => a.status === 'PENDING_VALIDATION',
  ).length

  const filteredAgreements = agreements.filter((a) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (a.niche_name || '').toLowerCase().includes(q) ||
      (a.agent_name || '').toLowerCase().includes(q) ||
      (a.contact_name || '').toLowerCase().includes(q) ||
      (a.contact_phone || '').toLowerCase().includes(q)
    )
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
            Attribuée
          </span>
        )
      case 'SUPERSEDED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
            Remplacée
          </span>
        )
      case 'PENDING_VALIDATION':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60 inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            En attente validation
          </span>
        )
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 inline-flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Validé / Actif
          </span>
        )
      case 'REJECTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200/60 inline-flex items-center gap-1">
            <XCircle className="h-3 w-3 text-red-600" />
            Rejeté
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <Header
        title={t('title')}
        subtitle={t('subtitle')}
      />

      <div className="p-8 space-y-6 flex-1">
        {/* Navigation Onglets */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('niches')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-0 cursor-pointer ${
                activeTab === 'niches'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Building2 className="h-4 w-4" />
              Catalogue des Niches ({niches.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('agreements')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-0 cursor-pointer relative ${
                activeTab === 'agreements'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText className="h-4 w-4" />
              Accords & Validations CIMA
              {pendingAgreementsCount > 0 && (
                <span className="ml-1.5 px-2 py-0.5 text-[10px] font-extrabold bg-amber-500 text-white rounded-full">
                  {pendingAgreementsCount}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'niches' && canManage && (
            <button
              type="button"
              onClick={() => {
                setEdit(null)
                setForm(emptyForm)
                setShowForm((v) => !v)
              }}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10 cursor-pointer border-0"
            >
              <Plus className="h-4 w-4" />
              Nouvelle niche
            </button>
          )}
        </div>

        {/* TAB 1: CATALOGUE DES NICHES */}
        {activeTab === 'niches' && (
          <div className="space-y-6">
            {canManage && showForm && (
              <div className="w-full bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 mb-4">
                  {edit ? 'Modifier la niche' : 'Créer une niche'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1">
                    <label className={labelClass}>Nom *</label>
                    <Input
                      placeholder="Ex: Syndicat Moto-Taxi Bepanda"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Catégorie</label>
                    <Input
                      placeholder="Ex: moto-taxi / auto-école"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Localisation</label>
                    <Input
                      placeholder="Ex: Douala, Bepanda"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Contact (facultatif)</label>
                    <Input
                      placeholder="Nom du responsable"
                      value={form.contact_name}
                      onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                      className="h-10 text-xs border-gray-200"
                    />
                    <p className="text-[10px] text-slate-500">
                      Si le contact est vide, sa collecte devient un objectif obligatoire pour l’agent.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Téléphone</label>
                    <PhoneField
                      value={form.contact_phone}
                      onChange={(contact_phone) => setForm({ ...form, contact_phone })}
                      country={form.contact_country}
                      onCountryChange={(contact_country) => setForm({ ...form, contact_country })}
                      placeholder="Ex: 677000000"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Description</label>
                    <Input
                      placeholder="Notes / détails"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Prime spéciale (Bonus)</label>
                    <Input
                      type="number"
                      value={form.special_bonus_amount}
                      onChange={(e) => setForm({ ...form, special_bonus_amount: e.target.value })}
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Type de prime</label>
                    <SearchableSelect
                      value={form.bonus_type}
                      onChange={(val) => setForm({ ...form, bonus_type: val as 'FCFA' | 'POINTS' })}
                      options={[
                        { value: 'FCFA', label: 'Prime FCFA' },
                        { value: 'POINTS', label: 'Prime points' },
                      ]}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-end pt-5 border-t border-gray-50 mt-5">
                  <Button type="button" variant="ghost" onClick={resetForm}>
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="text-white"
                    disabled={
                      !form.name.trim() || createMutation.isPending || updateMutation.isPending
                    }
                    isLoading={createMutation.isPending || updateMutation.isPending}
                    onClick={() => (edit ? updateMutation.mutate() : createMutation.mutate())}
                  >
                    {edit ? 'Enregistrer' : 'Créer'}
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              {isNichesLoading ? (
                <div className="py-20 text-center text-gray-400 font-medium">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-3" />
                  Chargement des niches…
                </div>
              ) : niches.length === 0 ? (
                <div className="py-20 text-center text-gray-400">
                  <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-semibold">Aucune niche enregistrée</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Ajoutez une association ou un point de volume pour démarrer.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className={thClass}>Nom</th>
                        <th className={thClass}>Catégorie</th>
                        <th className={thClass}>Prime Débloquée</th>
                        <th className={thClass}>Agent attribué</th>
                        <th className={thClass}>Statut</th>
                        <th className={`${thClass} text-right`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {niches.map((n) => (
                        <tr key={n.id} className={trClass}>
                          <td className="py-4">
                            <span className="font-bold text-sm text-gray-900 block">{n.name}</span>
                            <span className="text-[10px] text-gray-400 block">
                              {n.location || '—'}
                              {n.contact_name ? ` · ${n.contact_name}` : ''}
                            </span>
                          </td>
                          <td className="py-4 text-xs text-slate-700">{n.category || '—'}</td>
                          <td className="py-4">
                            <span className="font-extrabold text-sm text-emerald-700">
                              {Number(n.special_bonus_amount || 0).toLocaleString('fr-FR')}{' '}
                              {n.bonus_type}
                            </span>
                          </td>
                          <td className="py-4">
                            {n.assigned_agent_name ? (
                              <div>
                                <span className="text-xs font-bold text-slate-800">{n.assigned_agent_name}</span>
                                {n.contact_incomplete ? (
                                  <span className="block text-[10px] font-bold text-amber-700">Collecter le responsable</span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">Non attribué</span>
                            )}
                          </td>
                          <td className="py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                n.is_active
                                  ? 'bg-green-50 text-green-700'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {n.is_active ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs border-gray-200"
                                onClick={() => showAgreements(n.id)}
                              >
                                Accords
                              </Button>
                              {canManage && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-gray-200 text-xs"
                                    isLoading={isAssignNavPending && assignNavNicheId === n.id}
                                    disabled={isAssignNavPending}
                                    onClick={() => openAssignPage(n.id)}
                                  >
                                    {!(isAssignNavPending && assignNavNicheId === n.id) ? (
                                      <UserPlus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                                    ) : null}
                                    {n.assigned_agent_id ? 'Réattribuer' : 'Attribuer'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs border-gray-200"
                                    onClick={() => openTemplates(n)}
                                  >
                                    <Target className="h-3.5 w-3.5 mr-1" />
                                    Objectifs ({n.objective_templates?.length || 0})
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs border-gray-200"
                                    onClick={() => openEdit(n)}
                                  >
                                    Modifier
                                  </Button>
                                  <button
                                    type="button"
                                    onClick={() => deleteMutation.mutate(n.id)}
                                    className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all cursor-pointer border-0 inline-flex items-center justify-center active:scale-95"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ACCORDS & VALIDATIONS CIMA (BACKOFFICE) */}
        {activeTab === 'agreements' && (
          <div className="space-y-6">
            {/* Filtres & Recherche */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-gray-50/60 p-4 rounded-2xl border border-gray-100">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par niche, agent, contact..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 text-xs border-gray-200 bg-white"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
                {[
                  { label: 'Tous les statuts', value: '' },
                  { label: 'En attente', value: 'PENDING_VALIDATION' },
                  { label: 'Validés', value: 'ACTIVE' },
                  { label: 'Rejetés', value: 'REJECTED' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setStatusFilter(item.value)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border-0 cursor-pointer ${
                      statusFilter === item.value
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              {isAgreementsLoading ? (
                <div className="py-20 text-center text-gray-400 font-medium">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-3" />
                  Chargement des dossiers d'accords…
                </div>
              ) : filteredAgreements.length === 0 ? (
                <div className="py-20 text-center text-gray-400">
                  <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-semibold">Aucun accord trouvé</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Les souscriptions transmises par les agents terrain s'afficheront ici.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAgreements.map((a) => (
                    <div
                      key={a.id}
                      className="border border-gray-100 rounded-2xl p-5 hover:border-gray-200 transition-all bg-white shadow-xs space-y-4"
                    >
                      {/* Entête accord */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-50 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-gray-900">
                              {a.niche_name || 'Niche N° ' + a.niche_id.slice(0, 8)}
                            </h4>
                            {getStatusBadge(a.status)}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Agent apporteur : <strong className="text-gray-800">{a.agent_name || a.agent_id}</strong>
                            {a.signed_at && ` · Soumis le ${new Date(a.signed_at).toLocaleDateString('fr-FR')}`}
                          </p>
                        </div>

                        {/* Boutons d'action pour l'administration */}
                        {a.status === 'PENDING_VALIDATION' && canManage && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => {
                                setRejectingAgreement(a)
                                setRejectionReason('')
                              }}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Rejeter
                            </Button>
                            <Button
                              size="sm"
                              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                              onClick={() => {
                                setValidatingAgreement(a)
                                setValidationNotes('')
                              }}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Valider (Débloquer Prime)
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Détails du dossier */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs bg-gray-50/50 p-4 rounded-xl border border-gray-50">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            Contact Organisme
                          </span>
                          <span className="font-semibold text-gray-900 flex items-center gap-1">
                            <User className="h-3 w-3 text-gray-400" />
                            {a.contact_name || '—'}
                          </span>
                          {a.contact_phone && (
                            <span className="text-gray-500 flex items-center gap-1 mt-0.5 font-mono">
                              <Phone className="h-3 w-3 text-gray-400" />
                              {a.contact_phone}
                            </span>
                          )}
                          {a.contact_role && (
                            <span className="text-gray-400 block text-[11px]">{a.contact_role}</span>
                          )}
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            Structure & Membres
                          </span>
                          <span className="font-semibold text-gray-800 block">
                            Type : {a.organization_type || '—'}
                          </span>
                          <span className="text-gray-600 block mt-0.5">
                            Cible : <strong>{a.target_member_count || 0} membres</strong>
                          </span>
                          {a.legal_registration_number && (
                            <span className="text-gray-400 block text-[10px]">
                              N° Reg: {a.legal_registration_number}
                            </span>
                          )}
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            Volumétrie & Prime
                          </span>
                          <span className="font-extrabold text-blue-700 block">
                            {a.estimated_premium
                              ? `${Number(a.estimated_premium).toLocaleString('fr-FR')} FCFA`
                              : '0 FCFA'}{' '}
                            <span className="text-[10px] font-normal text-gray-500">
                              / {a.premium_frequency || 'ANNUEL'}
                            </span>
                          </span>
                          <span className="text-gray-500 block mt-0.5">
                            Profil Risque : <strong className="text-slate-800">{a.risk_profile || '—'}</strong>
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            Concurrence & Suivi
                          </span>
                          <span className="text-gray-700 block">
                            Marge : <strong>{a.margin_potential || '—'}</strong>
                          </span>
                          <span className="text-gray-600 block mt-0.5">
                            Étape : {a.tracking_step || 'PRISE_DE_CONTACT'}
                          </span>
                          {a.next_follow_up_date && (
                            <span className="text-gray-400 text-[10px] mt-0.5 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Relance : {new Date(a.next_follow_up_date).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Notes / Garanties / Motif Rejet */}
                      {(a.notes || a.custom_guarantees || a.rejection_reason) && (
                        <div className="space-y-1 text-xs pt-1">
                          {a.custom_guarantees && (
                            <p className="text-gray-600 bg-blue-50/40 p-2.5 rounded-xl border border-blue-100/50">
                              <strong>Garanties spécifiques :</strong> {a.custom_guarantees}
                            </p>
                          )}
                          {a.notes && (
                            <p className="text-gray-500 italic bg-gray-50 p-2.5 rounded-xl">
                              <strong>Notes terrain :</strong> {a.notes}
                            </p>
                          )}
                          {a.rejection_reason && (
                            <p className="text-red-700 font-medium bg-red-50 p-2.5 rounded-xl border border-red-100">
                              <strong>Motif du rejet :</strong> {a.rejection_reason}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODALE ACCORDS D'UNE NICHE (Catalogue view) */}
        {selectedNicheAgreements && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg bg-white border border-gray-100 shadow-2xl rounded-2xl">
              <CardContent className="pt-6 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider pb-2 border-b border-gray-50 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  Accords souscrits sur cette niche
                </h3>
                {selectedNicheAgreements.length === 0 ? (
                  <p className="text-xs text-gray-500 py-6 text-center">
                    Aucun accord souscrit par un agent sur cette niche.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {selectedNicheAgreements.map((a) => (
                      <div
                        key={a.id}
                        className="flex justify-between items-center rounded-xl border border-gray-100 px-4 py-3 bg-gray-50/50"
                      >
                        <div>
                          <span className="text-sm font-semibold text-gray-900 block">
                            {a.agent_name || a.agent_id}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {a.contact_name ? `Contact : ${a.contact_name}` : ''}
                            {a.signed_at ? ` · ${new Date(a.signed_at).toLocaleDateString('fr-FR')}` : ''}
                          </span>
                        </div>
                        {getStatusBadge(a.status)}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="primary"
                    className="text-white"
                    onClick={() => setSelectedNicheAgreements(null)}
                  >
                    Fermer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MODALE VALIDATION ACCORD */}
        {validatingAgreement && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-white border border-gray-100 shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-200">
              <CardContent className="pt-6 space-y-4">
                <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-gray-900">
                    Valider le dossier de niche
                  </h3>
                  <p className="text-xs text-gray-500">
                    La validation de cet accord confirmera le statut actif et débloquera la prime spéciale liée pour l'agent apporteur.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Notes de validation (Optionnel)</label>
                  <Input
                    placeholder="Ex: Dossier CIMA vérifié et conforme"
                    value={validationNotes}
                    onChange={(e) => setValidationNotes(e.target.value)}
                    className="h-10 text-xs border-gray-200"
                  />
                </div>

                <div className="flex gap-2 justify-stretch pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setValidatingAgreement(null)}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 text-white bg-emerald-600 hover:bg-emerald-500"
                    disabled={validateMutation.isPending}
                    isLoading={validateMutation.isPending}
                    onClick={() =>
                      validateMutation.mutate({
                        id: validatingAgreement.id,
                        notes: validationNotes.trim() || undefined,
                      })
                    }
                  >
                    Confirmer la Validation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MODALE REJET ACCORD */}
        {rejectingAgreement && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-white border border-gray-100 shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-200">
              <CardContent className="pt-6 space-y-4">
                <div className="h-12 w-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                  <XCircle className="h-6 w-6" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-gray-900">
                    Rejeter la souscription de niche
                  </h3>
                  <p className="text-xs text-gray-500">
                    Veuillez spécifier la raison du rejet. L'agent sera notifié de ce motif.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Motif du rejet *</label>
                  <Input
                    placeholder="Ex: Document de syndicat non fourni ou périmé"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="h-10 text-xs border-gray-200"
                    required
                  />
                </div>

                <div className="flex gap-2 justify-stretch pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setRejectingAgreement(null)}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-1 text-white bg-red-600 hover:bg-red-500"
                    disabled={!rejectionReason.trim() || rejectMutation.isPending}
                    isLoading={rejectMutation.isPending}
                    onClick={() =>
                      rejectMutation.mutate({
                        id: rejectingAgreement.id,
                        reason: rejectionReason.trim(),
                      })
                    }
                  >
                    Rejeter l'Accord
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {editingTemplatesNiche && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="template-editor-title">
            <Card className="w-full max-w-6xl bg-white border border-gray-100 shadow-2xl rounded-2xl max-h-[92vh] overflow-y-auto">
              <CardContent className="pt-6 space-y-5">
                <div>
                  <h3 id="template-editor-title" className="text-base font-bold text-slate-900">
                    Modèles d’objectifs — {editingTemplatesNiche.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Ces modèles préremplissent chaque nouvelle attribution et restent personnalisables.
                  </p>
                </div>
                <ObjectiveEditor items={templateDrafts} onChange={setTemplateDrafts} />
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setEditingTemplatesNiche(null)}>
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="text-white"
                    disabled={
                      saveTemplatesMutation.isPending ||
                      templateDrafts.some((item) => !item.code.trim() || !item.label.trim() || item.target_value <= 0 || (item.recurrence === 'CUSTOM' && !item.custom_interval_days))
                    }
                    isLoading={saveTemplatesMutation.isPending}
                    onClick={() => saveTemplatesMutation.mutate()}
                  >
                    Enregistrer les modèles
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  )
}
