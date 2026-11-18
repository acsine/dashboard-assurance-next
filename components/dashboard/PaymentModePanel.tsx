'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi, type PaymentConfig } from '@/lib/api/mobi-assur'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  FileText, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  Zap
} from 'lucide-react'

export function PaymentModePanel() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<PaymentConfig>({
    queryKey: ['payment-config'],
    queryFn: () => settingsApi.getPaymentConfig(),
  })

  const [mode, setMode] = useState<'MANUAL' | 'API_DIRECT'>('MANUAL')
  const [omMerchant, setOmMerchant] = useState('690000000')
  const [momoMerchant, setMomoMerchant] = useState('670000000')
  const [bankRib, setBankRib] = useState('CM21 10005 00001 12345678901 23')
  const [instructions, setInstructions] = useState('')

  useEffect(() => {
    if (data) {
      setMode(data.payment_gateway_mode || 'MANUAL')
      setOmMerchant(data.manual_payment_om_merchant || '690000000')
      setMomoMerchant(data.manual_payment_momo_merchant || '670000000')
      setBankRib(data.manual_payment_bank_rib || 'CM21 10005 00001 12345678901 23')
      setInstructions(
        data.manual_payment_instructions ||
          'Veuillez effectuer le dépôt sur le compte marchand indiqué puis renseigner la référence de transaction et téléverser la preuve.'
      )
    }
  }, [data])

  const mutation = useMutation({
    mutationFn: () =>
      settingsApi.updatePaymentConfig({
        payment_gateway_mode: mode,
        manual_payment_om_merchant: omMerchant.trim(),
        manual_payment_momo_merchant: momoMerchant.trim(),
        manual_payment_bank_rib: bankRib.trim(),
        manual_payment_instructions: instructions.trim(),
      }),
    onSuccess: () => {
      toast.success('Configuration des paiements enregistrée avec succès')
      qc.invalidateQueries({ queryKey: ['payment-config'] })
      qc.invalidateQueries({ queryKey: ['pricing-settings'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erreur lors de l'enregistrement")
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200/80 shadow-xs">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Mode de Paiement Client Actif
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Un seul mode de paiement est actif et affiché aux assurés sur l'application mobile et le portail.
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Enregistrer les paramètres
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Radio / Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option 1: Mode Manuel Déclaré (Par défaut) */}
            <div
              onClick={() => setMode('MANUAL')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                mode === 'MANUAL'
                  ? 'border-blue-600 bg-blue-50/30 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      mode === 'MANUAL'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        Mode Manuel Déclaré
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Par Défaut
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Sans passerelle API — Transfert OM / MoMo / Banque
                    </p>
                  </div>
                </div>
                <div
                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    mode === 'MANUAL'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300'
                  }`}
                >
                  {mode === 'MANUAL' && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs text-slate-600 space-y-1.5">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  Le client renseigne sa référence de transaction et sa preuve
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  Validation manuelle en 1 clic dans l'onglet Paiements Déclarés
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  Génération instantanée de la police & carte rose après validation
                </p>
              </div>
            </div>

            {/* Option 2: Mode API Direct */}
            <div
              onClick={() => setMode('API_DIRECT')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                mode === 'API_DIRECT'
                  ? 'border-blue-600 bg-blue-50/30 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      mode === 'API_DIRECT'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        Mode API Direct (Automatique)
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Passerelle en ligne instantanée via API marchande
                    </p>
                  </div>
                </div>
                <div
                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    mode === 'API_DIRECT'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300'
                  }`}
                >
                  {mode === 'API_DIRECT' && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs text-slate-600 space-y-1.5">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  Paiement en direct sur le mobile de l'assuré (Push USSD)
                </p>
                <p className="flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  Nécessite des clés API marchandes actives Orange Money / MTN
                </p>
                <p className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  Confirmation par Webhook backend automatisée
                </p>
              </div>
            </div>
          </div>

          {/* Config details for Manual Mode */}
          <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-blue-600" />
              Coordonnées de Réception des Fonds pour l'Assuré
            </h4>
            <p className="text-xs text-slate-500">
              Ces informations sont affichées au client lors de son paiement de prime ou de renouvellement express.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Numéro Marchand Orange Money (Cameroun)
                </label>
                <Input
                  value={omMerchant}
                  onChange={(e) => setOmMerchant(e.target.value)}
                  placeholder="ex: 690000000 ou Code Marchand OM"
                  className="bg-white rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Numéro Marchand MTN Mobile Money (Cameroun)
                </label>
                <Input
                  value={momoMerchant}
                  onChange={(e) => setMomoMerchant(e.target.value)}
                  placeholder="ex: 670000000 ou Code Marchand MoMo"
                  className="bg-white rounded-xl text-xs font-medium"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-slate-500" />
                  RIB Bancaire de l'Agence (Optionnel)
                </label>
                <Input
                  value={bankRib}
                  onChange={(e) => setBankRib(e.target.value)}
                  placeholder="ex: CM21 10005 00001 12345678901 23"
                  className="bg-white rounded-xl text-xs font-medium font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  Instructions et Consignes de Paiement affichées à l'assuré
                </label>
                <Textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  placeholder="Instructions détaillées pour l'assuré..."
                  className="bg-white rounded-xl text-xs font-medium"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
