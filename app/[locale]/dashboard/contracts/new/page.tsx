'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi, contractsApi, tariffApi } from '@/lib/api/mobi-assur'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import SearchableSelect from '@/components/ui/searchable-select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Loader2,
  Save,
  Trophy,
  CheckCircle2,
  Calculator,
  ShieldCheck,
  Building2,
  Check,
} from 'lucide-react'
import Link from 'next/link'

interface InsurerOffer {
  insurer_id: string
  insurer_code: string
  insurer_name: string
  prime_nette: number
  total_ttc: number
  discount_pct: number
}

function calculateContractTariff({
  productType,
  dureeJours,
  zoneCirculation,
  powerCv = 8,
  selectedInsurerId,
}: {
  productType: string
  dureeJours: number
  zoneCirculation: string
  powerCv?: number
  selectedInsurerId?: string
}) {
  // Base Responsabilité Civile according to product type
  let baseRc = 52000
  if (productType === 'CAT11') baseRc = 85000
  if (productType === 'CAT2' || productType === 'CAT3') baseRc = 68000
  if (productType === 'SANTE') baseRc = 120000
  if (productType === 'VOYAGE') baseRc = 35000

  // Adjust for vehicle power CV if relevant
  if (powerCv > 10) baseRc *= 1.25
  else if (powerCv > 7) baseRc *= 1.1

  // Zone multiplier (CIMA zones)
  let zoneFactor = 1.0
  if (zoneCirculation === 'ZONE_B') zoneFactor = 0.95
  if (zoneCirculation === 'ZONE_C') zoneFactor = 0.9

  // Duration ratio
  const durationRatio = Math.min(365, Math.max(1, dureeJours)) / 365

  // Base RC Nette
  const rcNette = Math.round(baseRc * zoneFactor * durationRatio)
  const dr = 5000 // Défense et Recours
  const ipt = 4000 // Indemnité Personne Transportée
  const primeNetteBase = rcNette + dr + ipt // RC + DR + IPT

  // Accessories & Taxes according to CIMA rules: TVA = (RC + DR + IPT) * 19.25%
  const acc = 5000 // Accessoires Compagnie
  const fc = Math.round(primeNetteBase * 0.02) // FGA 2%
  const tva = Math.round(primeNetteBase * 0.1925) // TVA 19.25% appliquée sur (RC + DR + IPT)
  const carteRose = 1000 // Carte Rose CIMA

  const baseTotalTtc = primeNetteBase + acc + fc + tva + carteRose

  // List of candidate insurers with market discount factors
  const candidateInsurers = [
    { id: 'bethel', code: 'BETHEL', name: 'Bethel Insurance', discountFactor: 0.9 },
    { id: 'activa', code: 'ACTIVA', name: 'Activa Assurances', discountFactor: 0.94 },
    { id: 'sanlam', code: 'SANLAM', name: 'Sanlam Cameroun', discountFactor: 0.96 },
    { id: 'axa', code: 'AXA', name: 'AXA Assurances', discountFactor: 1.0 },
    { id: 'chanas', code: 'CHANAS', name: 'Chanas Assurances', discountFactor: 1.03 },
  ]

  const insurerComparisons: InsurerOffer[] = candidateInsurers.map((ins) => {
    const totalTtc = Math.round(baseTotalTtc * ins.discountFactor)
    const primeNetteInsurer = Math.round(primeNetteBase * ins.discountFactor)
    return {
      insurer_id: ins.id,
      insurer_code: ins.code,
      insurer_name: ins.name,
      prime_nette: primeNetteInsurer,
      total_ttc: totalTtc,
      discount_pct: Math.round((1 - ins.discountFactor) * 100),
    }
  })

  // Determine Mieux-disant (lowest price)
  const sortedByPrice = [...insurerComparisons].sort((a, b) => a.total_ttc - b.total_ttc)
  const mieuxDisant = sortedByPrice[0]

  // Active chosen insurer or default to mieuxDisant
  const activeInsurer =
    insurerComparisons.find((i) => i.insurer_id === selectedInsurerId) || mieuxDisant

  // Re-calculate breakdown for chosen active insurer
  const currentRatio = activeInsurer.total_ttc / baseTotalTtc
  const primeNette = Math.round(primeNetteBase * currentRatio)
  const calculatedFc = Math.round(primeNette * 0.02)
  const calculatedTva = Math.round(primeNette * 0.1925) // TVA 19.25% sur (RC + DR + IPT)
  const netAPayer = activeInsurer.total_ttc

  return {
    primeNette,
    dr,
    ipt,
    acc,
    fc: calculatedFc,
    tva: calculatedTva,
    carteRose,
    netAPayer,
    activeInsurer,
    mieuxDisant,
    insurerComparisons,
  }
}

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
  const [driverName, setDriverName] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [selectedInsurerId, setSelectedInsurerId] = useState<string>('bethel')

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
      { code: 'CAT1', line: 'AUTO' as const, label: 'Automobile — CAT1 (Promenade & Affaires)' },
      { code: 'CAT11', line: 'AUTO' as const, label: 'Automobile — CAT11 (Transport Public)' },
      { code: 'CAT2', line: 'AUTO' as const, label: 'Automobile — CAT2 (Utilitaire / Camion)' },
    ]

  const needsVehicle = productLine === 'AUTO'
  const safeClients = Array.isArray(clients) ? clients : []

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['client-vehicles', clientId],
    queryFn: () => clientsApi.listVehicles(clientId),
    enabled: !!clientId,
  })

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId)
  const powerCv = selectedVehicle?.puissance_fiscale || 8

  // Compute live tariff and mieux-disant comparison
  const tariffCalc = calculateContractTariff({
    productType,
    dureeJours: Number(dureeJours) || 365,
    zoneCirculation,
    powerCv,
    selectedInsurerId,
  })

  useEffect(() => {
    if (preselectedClientId) {
      setClientId(preselectedClientId)
    }
  }, [preselectedClientId])

  const createContractMutation = useMutation({
    mutationFn: (data: any) => contractsApi.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      toast.success('Police / Devis créé avec succès')
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
      prime_nette: tariffCalc.primeNette,
      prime_ttc: tariffCalc.netAPayer,
      insurer_id: tariffCalc.activeInsurer.insurer_id,
      insurer_name: tariffCalc.activeInsurer.insurer_name,
      vehicles: needsVehicle
        ? [{ vehicle_id: vehicleId, prime_vehicule: tariffCalc.primeNette }]
        : [],
    })
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50/60 min-h-screen">
      <Header
        title="Création de Police / Tarification"
        subtitle="Saisissez les paramètres de souscription et comparez le Mieux-Disant en temps réel."
      />

      <div className="flex-1 p-6 sm:p-10">
        <div className="max-w-7xl mx-auto space-y-6">
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Form (8 cols) */}
            <div className="lg:col-span-7 space-y-6">
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
                            <SearchableSelect
                              value={clientId}
                              onChange={(val) => {
                                setClientId(val)
                                setVehicleId('')
                              }}
                              placeholder="Rechercher un client..."
                              options={safeClients.map((c) => ({
                                value: c.id,
                                label: c.full_name,
                                sublabel: c.phone,
                              }))}
                            />
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                            Conducteur habituel (Nom)
                          </label>
                          <Input
                            placeholder="Ex: Jean Dupont (Vide si identique au client)"
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
                        Paramètres de la Police
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                            Type de produit & Catégorie *
                          </label>
                          <SearchableSelect
                            value={productType}
                            onChange={(next) => {
                              const opt = productTypeOptions.find((o) => o.code === next)
                              setProductType(next)
                              setProductLine((opt?.line as typeof productLine) || 'AUTO')
                              if ((opt?.line || 'AUTO') !== 'AUTO') setVehicleId('')
                            }}
                            options={productTypeOptions.map((opt) => ({
                              value: opt.code,
                              label: opt.label,
                            }))}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                            Type de souscription
                          </label>
                          <SearchableSelect
                            value={subscriptionType}
                            onChange={(val) => setSubscriptionType(val)}
                            options={[
                              { value: 'AFFAIRE_NOUVELLE', label: 'Affaire Nouvelle' },
                              { value: 'RENOUVELLEMENT', label: 'Renouvellement' },
                              { value: 'AVENANT', label: 'Avenant' },
                            ]}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                            Zone de circulation
                          </label>
                          <SearchableSelect
                            value={zoneCirculation}
                            onChange={(val) => setZoneCirculation(val)}
                            options={[
                              { value: 'ZONE_A', label: 'Zone A — Yaoundé / Douala' },
                              { value: 'ZONE_B', label: 'Zone B — Villes Secondaires' },
                              { value: 'ZONE_C', label: 'Zone C — Zones rurales' },
                            ]}
                          />
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
                            Choix du véhicule du souscripteur
                          </label>
                          <SearchableSelect
                            value={vehicleId}
                            onChange={(val) => setVehicleId(val)}
                            disabled={!clientId || loadingVehicles}
                            placeholder={
                              loadingVehicles
                                ? 'Chargement des véhicules...'
                                : 'Rechercher un véhicule existant...'
                            }
                            options={vehicles.map((v) => ({
                              value: v.id,
                              label: `${v.marque} ${v.modele || ''}`,
                              sublabel: `${v.immatriculation || v.chassis_num} (${v.puissance_fiscale || 8} CV)`,
                            }))}
                          />
                          {clientId && !loadingVehicles && vehicles.length === 0 && (
                            <p className="text-xs font-semibold text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                              ⚠️ Ce client n'a aucun véhicule enregistré. Veuillez lui en ajouter un depuis sa fiche client.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action triggers with inline Net summary */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                          <Calculator className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                            Net à payer ({tariffCalc.activeInsurer.insurer_name})
                          </span>
                          <span className="text-lg font-black text-slate-900">
                            {tariffCalc.netAPayer.toLocaleString('fr-FR')} <span className="text-xs text-blue-600 font-extrabold">FCFA</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <Link href="/dashboard/contracts">
                          <Button type="button" variant="outline" size="lg" className="rounded-xl border-slate-200">
                            Annuler
                          </Button>
                        </Link>
                        <Button
                          type="submit"
                          size="lg"
                          disabled={createContractMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 font-bold rounded-xl px-6 shadow-md shadow-blue-600/10 cursor-pointer transition-all"
                        >
                          {createContractMutation.isPending ? (
                            <>
                              <Loader2 className="h-4.5 w-4.5 animate-spin text-white" />
                              <span>Génération...</span>
                            </>
                          ) : (
                            <>
                              <Save className="h-4.5 w-4.5" />
                              <span>Créer la Police</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Unified Dynamic Pricing & Insurer Comparison (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="border-slate-200/80 shadow-md bg-white rounded-3xl overflow-hidden">
                {/* Header */}
                <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                        <Trophy className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-900">
                          Tarification & Mieux-Disant
                        </CardTitle>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Barème CIMA — Comparatif temps réel
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                      5 Offres Simulées
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-5">
                  {/* Hero Net Price Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Net à payer (Prime TTC)
                      </span>
                      {tariffCalc.activeInsurer.insurer_id === tariffCalc.mieuxDisant.insurer_id && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                          🏆 Mieux-Disant
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-black text-white tracking-tight">
                        {tariffCalc.netAPayer.toLocaleString('fr-FR')}
                      </span>
                      <span className="text-xs font-extrabold text-blue-400">FCFA</span>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-300 border-t border-white/10 pt-2 flex items-center justify-between">
                      <span>Assureur retenu :</span>
                      <strong className="text-amber-300 font-extrabold">{tariffCalc.activeInsurer.insurer_name}</strong>
                    </div>
                  </div>

                  {/* Financial Breakdown Table */}
                  <div className="space-y-2 bg-slate-50/70 p-4 rounded-2xl border border-slate-100 text-xs">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block pb-1 border-b border-slate-200">
                      Décomposition Tarifaire CIMA
                    </span>

                    <div className="flex justify-between py-1 text-slate-600 border-b border-slate-100">
                      <span>Prime Nette (RC Base)</span>
                      <span className="font-bold text-slate-900">{tariffCalc.primeNette.toLocaleString('fr-FR')} FCFA</span>
                    </div>

                    <div className="flex justify-between py-1 text-slate-600 border-b border-slate-100">
                      <span>Garanties (DR + IPT)</span>
                      <span className="font-bold text-slate-900">{(tariffCalc.dr + tariffCalc.ipt).toLocaleString('fr-FR')} FCFA</span>
                    </div>

                    <div className="flex justify-between py-1 text-slate-600 border-b border-slate-100">
                      <span>Accessoires Compagnie</span>
                      <span className="font-bold text-slate-900">{tariffCalc.acc.toLocaleString('fr-FR')} FCFA</span>
                    </div>

                    <div className="flex justify-between py-1 text-slate-600 border-b border-slate-100">
                      <span>Fonds Garantie Auto (FGA 2%)</span>
                      <span className="font-bold text-slate-900">{tariffCalc.fc.toLocaleString('fr-FR')} FCFA</span>
                    </div>

                    <div className="flex justify-between py-1 text-slate-600 border-b border-slate-100">
                      <span>TVA (19.25% sur RC+DR+IPT)</span>
                      <span className="font-bold text-slate-900">{tariffCalc.tva.toLocaleString('fr-FR')} FCFA</span>
                    </div>

                    <div className="flex justify-between py-1 text-slate-600">
                      <span>Carte Rose CIMA</span>
                      <span className="font-bold text-slate-900">{tariffCalc.carteRose.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  </div>

                  {/* Insurer Offers Selection List */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                      Sélectionner l'Assureur de référence
                    </span>

                    <div className="space-y-2">
                      {tariffCalc.insurerComparisons.map((offer) => {
                        const isMieuxDisant = offer.insurer_id === tariffCalc.mieuxDisant.insurer_id
                        const isSelected = offer.insurer_id === tariffCalc.activeInsurer.insurer_id

                        return (
                          <div
                            key={offer.insurer_id}
                            onClick={() => setSelectedInsurerId(offer.insurer_id)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-blue-50/80 border-blue-500 ring-1 ring-blue-500/30 shadow-xs'
                                : 'bg-slate-50/50 hover:bg-slate-100/80 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'border-blue-600 bg-blue-600 text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-xs text-slate-900">
                                    {offer.insurer_name}
                                  </span>
                                  {isMieuxDisant && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black tracking-tight shadow-2xs">
                                      🏆 Mieux-Disant
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                                  Prime Nette: {offer.prime_nette.toLocaleString('fr-FR')} FCFA
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-slate-900 block">
                                {offer.total_ttc.toLocaleString('fr-FR')} FCFA
                              </span>
                              {offer.discount_pct > 0 && (
                                <span className="text-[10px] font-bold text-emerald-600">
                                  -{offer.discount_pct}% de réduction
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NewContractPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-grow flex items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <NewContractFormContent />
    </Suspense>
  )
}
