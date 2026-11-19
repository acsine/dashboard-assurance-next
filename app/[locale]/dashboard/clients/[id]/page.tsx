'use client'

export const dynamic = 'force-dynamic'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, use } from 'react'
import { clientsApi, contractsApi, suggestCarteRoseSerial, portalClientApi } from '@/lib/api/mobi-assur'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/link-button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import Link from 'next/link'
import { PhoneField } from '@/components/ui/phone-field'
import { toast } from 'sonner'
import { parseValidPhone, DEFAULT_PHONE_COUNTRY } from '@/lib/phone'
import {
  Phone,
  Mail,
  MapPin,
  Car,
  FileText,
  Plus,
  Loader2,
  Edit2,
  Save,
  X,
  Download,
  Eye,
  Smartphone,
  ShieldCheck,
  CircleDollarSign,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { useTranslations } from 'next-intl'


type ClientTab = 'synthese' | 'contrats' | 'documents' | 'finance_sinistres'

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const tCommon = useTranslations('common')
  const { id } = use(params)
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<ClientTab>('synthese')
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Vehicle input states
  const [vehicleBrand, setVehicleBrand] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [vehicleImmat, setVehicleImmat] = useState('')
  const [vehicleChassis, setVehicleChassis] = useState('')
  const [vehiclePower, setVehiclePower] = useState('')

  // Query Client Profile
  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientsApi.get(id),
  })

  // Query Vehicles
  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['client-vehicles', id],
    queryFn: () => clientsApi.listVehicles(id),
  })

  // Query Contracts
  const { data: allContracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => contractsApi.list(),
  })

  const { data: dossier, isLoading: loadingDossier } = useQuery({
    queryKey: ['client-dossier', id],
    queryFn: () => clientsApi.getDossier(id),
    retry: false,
  })

  // Filter contracts for this client
  const clientContracts = allContracts.filter((c) => c.client_id === id)

  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: (data: any) => clientsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] })
      toast.success('Client mis à jour avec succès')
      setIsEditing(false)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la mise à jour')
    },
  })

  const invitePortalMutation = useMutation({
    mutationFn: () =>
      portalClientApi.invitePortal({
        client_id: id,
        email: client?.email || undefined,
      }),
    onSuccess: (res: any) => {
      toast.success(
        res?.temporary_password
          ? `Portail activé — MDP temporaire : ${res.temporary_password}`
          : 'Invitation portail envoyée',
      )
    },
    onError: (err: any) => toast.error(err.message || "Erreur d'invitation"),
  })

  const [editForm, setEditForm] = useState<any>({})

  const startEditing = () => {
    setEditForm({
      full_name: client?.full_name || '',
      phone: client?.phone || '',
      country_code: client?.country_code || 'CM',
      email: client?.email || '',
      city: client?.city || '',
      profession: client?.profession || '',
    })
    setIsEditing(true)
  }

  const handleUpdateClient = (e: React.FormEvent) => {
    e.preventDefault()

    if (editForm.phone) {
      const parsed = parseValidPhone(editForm.phone, editForm.country_code || DEFAULT_PHONE_COUNTRY)
      if (!parsed) {
      toast.error(tCommon('phoneInvalid'))
        return
      }
      updateClientMutation.mutate({
        full_name: editForm.full_name,
        phone: parsed.e164,
        country_code: parsed.country,
        email: editForm.email || undefined,
        city: editForm.city || undefined,
        profession: editForm.profession || undefined,
      })
      return
    }

    updateClientMutation.mutate({
      full_name: editForm.full_name,
      phone: editForm.phone,
      country_code: editForm.country_code,
      email: editForm.email || undefined,
      city: editForm.city || undefined,
      profession: editForm.profession || undefined,
    })
  }

  // Add vehicle mutation
  const addVehicleMutation = useMutation({
    mutationFn: (data: any) => clientsApi.addVehicle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-vehicles', id] })
      toast.success('Véhicule ajouté avec succès')
      setShowAddVehicle(false)
      // reset states
      setVehicleBrand('')
      setVehicleModel('')
      setVehicleImmat('')
      setVehicleChassis('')
      setVehiclePower('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de l\'ajout du véhicule')
    },
  })

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault()
    if (!vehicleBrand || !vehicleImmat) {
      toast.error('Marque et Immatriculation requises')
      return
    }

    addVehicleMutation.mutate({
      marque: vehicleBrand,
      modele: vehicleModel || undefined,
      immatriculation: vehicleImmat.trim().toUpperCase(),
      chassis_num: vehicleChassis ? vehicleChassis.trim().toUpperCase() : undefined,
      puissance_cv: vehiclePower ? parseInt(vehiclePower) : undefined,
    })
  }

  if (loadingClient) {
    return (
      <div className="min-h-screen flex-1 bg-slate-50/70">
        <Header title="Dossier client" subtitle="Chargement des informations" />
        <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8" aria-busy="true">
          <div className="h-4 w-52 animate-pulse rounded bg-slate-200" />
          <div className="h-52 animate-pulse rounded-3xl bg-slate-200" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
          <span className="sr-only">Chargement du dossier client…</span>
        </main>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen flex-1 bg-slate-50/70">
        <Header title="Dossier client" subtitle="Client introuvable" />
        <main className="mx-auto flex w-full max-w-xl flex-1 items-center p-6">
          <Card className="w-full p-8 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
            <h1 className="mt-4 text-xl font-black text-slate-950">Client introuvable</h1>
            <p className="mt-2 text-sm text-slate-600">Ce dossier n’existe pas ou n’est plus accessible.</p>
            <LinkButton href="/dashboard/clients" className="mt-6">Retour aux clients</LinkButton>
          </Card>
        </main>
      </div>
    )
  }

  const clientInitials = client.full_name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
  const paidContractsCount = clientContracts.filter((contract) => contract.status === 'PAYE').length
  const activeReference = client.att_num || client.att_number

  return (
    <div className="min-h-screen flex-1 bg-slate-50/70">
      <Header title="Dossier client" subtitle="Profil, véhicules, contrats et documents" />

      <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <Breadcrumb
          items={[
            { label: 'Tableau de bord', href: '/dashboard' },
            { label: 'Clients', href: '/dashboard/clients' },
            { label: client.full_name },
          ]}
        />

        <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-5 text-white shadow-xl sm:p-7">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-4 sm:items-center">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl font-black ring-4 ring-white/10 sm:h-20 sm:w-20 sm:text-2xl">
                {clientInitials}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-300">
                    <ShieldCheck className="h-3.5 w-3.5" /> Dossier actif
                  </span>
                  {activeReference && (
                    <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 font-mono text-xs font-semibold text-slate-200">
                      {activeReference}
                    </span>
                  )}
                </div>
                <h1 className="mt-3 truncate text-2xl font-black tracking-tight sm:text-3xl">{client.full_name}</h1>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
                  <span className="inline-flex items-center gap-2"><Phone className="h-4 w-4 text-blue-300" />{client.phone}</span>
                  {client.email && <span className="inline-flex min-w-0 items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-blue-300" /><span className="truncate">{client.email}</span></span>}
                  <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-blue-300" />{client.city || 'Ville non renseignée'}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <LinkButton href={`/dashboard/contracts/new?client_id=${id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-blue-50">
                <Plus className="h-4 w-4" /> Nouveau contrat
              </LinkButton>
              <RoleGuard permission="agency:mutate" fallback={null}>
                <button type="button" onClick={startEditing} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-blue-300">
                  <Edit2 className="h-4 w-4" /> Modifier le profil
                </button>
              </RoleGuard>
            </div>
          </div>
        </section>

        <section aria-label="Résumé du dossier" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Véhicules" value={loadingVehicles ? '…' : vehicles.length} icon={Car} tone="blue" />
          <SummaryCard label="Contrats" value={loadingContracts ? '…' : clientContracts.length} icon={FileText} tone="indigo" />
          <SummaryCard label="Contrats payés" value={loadingContracts ? '…' : paidContractsCount} icon={ShieldCheck} tone="emerald" />
          <SummaryCard label="Paiements en attente" value={loadingDossier ? '…' : dossier?.pending_payments_count ?? 0} icon={CircleDollarSign} tone="amber" />
        </section>

        {/* Navigation Onglets ProMax */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
          {[
            {
              id: 'synthese' as const,
              label: 'Synthèse & Véhicules',
              icon: Car,
              count: vehicles.length,
            },
            {
              id: 'contrats' as const,
              label: 'Contrats & Devis CIMA',
              icon: FileText,
              count: clientContracts.length,
            },
            {
              id: 'documents' as const,
              label: 'Coffre-fort Documents & Cartes Roses',
              icon: ShieldCheck,
              count: paidContractsCount,
            },
            {
              id: 'finance_sinistres' as const,
              label: 'Paiements & Sinistres',
              icon: CircleDollarSign,
              count: (dossier?.payments?.length || 0) + (dossier?.sinistres?.length || 0),
            },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

      <div className="space-y-8">
        {/* ONGLET 1 : SYNTHÈSE & VÉHICULES */}
        {activeTab === 'synthese' && (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            {/* Card left: Info Profile */}
            <aside className="space-y-6 lg:sticky lg:top-6 lg:col-span-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-slate-100">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Identité</p>
                  <CardTitle className="mt-1 text-lg">Informations personnelles</CardTitle>
                </div>
                {!isEditing ? (
                  <div className="flex items-center gap-2">
                    <RoleGuard permission="agency:mutate" fallback={null}>
                      <button
                        type="button"
                        aria-label="Inviter ce client au portail"
                        title="Inviter au portail client"
                        onClick={() => invitePortalMutation.mutate()}
                        disabled={invitePortalMutation.isPending}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
                      >
                        {invitePortalMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Smartphone className="h-4 w-4" />
                        )}
                      </button>
                    </RoleGuard>
                    <RoleGuard permission="agency:mutate" fallback={null}>
                    <button
                      type="button"
                      aria-label="Modifier les informations personnelles"
                      onClick={startEditing}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    </RoleGuard>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-label="Annuler la modification"
                    onClick={() => setIsEditing(false)}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </CardHeader>
              <CardContent className="pt-6">
                {!isEditing ? (
                  <div className="divide-y divide-slate-100">
                    <div className="py-3 first:pt-0">
                      <span className="block text-xs font-semibold text-slate-500">
                        Nom complet
                      </span>
                      <span className="mt-1 block text-sm font-bold text-slate-950">
                        {client?.full_name}
                      </span>
                    </div>
                    <div className="py-3">
                      <span className="block text-xs font-semibold text-slate-500">
                        Téléphone
                      </span>
                      <span className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Phone className="h-4 w-4 text-blue-600" /> {client?.phone}
                      </span>
                    </div>
                    {client?.email && (
                      <div className="py-3">
                        <span className="block text-xs font-semibold text-slate-500">
                          Adresse Email
                        </span>
                        <span className="mt-1 flex min-w-0 items-center gap-2 text-sm font-medium text-slate-800">
                          <Mail className="h-4 w-4 shrink-0 text-blue-600" /> <span className="truncate">{client.email}</span>
                        </span>
                      </div>
                    )}
                    <div className="py-3">
                      <span className="block text-xs font-semibold text-slate-500">
                        Localisation
                      </span>
                      <span className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-800">
                        <MapPin className="h-4 w-4 text-blue-600" /> {client?.city || 'Non renseignée'},{' '}
                        {client?.country_code}
                      </span>
                    </div>
                    <div className="py-3">
                      <span className="block text-xs font-semibold text-slate-500">
                        Profession
                      </span>
                      <span className="mt-1 block text-sm font-medium text-slate-800">
                        {client?.profession || 'Non renseignée'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateClient} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Nom complet</label>
                      <Input
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        className="mt-1 h-11"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Téléphone</label>
                      <PhoneField
                        value={editForm.phone}
                        onChange={(phone) => setEditForm({ ...editForm, phone })}
                        country={editForm.country_code || DEFAULT_PHONE_COUNTRY}
                        onCountryChange={(country) => setEditForm({ ...editForm, country_code: country })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Adresse e-mail</label>
                      <Input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="mt-1 h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Ville</label>
                      <Input
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        className="mt-1 h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Profession</label>
                      <Input
                        value={editForm.profession}
                        onChange={(e) => setEditForm({ ...editForm, profession: e.target.value })}
                        className="mt-1 h-11"
                      />
                    </div>
                    <Button type="submit" variant="primary" className="mt-4 h-11 w-full" disabled={updateClientMutation.isPending}>
                      {updateClientMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Enregistrer
                    </Button>
                  </form>
                )}

                {!isEditing && (
                  <div className="mt-3 grid gap-3 border-t border-slate-100 pt-4">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <span className="block text-xs font-semibold text-slate-500">CNI / Passeport</span>
                      <span className="mt-1 block font-mono text-sm font-bold text-slate-800">
                        {client.cni_number || 'Non renseigné'}
                      </span>
                    </div>
                    <div className="rounded-xl bg-blue-50 p-3">
                      <span className="block text-xs font-semibold text-blue-700">Numéro ATT</span>
                      <span className="mt-1 block font-mono text-sm font-black text-blue-800">
                        {activeReference || 'Non attribué'}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>

          {/* Tabbed panels right: Vehicles and Contracts */}
          <div className="space-y-6 lg:col-span-8">
            {/* Vehicles section */}
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-slate-100">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Patrimoine assuré</p>
                  <CardTitle className="mt-1 flex items-center gap-2 text-lg">
                    <Car className="h-5 w-5 text-blue-600" /> Véhicules
                  </CardTitle>
                  <p className="mt-1 text-sm text-slate-500">Véhicules enregistrés et disponibles pour une souscription.</p>
                </div>
                <RoleGuard permission="agency:mutate" fallback={null}>
                  <button
                    onClick={() => setShowAddVehicle(!showAddVehicle)}
                    className="flex min-h-11 items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {showAddVehicle ? 'Fermer' : 'Ajouter'}
                  </button>
                </RoleGuard>
              </CardHeader>
              <CardContent className="pt-6">
                {showAddVehicle && (
                  <form
                    onSubmit={handleAddVehicle}
                    className="mb-6 space-y-5 rounded-2xl border border-blue-100 bg-blue-50/50 p-5"
                  >
                    <h4 className="text-base font-black text-slate-950">
                      Nouveau véhicule
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                          Marque *
                        </label>
                        <Input
                          placeholder="Toyota, Hyundai..."
                          value={vehicleBrand}
                          onChange={(e) => setVehicleBrand(e.target.value)}
                          className="h-10 text-xs border-gray-200"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                          Modèle
                        </label>
                        <Input
                          placeholder="Tucson, Corolla..."
                          value={vehicleModel}
                          onChange={(e) => setVehicleModel(e.target.value)}
                          className="h-10 text-xs border-gray-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                          Immatriculation *
                        </label>
                        <Input
                          placeholder="LT-123-AA..."
                          value={vehicleImmat}
                          onChange={(e) => setVehicleImmat(e.target.value)}
                          className="h-10 text-xs border-gray-200"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                          Numéro de Châssis (optionnel)
                        </label>
                        <Input
                          placeholder="VIN123456789..."
                          value={vehicleChassis}
                          onChange={(e) => setVehicleChassis(e.target.value)}
                          className="h-10 text-xs border-gray-200"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                          Puissance Fiscale (CV)
                        </label>
                        <Input
                          type="number"
                          placeholder="Ex: 7"
                          value={vehiclePower}
                          onChange={(e) => setVehiclePower(e.target.value)}
                          className="h-10 text-xs border-gray-200"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAddVehicle(false)}
                      >
                        Annuler
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={addVehicleMutation.isPending}
                        className="text-white"
                      >
                        {addVehicleMutation.isPending ? 'Ajout...' : 'Valider'}
                      </Button>
                    </div>
                  </form>
                )}

                {loadingVehicles ? (
                  <div className="space-y-3 py-2" aria-label="Chargement des véhicules">
                    {[0, 1].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}
                  </div>
                ) : vehicles.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                    <Car className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm font-bold text-slate-700">Aucun véhicule enregistré</p>
                    <p className="mt-1 text-sm text-slate-500">Ajoutez un véhicule pour créer un contrat automobile.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {vehicles.map((v) => (
                      <div
                        key={v.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/40"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                            <Car className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                          <span className="block truncate text-base font-black text-slate-950">
                            {v.marque} {v.modele || ''}
                          </span>
                          <span className="mt-1 block text-sm font-semibold text-slate-600">
                            {v.immatriculation || 'Immatriculation non renseignée'}
                          </span>
                          <span className="mt-2 block break-all font-mono text-xs text-slate-500">
                            VIN: {v.chassis_num}
                          </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Aperçu rapide contrat actif dans la Synthèse */}
            {clientContracts.length > 0 && (
              <Card className="border-blue-100 bg-linear-to-br from-blue-50/50 to-indigo-50/30">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Dernière souscription</p>
                    <CardTitle className="mt-1 text-base">Contrat en cours</CardTitle>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('contrats')}
                    className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1"
                  >
                    Voir tous les contrats ({clientContracts.length}) <ExternalLink className="h-3 w-3" />
                  </button>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4 border border-blue-100">
                    <div>
                      <span className="font-mono font-black text-sm text-slate-900 block">
                        {clientContracts[0].id.substring(0, 8).toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-500">
                        {clientContracts[0].product_type} / {clientContracts[0].subscription_type}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Prime TTC</span>
                      <span className="text-sm font-black text-slate-900">
                        {(clientContracts[0].pttc ?? clientContracts[0].prime_ttc ?? 0).toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                    <div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          clientContracts[0].status === 'PAYE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {clientContracts[0].status}
                      </span>
                    </div>
                    <Link
                      href={`/dashboard/contracts/${clientContracts[0].id}`}
                      className="text-xs font-bold text-blue-700 hover:underline"
                    >
                      Détails contrat &rarr;
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ONGLET 2 : CONTRATS & POLICES */}
      {activeTab === 'contrats' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-slate-100">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Couverture & Devis CIMA</p>
                <CardTitle className="mt-1 flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-indigo-600" /> Contrats et polices d'assurance
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500">Suivi des devis, contrats souscrits, encaissements et attestations.</p>
              </div>
              <RoleGuard permission="agency:mutate" fallback={null}>
                <Link href={`/dashboard/contracts/new?client_id=${id}`}>
                  <button className="flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700 shadow-xs">
                    <Plus className="h-4 w-4" />
                    Créer un contrat
                  </button>
                </Link>
              </RoleGuard>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingContracts ? (
                <div className="space-y-3" aria-label="Chargement des contrats">
                  {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}
                </div>
              ) : clientContracts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                  <FileText className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-base font-bold text-slate-700">Aucun contrat ou devis</p>
                  <p className="mt-1 text-sm text-slate-500">Créez la première souscription automobile de ce client.</p>
                  <RoleGuard permission="agency:mutate" fallback={null}>
                    <Link href={`/dashboard/contracts/new?client_id=${id}`} className="mt-4 inline-block">
                      <Button variant="primary" size="sm">
                        <Plus className="h-4 w-4 mr-1.5" /> Créer un contrat
                      </Button>
                    </Link>
                  </RoleGuard>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-3 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                          ID Police
                        </th>
                        <th className="pb-3 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                          Formule / Produit
                        </th>
                        <th className="pb-3 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                          Tarif Total (TTC)
                        </th>
                        <th className="pb-3 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                          Statut
                        </th>
                        <th className="pb-3 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clientContracts.map((contract) => (
                        <tr key={contract.id} className="transition-colors hover:bg-slate-50/70">
                          <td className="py-4 px-3 whitespace-nowrap font-mono font-bold text-sm text-slate-900">
                            <Link
                              href={`/dashboard/contracts/${contract.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {contract.id.substring(0, 8).toUpperCase()}
                            </Link>
                          </td>
                          <td className="py-4 px-3 whitespace-nowrap text-sm text-slate-600">
                            {contract.product_type} / {contract.subscription_type}
                          </td>
                          <td className="py-4 px-3 whitespace-nowrap font-black text-sm text-slate-900">
                            {(contract.pttc ?? contract.prime_ttc ?? 0).toLocaleString('fr-FR')} FCFA
                          </td>
                          <td className="py-4 px-3 whitespace-nowrap">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                contract.status === 'PAYE'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {contract.status}
                            </span>
                          </td>
                          <td className="py-4 px-3 whitespace-nowrap">
                            <Link
                              href={`/dashboard/contracts/${contract.id}`}
                              className="inline-flex min-h-10 items-center gap-1.5 text-xs font-bold text-blue-700 hover:underline"
                            >
                              Gérer le contrat &rarr;
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ONGLET 3 : COFFRE-FORT DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="space-y-8">
          {/* Documents officiels d'assurance */}
          <ClientDocumentsPanel contracts={clientContracts} />

          {/* Justificatifs KYC et Pièces du dossier */}
          <Card>
            <CardHeader className="border-b border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Conformité & KYC</p>
              <CardTitle className="mt-1 flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-blue-600" /> Justificatifs et pièces du dossier
              </CardTitle>
              <p className="mt-1 text-sm text-slate-500">CNI, permis de conduire et cartes grises téléversés par l'assuré.</p>
            </CardHeader>
            <CardContent className="pt-6">
              {(dossier?.documents || []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                  <FileText className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-sm font-bold text-slate-700">Aucun justificatif téléversé</p>
                  <p className="mt-1 text-sm text-slate-500">Le client n'a pas encore importé de documents justificatifs.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(dossier?.documents || []).map((d: any) => (
                    <div
                      key={d.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                          <FileText className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-bold text-slate-900">
                            {d.doc_type || 'Document'}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {d.file_name || 'Sans titre'}
                          </span>
                        </div>
                      </div>
                      {(d.signed_url || d.file_url) && (
                        <a
                          href={d.signed_url || d.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-blue-700 border border-slate-200 hover:bg-blue-50 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Visualiser le justificatif
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ONGLET 4 : FINANCES & SINISTRES */}
      {activeTab === 'finance_sinistres' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section Paiements & Encaissements */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-slate-100">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Encaissements</p>
                <CardTitle className="mt-1 flex items-center gap-2 text-lg">
                  <CircleDollarSign className="h-5 w-5 text-emerald-600" /> Paiements déclarés
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500">Règlements reçus ou en cours de vérification.</p>
              </div>
              <Link href="/dashboard/paiements-declares">
                <button className="flex min-h-9 items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors">
                  <ExternalLink className="h-3 w-3" />
                  Validation des paiements
                </button>
              </Link>
            </CardHeader>
            <CardContent className="pt-6">
              {(dossier?.payments || []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                  <CircleDollarSign className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-sm font-bold text-slate-700">Aucun paiement enregistré</p>
                  <p className="mt-1 text-sm text-slate-500">Aucun versement ou déclaration reçu pour l'instant.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(dossier?.payments || []).map((p: any) => (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {Number(p.amount).toLocaleString('fr-FR')} FCFA
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Méthode: <span className="font-semibold text-slate-700">{p.method}</span>
                          {p.payer_name ? ` · Payeur: ${p.payer_name}` : ''}
                        </p>
                        {p.reference_externe && (
                          <p className="text-[11px] font-mono text-blue-700 mt-1">
                            Réf: {p.reference_externe}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          p.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.status === 'SUCCESS' ? 'Validé' : p.status === 'REJECTED' ? 'Rejeté' : 'En attente'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section Sinistres CIMA */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-slate-100">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-rose-700">Assistance CIMA</p>
                <CardTitle className="mt-1 flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-rose-600" /> Sinistres déclarés
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500">Dossiers accidents et indemnisations CIMA.</p>
              </div>
              <Link href="/dashboard/sinistres">
                <button className="flex min-h-9 items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors">
                  <ExternalLink className="h-3 w-3" />
                  Gestionnaire Sinistres
                </button>
              </Link>
            </CardHeader>
            <CardContent className="pt-6">
              {(dossier?.sinistres || []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                  <ShieldCheck className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-sm font-bold text-slate-700">Aucun sinistre déclaré</p>
                  <p className="mt-1 text-sm text-slate-500">Ce client n'a aucun accident ou sinistre en cours.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(dossier?.sinistres || []).map((s: any) => (
                    <div
                      key={s.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-blue-700">
                            {s.reference || s.claim_number || 'SINISTRE'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {s.incident_date ? new Date(s.incident_date).toLocaleDateString('fr-FR') : ''}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 mt-1">
                          {s.title || s.description || 'Déclaration accident'}
                        </p>
                        {s.location && (
                          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {s.location}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            s.status === 'CLOTURE' || s.status === 'RESOLU'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.status === 'REFUSE'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {s.status}
                        </span>
                        <div className="mt-2">
                          <Link
                            href="/dashboard/sinistres"
                            className="text-xs font-bold text-blue-700 hover:underline inline-flex items-center gap-1"
                          >
                            Suivre CIMA <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      </div>
      </main>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  tone: 'blue' | 'indigo' | 'emerald' | 'amber'
}) {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  }[tone]

  return (
    <Card className="p-5 hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{value}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  )
}

function ClientDocumentsPanel({ contracts }: { contracts: Array<{ id: string; status: string }> }) {
  const paidContracts = contracts.filter((c) => c.status === 'PAYE')
  const firstPaidContractId = paidContracts[0]?.id || ''
  const [selectedContractId, setSelectedContractId] = useState(paidContracts[0]?.id || '')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewingDocId, setPreviewingDocId] = useState<string | null>(null)
  const [carteRoseSerial, setCarteRoseSerial] = useState(() =>
    suggestCarteRoseSerial(paidContracts[0]?.id || ''),
  )
  const [carteRoseAssigned, setCarteRoseAssigned] = useState(false)

  useEffect(() => {
    if (!selectedContractId && firstPaidContractId) {
      setSelectedContractId(firstPaidContractId)
      setCarteRoseSerial(suggestCarteRoseSerial(firstPaidContractId))
    }
  }, [firstPaidContractId, selectedContractId])

  const { data: documents = [], isFetching } = useQuery({
    queryKey: ['client-contract-docs', selectedContractId],
    queryFn: () => contractsApi.listDocs(selectedContractId),
    enabled: !!selectedContractId,
  })

  const generatePackMutation = useMutation({
    mutationFn: () => contractsApi.generatePack(selectedContractId),
    onSuccess: () => {
      toast.success('Classeur Excel téléchargé')
    },
    onError: (err: any) => toast.error(err.message || 'Erreur de génération'),
  })

  const assignCarteRoseMutation = useMutation({
    mutationFn: () =>
      contractsApi.addPhysicalDocs(selectedContractId, {
        doc_type: 'CARTE_ROSE',
        serial_number: carteRoseSerial.trim(),
      }),
    onSuccess: () => {
      setCarteRoseAssigned(true)
      toast.success('Numéro de série de la Carte Rose attribué')
    },
    onError: (err: any) =>
      toast.error(err.message || 'Erreur lors de l’attribution de la Carte Rose'),
  })

  if (paidContracts.length === 0) {
    return (
      <Card className="border-gray-100 shadow-sm bg-white">
        <CardHeader className="pb-4 border-b border-gray-50">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-500" /> Documents assurance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-xs text-amber-700 font-medium">
            Les documents (CP, Attestation, Carte Rose, Reçu) deviennent disponibles après
            encaissement (statut PAYE) sur un contrat du client.
          </div>
        </CardContent>
      </Card>
    )
  }

  const docs = Array.isArray(documents) ? documents : []

  return (
    <Card className="border-gray-100 shadow-sm bg-white relative">
      {previewingDocId && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-6 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm font-semibold text-slate-700">Ouverture du document...</p>
          </div>
        </div>
      )}
      <CardHeader className="pb-4 border-b border-gray-50 flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-500" /> Documents assurance
        </CardTitle>
        <div className="flex items-center gap-2">
          <select
            value={selectedContractId}
            onChange={(e) => {
              setSelectedContractId(e.target.value)
              setCarteRoseSerial(suggestCarteRoseSerial(e.target.value))
              setCarteRoseAssigned(false)
            }}
            className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs"
          >
            {paidContracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id.substring(0, 8).toUpperCase()}
              </option>
            ))}
          </select>
          <RoleGuard permission="agency:mutate" fallback={null}>
            <button
              onClick={() => generatePackMutation.mutate()}
              disabled={generatePackMutation.isPending || !selectedContractId}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl border-0 cursor-pointer"
            >
              {generatePackMutation.isPending ? 'Génération...' : 'Télécharger le classeur Excel'}
            </button>
          </RoleGuard>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-5">
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
              <span className="text-sm font-bold text-slate-900">N° série Carte Rose</span>
              {carteRoseAssigned && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Attribué
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Attribuez le numéro au contrat sélectionné avant de générer son pack.
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
              disabled={
                assignCarteRoseMutation.isPending || carteRoseAssigned || !selectedContractId
              }
              className="h-10 text-white"
            >
              {assignCarteRoseMutation.isPending ? 'Attribution...' : 'Attribuer'}
            </Button>
          </div>
        </form>

        {isFetching ? (
          <div className="text-center text-gray-400 py-6 text-sm">Chargement des documents...</div>
        ) : docs.length === 0 ? (
          <div className="p-4 border border-dashed border-gray-200 rounded-2xl text-center text-xs text-gray-500">
            Aucun document généré. Cliquez sur « Générer le Pack ».
          </div>
        ) : (
          docs.map((doc: any) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3.5 rounded-2xl border border-gray-100 bg-gray-50/20 gap-3"
            >
              <div>
                <span className="font-bold text-xs text-gray-900 block">
                  {doc.doc_type} ({doc.format})
                </span>
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  {doc.generated_at
                    ? `Généré le ${new Date(doc.generated_at).toLocaleString('fr-FR')}`
                    : 'Document disponible'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!!previewingDocId}
                  onClick={async () => {
                    if (previewingDocId) return
                    setPreviewingDocId(doc.id)
                    try {
                      const url = await contractsApi.previewDoc(selectedContractId, doc.id)
                      setPreviewUrl(url)
                      window.open(url, '_blank', 'noopener,noreferrer')
                    } catch {
                      toast.error('Impossible d\'ouvrir l\'aperçu')
                    } finally {
                      setPreviewingDocId(null)
                    }
                  }}
                  className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl cursor-pointer border-0 disabled:cursor-wait disabled:opacity-60"
                  title="Aperçu"
                >
                  {previewingDocId === doc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toast.promise(contractsApi.downloadDoc(selectedContractId, doc.id, doc), {
                      loading: 'Téléchargement...',
                      success: 'Document téléchargé',
                      error: 'Erreur lors du téléchargement',
                    })
                  }}
                  className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl cursor-pointer border-0"
                  title="Télécharger"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
        {previewUrl && (
          <p className="text-[10px] text-gray-400">
            Aperçu ouvert dans un nouvel onglet.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
