'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import {
  settingsApi,
  type PricingSettings,
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
import { InsurersPanelContent } from '@/components/dashboard/InsurersPanel'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Settings, Save, Loader2, RotateCcw } from 'lucide-react'
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
