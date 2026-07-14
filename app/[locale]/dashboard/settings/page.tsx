'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { settingsApi } from '@/lib/api/mobi-assur'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Settings, Save, Loader2, RefreshCw } from 'lucide-react'

export default function SettingsPage() {
  const queryClient = useQueryClient()

  // Form input states
  const [accessoires, setAccessoires] = useState('2500')
  const [asac, setAsac] = useState('1500')
  const [fga, setFga] = useState('0')
  const [cr, setCr] = useState('2000')
  const [tva, setTva] = useState('19.25')
  const [commissionRate, setCommissionRate] = useState('10')

  // Query settings values
  const { data: pricing, isLoading } = useQuery({
    queryKey: ['pricing-settings'],
    queryFn: () => settingsApi.getPricing(),
  })

  // Hydrate fields if data is returned
  useEffect(() => {
    if (pricing) {
      if (pricing.accessoires !== undefined) setAccessoires(pricing.accessoires.toString())
      if (pricing.asac !== undefined) setAsac(pricing.asac.toString())
      if (pricing.fga !== undefined) setFga(pricing.fga.toString())
      if (pricing.cr !== undefined) setCr(pricing.cr.toString())
      if (pricing.tva !== undefined) setTva(pricing.tva.toString())
      if (pricing.commission_rate !== undefined) setCommissionRate(pricing.commission_rate.toString())
    }
  }, [pricing])

  // Save Settings Mutation
  const saveSettingsMutation = useMutation({
    mutationFn: (data: any) => settingsApi.createPricing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-settings'] })
      toast.success('Paramètres de tarification mis à jour avec succès')
    },
    onError: (err: any) => {
      // Fallback update if create failed or already exists
      updateSettingsMutation.mutate({
        accessoires: Number(accessoires),
        asac: Number(asac),
        fga: Number(fga),
        cr: Number(cr),
        tva: Number(tva),
        commission_rate: Number(commissionRate) / 100, // convert percentage
      })
    },
  })

  // Update Settings Mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => settingsApi.updatePricing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-settings'] })
      toast.success('Paramètres mis à jour (PATCH)')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la mise à jour')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    saveSettingsMutation.mutate({
      accessoires: Number(accessoires),
      asac: Number(asac),
      fga: Number(fga),
      cr: Number(cr),
      tva: Number(tva),
      commission_rate: Number(commissionRate) / 100,
    })
  }

  return (
    <div className="flex-1 flex flex-col bg-white">

      <Header
        title="Paramètres de Tarification & Commissions"
        subtitle="Configurez les taxes d'assurances, les frais d'accessoires de l'agence et les commissions."
      />

      <div className="p-8 space-y-6 max-w-3xl flex-1">
        <Card className="border-gray-100 shadow-sm bg-white">
          <CardHeader className="pb-4 border-b border-gray-50 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Settings className="h-4.5 w-4.5 text-blue-500" /> Structure Tarifaire Globale (V1)
            </CardTitle>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Frais Accessoires (FCFA) *
                  </label>
                  <Input
                    type="number"
                    placeholder="2500"
                    value={accessoires}
                    onChange={(e) => setAccessoires(e.target.value)}
                    className="h-11 text-xs border-gray-200"
                    required
                  />
                  <span className="text-[10px] text-gray-400 block mt-1">
                    Frais fixes ajoutés à l'émission de la police.
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Taxe ASAC (FCFA) *
                  </label>
                  <Input
                    type="number"
                    placeholder="1500"
                    value={asac}
                    onChange={(e) => setAsac(e.target.value)}
                    className="h-11 text-xs border-gray-200"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    FGA (Fonds de Garantie Automobile) *
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={fga}
                    onChange={(e) => setFga(e.target.value)}
                    className="h-11 text-xs border-gray-200"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Carte Rose (CR - FCFA) *
                  </label>
                  <Input
                    type="number"
                    placeholder="2000"
                    value={cr}
                    onChange={(e) => setCr(e.target.value)}
                    className="h-11 text-xs border-gray-200"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    TVA (%) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="19.25"
                    value={tva}
                    onChange={(e) => setTva(e.target.value)}
                    className="h-11 text-xs border-gray-200"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Taux de commission Agent (%) *
                  </label>
                  <Input
                    type="number"
                    placeholder="10"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    className="h-11 text-xs border-gray-200"
                    required
                  />
                  <span className="text-[10px] text-gray-400 block mt-1">
                    Pourcentage affecté au portefeuille de l'agent après validation de paiement.
                  </span>
                </div>
              </div>

              {/* Action triggers */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={saveSettingsMutation.isPending || updateSettingsMutation.isPending}
                  className="text-white flex items-center gap-2 font-semibold"
                >
                  {saveSettingsMutation.isPending || updateSettingsMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Mise à jour...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Enregistrer les Paramètres
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
