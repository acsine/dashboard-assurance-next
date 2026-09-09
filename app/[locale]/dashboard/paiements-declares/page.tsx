'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, CreditCard, Bell, AlertTriangle, ArrowUpRight, CheckCircle2, DollarSign } from 'lucide-react'
import { asList, portalClientApi } from '@/lib/api/mobi-assur'

export default function PaiementsDeclaresPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['pending-client-payments'],
    queryFn: () => portalClientApi.pendingPayments(),
  })
  const failuresQ = useQuery({
    queryKey: ['payment-failures'],
    queryFn: () => portalClientApi.paymentFailures(),
  })
  const items = asList<Record<string, unknown>>(data)
  const failures = asList<Record<string, unknown>>(failuresQ.data)

  const remindMut = useMutation({
    mutationFn: () => portalClientApi.runReminders(),
    onSuccess: (res) => {
      toast.success(`${res?.notifications_created ?? 0} relance(s) générée(s)`)
      qc.invalidateQueries({ queryKey: ['pending-client-payments'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8 bg-slate-50/50 min-h-screen">
      <Header
        title="Paiements déclarés"
        subtitle="File globale des déclarations Mobile Money, virements et règlements clients"
      />

      <div className="flex items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Gestion des Encaissements</p>
            <p className="text-xs text-slate-500">Validez les déclarations et relancez les échéances en retard</p>
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          disabled={remindMut.isPending}
          onClick={() => remindMut.mutate()}
          className="shadow-sm"
        >
          {remindMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Bell className="h-4 w-4 mr-2" />
          )}
          Lancer relances (J-30/15/7)
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Pending Payments Table */}
        <Card className="lg:col-span-2 bg-white/95 backdrop-blur-xl border-slate-200/80 shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Déclarations en attente</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {items.length} paiement(s) nécessitant vérification
                </CardDescription>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
                En attente
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                <span className="text-xs font-medium">Chargement des transactions...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                <div className="p-3 bg-slate-100 rounded-full text-slate-400 mb-1">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Aucun paiement en attente</p>
                <p className="text-xs text-slate-400">Toutes les déclarations reçues ont été traitées.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-3.5">Montant</th>
                      <th className="px-5 py-3.5">Méthode</th>
                      <th className="px-5 py-3.5">Payeur</th>
                      <th className="px-5 py-3.5">Référence</th>
                      <th className="px-5 py-3.5">Contrat</th>
                      <th className="px-5 py-3.5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {items.map((p) => (
                      <tr key={String(p.id)} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-slate-900">
                          {Number(p.amount || 0).toLocaleString('fr-FR')} <span className="text-xs text-slate-500 font-normal">XAF</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {String(p.method || 'Mobile Money')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-800">
                          {String(p.payer_name || 'Client anonyme')}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-500">
                          {String(p.reference_externe || '—')}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-blue-600 font-medium">
                          {String(p.contract_id || '—')}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                          {String(p.created_at || '—')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Failures Panel */}
        <Card className="bg-white/95 backdrop-blur-xl border-slate-200/80 shadow-xs rounded-2xl overflow-hidden flex flex-col">
          <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              <CardTitle className="text-base font-bold text-slate-900">Échecs Mobile Money</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Anomalies et rejets de transactions récents
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 flex-1">
            {failures.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center text-slate-400">
                <CreditCard className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-600">Aucun échec récent</p>
                <p className="text-[11px] text-slate-400 mt-1">Les passerelles de paiement fonctionnent normalement.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {failures.map((f) => (
                  <div
                    key={String(f.id)}
                    className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-100 text-xs flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between font-semibold text-rose-950">
                      <span>{String(f.provider || 'Opérateur')}</span>
                      <span className="font-mono">{Number(f.amount || 0).toLocaleString('fr-FR')} XAF</span>
                    </div>
                    <p className="text-rose-700 font-medium text-[11px] leading-relaxed">
                      {String(f.error_message || 'Erreur indéterminée')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

