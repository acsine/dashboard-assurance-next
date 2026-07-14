'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi, contractsApi } from '@/lib/api/mobi-assur'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Save, FileText, Plus, Trash, User } from 'lucide-react'
import Link from 'next/link'

function NewContractFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  // Read preselected client_id from query params if any
  const preselectedClientId = searchParams.get('client_id') || ''

  // Form states
  const [clientId, setClientId] = useState(preselectedClientId)
  const [productType, setProductType] = useState<'CAT1' | 'CAT11'>('CAT1')
  const [subscriptionType, setSubscriptionType] = useState('AFFAIRE_NOUVELLE')
  const [zoneCirculation, setZoneCirculation] = useState('ZONE_C')
  const [dateEffet, setDateEffet] = useState('')
  const [dureeJours, setDureeJours] = useState(365)

  // Driver details
  const [driverName, setDriverName] = useState('')

  // Vehicles subset
  const [vehiclesInput, setVehiclesInput] = useState<Array<{
    brand: string
    model: string
    chassis: string
    immat: string
    power: number
  }>>([{ brand: '', model: '', chassis: '', immat: '', power: 7 }])

  // Hydrate lists of clients
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list(),
  })

  const safeClients = Array.isArray(clients) ? clients : []

  // Autofill client ID if lists are ready and parameter exists
  useEffect(() => {
    if (preselectedClientId) {
      setClientId(preselectedClientId)
    }
  }, [preselectedClientId])

  const createContractMutation = useMutation({
    mutationFn: (data: any) => contractsApi.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      toast.success('Contrat créé avec succès')
      router.push(`/dashboard/contracts/${data.id}`)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la création du contrat')
    },
  })

  const handleAddVehicleRow = () => {
    setVehiclesInput([...vehiclesInput, { brand: '', model: '', chassis: '', immat: '', power: 7 }])
  }

  const handleRemoveVehicleRow = (index: number) => {
    if (vehiclesInput.length === 1) return
    setVehiclesInput(vehiclesInput.filter((_, idx) => idx !== index))
  }

  const handleVehicleValueChange = (index: number, field: string, value: any) => {
    const updated = [...vehiclesInput]
    updated[index] = { ...updated[index], [field]: value }
    setVehiclesInput(updated)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId || !dateEffet) {
      toast.error('Client et Date d\'effet sont obligatoires')
      return
    }

    // Validate that vehicles are entered
    const invalidVehicle = vehiclesInput.some((v) => !v.brand || !v.chassis)
    if (invalidVehicle) {
      toast.error('Veuillez renseigner la marque et le châssis de chaque véhicule')
      return
    }

    // Adapt to API Payload Schema
    const vehiclesPayload = vehiclesInput.map((v) => ({
      vehicle: {
        marque: v.brand,
        modele: v.model || undefined,
        immatriculation: v.immat || undefined,
        chassis_num: v.chassis,
        puissance_fiscale: Number(v.power),
      },
      prime_vehicule: 0, // auto calculated by backend V1
    }))

    createContractMutation.mutate({
      client_id: clientId,
      product_type: productType,
      subscription_type: subscriptionType,
      zone_circulation: zoneCirculation,
      date_effet: new Date(dateEffet).toISOString(),
      duree_jours: Number(dureeJours),
      conducteur_nom: driverName || undefined,
      vehicles: vehiclesPayload,
    })
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <Header
        title="Création de Police / Devis"
        subtitle="Saisissez les informations du souscripteur, du conducteur et des véhicules."
      />

      <div className="p-8 space-y-6 max-w-4xl flex-1">
        {/* Return link */}
        <div>
          <Link
            href="/dashboard/contracts"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux contrats
          </Link>
        </div>

        <Card className="border-gray-100 shadow-sm bg-white">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Subscriber Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center gap-2">
                  <User className="h-4.5 w-4.5 text-blue-500" /> Souscripteur
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Sélectionner le Client *
                    </label>
                    {loadingClients ? (
                      <div className="text-xs text-gray-400">Chargement...</div>
                    ) : (
                      <select
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-transparent font-medium"
                        required
                      >
                        <option value="">Sélectionner un client dans la liste</option>
                        {safeClients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.full_name} ({c.phone})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Conducteur habituel (Nom)
                    </label>
                    <Input
                      placeholder="Ex: Jean Dupont (Laissez vide si identique au client)"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="h-11 text-xs border-gray-200"
                    />
                  </div>
                </div>
              </div>

              {/* Policy parameters */}
              <div className="space-y-4 pt-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center gap-2">
                  <FileText className="h-4.5 w-4.5 text-blue-500" /> Paramètres du Contrat
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Produit *
                    </label>
                    <select
                      value={productType}
                      onChange={(e) => setProductType(e.target.value as 'CAT1' | 'CAT11')}
                      className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs transition-colors focus-visible:outline-none"
                    >
                      <option value="CAT1">Véhicule de tourisme (CAT 1)</option>
                      <option value="CAT11">Flotte (CAT 11)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Type de souscription
                    </label>
                    <select
                      value={subscriptionType}
                      onChange={(e) => setSubscriptionType(e.target.value)}
                      className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs transition-colors focus-visible:outline-none"
                    >
                      <option value="AFFAIRE_NOUVELLE">Affaire Nouvelle</option>
                      <option value="RENOUVELLEMENT">Renouvellement</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Zone de circulation
                    </label>
                    <select
                      value={zoneCirculation}
                      onChange={(e) => setZoneCirculation(e.target.value)}
                      className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs transition-colors focus-visible:outline-none"
                    >
                      <option value="ZONE_C">Zone C (Caméroun)</option>
                      <option value="ZONE_A">Zone A</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Durée (Jours)
                    </label>
                    <select
                      value={dureeJours}
                      onChange={(e) => setDureeJours(Number(e.target.value))}
                      className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs transition-colors focus-visible:outline-none"
                    >
                      <option value={30}>30 Jours</option>
                      <option value={90}>90 Jours</option>
                      <option value={180}>180 Jours</option>
                      <option value={365}>365 Jours</option>
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Date d'effet *
                    </label>
                    <Input
                      type="datetime-local"
                      value={dateEffet}
                      onChange={(e) => setDateEffet(e.target.value)}
                      className="h-11 text-xs border-gray-200"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Vehicles specifications */}
              <div className="space-y-4 pt-4">
                <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    Véhicules de la police
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddVehicleRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter un autre véhicule
                  </button>
                </div>

                <div className="space-y-6">
                  {vehiclesInput.map((veh, index) => (
                    <div
                      key={index}
                      className="p-5 border border-gray-100 bg-gray-50/20 rounded-2xl space-y-4 relative"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-700">
                          Véhicule #{index + 1}
                        </span>
                        {vehiclesInput.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveVehicleRow(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                            Marque *
                          </label>
                          <Input
                            placeholder="Toyota"
                            value={veh.brand}
                            onChange={(e) =>
                              handleVehicleValueChange(index, 'brand', e.target.value)
                            }
                            className="h-10 text-xs border-gray-200 bg-white"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                            Modèle
                          </label>
                          <Input
                            placeholder="Corolla"
                            value={veh.model}
                            onChange={(e) =>
                              handleVehicleValueChange(index, 'model', e.target.value)
                            }
                            className="h-10 text-xs border-gray-200 bg-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                            N° Châssis *
                          </label>
                          <Input
                            placeholder="VIN..."
                            value={veh.chassis}
                            onChange={(e) =>
                              handleVehicleValueChange(index, 'chassis', e.target.value)
                            }
                            className="h-10 text-xs border-gray-200 bg-white"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                            Immatriculation
                          </label>
                          <Input
                            placeholder="LT..."
                            value={veh.immat}
                            onChange={(e) =>
                              handleVehicleValueChange(index, 'immat', e.target.value)
                            }
                            className="h-10 text-xs border-gray-200 bg-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                            Puis. Fiscale (CV)
                          </label>
                          <Input
                            type="number"
                            placeholder="7"
                            value={veh.power}
                            onChange={(e) =>
                              handleVehicleValueChange(index, 'power', e.target.value)
                            }
                            className="h-10 text-xs border-gray-200 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action triggers */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <Link href="/dashboard/contracts">
                  <Button type="button" variant="outline" size="lg">
                    Annuler
                  </Button>
                </Link>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={createContractMutation.isPending}
                  className="text-white flex items-center gap-2 font-semibold"
                >
                  {createContractMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Créer le Devis
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function NewContractPage() {
  return (
    <Suspense fallback={
      <div className="flex-grow flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <NewContractFormContent />
    </Suspense>
  )
}
