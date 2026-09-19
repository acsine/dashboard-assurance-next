'use client'

import { useState } from 'react'
import type { CountryCode } from 'libphonenumber-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from '@/i18n/navigation'
import {
  clientsApi,
  formOptionsApi,
  tariffApi,
  type CreateDossierRequest,
  type DriverType,
  type QuoteComputeResult,
} from '@/lib/api/mobi-assur'
import {
  durationMonthsToDays,
  validateContractStep,
  validateInsuredStep,
  validateVehicleStep,
  type DriverFields as DriverValues,
  type ValidationErrors,
} from '@/lib/schemas/client-form'
import { parseValidPhone, DEFAULT_PHONE_COUNTRY } from '@/lib/phone'
import {
  CAMEROON_CITY_OPTIONS,
  ENERGY_OPTIONS,
  GENRE_OPTIONS,
  GUARANTEE_OPTIONS,
  USAGE_OPTIONS,
  withSelectFallback,
} from '@/lib/cameroon-cities'
import Header from '@/components/dashboard/Header'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PhoneField } from '@/components/ui/phone-field'
import SearchableSelect from '@/components/ui/searchable-select'
import QuoteDetailsAndGuarantees from '@/components/insurance/QuoteDetailsAndGuarantees'
import { DriverFields } from '@/components/insurance/DriverFields'
import { GuaranteeChoices } from '@/components/insurance/GuaranteeChoices'
import { WizardSteps } from '@/components/insurance/WizardSteps'

const STEPS = ['Assuré', 'Véhicule', 'Contrat & conducteur', 'Pièces', 'Récapitulatif'] as const
const labelClass = 'space-y-1 text-xs font-bold text-slate-600'
const inputClass = 'h-11 text-xs'

interface FormState {
  full_name: string
  country_code: CountryCode
  phone: string
  email: string
  address: string
  city: string
  profession: string
  cni_number: string
  date_naissance: string
  sexe: 'MASCULIN' | 'FEMININ'
  marque: string
  modele: string
  chassis_num: string
  immatriculation: string
  energie: string
  puissance_cv: string
  nb_places: string
  date_mise_circulation: string
  usage: string
  genre: string
  category_id: string
  has_trailer: boolean
  zone_id: string
  duration_id: string
  subscription_type: string
  date_effet: string
  driver_type: DriverType
  driver: DriverValues
  guarantees: Record<string, boolean>
}

const initialForm: FormState = {
  full_name: '',
  country_code: DEFAULT_PHONE_COUNTRY,
  phone: '',
  email: '',
  address: '',
  city: '',
  profession: '',
  cni_number: '',
  date_naissance: '',
  sexe: 'MASCULIN',
  marque: '',
  modele: '',
  chassis_num: '',
  immatriculation: '',
  energie: 'ESSENCE',
  puissance_cv: '',
  nb_places: '5',
  date_mise_circulation: '',
  usage: '',
  genre: '',
  category_id: '',
  has_trailer: false,
  zone_id: '',
  duration_id: '',
  subscription_type: 'AFFAIRE_NOUVELLE',
  date_effet: new Date().toISOString().slice(0, 10),
  driver_type: 'ASSURE',
  driver: {},
  guarantees: { RC: true, DR: true },
}

