'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { commissionRatesApi } from '@/lib/api/mobi-assur'

const labelClass = 'text-[10px] font-bold text-gray-500 uppercase tracking-wider block'
const selectClass =
  'flex h-10 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs transition-colors focus-visible:outline-none'
const thClass = 'pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider'
const trClass = 'border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors'

export function CommissionRatesPanel() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    applies_to: 'CONTRACT',
    product_type: '*',
    product_line: '*',
    subscription_type: '',
    rate_mode: 'PERCENT',
    rate_value: '0.10',
    label: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['commission-rates'],
    queryFn: () => commissionRatesApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: () => {
      let rateValue = Number(form.rate_value)
      if (form.rate_mode === 'PERCENT' && rateValue > 1) {
        rateValue = rateValue / 100
      }
      return commissionRatesApi.create({
        applies_to: form.applies_to as any,
        product_type: form.product_type || '*',
        product_line: form.product_line || '*',
        subscription_type: form.subscription_type || null,
        rate_mode: form.rate_mode as any,
        rate_value: rateValue,
        label: form.label || null,
        is_active: true,
      })
    },
    onSuccess: () => {
      toast.success('Règle de commission créée')
      setShowForm(false)
      queryClient.invalidateQueries({ queryKey: ['commission-rates'] })
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur'),
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-gray-950">Grille de commissions</h3>
          <p className="text-xs text-gray-500 mt-1">
            Taux % ou montant fixe selon le type de contrat. Sinon, le taux global « Commission
            agent » s&apos;applique.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-5 py-3 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10 cursor-pointer border-0"
        >
          <Plus className="h-4 w-4" />
          Nouvelle règle
        </button>
      </div>

      {showForm && (
        <Card className="border-gray-100 shadow-sm bg-white max-w-3xl">
          <CardContent className="pt-6">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 mb-4">
              Ajouter une règle
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className={labelClass}>Appliqué à</label>
                <select
                  className={selectClass}
                  value={form.applies_to}
                  onChange={(e) => setForm({ ...form, applies_to: e.target.value })}
                >
                  <option value="CONTRACT">Contrat</option>
                  <option value="PROSPECT">Prospect</option>
                  <option value="CLIENT">Client</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Type produit</label>
                <select
                  className={selectClass}
                  value={form.product_type}
                  onChange={(e) => setForm({ ...form, product_type: e.target.value })}
                >
                  <option value="*">Tous types</option>
                  <option value="CAT1">CAT1</option>
                  <option value="CAT11">CAT11</option>
                  <option value="SANTE">SANTÉ</option>
                  <option value="VOYAGE">VOYAGE</option>
                  <option value="AUTRE">AUTRE</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Ligne produit</label>
                <select
                  className={selectClass}
                  value={form.product_line}
                  onChange={(e) => setForm({ ...form, product_line: e.target.value })}
                >
                  <option value="*">Toutes lignes</option>
                  <option value="AUTO">AUTO</option>
                  <option value="SANTE">SANTÉ</option>
                  <option value="VOYAGE">VOYAGE</option>
                  <option value="AUTRE">AUTRE</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Souscription</label>
                <Input
                  placeholder="Optionnel"
                  value={form.subscription_type}
                  onChange={(e) => setForm({ ...form, subscription_type: e.target.value })}
                  className="h-10 text-xs border-gray-200"
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Mode</label>
                <select
                  className={selectClass}
                  value={form.rate_mode}
                  onChange={(e) => setForm({ ...form, rate_mode: e.target.value })}
                >
                  <option value="PERCENT">Pourcentage</option>
                  <option value="FIXED">Montant fixe FCFA</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Valeur</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={form.rate_mode === 'PERCENT' ? '0.10 ou 10' : 'Montant FCFA'}
                  value={form.rate_value}
                  onChange={(e) => setForm({ ...form, rate_value: e.target.value })}
                  className="h-10 text-xs border-gray-200"
                />
              </div>
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <label className={labelClass}>Libellé</label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className="h-10 text-xs border-gray-200"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button
                type="button"
                variant="primary"
                className="text-white"
                isLoading={createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-3" />
          </div>
        ) : (data?.items || []).length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-sm font-semibold">Aucune règle de commission</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className={thClass}>Libellé</th>
                  <th className={thClass}>Appliqué à</th>
                  <th className={thClass}>Produit</th>
                  <th className={thClass}>Mode</th>
                  <th className={thClass}>Valeur</th>
                  <th className={`${thClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items || []).map((r) => (
                  <tr key={r.id} className={trClass}>
                    <td className="py-4 font-bold text-sm text-gray-900">{r.label || '—'}</td>
                    <td className="py-4 text-xs text-slate-600">{r.applies_to}</td>
                    <td className="py-4 text-xs text-slate-600">
                      {r.product_type} / {r.product_line}
                      {r.subscription_type ? ` / ${r.subscription_type}` : ''}
                    </td>
                    <td className="py-4 text-xs">{r.rate_mode}</td>
                    <td className="py-4 font-extrabold text-sm text-slate-800">
                      {r.rate_mode === 'PERCENT'
                        ? `${(Number(r.rate_value) * 100).toFixed(2)} %`
                        : `${Number(r.rate_value).toLocaleString('fr-FR')} FCFA`}
                    </td>
                    <td className="py-4 text-right">
                      <button
                        type="button"
                        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all cursor-pointer border-0 inline-flex"
                        onClick={() =>
                          commissionRatesApi.delete(r.id).then(() => {
                            toast.success('Règle supprimée')
                            queryClient.invalidateQueries({ queryKey: ['commission-rates'] })
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
