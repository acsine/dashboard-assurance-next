'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import {
  settingsApi,
  insurersApi,
  type PricingSettings,
  type Insurer,
  type InsurerPolicy,
} from '@/lib/api/mobi-assur'
import {
  CategoriesPanel,
  DurationsPanel,
  FeeSchedulePanel,
  ProductLineTariffPanel,
  RcTariffPanel,
  ValidationCodePanel,
  ZonesPanel,
} from '@/components/dashboard/cima-settings'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Settings, Save, Loader2, Plus, RotateCcw, Upload } from 'lucide-react'
import { RoleGuard } from '@/components/auth/RoleGuard'

type SettingsTab =
  | 'pricing'
  | 'categories'
  | 'zones'
  | 'durations'
  | 'rc'
  | 'fees'
  | 'branches'
  | 'validation'
  | 'insurers'

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'pricing', label: 'Tarification agent' },
  { id: 'insurers', label: 'Assureurs' },
  { id: 'categories', label: 'Catégories CIMA' },
  { id: 'zones', label: 'Zones' },
  { id: 'durations', label: 'Durées' },
  { id: 'rc', label: 'Barème RC' },
  { id: 'fees', label: 'Frais légaux' },
  { id: 'branches', label: 'Santé / Voyage' },
  { id: 'validation', label: 'Code validation' },
]

const DEFAULT_GUIDE =
  '1. Identifiez le type de véhicule et son usage.\n' +
  '2. Vérifiez puissance fiscale, valeur et zone de circulation.\n' +
  '3. Utilisez l’estimation officielle avant toute proposition.\n' +
  '4. Ne promettez jamais un tarif avant validation du dossier.'