function NewClientContent() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [cniFile, setCniFile] = useState<File | null>(null)
  const [permisFile, setPermisFile] = useState<File | null>(null)
  const [quote, setQuote] = useState<QuoteComputeResult | null>(null)

  const { data: options, isLoading: loadingOptions } = useQuery({
    queryKey: ['form-options'],
    queryFn: formOptionsApi.get,
  })
  const { data: bootstrap, isLoading: loadingBootstrap } = useQuery({
    queryKey: ['tariff-bootstrap'],
    queryFn: tariffApi.bootstrap,
  })

  const selectedZone = bootstrap?.zones.find((item) => item.id === form.zone_id)
  const selectedDuration = bootstrap?.durations.find((item) => item.id === form.duration_id)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const setDriver = (key: keyof DriverValues, value: string) =>
    setForm((current) => ({ ...current, driver: { ...current.driver, [key]: value } }))

  const chooseDriverType = (driverType: DriverType) => {
    setForm((current) => ({
      ...current,
      driver_type: driverType,
      driver:
        driverType === 'ASSURE'
          ? {
              ...current.driver,
              conducteur_nom: current.full_name,
              conducteur_date_naissance: current.date_naissance,
            }
          : {
              conducteur_permis_cat: current.driver.conducteur_permis_cat,
              conducteur_permis_num: current.driver.conducteur_permis_num,
              conducteur_permis_date: current.driver.conducteur_permis_date,
            },
    }))
  }

  const quoteMutation = useMutation({
    mutationFn: (insurerId?: string) =>
      tariffApi.computeQuote({
        category_id: form.category_id,
        zone_id: form.zone_id,
        duration_id: form.duration_id,
        fuel: form.energie,
        power_cv: Number(form.puissance_cv),
        trailer: form.has_trailer,
        include_dr: !!form.guarantees.DR,
        include_ipt: !!form.guarantees.INDIV_ACC,
        insurer_id: insurerId,
      }),
    onSuccess: setQuote,
    onError: (error: Error) => toast.error(error.message || 'Calcul du devis impossible'),
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!quote || quote.total <= 0 || !selectedZone || !selectedDuration) {
        throw new Error('Un devis backend valide est requis')
      }
      const parsedPhone = parseValidPhone(form.phone, form.country_code)
      if (!parsedPhone) throw new Error('Numéro de téléphone invalide')

      let cniPhotoUrl: string | undefined
      let permisPhotoUrl: string | undefined
      if (cniFile) cniPhotoUrl = (await clientsApi.uploadDoc(cniFile)).url
      if (permisFile) permisPhotoUrl = (await clientsApi.uploadDoc(permisFile)).url

      const payload: CreateDossierRequest = {
        client: {
          full_name: form.full_name.trim(),
          country_code: parsedPhone.country,
          phone: parsedPhone.e164,
          email: form.email.trim() || undefined,
          address: form.address.trim() || undefined,
          city: form.city.trim() || undefined,
          profession: form.profession.trim() || undefined,
          cni_number: form.cni_number.trim() || undefined,
          date_naissance: form.date_naissance,
          sexe: form.sexe,
          cni_photo_url: cniPhotoUrl,
          permis_photo_url: permisPhotoUrl,
          vehicle: {
            marque: form.marque.trim(),
            modele: form.modele.trim() || undefined,
            chassis_num: form.chassis_num.replace(/\s/g, '').toUpperCase(),
            immatriculation: form.immatriculation.replace(/\s/g, '').toUpperCase() || undefined,
            energie: form.energie,
            puissance_cv: Number(form.puissance_cv),
            nb_places: Number(form.nb_places) || undefined,
            date_mise_circulation: form.date_mise_circulation || undefined,
            usage: form.usage,
            genre: form.genre,
            zone_circulation: selectedZone.code,
            category_id: form.category_id,
            has_trailer: form.has_trailer,
          },
        },
        contract: {
          quote_id: quote.quote_id,
          product_type: 'CAT1',
          product_line: 'AUTO',
          subscription_type: form.subscription_type,
          zone_circulation: selectedZone.code,
          date_effet: new Date(`${form.date_effet}T00:00:00Z`).toISOString(),
          duree_jours: durationMonthsToDays(selectedDuration.months),
          driver_type: form.driver_type,
          conducteur_nom: form.driver.conducteur_nom!,
          conducteur_date_naissance: form.driver.conducteur_date_naissance!,
          conducteur_permis_cat: form.driver.conducteur_permis_cat!,
          conducteur_permis_num: form.driver.conducteur_permis_num!,
          conducteur_permis_date: form.driver.conducteur_permis_date!,
          vehicles: [
            {
              guarantees: Object.fromEntries(
                Object.entries(form.guarantees).filter(([, enabled]) => enabled),
              ),
            },
          ],
          insurer_id: quote.insurer_id,
          category_id: form.category_id,
          zone_id: form.zone_id,
        },
      }
      return clientsApi.createDossier(payload)
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      toast.success('Dossier client créé')
      router.push(`/dashboard/clients/${result.client.id}`)
    },
    onError: (error: Error) => toast.error(error.message || 'Création du dossier impossible'),
  })

  const validateCurrent = () => {
    let nextErrors: ValidationErrors = {}
    if (step === 0) {
      nextErrors = validateInsuredStep(form)
      if (!parseValidPhone(form.phone, form.country_code)) {
        nextErrors.phone = 'Numéro de téléphone invalide'
      }
    } else if (step === 1) {
      nextErrors = validateVehicleStep(form)
    } else if (step === 2) {
      const driver =
        form.driver_type === 'ASSURE'
          ? {
              ...form.driver,
              conducteur_nom: form.full_name,
              conducteur_date_naissance: form.date_naissance,
            }
          : form.driver
      nextErrors = validateContractStep({ ...form, ...driver })
      if (Object.keys(nextErrors).length === 0 && form.driver_type === 'ASSURE') {
        setForm((current) => ({ ...current, driver }))
      }
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      toast.error('Corrigez les champs signalés')
      return false
    }
    return true
  }

  const next = async () => {
    if (!validateCurrent()) return
    if (step === 3) {
      try {
        await quoteMutation.mutateAsync(undefined)
      } catch {
        return
      }
    }
    setStep((current) => Math.min(STEPS.length - 1, current + 1))
  }

  const fieldError = (key: string) =>
    errors[key] ? <span className="block text-[11px] font-medium text-red-600">{errors[key]}</span> : null

  const busy = loadingOptions || loadingBootstrap || quoteMutation.isPending || createMutation.isPending

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-slate-50/60">
      <Header title="Nouveau dossier client" subtitle="Création guidée de l’assuré, du véhicule et du devis" />
      <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-8">
        <Breadcrumb items={[{ label: 'Clients', href: '/dashboard/clients' }, { label: 'Nouveau dossier' }]} />
        <WizardSteps steps={STEPS} current={step} />
        <Card className="rounded-3xl border-slate-200 shadow-lg">
          <CardContent className="space-y-6 p-5 sm:p-8">
            {step === 0 && (
              <section className="space-y-5">
                <h2 className="text-xl font-black text-slate-900">Informations de l’assuré</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={`${labelClass} sm:col-span-2`}>Nom complet *
                    <Input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} className={inputClass} aria-invalid={!!errors.full_name} />
                    {fieldError('full_name')}
                  </label>
                  <label className={labelClass}>Téléphone *
                    <PhoneField value={form.phone} onChange={(value) => set('phone', value)} country={form.country_code} onCountryChange={(value) => set('country_code', value)} required />
                    {fieldError('phone')}
                  </label>
                  <label className={labelClass}>E-mail
                    <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass} aria-invalid={!!errors.email} />
                    {fieldError('email')}
                  </label>
                  <label className={labelClass}>Date de naissance *
                    <Input type="date" value={form.date_naissance} onChange={(e) => set('date_naissance', e.target.value)} className={inputClass} aria-invalid={!!errors.date_naissance} />
                    {fieldError('date_naissance')}
                  </label>
                  <label className={labelClass}>Sexe
                    <SearchableSelect value={form.sexe} onChange={(value) => set('sexe', value as FormState['sexe'])} options={[{ value: 'MASCULIN', label: 'Masculin' }, { value: 'FEMININ', label: 'Féminin' }]} />
                  </label>
                  {(['profession', 'cni_number'] as const).map((key) => (
                    <label key={key} className={labelClass}>{({ profession: 'Profession', cni_number: 'N° CNI / Passeport' })[key]}
                      <Input value={form[key]} onChange={(e) => set(key, e.target.value)} className={inputClass} />
                    </label>
                  ))}
                  <label className={labelClass}>Ville
                    <SearchableSelect
                      value={form.city}
                      onChange={(value) => set('city', value)}
                      options={withSelectFallback(options?.cities, CAMEROON_CITY_OPTIONS)}
                      placeholder="Rechercher une ville du Cameroun..."
                    />
                  </label>
                  <label className={labelClass}>Adresse
                    <Input value={form.address} onChange={(e) => set('address', e.target.value)} className={inputClass} />
                  </label>
                </div>
              </section>
            )}

            {step === 1 && (
              <section className="space-y-5">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Véhicule à assurer</h2>
                  <p className="mt-1 text-xs text-slate-500">Produit CAT1 mono-véhicule</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={labelClass}>Marque *<Input value={form.marque} onChange={(e) => set('marque', e.target.value)} className={inputClass} />{fieldError('marque')}</label>
                  <label className={labelClass}>Modèle<Input value={form.modele} onChange={(e) => set('modele', e.target.value)} className={inputClass} /></label>
                  <label className={labelClass}>N° châssis (VIN) *<Input maxLength={17} value={form.chassis_num} onChange={(e) => set('chassis_num', e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 17))} className={inputClass} />{fieldError('chassis_num')}</label>
                  <label className={labelClass}>Immatriculation<Input value={form.immatriculation} onChange={(e) => set('immatriculation', e.target.value)} className={inputClass} /></label>
                  <label className={labelClass}>Catégorie tarifaire *<SearchableSelect value={form.category_id} onChange={(value) => set('category_id', value)} options={(bootstrap?.categories ?? []).filter((item) => item.is_active).map((item) => ({ value: item.id, label: `${item.code} — ${item.name}` }))} />{fieldError('category_id')}</label>
                  <label className={labelClass}>Énergie *<SearchableSelect value={form.energie} onChange={(value) => set('energie', value)} options={withSelectFallback(options?.energies, ENERGY_OPTIONS)} placeholder="Sélectionner une énergie..." />{fieldError('energie')}</label>
                  <label className={labelClass}>Puissance (CV) *<Input type="number" min={1} max={99} value={form.puissance_cv} onChange={(e) => set('puissance_cv', e.target.value)} className={inputClass} />{fieldError('puissance_cv')}</label>
                  <label className={labelClass}>Nombre de places<Input type="number" min={1} max={99} value={form.nb_places} onChange={(e) => set('nb_places', e.target.value)} className={inputClass} /></label>
                  <label className={labelClass}>Usage *<SearchableSelect value={form.usage} onChange={(value) => set('usage', value)} options={withSelectFallback(options?.usages, USAGE_OPTIONS)} placeholder="Sélectionner un usage..." />{fieldError('usage')}</label>
                  <label className={labelClass}>Genre *<SearchableSelect value={form.genre} onChange={(value) => set('genre', value)} options={withSelectFallback(options?.genres, GENRE_OPTIONS)} placeholder="Sélectionner un genre..." />{fieldError('genre')}</label>
                  <label className={labelClass}>1ère mise en circulation<Input type="date" value={form.date_mise_circulation} onChange={(e) => set('date_mise_circulation', e.target.value)} className={inputClass} /></label>
                  <label className="flex min-h-11 items-center gap-3 self-end rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700">
                    <input type="checkbox" checked={form.has_trailer} onChange={(e) => set('has_trailer', e.target.checked)} />
                    Véhicule avec remorque
                  </label>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="space-y-6">
                <h2 className="text-xl font-black text-slate-900">Contrat et conducteur</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={labelClass}>Type de souscription<SearchableSelect value={form.subscription_type} onChange={(value) => set('subscription_type', value)} options={[{ value: 'AFFAIRE_NOUVELLE', label: 'Affaire nouvelle' }, { value: 'RENOUVELLEMENT', label: 'Renouvellement' }, { value: 'AVENANT', label: 'Avenant' }]} /></label>
                  <label className={labelClass}>Zone de circulation *<SearchableSelect value={form.zone_id} onChange={(value) => set('zone_id', value)} options={(bootstrap?.zones ?? []).filter((item) => item.is_active).map((item) => ({ value: item.id, label: item.zone_description || item.label }))} />{fieldError('zone_id')}</label>
                  <label className={labelClass}>Durée *<SearchableSelect value={form.duration_id} onChange={(value) => set('duration_id', value)} options={(bootstrap?.durations ?? []).map((item) => ({ value: item.id, label: item.label }))} />{fieldError('duration_id')}</label>
                  <label className={labelClass}>Date d’effet *<Input type="date" value={form.date_effet} onChange={(e) => set('date_effet', e.target.value)} className={inputClass} />{fieldError('date_effet')}</label>
                </div>
                <DriverFields driverType={form.driver_type} values={form.driver} errors={errors} onTypeChange={chooseDriverType} onChange={setDriver} />
                <GuaranteeChoices options={withSelectFallback(options?.garanties, GUARANTEE_OPTIONS)} value={form.guarantees} onChange={(value) => set('guarantees', value)} />
              </section>
            )}

            {step === 3 && (
              <section className="space-y-5">
                <h2 className="text-xl font-black text-slate-900">Pièces justificatives</h2>
                <p className="text-sm text-slate-500">Les fichiers sélectionnés seront téléversés avant l’envoi final du dossier.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { label: 'CNI / Passeport', file: cniFile, setter: setCniFile },
                    { label: 'Permis de conduire', file: permisFile, setter: setPermisFile },
                  ].map(({ label, file, setter }) => (
                    <label key={label} className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs font-bold text-slate-600 hover:border-blue-400">
                      <Upload className="h-5 w-5" aria-hidden="true" />
                      <span>{file?.name || label}</span>
                      <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setter(e.target.files?.[0] ?? null)} />
                    </label>
                  ))}
                </div>
              </section>
            )}

            {step === 4 && quote && (
              <section className="space-y-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Récapitulatif et devis</h2>
                  <p className="mt-1 text-sm text-slate-500">{form.full_name} · {form.marque} {form.modele} · CAT1</p>
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
              <Button type="button" variant="outline" disabled={step === 0 || busy} onClick={() => setStep((value) => value - 1)} className="min-h-11">
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
                  Créer le dossier
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function NewClientPage() {
  return (
    <RoleGuard permission="agency:mutate">
      <NewClientContent />
    </RoleGuard>
  )
}
