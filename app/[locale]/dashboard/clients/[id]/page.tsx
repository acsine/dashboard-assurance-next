'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, use } from 'react'
import { clientsApi, contractsApi } from '@/lib/api/mobi-assur'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/link-button'
import Link from 'next/link'
import { toast } from 'sonner'
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js'
import {
  User,
  Phone,
  Mail,
  MapPin,
  Car,
  FileText,
  Plus,
  Loader2,
  Bookmark,
  Edit2,
  Save,
  X,
  Download,
  Eye,
} from 'lucide-react'
import { RoleGuard } from '@/components/auth/RoleGuard'


export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const queryClient = useQueryClient()
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
  const { data: allContracts = [] } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => contractsApi.list(),
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
      const parsedCountry = (editForm.country_code || 'CM').toUpperCase() as CountryCode
      const phoneNumber = parsePhoneNumberFromString(editForm.phone, parsedCountry)
      if (!phoneNumber || !phoneNumber.isValid()) {
        toast.error('Le numéro de téléphone est invalide pour ce code pays')
        return
      }
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
    if (!vehicleBrand || !vehicleChassis) {
      toast.error('Marque et Numéro de Châssis requis')
      return
    }

    addVehicleMutation.mutate({
      marque: vehicleBrand,
      modele: vehicleModel || undefined,
      immatriculation: vehicleImmat || undefined,
      chassis_num: vehicleChassis,
      puissance_cv: vehiclePower ? parseInt(vehiclePower) : undefined,
    })
  }

  if (loadingClient) {
    return (
      <div className="flex-grow flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <Header
        title={client?.full_name || 'Détails du Client'}
        subtitle={`ID Client: ${id}`}
      />

      {/* Global Actions Bar */}
      <div className="px-8 pt-6 pb-2 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-gray-50 bg-white">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800">Dossier Client</h2>
          <p className="text-xs text-slate-500 mt-1">Gérez le profil, les véhicules et les contrats de ce client.</p>
        </div>
        <div className="flex items-center gap-3">
          <LinkButton href={`/dashboard/contracts/new?client_id=${id}`} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-all cursor-pointer border-0">
            <FileText className="h-4 w-4" />
            Nouveau Contrat
          </LinkButton>
          <RoleGuard permission="agency:mutate" fallback={null}>
            <button 
              onClick={startEditing}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Edit2 className="h-4 w-4" />
              Modifier le Profil
            </button>
          </RoleGuard>
        </div>
      </div>


      <div className="p-8 space-y-8 flex-1">
        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Card left: Info Profile */}
          <div className="space-y-6">
            <Card className="border-gray-100 shadow-sm bg-white">
              <CardHeader className="pb-4 border-b border-gray-50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-500" /> Profil Client
                </CardTitle>
                {!isEditing ? (
                  <RoleGuard permission="agency:mutate" fallback={null}>
                  <button
                    onClick={startEditing}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  </RoleGuard>
                ) : (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </CardHeader>
              <CardContent className="pt-6">
                {!isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                        Nom complet
                      </span>
                      <span className="text-sm font-bold text-gray-900 mt-1 block">
                        {client?.full_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                        Téléphone
                      </span>
                      <span className="text-sm font-semibold text-gray-800 mt-1 block flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-gray-400" /> {client?.phone}
                      </span>
                    </div>
                    {client?.email && (
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                          Adresse Email
                        </span>
                        <span className="text-sm font-medium text-gray-800 mt-1 block flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-gray-400" /> {client.email}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                        Localisation
                      </span>
                      <span className="text-sm font-medium text-gray-800 mt-1 block flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" /> {client?.city || 'N/A'},{' '}
                        {client?.country_code}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                        Profession
                      </span>
                      <span className="text-sm font-medium text-gray-800 mt-1 block">
                        {client?.profession || 'N/A'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateClient} className="space-y-4">
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase font-semibold block">Nom complet</label>
                      <Input
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        className="h-9 text-xs mt-1"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">Téléphone</label>
                      <div className="flex mt-1">
                        <select
                          value={editForm.country_code || 'CM'}
                          onChange={(e) => setEditForm({ ...editForm, country_code: e.target.value })}
                          className="w-24 h-9 rounded-l-xl border border-gray-200 border-r-0 bg-white px-2 py-1 text-xs transition-colors focus-visible:outline-none focus:border-gray-200 text-gray-900"
                        >
                          <option value="CM">🇨🇲 CM (+237)</option>
                          <option value="CI">🇨🇮 CI (+225)</option>
                          <option value="SN">🇸🇳 SN (+221)</option>
                          <option value="GA">🇬🇦 GA (+241)</option>
                          <option value="CG">🇨🇬 CG (+242)</option>
                          <option value="TD">🇹🇩 TD (+235)</option>
                          <option value="FR">🇫🇷 FR (+33)</option>
                        </select>
                        <Input
                          placeholder="Ex: 690000000"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="flex-1 h-9 text-xs border-gray-200 rounded-l-none rounded-r-xl"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase font-semibold block">Email</label>
                      <Input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="h-9 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase font-semibold block">Ville</label>
                      <Input
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        className="h-9 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase font-semibold block">Profession</label>
                      <Input
                        value={editForm.profession}
                        onChange={(e) => setEditForm({ ...editForm, profession: e.target.value })}
                        className="h-9 text-xs mt-1"
                      />
                    </div>
                    <Button type="submit" variant="primary" className="w-full text-xs h-9 mt-4" disabled={updateClientMutation.isPending}>
                      {updateClientMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Enregistrer
                    </Button>
                  </form>
                )}

                {client?.cni_number && !isEditing && (
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                      Numéro de CNI / Passeport
                    </span>
                    <span className="text-sm font-mono font-medium text-gray-800 mt-1 block">
                      {client.cni_number}
                    </span>
                  </div>
                )}
                {client?.att_number && (
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                      N° Attestation Auto-généré (ATT)
                    </span>
                    <span className="text-sm font-mono font-bold text-blue-600 mt-1 block">
                      {client.att_number}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabbed panels right: Vehicles and Contracts */}
          <div className="lg:col-span-2 space-y-8">
            {/* Vehicles section */}
            <Card className="border-gray-100 shadow-sm bg-white">
              <CardHeader className="pb-4 border-b border-gray-50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <Car className="h-4 w-4 text-blue-500" /> Véhicules
                </CardTitle>
                <RoleGuard permission="agency:mutate" fallback={null}>
                  <button
                    onClick={() => setShowAddVehicle(!showAddVehicle)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter un véhicule
                  </button>
                </RoleGuard>
              </CardHeader>
              <CardContent className="pt-6">
                {showAddVehicle && (
                  <form
                    onSubmit={handleAddVehicle}
                    className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-6 space-y-4"
                  >
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Nouveau Véhicule
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
                          Numéro de Châssis *
                        </label>
                        <Input
                          placeholder="VIN123456789..."
                          value={vehicleChassis}
                          onChange={(e) => setVehicleChassis(e.target.value)}
                          className="h-10 text-xs border-gray-200"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                          Immatriculation
                        </label>
                        <Input
                          placeholder="LT-123-AA..."
                          value={vehicleImmat}
                          onChange={(e) => setVehicleImmat(e.target.value)}
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
                  <div className="text-center text-gray-400 py-6 text-sm">Chargement...</div>
                ) : vehicles.length === 0 ? (
                  <div className="text-center text-gray-400 py-6 text-sm">
                    Aucun véhicule enregistré pour ce client.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {vehicles.map((v) => (
                      <div
                        key={v.id}
                        className="p-4 rounded-2xl border border-gray-100 flex items-start gap-3 bg-gray-50/30"
                      >
                        <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                          <Car className="h-4.5 w-4.5" />
                        </span>
                        <div>
                          <span className="font-bold text-sm text-gray-900 block">
                            {v.marque} {v.modele || ''}
                          </span>
                          <span className="text-xs text-gray-500 block mt-0.5">
                            Immatriculation: {v.immatriculation || 'Non spécifié'}
                          </span>
                          <span className="text-[10px] font-mono text-gray-400 block mt-1">
                            VIN: {v.chassis_num}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contracts section */}
            <Card className="border-gray-100 shadow-sm bg-white">
              <CardHeader className="pb-4 border-b border-gray-50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" /> Contrats & Polices
                </CardTitle>
                <Link href={`/dashboard/contracts/new?client_id=${id}`}>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all cursor-pointer">
                    <Plus className="h-3.5 w-3.5" />
                    Créer un contrat
                  </button>
                </Link>
              </CardHeader>
              <CardContent className="pt-6">
                {clientContracts.length === 0 ? (
                  <div className="text-center text-gray-400 py-6 text-sm">
                    Aucun contrat ou devis enregistré pour ce client.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="pb-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                            ID Police
                          </th>
                          <th className="pb-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                            Produit
                          </th>
                          <th className="pb-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                            Tarif (TTC)
                          </th>
                          <th className="pb-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                            Statut
                          </th>
                          <th className="pb-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientContracts.map((contract) => (
                          <tr key={contract.id} className="border-b border-gray-50 last:border-0">
                            <td className="py-4 px-2 whitespace-nowrap font-mono font-bold text-sm text-gray-900">
                              <Link
                                href={`/dashboard/contracts/${contract.id}`}
                                className="text-blue-600 hover:underline"
                              >
                                {contract.id.substring(0, 8).toUpperCase()}
                              </Link>
                            </td>
                            <td className="py-4 px-2 whitespace-nowrap text-sm text-gray-600">
                              {contract.product_type} / {contract.subscription_type}
                            </td>
                            <td className="py-4 px-2 whitespace-nowrap font-bold text-sm text-gray-900">
                              {(contract.prime_ttc || 0).toLocaleString('fr-FR')} FCFA
                            </td>
                            <td className="py-4 px-2 whitespace-nowrap">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                  contract.status === 'PAYE'
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {contract.status}
                              </span>
                            </td>
                            <td className="py-4 px-2 whitespace-nowrap">
                              <Link
                                href={`/dashboard/contracts/${contract.id}`}
                                className="text-xs font-semibold text-blue-600 hover:underline"
                              >
                                Voir documents
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

            {/* Documents générés par contrat */}
            <ClientDocumentsPanel contracts={clientContracts} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ClientDocumentsPanel({ contracts }: { contracts: Array<{ id: string; status: string }> }) {
  const paidContracts = contracts.filter((c) => c.status === 'PAYE')
  const [selectedContractId, setSelectedContractId] = useState(paidContracts[0]?.id || '')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const { data: documents = [], isFetching, refetch } = useQuery({
    queryKey: ['client-contract-docs', selectedContractId],
    queryFn: () => contractsApi.listDocs(selectedContractId),
    enabled: !!selectedContractId,
  })

  const generatePackMutation = useMutation({
    mutationFn: () => contractsApi.generatePack(selectedContractId),
    onSuccess: () => {
      toast.success('Pack de documents généré')
      refetch()
    },
    onError: (err: any) => toast.error(err.message || 'Erreur de génération'),
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
    <Card className="border-gray-100 shadow-sm bg-white">
      <CardHeader className="pb-4 border-b border-gray-50 flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-500" /> Documents assurance
        </CardTitle>
        <div className="flex items-center gap-2">
          <select
            value={selectedContractId}
            onChange={(e) => setSelectedContractId(e.target.value)}
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
              {generatePackMutation.isPending ? 'Génération...' : 'Générer le Pack'}
            </button>
          </RoleGuard>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-3">
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
                  onClick={async () => {
                    try {
                      const url = await contractsApi.previewDoc(selectedContractId, doc.id)
                      setPreviewUrl(url)
                      window.open(url, '_blank', 'noopener,noreferrer')
                    } catch {
                      toast.error('Impossible d\'ouvrir l\'aperçu')
                    }
                  }}
                  className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl cursor-pointer border-0"
                  title="Aperçu"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toast.promise(contractsApi.downloadDoc(selectedContractId, doc.id), {
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
