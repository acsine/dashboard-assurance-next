'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from '@/i18n/navigation'
import {
  clientsApi,
  contractsApi,
  formOptionsApi,
  tariffApi,
  type CreateContractRequest,
  type DriverType,
  type QuoteComputeResult,
} from '@/lib/api/mobi-assur'
import {
  durationMonthsToDays,
  isUnconvertedProspectClient,
  missingVehicleTariffFields,
  validateContractStep,
  type DriverFields as DriverValues,
  type ValidationErrors,
} from '@/lib/schemas/client-form'
import { ENERGY_OPTIONS, GUARANTEE_OPTIONS, withSelectFallback } from '@/lib/cameroon-cities'
import Header from '@/components/dashboard/Header'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import SearchableSelect from '@/components/ui/searchable-select'
import QuoteDetailsAndGuarantees from '@/components/insurance/QuoteDetailsAndGuarantees'
import { DriverFields } from '@/components/insurance/DriverFields'
import { GuaranteeChoices } from '@/components/insurance/GuaranteeChoices'
import { WizardSteps } from '@/components/insurance/WizardSteps'

const STEPS = ['Client & véhicule', 'Données tarifaires', 'Contrat & conducteur', 'Confirmation'] as const
const labelClass = 'space-y-1 text-xs font-bold text-slate-600'
const inputClass = 'h-11 text-xs'

interface VehicleDraft {
  category_id: string
  energie: string
  puissance_cv: string
  zone_id: string
  has_trailer: boolean
}

function NewContractFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [clientId, setClientId] = useState(searchParams.get('client_id') || '')
  const [vehicleId, setVehicleId] = useState('')
  const [vehicleDraft, setVehicleDraft] = useState<VehicleDraft>({
    category_id: '',
    energie: '',
    puissance_cv: '',
    zone_id: '',
    has_trailer: false,
  })
  const [subscriptionType, setSubscriptionType] = useState('AFFAIRE_NOUVELLE')
  const [durationId, setDurationId] = useState('')
  const [dateEffet, setDateEffet] = useState(new Date().toISOString().slice(0, 10))
  const [driverType, setDriverType] = useState<DriverType>('ASSURE')
  const [driver, setDriver] = useState<DriverValues>({})
  const [guarantees, setGuarantees] = useState<Record<string, boolean>>({ RC: true, DR: true })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [quote, setQuote] = useState<QuoteComputeResult | null>(null)

  const { data: rawClients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list(),
  })
  const clients = rawClients.filter((client) => !isUnconvertedProspectClient(client))
  const selectedClient = clients.find((client) => client.id === clientId)

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['client-vehicles', clientId],
    queryFn: () => clientsApi.listVehicles(clientId),
    enabled: !!clientId,
  })
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId)

  const { data: options } = useQuery({
    queryKey: ['form-options'],
    queryFn: formOptionsApi.get,
  })
  const { data: bootstrap, isLoading: loadingBootstrap } = useQuery({
    queryKey: ['tariff-bootstrap'],
    queryFn: tariffApi.bootstrap,
  })

  const originalMissingFields = useMemo(
    () => missingVehicleTariffFields(selectedVehicle),
    [selectedVehicle],
  )
  const selectedZone = bootstrap?.zones.find((zone) => zone.id === vehicleDraft.zone_id)
  const selectedDuration = bootstrap?.durations.find((duration) => duration.id === durationId)

  useEffect(() => {
    if (!selectedVehicle || !bootstrap) return
    const zone = bootstrap.zones.find(
      (item) =>
        item.code === selectedVehicle.zone_circulation ||
        item.name === selectedVehicle.zone_circulation,
    )
    setVehicleDraft({
      category_id: selectedVehicle.category_id || '',
      energie: selectedVehicle.energie || '',
      puissance_cv: String(selectedVehicle.puissance_cv || selectedVehicle.puissance_fiscale || ''),
      zone_id: zone?.id || '',
      has_trailer: selectedVehicle.has_trailer,
    })
    setQuote(null)
  }, [selectedVehicle, bootstrap])

  useEffect(() => {
    if (driverType !== 'ASSURE' || !selectedClient) return
    setDriver((current) => ({
      ...current,
      conducteur_nom: selectedClient.full_name,
      conducteur_date_naissance: selectedClient.date_naissance || '',
    }))
  }, [driverType, selectedClient])

  const setVehicleField = <K extends keyof VehicleDraft>(key: K, value: VehicleDraft[K]) =>
    setVehicleDraft((current) => ({ ...current, [key]: value }))
  const setDriverField = (key: keyof DriverValues, value: string) =>
    setDriver((current) => ({ ...current, [key]: value }))

  const quoteMutation = useMutation({
    mutationFn: (insurerId?: string) =>
      tariffApi.computeQuote({
        category_id: vehicleDraft.category_id,
        zone_id: vehicleDraft.zone_id,
        duration_id: durationId,
        fuel: vehicleDraft.energie,
        power_cv: Number(vehicleDraft.puissance_cv),
        trailer: vehicleDraft.has_trailer,
        include_dr: !!guarantees.DR,
        include_ipt: !!guarantees.INDIV_ACC,
        insurer_id: insurerId,
      }),
    onSuccess: setQuote,
    onError: (error: Error) => toast.error(error.message || 'Calcul du devis impossible'),
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVehicle || !selectedZone || !selectedDuration || !quote || quote.total <= 0) {
        throw new Error('Le véhicule, la durée et un devis backend valide sont requis')
      }

      await clientsApi.updateVehicle(clientId, vehicleId, {
        category_id: vehicleDraft.category_id,
        energie: vehicleDraft.energie,
        puissance_cv: Number(vehicleDraft.puissance_cv),
        zone_circulation: selectedZone.code,
        has_trailer: vehicleDraft.has_trailer,
      })

      const payload: CreateContractRequest = {
        client_id: clientId,
        quote_id: quote.quote_id,
        product_type: 'CAT1',
        product_line: 'AUTO',
        subscription_type: subscriptionType,
        zone_circulation: selectedZone.code,
        date_effet: new Date(`${dateEffet}T00:00:00Z`).toISOString(),
        duree_jours: durationMonthsToDays(selectedDuration.months),
        driver_type: driverType,
        conducteur_nom: driver.conducteur_nom,
        conducteur_date_naissance: driver.conducteur_date_naissance,
        conducteur_permis_cat: driver.conducteur_permis_cat,
        conducteur_permis_num: driver.conducteur_permis_num,
        conducteur_permis_date: driver.conducteur_permis_date,
        vehicles: [
          {
            vehicle_id: selectedVehicle.id,
            guarantees: Object.fromEntries(
              Object.entries(guarantees).filter(([, enabled]) => enabled),
            ),
          },
        ],
        insurer_id: quote.insurer_id,
        category_id: vehicleDraft.category_id,
        zone_id: vehicleDraft.zone_id,
      }
      return contractsApi.create(payload)
    },
    onSuccess: (contract) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      queryClient.invalidateQueries({ queryKey: ['client-vehicles', clientId] })
      toast.success('Contrat créé')
      router.push(`/dashboard/contracts/${contract.id}`)
    },
    onError: (error: Error) => toast.error(error.message || 'Création du contrat impossible'),
  })

  const validateVehicle = () => {
    const nextErrors: ValidationErrors = {}
    if (!vehicleDraft.category_id) nextErrors.category_id = 'La catégorie est requise'
    if (!vehicleDraft.energie) nextErrors.energie = 'L’énergie est requise'
    if (Number(vehicleDraft.puissance_cv) < 1 || Number(vehicleDraft.puissance_cv) > 99) {
      nextErrors.puissance_cv = 'La puissance doit être comprise entre 1 et 99 CV'
    }
    if (!vehicleDraft.zone_id) nextErrors.zone_id = 'La zone est requise'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const next = async () => {
    if (step === 0 && (!clientId || !vehicleId)) {
      toast.error('Sélectionnez un client et un véhicule')
      return
    }
    if (step === 1 && !validateVehicle()) {
      toast.error('Complétez les données tarifaires manquantes')
      return
    }
    if (step === 2) {
      const nextErrors = validateContractStep({
        zone_id: vehicleDraft.zone_id,
        duration_id: durationId,
        date_effet: dateEffet,
        ...driver,
      })
      setErrors(nextErrors)
      if (Object.keys(nextErrors).length) {
        toast.error('Complétez les informations du conducteur et du contrat')
        return
      }
      try {
        await quoteMutation.mutateAsync(undefined)
      } catch {
        return
      }
    }
    setErrors({})
    setStep((current) => Math.min(STEPS.length - 1, current + 1))
  }

  const error = (key: string) =>
    errors[key] ? <span className="block text-[11px] font-medium text-red-600">{errors[key]}</span> : null
  const tariffField = (
    key: (typeof originalMissingFields)[number],
    content: React.ReactNode,
  ) => originalMissingFields.includes(key) ? content : null
  const busy = loadingClients || loadingVehicles || loadingBootstrap || quoteMutation.isPending || createMutation.isPending

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-slate-50/60">
      <Header title="Nouveau contrat" subtitle="Tarification automobile guidée par le backend" />
      <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-8">
        <Breadcrumb items={[{ label: 'Contrats', href: '/dashboard/contracts' }, { label: 'Nouveau contrat' }]} />
        <WizardSteps steps={STEPS} current={step} />
        <Card className="rounded-3xl border-slate-200 shadow-lg">
          <CardContent className="space-y-6 p-5 sm:p-8">
            {step === 0 && (
              <section className="space-y-5">
                <h2 className="text-xl font-black text-slate-900">Client et véhicule</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={labelClass}>Client converti *
                    <SearchableSelect
                      value={clientId}
                      onChange={(value) => { setClientId(value); setVehicleId(''); setQuote(null) }}
                      options={clients.map((client) => ({ value: client.id, label: client.full_name, sublabel: client.phone }))}
                      placeholder="Rechercher un client..."
                    />
                  </label>
                  <label className={labelClass}>Véhicule *
                    <SearchableSelect
                      value={vehicleId}
                      onChange={setVehicleId}
                      disabled={!clientId || loadingVehicles}
                      options={vehicles.map((vehicle) => ({
                        value: vehicle.id,
                        label: `${vehicle.marque} ${vehicle.modele || ''}`,
                        sublabel: vehicle.immatriculation || vehicle.chassis_num,
                      }))}
                      placeholder="Sélectionner un véhicule..."
                    />
                  </label>
                </div>
                {clientId && !loadingVehicles && vehicles.length === 0 && (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                    Ce client ne possède aucun véhicule. Ajoutez-en un depuis sa fiche.
                  </p>
                )}
              </section>
            )}

            {step === 1 && selectedVehicle && (
              <section className="space-y-5">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Données tarifaires du véhicule</h2>
                  <p className="mt-1 text-sm text-slate-500">Seuls les champs requis absents du véhicule sont demandés.</p>
                </div>
                {originalMissingFields.length === 0 ? (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                    Le véhicule contient déjà toutes les données nécessaires.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {tariffField('category_id', <label className={labelClass}>Catégorie *<SearchableSelect value={vehicleDraft.category_id} onChange={(value) => setVehicleField('category_id', value)} options={(bootstrap?.categories ?? []).filter((item) => item.is_active).map((item) => ({ value: item.id, label: `${item.code} — ${item.name}` }))} />{error('category_id')}</label>)}
                    {tariffField('energie', <label className={labelClass}>Énergie *<SearchableSelect value={vehicleDraft.energie} onChange={(value) => setVehicleField('energie', value)} options={withSelectFallback(options?.energies, ENERGY_OPTIONS)} placeholder="Sélectionner une énergie..." />{error('energie')}</label>)}
                    {tariffField('puissance_cv', <label className={labelClass}>Puissance (CV) *<Input type="number" min={1} max={99} value={vehicleDraft.puissance_cv} onChange={(event) => setVehicleField('puissance_cv', event.target.value)} className={inputClass} />{error('puissance_cv')}</label>)}
                    {tariffField('zone_circulation', <label className={labelClass}>Zone *<SearchableSelect value={vehicleDraft.zone_id} onChange={(value) => setVehicleField('zone_id', value)} options={(bootstrap?.zones ?? []).filter((item) => item.is_active).map((item) => ({ value: item.id, label: item.zone_description || item.label }))} />{error('zone_id')}</label>)}
                  </div>
                )}
                <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700">
                  <input type="checkbox" checked={vehicleDraft.has_trailer} onChange={(event) => setVehicleField('has_trailer', event.target.checked)} />
                  Véhicule avec remorque
                </label>
              </section>
            )}

            {step === 2 && (
              <section className="space-y-6">
                <h2 className="text-xl font-black text-slate-900">Contrat et conducteur</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className={labelClass}>Produit
                    <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-700">
                      CAT1 — Mono-véhicule
                    </div>
                  </div>
                  <label className={labelClass}>Souscription<SearchableSelect value={subscriptionType} onChange={setSubscriptionType} options={[{ value: 'AFFAIRE_NOUVELLE', label: 'Affaire nouvelle' }, { value: 'RENOUVELLEMENT', label: 'Renouvellement' }, { value: 'AVENANT', label: 'Avenant' }]} /></label>
                  <label className={labelClass}>Durée *<SearchableSelect value={durationId} onChange={setDurationId} options={(bootstrap?.durations ?? []).map((duration) => ({ value: duration.id, label: duration.label }))} />{error('duration_id')}</label>
                  <label className={labelClass}>Date d’effet *<Input type="date" value={dateEffet} onChange={(event) => setDateEffet(event.target.value)} className={inputClass} />{error('date_effet')}</label>
                </div>
                <DriverFields
                  driverType={driverType}
                  values={driver}
                  errors={errors}
                  onTypeChange={(value) => {
                    setDriverType(value)
                    if (value === 'AUTRE') {
                      setDriver((current) => ({
                        conducteur_permis_cat: current.conducteur_permis_cat,
                        conducteur_permis_num: current.conducteur_permis_num,
                        conducteur_permis_date: current.conducteur_permis_date,
                      }))
                    }
                  }}
                  onChange={setDriverField}
                />
                <GuaranteeChoices options={withSelectFallback(options?.garanties, GUARANTEE_OPTIONS)} value={guarantees} onChange={setGuarantees} />
              </section>
            )}

            {step === 3 && quote && (
              <section className="space-y-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Devis backend</h2>
                  <p className="mt-1 text-sm text-slate-500">{selectedClient?.full_name} · {selectedVehicle?.marque} {selectedVehicle?.modele}</p>
                </div>
                <QuoteDetailsAndGuarantees
                  breakdown={quote.breakdown}
                  lineItems={quote.line_items}
                  insurerName={quote.insurer_name || quote.best_insurer_name}
                  total={quote.total}
                  comparison={quote.comparison}
                  selectedInsurerId={quote.insurer_id}
                  onSelectInsurer={(insurerId) => quoteMutation.mutate(insurerId)}
                />
              </section>
            )}

            <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row">
              <Button type="button" variant="outline" disabled={step === 0 || busy} onClick={() => setStep((current) => current - 1)} className="min-h-11">
                <ChevronLeft className="h-4 w-4" /> Précédent
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" isLoading={quoteMutation.isPending} disabled={busy} onClick={next} className="min-h-11 bg-blue-700 hover:bg-blue-800">
                  {!quoteMutation.isPending && <ChevronRight className="h-4 w-4" />}
                  Suivant
                </Button>
              ) : (
                <Button type="button" disabled={busy || !quote} onClick={() => createMutation.mutate()} className="min-h-11 bg-emerald-700 hover:bg-emerald-800">
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Créer le contrat
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function NewContractPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>}>
      <NewContractFormContent />
    </Suspense>
  )
}
