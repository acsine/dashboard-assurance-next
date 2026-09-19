'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import SearchableSelect from '@/components/ui/searchable-select'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { commissionRatesApi, asList, type CommissionRateRule } from '@/lib/api/mobi-assur'
import { useTranslations } from 'next-intl'

const labelClass = 'text-[10px] font-bold text-gray-500 uppercase tracking-wider block'
const selectClass =
  'flex h-10 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs transition-colors focus-visible:outline-none'
const thClass = 'pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider'
const trClass = 'border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors'

export function CommissionRatesPanel() {
  const t = useTranslations('commissions')
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

  const rules = asList<CommissionRateRule>(data)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-gray-950">{t('title')}</h3>
          <p className="text-xs text-gray-500 mt-1">
            {t('hint')}
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
        <Card className="bg-white/95 backdrop-blur-xl border-slate-200/80 shadow-xs rounded-2xl max-w-3xl">
          <CardContent className="pt-6">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">
              Ajouter une règle
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className={labelClass}>Appliqué à</label>
                <SearchableSelect
                  value={form.applies_to}
                  onChange={(val) => setForm({ ...form, applies_to: val })}
                  options={[
                    { value: 'CONTRACT', label: 'Contrat' },
                    { value: 'PROSPECT', label: 'Prospect' },
                    { value: 'CLIENT', label: 'Client' },
                  ]}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Type produit</label>
                <SearchableSelect
                  value={form.product_type}
                  onChange={(val) => setForm({ ...form, product_type: val })}
                  options={[
                    { value: '*', label: 'Tous types' },
                    { value: 'CAT1', label: 'CAT1' },
                    { value: 'CAT11', label: 'CAT11' },
                    { value: 'SANTE', label: 'SANTÉ' },
                    { value: 'VOYAGE', label: 'VOYAGE' },
                    { value: 'AUTRE', label: 'AUTRE' },
                  ]}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Ligne produit</label>
                <SearchableSelect
                  value={form.product_line}
                  onChange={(val) => setForm({ ...form, product_line: val })}
                  options={[
                    { value: '*', label: 'Toutes lignes' },
                    { value: 'AUTO', label: 'AUTO' },
                    { value: 'SANTE', label: 'SANTÉ' },
                    { value: 'VOYAGE', label: 'VOYAGE' },
                    { value: 'AUTRE', label: 'AUTRE' },
                  ]}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Souscription</label>
                <Input
                  placeholder="Optionnel"
                  value={form.subscription_type}
                  onChange={(e) => setForm({ ...form, subscription_type: e.target.value })}
                  className="h-10 text-xs border-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Mode</label>
                <SearchableSelect
                  value={form.rate_mode}
                  onChange={(val) => setForm({ ...form, rate_mode: val })}
                  options={[
                    { value: 'PERCENT', label: 'Pourcentage' },
                    { value: 'FIXED', label: 'Montant fixe FCFA' },
                  ]}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Valeur</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={form.rate_mode === 'PERCENT' ? '0.10 ou 10' : 'Montant FCFA'}
                  value={form.rate_value}
                  onChange={(e) => setForm({ ...form, rate_value: e.target.value })}
                  className="h-10 text-xs border-slate-200"
                />
              </div>
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <label className={labelClass}>Libellé</label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className="h-10 text-xs border-slate-200"
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
                className="text-white shadow-xs"
                isLoading={createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/80 shadow-xs p-6">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-3" />
          </div>
        ) : rules.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm font-semibold">Aucune règle de commission</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px]">
                  <th className="py-3 px-3 font-bold text-slate-500 uppercase tracking-wider">Libellé</th>
                  <th className="py-3 px-3 font-bold text-slate-500 uppercase tracking-wider">Appliqué à</th>
                  <th className="py-3 px-3 font-bold text-slate-500 uppercase tracking-wider">Produit</th>
                  <th className="py-3 px-3 font-bold text-slate-500 uppercase tracking-wider">Mode</th>
                  <th className="py-3 px-3 font-bold text-slate-500 uppercase tracking-wider">Valeur</th>
                  <th className="py-3 px-3 font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rules.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-sm text-slate-900">{r.label || '—'}</td>
                    <td className="py-3.5 px-3 text-xs text-slate-600 font-medium">{r.applies_to}</td>
                    <td className="py-3.5 px-3 text-xs text-slate-600 font-medium">
                      {r.product_type} / {r.product_line}
                      {r.subscription_type ? ` / ${r.subscription_type}` : ''}
                    </td>
                    <td className="py-3.5 px-3 text-xs font-semibold text-slate-700">{r.rate_mode}</td>
                    <td className="py-3.5 px-3 font-extrabold text-sm text-slate-900">
                      {r.rate_mode === 'PERCENT'
                        ? `${(Number(r.rate_value) * 100).toFixed(2)} %`
                        : `${Number(r.rate_value).toLocaleString('fr-FR')} FCFA`}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        type="button"
                        className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all cursor-pointer border-0 inline-flex"
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
