'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, CreditCard, Bell } from 'lucide-react'
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
    <div className="flex flex-col gap-6 p-6">
      <Header
        title="Paiements déclarés"
        subtitle="File globale des déclarations Mobile Money / client"
      />

      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={remindMut.isPending}
          onClick={() => remindMut.mutate()}
        >
          {remindMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Bell className="h-4 w-4 mr-2" />
          )}
          Lancer relances J-30/15/7
        </Button>
      </div>

      <Card className="border-gray-100 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
              <CreditCard className="h-8 w-8" />
              <p className="text-sm">Aucun paiement en attente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-[10px] uppercase tracking-wider text-gray-400">
                    <th className="px-4 py-3">Montant</th>
                    <th className="px-4 py-3">Méthode</th>
                    <th className="px-4 py-3">Payeur</th>
                    <th className="px-4 py-3">Référence</th>
                    <th className="px-4 py-3">Contrat</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={String(p.id)} className="border-b border-gray-50 hover:bg-gray-50/40">
                      <td className="px-4 py-3 font-semibold">{String(p.amount)} XAF</td>
                      <td className="px-4 py-3">{String(p.method)}</td>
                      <td className="px-4 py-3">{String(p.payer_name || '—')}</td>
                      <td className="px-4 py-3 font-mono text-xs">{String(p.reference_externe || '—')}</td>
                      <td className="px-4 py-3 font-mono text-xs truncate max-w-[120px]">
                        {String(p.contract_id || '')}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{String(p.created_at || '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-gray-100 shadow-sm">
        <CardContent className="p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Échecs transaction MM</h3>
          {failures.length === 0 ? (
            <p className="text-xs text-gray-400">Aucun échec récent</p>
          ) : (
            <ul className="space-y-2">
              {failures.map((f) => (
                <li key={String(f.id)} className="text-xs border-l-2 border-red-200 pl-3">
                  <span className="font-semibold">{String(f.provider)} · {String(f.amount)} XAF</span>
                  <div className="text-red-600">{String(f.error_message || 'Échec')}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
