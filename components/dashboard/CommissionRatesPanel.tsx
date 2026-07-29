'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { commissionRatesApi } from '@/lib/api/mobi-assur'

export function CommissionRatesPanel() {
  const queryClient = useQueryClient()
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
      queryClient.invalidateQueries({ queryKey: ['commission-rates'] })
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur'),
  })

  return (
    <div className="space-y-6">
      <Card className="border-gray-100 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-50">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400">
            Grille de commissions (par type de contrat)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Définissez des taux en pourcentage (0–1 ou %) ou un montant fixe FCFA selon le type de
            produit. En l&apos;absence de règle, le taux global « Commission agent » s&apos;applique.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <select
              className="h-10 rounded-md border px-3 text-sm"
              value={form.applies_to}
              onChange={(e) => setForm({ ...form, applies_to: e.target.value })}
            >
              <option value="CONTRACT">Contrat</option>
              <option value="PROSPECT">Prospect</option>
              <option value="CLIENT">Client</option>
            </select>
            <select
              className="h-10 rounded-md border px-3 text-sm"
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
            <select
              className="h-10 rounded-md border px-3 text-sm"
              value={form.product_line}
              onChange={(e) => setForm({ ...form, product_line: e.target.value })}
            >
              <option value="*">Toutes lignes</option>
              <option value="AUTO">AUTO</option>
              <option value="SANTE">SANTÉ</option>
              <option value="VOYAGE">VOYAGE</option>
              <option value="AUTRE">AUTRE</option>
            </select>
            <Input
              placeholder="Souscription (optionnel)"
              value={form.subscription_type}
              onChange={(e) => setForm({ ...form, subscription_type: e.target.value })}
            />
            <select
              className="h-10 rounded-md border px-3 text-sm"
              value={form.rate_mode}
              onChange={(e) => setForm({ ...form, rate_mode: e.target.value })}
            >
              <option value="PERCENT">Pourcentage</option>
              <option value="FIXED">Montant fixe FCFA</option>
            </select>
            <Input
              type="number"
              step="0.01"
              placeholder={form.rate_mode === 'PERCENT' ? '0.10 ou 10' : 'Montant FCFA'}
              value={form.rate_value}
              onChange={(e) => setForm({ ...form, rate_value: e.target.value })}
            />
            <Input
              placeholder="Libellé"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
      ) : (
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="pt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2">Libellé</th>
                  <th>Appliqué à</th>
                  <th>Produit</th>
                  <th>Mode</th>
                  <th>Valeur</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(data?.items || []).map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="py-2">{r.label || '—'}</td>
                    <td>{r.applies_to}</td>
                    <td>
                      {r.product_type} / {r.product_line}
                      {r.subscription_type ? ` / ${r.subscription_type}` : ''}
                    </td>
                    <td>{r.rate_mode}</td>
                    <td>
                      {r.rate_mode === 'PERCENT'
                        ? `${(Number(r.rate_value) * 100).toFixed(2)} %`
                        : `${r.rate_value} FCFA`}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          commissionRatesApi.delete(r.id).then(() => {
                            toast.success('Règle supprimée')
                            queryClient.invalidateQueries({ queryKey: ['commission-rates'] })
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
