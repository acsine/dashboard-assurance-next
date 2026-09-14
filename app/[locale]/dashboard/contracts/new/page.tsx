'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi, contractsApi, tariffApi } from '@/lib/api/mobi-assur'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Save, FileText, User } from 'lucide-react'
import Link from 'next/link'

function NewContractFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  // Read preselected client_id from query params if any
  const preselectedClientId = searchParams.get('client_id') || ''

  // Form states
  const [clientId, setClientId] = useState(preselectedClientId)
  const [productType, setProductType] = useState('CAT1')
  const [productLine, setProductLine] = useState<'AUTO' | 'SANTE' | 'VOYAGE' | 'AUTRE'>('AUTO')
  const [subscriptionType, setSubscriptionType] = useState('AFFAIRE_NOUVELLE')
  const [zoneCirculation, setZoneCirculation] = useState('ZONE_C')
  const [dateEffet, setDateEffet] = useState('')
  const [dureeJours, setDureeJours] = useState(365)

  // Driver details
  const [driverName, setDriverName] = useState('')

  const [vehicleId, setVehicleId] = useState('')

  // Hydrate lists of clients
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list(),
  })

  const { data: productTypes } = useQuery({
    queryKey: ['product-types'],
    queryFn: () => tariffApi.listProductTypes(),
  })

  const productTypeOptions =
    productTypes?.product_lines.flatMap((line) =>
      line.contract_product_types.map((code) => ({
        code,
        line: line.code,
        label: `${line.label} — ${code}`,
      })),
    ) ?? [
      { code: 'CAT1', line: 'AUTO' as const, label: 'Automobile — CAT1' },
      { code: 'CAT11', line: 'AUTO' as const, label: 'Automobile — CAT11' },
    ]

  const needsVehicle = productLine === 'AUTO'

  const safeClients = Array.isArray(clients) ? clients : []

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['client-vehicles', clientId],
    queryFn: () => clientsApi.listVehicles(clientId),
    enabled: !!clientId,
  })

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId || !dateEffet) {
      toast.error('Client et date d’effet sont obligatoires')
      return
    }
    if (needsVehicle && !vehicleId) {
      toast.error('Sélectionnez un véhicule pour un contrat automobile')
      return
    }

    createContractMutation.mutate({
      client_id: clientId,
      product_type: productType,
      product_line: productLine,
      subscription_type: subscriptionType,
      zone_circulation: zoneCirculation,
      date_effet: new Date(dateEffet).toISOString(),
      duree_jours: Number(dureeJours),
      conducteur_nom: driverName || undefined,
      vehicles: needsVehicle ? [{ vehicle_id: vehicleId, prime_vehicule: 0 }] : [],
    })
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50/60 min-h-screen">
      <Header
        title="Création de Police / Devis"
        subtitle="Saisissez les informations du souscripteur, du conducteur et des véhicules."
      />

      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-3xl space-y-6">
          {/* Return link */}
          <div>
            <Link
              href="/dashboard/contracts"
              className="inline-flex items-center gap-2 text-xs font-extrabold text-blue-700 hover:text-blue-900 transition-colors bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour aux contrats
            </Link>
          </div>

          <Card className="border-slate-200/90 shadow-lg bg-white rounded-3xl overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Subscriber Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-blue-900 uppercase tracking-wider border-b border-blue-100 pb-2.5 flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shadow-xs" />
                    Souscripteur
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                        Sélectionner le Client *
                      </label>
                      {loadingClients ? (
                        <div className="text-xs text-slate-400">Chargement...</div>
                      ) : (
                        <select
                          value={clientId}
                          onChange={(e) => {
                            setClientId(e.target.value)
                            setVehicleId('')
                          }}
                          className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-semibold text-slate-900"
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
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                        Conducteur habituel (Nom)
                      </label>
                      <Input
                        placeholder="Ex: Jean Dupont (Laissez vide si identique au client)"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        className="h-11 text-xs border-slate-200 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Policy parameters */}
                <div className="space-y-4 pt-4">
                  <h3 className="text-sm font-black text-emerald-900 uppercase tracking-wider border-b border-emerald-100 pb-2.5 flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs" />
                    Paramètres du Contrat
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                        Type de produit *
                      </label>
                      <select
                        value={productType}
                        onChange={(e) => {
                          const next = e.target.value
                          const opt = productTypeOptions.find((o) => o.code === next)
                          setProductType(next)
                          setProductLine((opt?.line as typeof productLine) || 'AUTO')
                          if ((opt?.line || 'AUTO') !== 'AUTO') setVehicleId('')
                        }}
                        className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs transition-colors focus-visible:outline-none font-semibold text-slate-900"
                        required
                      >
                        {productTypeOptions.map((opt) => (
                          <option key={opt.code} value={opt.code}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                        Type de souscription
                      </label>
                      <select
                        value={subscriptionType}
                        onChange={(e) => setSubscriptionType(e.target.value)}
                        className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs transition-colors focus-visible:outline-none font-semibold text-slate-900"
                      >
                        <option value="AFFAIRE_NOUVELLE">Affaire Nouvelle</option>
                        <option value="RENOUVELLEMENT">Renouvellement</option>
                        <option value="AVENANT">Avenant</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                        Date d'effet *
                      </label>
                      <Input
                        type="date"
                        value={dateEffet}
                        onChange={(e) => setDateEffet(e.target.value)}
                        className="h-11 text-xs border-slate-200 font-semibold"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                        Durée (jours) *
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={dureeJours}
                        onChange={(e) => setDureeJours(Number(e.target.value))}
                        className="h-11 text-xs border-slate-200 font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                        Zone de circulation
                      </label>
                      <select
                        value={zoneCirculation}
                        onChange={(e) => setZoneCirculation(e.target.value)}
                        className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs transition-colors focus-visible:outline-none font-semibold text-slate-900"
                      >
                        <option value="ZONE_A">Zone A — Yaoundé / Douala</option>
                        <option value="ZONE_B">Zone B — Autres Villes</option>
                        <option value="ZONE_C">Zone C — Zones rurales</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Vehicle Selection Section */}
                {needsVehicle && (
                  <div className="space-y-4 pt-4">
                    <h3 className="text-sm font-black text-amber-900 uppercase tracking-wider border-b border-amber-100 pb-2.5 flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-xs" />
                      Véhicule à Assurer *
                    </h3>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                        Choix du véhicule
                      </label>
                      <select
                        value={vehicleId}
                        onChange={(event) => setVehicleId(event.target.value)}
                        disabled={!clientId || loadingVehicles}
                        required
                        className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-xs disabled:bg-slate-50 font-semibold text-slate-900"
                      >
                        <option value="">
                          {loadingVehicles ? 'Chargement des véhicules...' : 'Sélectionner un véhicule existant'}
                        </option>
                        {vehicles.map((vehicle) => (
                          <option key={vehicle.id} value={vehicle.id}>
                            {vehicle.marque} {vehicle.modele || ''} — {vehicle.immatriculation || vehicle.chassis_num}
                          </option>
                        ))}
                      </select>
                      {clientId && !loadingVehicles && vehicles.length === 0 && (
                        <p className="text-xs font-semibold text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                          ⚠️ Ce client n'a aucun véhicule enregistré. Veuillez d'abord lui en ajouter un depuis sa fiche client.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Action triggers */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <Link href="/dashboard/contracts">
                    <Button type="button" variant="outline" size="lg" className="rounded-xl border-slate-200">
                      Annuler
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={createContractMutation.isPending}
                    className="bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white flex items-center gap-2 font-black rounded-xl px-6 shadow-md cursor-pointer transition-all"
                  >
                    {createContractMutation.isPending ? (
                      <>
                        <Loader2 className="h-4.5 w-4.5 animate-spin text-white" />
                        <span>Création du Devis en cours...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4.5 w-4.5" />
                        <span>Créer le Devis</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
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