function InsurersPanelContent() {
  const [insurers, setInsurers] = useState<Insurer[]>([])
  const [policy, setPolicy] = useState<InsurerPolicy>({ mode: 'AUTO', selected_insurer_id: null })
  const [isLoadingInsurers, setIsLoadingInsurers] = useState(false)
  const [newInsurerCode, setNewInsurerCode] = useState('')
  const [newInsurerName, setNewInsurerName] = useState('')
  const [newInsurerLine, setNewInsurerLine] = useState<'AUTO' | 'SANTE' | 'VOYAGE' | 'AUTRE'>('AUTO')
  const [pickingInsurerId, setPickingInsurerId] = useState<string | null>(null)
  const [importingInsurerId, setImportingInsurerId] = useState<string | null>(null)
  const [lastImportSummary, setLastImportSummary] = useState<string | null>(null)
  const [lastImportedInsurerId, setLastImportedInsurerId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingInsurerIdRef = useRef<string | null>(null)

  const queryClient = useQueryClient()

  useEffect(() => {
    ;(async () => {
      setIsLoadingInsurers(true)
      try {
        const [data, pol] = await Promise.all([
          insurersApi.list(),
          insurersApi.getPolicy(),
        ])
        setInsurers(Array.isArray(data) ? data : [])
        if (pol) setPolicy(pol)
      } catch {
        toast.error('Erreur lors du chargement des assureurs')
      } finally {
        setIsLoadingInsurers(false)
      }
    })()
  }, [])

  // Quand le dialogue fichier se ferme (focus fenêtre), on retire le spinner « ouverture ».
  useEffect(() => {
    const onFocus = () => {
      window.setTimeout(() => setPickingInsurerId(null), 250)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const createInsurerMutation = useMutation({
    mutationFn: ({
      code,
      name,
      product_line,
    }: {
      code: string
      name: string
      product_line: 'AUTO' | 'SANTE' | 'VOYAGE' | 'AUTRE'
    }) => insurersApi.create({ code, name, product_line, is_active: true }),
    onSuccess: (newInsurer) => {
      setInsurers([...insurers, newInsurer])
      setNewInsurerCode('')
      setNewInsurerName('')
      setNewInsurerLine('AUTO')
      toast.success('Assureur créé avec succès')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la création')
    },
  })

  const toggleInsurerMutation = useMutation({
    mutationFn: ({
      id,
      is_active,
      code,
      name,
      product_line,
    }: {
      id: string
      is_active: boolean
      code: string
      name: string
      product_line?: Insurer['product_line']
    }) => insurersApi.update(id, { code, name, is_active, product_line: product_line || 'AUTO' }),
    onSuccess: (updated) => {
      setInsurers((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
      toast.success("Statut de l'assureur mis à jour")
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la mise à jour')
    },
  })

  const policyMutation = useMutation({
    mutationFn: (data: InsurerPolicy) => insurersApi.setPolicy(data),
    onSuccess: (data) => {
      setPolicy(data)
      toast.success('Politique tarifaire mise à jour')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur politique')
    },
  })

  const importTariffMutation = useMutation({
    mutationFn: ({ insurerId, file }: { insurerId: string; file: File }) =>
      insurersApi.importTariff(insurerId, file),
    onSuccess: (result, variables) => {
      const data = (result && typeof result === 'object' ? result : {}) as Record<string, unknown>
      const created = data.created ?? 0
      const updated = data.updated ?? 0
      const applied = data.applied_as_defaults === true
      const warnings = Array.isArray(data.warnings) ? data.warnings : []
      const sheets = Array.isArray(data.sheets_parsed) ? data.sheets_parsed : []
      const summary = [
        `créées=${created}`,
        `mises à jour=${updated}`,
        sheets.length ? `feuilles=${sheets.join(',')}` : null,
        applied ? 'appliqué comme défauts agence' : null,
        warnings.length ? `alertes=${warnings.length}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
      setLastImportedInsurerId(variables.insurerId)
      setLastImportSummary(summary || 'Tarif importé')
      queryClient.invalidateQueries({ queryKey: ['tariff-lines'] })
      queryClient.invalidateQueries({ queryKey: ['tariff-categories'] })
      queryClient.invalidateQueries({ queryKey: ['tariff-zones'] })
      queryClient.invalidateQueries({ queryKey: ['fee-schedule'] })
      queryClient.invalidateQueries({ queryKey: ['pricing-settings'] })
      queryClient.invalidateQueries({ queryKey: ['insurers'] })
      toast.success(
        applied
          ? 'Tarif importé et appliqué comme paramètres par défaut'
          : 'Tarif Excel importé avec succès',
      )
      if (warnings.length > 0) {
        toast.message(String(warnings[0]))
      }
    },
    onError: (err: any, variables) => {
      const msg =
        typeof err?.message === 'string'
          ? err.message
          : typeof err?.detail === 'string'
            ? err.detail
            : "Erreur lors de l'import du tarif"
      setLastImportedInsurerId(variables.insurerId)
      toast.error(msg)
      setLastImportSummary(`Échec : ${msg}`)
    },
    onSettled: () => {
      setImportingInsurerId(null)
      pendingInsurerIdRef.current = null
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
  })

  const openFilePicker = async (insurerId: string) => {
    if (importTariffMutation.isPending || pickingInsurerId) return
    pendingInsurerIdRef.current = insurerId
    setPickingInsurerId(insurerId)
    setLastImportSummary(null)
    // Laisse le temps au spinner de s’afficher avant la boîte de dialogue OS.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })
    await new Promise((r) => setTimeout(r, 80))
    fileInputRef.current?.click()
  }

  const handleFileSelected = (file: File | null) => {
    const insurerId = pendingInsurerIdRef.current
    setPickingInsurerId(null)
    if (!file || !insurerId) {
      pendingInsurerIdRef.current = null
      return
    }
    setImportingInsurerId(insurerId)
    importTariffMutation.mutate({ insurerId, file })
  }

  const handleCreateInsurer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newInsurerCode.trim() || !newInsurerName.trim()) {
      toast.error('Veuillez remplir tous les champs')
      return
    }
    createInsurerMutation.mutate({
      code: newInsurerCode,
      name: newInsurerName,
      product_line: newInsurerLine,
    })
  }

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => {
          handleFileSelected(e.target.files?.[0] ?? null)
        }}
      />

      {importingInsurerId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/35 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-6 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm font-semibold text-slate-700">Import du tarif Excel…</p>
            <p className="text-xs text-slate-500">Veuillez patienter pendant le traitement.</p>
          </div>
        </div>
      )}

      {isLoadingInsurers ? (
        <div className="py-8 text-center text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500 mb-2" />
          Chargement des assureurs...
        </div>
      ) : (
        <>
          <div className="p-4 border border-blue-100 rounded-lg bg-blue-50/40 space-y-3">
            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider">
              Politique tarifaire globale
            </h4>
            <p className="text-xs text-gray-600">
              AUTO = meilleur PTTC parmi les assureurs actifs. MANUEL = forcer une compagnie pour tous les devis.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={policy.mode === 'AUTO' ? 'default' : 'outline'}
                onClick={() =>
                  policyMutation.mutate({ mode: 'AUTO', selected_insurer_id: null })
                }
              >
                AUTO — meilleur prix
              </Button>
              <Button
                type="button"
                size="sm"
                variant={policy.mode === 'MANUAL' ? 'default' : 'outline'}
                onClick={() => {
                  const first = insurers.find((i) => i.is_active)
                  if (!first) {
                    toast.error('Créez d’abord un assureur actif')
                    return
                  }
                  policyMutation.mutate({
                    mode: 'MANUAL',
                    selected_insurer_id: first.id,
                  })
                }}
              >
                MANUEL
              </Button>
            </div>
            {policy.mode === 'MANUAL' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {insurers.filter((i) => i.is_active).map((ins) => (
                  <button
                    key={ins.id}
                    type="button"
                    onClick={() =>
                      policyMutation.mutate({
                        mode: 'MANUAL',
                        selected_insurer_id: ins.id,
                      })
                    }
                    className={`text-left p-3 rounded border text-xs ${
                      policy.selected_insurer_id === ins.id
                        ? 'border-blue-500 bg-blue-50 font-semibold'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    {ins.name}
                    <div className="text-gray-400">{ins.code}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleCreateInsurer} className="p-4 border border-gray-100 rounded-lg bg-gray-50/30 space-y-3">
            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Ajouter un Assureur</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                placeholder="Code"
                value={newInsurerCode}
                onChange={(e) => setNewInsurerCode(e.target.value)}
                className="h-10 text-xs border-gray-200"
              />
              <Input
                placeholder="Nom"
                value={newInsurerName}
                onChange={(e) => setNewInsurerName(e.target.value)}
                className="h-10 text-xs border-gray-200"
              />
              <select
                value={newInsurerLine}
                onChange={(e) =>
                  setNewInsurerLine(e.target.value as 'AUTO' | 'SANTE' | 'VOYAGE' | 'AUTRE')
                }
                className="h-10 text-xs border border-gray-200 rounded-md px-2 bg-white"
              >
                <option value="AUTO">Automobile</option>
                <option value="SANTE">Santé</option>
                <option value="VOYAGE">Voyage</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={createInsurerMutation.isPending}
              isLoading={createInsurerMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-1" /> Créer
            </Button>
          </form>

          <div className="space-y-3">
            {insurers.map((insurer) => (
              <div
                key={insurer.id}
                className="p-4 border border-gray-100 rounded-lg bg-white space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-sm text-gray-900">{insurer.name}</h5>
                    <span className="text-xs text-gray-400">
                      {insurer.code} · {insurer.product_line || 'AUTO'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      toggleInsurerMutation.mutate({
                        id: insurer.id,
                        code: insurer.code,
                        name: insurer.name,
                        product_line: insurer.product_line || 'AUTO',
                        is_active: !insurer.is_active,
                      })
                    }
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      insurer.is_active
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {insurer.is_active ? 'Actif' : 'Inactif'}
                  </button>
                </div>

                <div className="pt-3 border-t border-gray-50 space-y-2">
                  {(insurer.product_line || 'AUTO') === 'AUTO' ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      isLoading={
                        pickingInsurerId === insurer.id || importingInsurerId === insurer.id
                      }
                      disabled={
                        !!pickingInsurerId ||
                        !!importingInsurerId ||
                        importTariffMutation.isPending
                      }
                      onClick={() => openFilePicker(insurer.id)}
                      className="text-xs"
                    >
                      {pickingInsurerId === insurer.id ? (
                        <>Ouverture du sélecteur…</>
                      ) : importingInsurerId === insurer.id ? (
                        <>Import en cours…</>
                      ) : (
                        <>
                          <Upload className="h-3.5 w-3.5 mr-1" /> Importer Tarif Excel (.xlsx)
                        </>
                      )}
                    </Button>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Branche {insurer.product_line} — tarifs dans l’onglet Santé / Voyage.
                    </p>
                  )}
                  {lastImportedInsurerId === insurer.id && lastImportSummary && (
                    <p className="text-[10px] text-slate-500 break-all leading-relaxed">
                      {lastImportSummary}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {insurers.length === 0 && (
              <div className="py-8 text-center text-gray-400">
                <p className="text-sm">Aucun assureur créé</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function SettingsContent() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<SettingsTab>('pricing')

  const [accessoires, setAccessoires] = useState('2500')
  const [asac, setAsac] = useState('1000')
  const [fga, setFga] = useState('50000')
  const [cr, setCr] = useState('1000')
  const [tva, setTva] = useState('19.25')
  const [commissionRate, setCommissionRate] = useState('10')
  const [guideContent, setGuideContent] = useState(DEFAULT_GUIDE)

  const { data: pricing, isLoading } = useQuery({
    queryKey: ['pricing-settings'],
    queryFn: () => settingsApi.getPricing(),
  })

  useEffect(() => {
    if (!pricing) return
    if (pricing.accessoires !== undefined) setAccessoires(String(pricing.accessoires))
    if (pricing.asac !== undefined) setAsac(String(pricing.asac))
    if (pricing.dta !== undefined) setFga(String(pricing.dta))
    if (pricing.carte_rose_fee !== undefined) setCr(String(pricing.carte_rose_fee))
    if (pricing.tva_rate !== undefined) setTva(String(Number(pricing.tva_rate) * 100))
    if (pricing.commission_rate !== undefined) {
      setCommissionRate(String(Number(pricing.commission_rate) * 100))
    }
    if (pricing.guide_content) setGuideContent(pricing.guide_content)
  }, [pricing])

  const buildPayload = (): Partial<PricingSettings> => ({
    accessoires: Number(accessoires),
    asac: Number(asac),
    dta: Number(fga),
    carte_rose_fee: Number(cr),
    tva_rate: Number(tva) / 100,
    commission_rate: Number(commissionRate) / 100,
    guide_content: guideContent,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload()
      try {
        return await settingsApi.updatePricing(payload)
      } catch {
        return settingsApi.createPricing(payload)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-settings'] })
      toast.success('Paramètres de tarification enregistrés')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la sauvegarde')
    },
  })

  const resetMutation = useMutation({
    mutationFn: async () => {
      try {
        await settingsApi.deletePricing()
      } catch {
        // déjà sur défauts
      }
      return settingsApi.createPricing({
        accessoires: 2500,
        asac: 1000,
        dta: 50000,
        carte_rose_fee: 1000,
        tva_rate: 0.1925,
        commission_rate: 0.1,
        guide_content: DEFAULT_GUIDE,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-settings'] })
      toast.success('Tarification réinitialisée aux valeurs par défaut')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la réinitialisation')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <Header
        title="Paramètres de tarification"
        subtitle="Guide agent, assureurs, zones CIMA A/B/C, frais légaux et code de validation."
      />

      <div className="px-8 pt-6">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8 space-y-6 max-w-5xl flex-1">
        {activeTab === 'pricing' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Guide */}
          <Card className="border-gray-100 shadow-sm bg-white">
            <CardHeader className="pb-4 border-b border-gray-50">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400">
                Guide de tarification (agents)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                Contenu affiché dans l’application mobile
              </label>
              <textarea
                value={guideContent}
                onChange={(e) => setGuideContent(e.target.value)}
                rows={6}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={DEFAULT_GUIDE}
              />
              <p className="text-[11px] text-slate-500">
                Les primes viennent des barèmes Excel importés par assureur (catégorie × puissance ×
                durée × zone A/B/C). Le taux de base et le multiplicateur CV ne sont plus utilisés.
              </p>
            </CardContent>
          </Card>

          {/* Frais */}
          <Card className="border-gray-100 shadow-sm bg-white">
            <CardHeader className="pb-4 border-b border-gray-50 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <Settings className="h-4 w-4 text-blue-500" /> Frais & commissions
              </CardTitle>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Frais Accessoires (FCFA)
                  </label>
                  <Input
                    type="number"
                    value={accessoires}
                    onChange={(e) => setAccessoires(e.target.value)}
                    className="h-11 text-xs border-gray-200"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Taxe ASAC (FCFA)
                  </label>
                  <Input
                    type="number"
                    value={asac}
                    onChange={(e) => setAsac(e.target.value)}
                    className="h-11 text-xs border-gray-200"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    DTA / FGA (FCFA)
                  </label>
                  <Input
                    type="number"
                    value={fga}
                    onChange={(e) => setFga(e.target.value)}
                    className="h-11 text-xs border-gray-200"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Carte Rose (FCFA)
                  </label>
                  <Input
                    type="number"
                    value={cr}
                    onChange={(e) => setCr(e.target.value)}
                    className="h-11 text-xs border-gray-200"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    TVA (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={tva}
                    onChange={(e) => setTva(e.target.value)}
                    className="h-11 text-xs border-gray-200"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Commission agent (%)
                  </label>
                  <Input
                    type="number"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    className="h-11 text-xs border-gray-200"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending || saveMutation.isPending}
              className="flex items-center gap-2"
            >
              {resetMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Réinitialiser aux défauts
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={saveMutation.isPending || resetMutation.isPending}
              className="text-white flex items-center gap-2 font-semibold"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </form>
        )}

        {activeTab === 'insurers' && (
          <Card className="border-gray-100 shadow-sm bg-white">
            <CardHeader className="pb-4 border-b border-gray-50">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <Settings className="h-4 w-4 text-blue-500" /> Gestion des Assureurs
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <InsurersPanelContent />
            </CardContent>
          </Card>
        )}

        {activeTab === 'categories' && <CategoriesPanel />}
        {activeTab === 'zones' && <ZonesPanel />}
        {activeTab === 'durations' && <DurationsPanel />}
        {activeTab === 'rc' && <RcTariffPanel />}
        {activeTab === 'fees' && <FeeSchedulePanel />}
        {activeTab === 'branches' && <ProductLineTariffPanel />}
        {activeTab === 'validation' && <ValidationCodePanel />}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <RoleGuard permission="settings:manage">
      <SettingsContent />
    </RoleGuard>
  )
}
