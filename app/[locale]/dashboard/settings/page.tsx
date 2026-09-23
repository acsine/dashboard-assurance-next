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
  VignetteTariffPanel,
  ValidationCodePanel,
  ZonesPanel,
} from '@/components/dashboard/cima-settings'
import { InsurersPanelContent } from '@/components/dashboard/InsurersPanel'
import { CommissionRatesPanel } from '@/components/dashboard/CommissionRatesPanel'
import Header from '@/components/dashboard/Header'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Settings, Save, Loader2, RotateCcw, Download, FileSpreadsheet } from 'lucide-react'
import { generateExcelTemplate } from '@/lib/excel/import-engine'
import { RoleGuard } from '@/components/auth/RoleGuard'

type SettingsTab =
  | 'pricing'
  | 'commissions'
  | 'categories'
  | 'zones'
  | 'durations'
  | 'rc'
  | 'vignette'
  | 'fees'
  | 'branches'
  | 'validation'
  | 'insurers'

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'pricing', label: 'Tarification agent' },
  { id: 'commissions', label: 'Commissions' },
  { id: 'insurers', label: 'Assureurs' },
  { id: 'categories', label: 'Catégories CIMA' },
  { id: 'zones', label: 'Zones' },
  { id: 'durations', label: 'Durées' },
  { id: 'rc', label: 'Barème RC' },
  { id: 'vignette', label: 'Barème vignette' },
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
  const t = useTranslations('settings')
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
    <div className="flex flex-col gap-8 p-6 md:p-8 bg-slate-50/50 min-h-screen">
      <Header
        title={t('title')}
        subtitle={t('subtitle')}
      />

      {/* Banner Téléchargement Modèle Excel Exemple Tarifs */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-5 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
            <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              Modèle Excel d’Exemple — Tarifs Bethel Insurance
            </h3>
            <p className="text-xs text-emerald-100/90 mt-0.5">
              Téléchargez le fichier Excel modèle pour la saisie et l’importation des grilles et barèmes tarifaires.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => generateExcelTemplate('tariffs')}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shrink-0 cursor-pointer flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Télécharger Modèle Tarifs (.xlsx)
        </Button>
      </div>

      <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs ${activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-blue-600/20'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6 max-w-5xl">
        {activeTab === 'pricing' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Guide */}
            <Card className="bg-white/95 backdrop-blur-xl border-slate-200/80 shadow-xs rounded-2xl">
              <CardHeader className="pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Guide de tarification (agents)
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => generateExcelTemplate('tariffs')}
                  className="bg-emerald-50 border-emerald-300 hover:bg-emerald-100 text-emerald-900 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-700" />
                  Fichier Excel Exemple Tarifs (.xlsx)
                </Button>
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <p className="text-[11px] text-slate-500">
                    Les primes viennent des barèmes Excel importés par assureur (catégorie × puissance ×
                    durée × zone A/B/C). Le taux de base et le multiplicateur CV ne sont plus utilisés.
                  </p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => generateExcelTemplate('tariffs')}
                    className="text-emerald-700 hover:text-emerald-800 font-extrabold text-xs p-0 h-auto flex items-center gap-1 shrink-0"
                  >
                    <Download className="h-3 w-3" />
                    Télécharger le fichier exemple des tarifs
                  </Button>
                </div>
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
                  <p className="text-[11px] text-slate-500 col-span-full">
                    La vignette automobile se configure dans l’onglet{' '}
                    <strong>Barème vignette</strong> (paramètres du devis et montants par intervalle).
                  </p>
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

        {activeTab === 'commissions' && <CommissionRatesPanel />}

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
        {activeTab === 'vignette' && <VignetteTariffPanel />}
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
