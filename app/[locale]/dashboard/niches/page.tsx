'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Building2, Loader2, Plus, Trash2 } from 'lucide-react'
import { nichesApi, type Niche } from '@/lib/api/mobi-assur'
import { useAuthStore } from '@/lib/stores/auth-store'
import { can } from '@/lib/auth/roles'

const emptyForm = {
  name: '',
  description: '',
  category: '',
  location: '',
  contact_name: '',
  contact_phone: '',
  special_bonus_amount: '0',
  bonus_type: 'FCFA' as 'FCFA' | 'POINTS',
}

const labelClass = 'text-[10px] font-bold text-gray-500 uppercase tracking-wider block'
const selectClass =
  'flex h-10 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs transition-colors focus-visible:outline-none'
const thClass = 'pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider'
const trClass = 'border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors'

export default function NichesPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const canManage = can(user?.role, 'settings:manage')
  const [form, setForm] = useState(emptyForm)
  const [edit, setEdit] = useState<Niche | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [agreements, setAgreements] = useState<any[] | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['niches'],
    queryFn: () => nichesApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      nichesApi.create({
        name: form.name.trim(),
        description: form.description || null,
        category: form.category || null,
        location: form.location || null,
        contact_name: form.contact_name || null,
        contact_phone: form.contact_phone || null,
        special_bonus_amount: Number(form.special_bonus_amount) || 0,
        bonus_type: form.bonus_type,
        is_active: true,
      }),
    onSuccess: () => {
      toast.success('Niche créée')
      setForm(emptyForm)
      setShowForm(false)
      queryClient.invalidateQueries({ queryKey: ['niches'] })
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur'),
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      nichesApi.update(edit!.id, {
        name: form.name.trim(),
        description: form.description || null,
        category: form.category || null,
        location: form.location || null,
        contact_name: form.contact_name || null,
        contact_phone: form.contact_phone || null,
        special_bonus_amount: Number(form.special_bonus_amount) || 0,
        bonus_type: form.bonus_type,
      }),
    onSuccess: () => {
      toast.success('Niche mise à jour')
      setEdit(null)
      setShowForm(false)
      setForm(emptyForm)
      queryClient.invalidateQueries({ queryKey: ['niches'] })
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => nichesApi.delete(id),
    onSuccess: () => {
      toast.success('Niche supprimée')
      queryClient.invalidateQueries({ queryKey: ['niches'] })
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur'),
  })

  const openEdit = (n: Niche) => {
    setEdit(n)
    setShowForm(true)
    setForm({
      name: n.name,
      description: n.description || '',
      category: n.category || '',
      location: n.location || '',
      contact_name: n.contact_name || '',
      contact_phone: n.contact_phone || '',
      special_bonus_amount: String(n.special_bonus_amount ?? 0),
      bonus_type: n.bonus_type || 'FCFA',
    })
  }

  const resetForm = () => {
    setEdit(null)
    setShowForm(false)
    setForm(emptyForm)
  }

  const showAgreements = async (id: string) => {
    const res = await nichesApi.agreements(id)
    setAgreements(res.items || [])
  }

  const niches = data?.items || []

  return (
    <div className="flex-1 flex flex-col bg-white">
      <Header
        title="Niches"
        subtitle="Associations, auto-écoles et autres points de volume à fort potentiel client."
      />

      <div className="p-8 space-y-6 flex-1">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-gray-950">Catalogue des niches</h3>
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setEdit(null)
                setForm(emptyForm)
                setShowForm((v) => !v)
              }}
              className="flex items-center gap-2 px-5 py-3 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10 cursor-pointer border-0"
            >
              <Plus className="h-4 w-4" />
              Nouvelle niche
            </button>
          )}
        </div>

        {canManage && showForm && (
          <div className="w-full bg-white rounded-2xl border border-gray-100 p-6">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 mb-4">
              {edit ? 'Modifier la niche' : 'Créer une niche'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              <div className="space-y-1">
                <label className={labelClass}>Nom *</label>
                <Input
                  placeholder="Ex: Association moto-taxi Bepanda"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-10 text-xs border-gray-200"
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Catégorie</label>
                <Input
                  placeholder="Ex: moto-taxi"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="h-10 text-xs border-gray-200"
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Localisation</label>
                <Input
                  placeholder="Ex: Douala, Bepanda"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="h-10 text-xs border-gray-200"
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Contact</label>
                <Input
                  placeholder="Nom du contact"
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  className="h-10 text-xs border-gray-200"
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Téléphone</label>
                <Input
                  placeholder="Ex: 677000000"
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  className="h-10 text-xs border-gray-200"
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Description</label>
                <Input
                  placeholder="Notes / détails"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="h-10 text-xs border-gray-200"
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Prime spéciale</label>
                <Input
                  type="number"
                  value={form.special_bonus_amount}
                  onChange={(e) => setForm({ ...form, special_bonus_amount: e.target.value })}
                  className="h-10 text-xs border-gray-200"
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Type de prime</label>
                <select
                  className={selectClass}
                  value={form.bonus_type}
                  onChange={(e) =>
                    setForm({ ...form, bonus_type: e.target.value as 'FCFA' | 'POINTS' })
                  }
                >
                  <option value="FCFA">Prime FCFA</option>
                  <option value="POINTS">Prime points</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-end pt-5 border-t border-gray-50 mt-5">
              <Button type="button" variant="ghost" onClick={resetForm}>
                Annuler
              </Button>
              <Button
                type="button"
                variant="primary"
                className="text-white"
                disabled={
                  !form.name.trim() || createMutation.isPending || updateMutation.isPending
                }
                isLoading={createMutation.isPending || updateMutation.isPending}
                onClick={() => (edit ? updateMutation.mutate() : createMutation.mutate())}
              >
                {edit ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          {isLoading ? (
            <div className="py-20 text-center text-gray-400 font-medium">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-3" />
              Chargement des niches…
            </div>
          ) : niches.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-semibold">Aucune niche enregistrée</p>
              <p className="text-xs text-gray-500 mt-1">
                Ajoutez une association ou un point de volume pour démarrer.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className={thClass}>Nom</th>
                    <th className={thClass}>Catégorie</th>
                    <th className={thClass}>Prime</th>
                    <th className={thClass}>Statut</th>
                    <th className={`${thClass} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {niches.map((n) => (
                    <tr key={n.id} className={trClass}>
                      <td className="py-4">
                        <span className="font-bold text-sm text-gray-900 block">{n.name}</span>
                        <span className="text-[10px] text-gray-400 block">
                          {n.location || '—'}
                          {n.contact_name ? ` · ${n.contact_name}` : ''}
                        </span>
                      </td>
                      <td className="py-4 text-xs text-slate-700">{n.category || '—'}</td>
                      <td className="py-4">
                        <span className="font-extrabold text-sm text-slate-800">
                          {Number(n.special_bonus_amount || 0).toLocaleString('fr-FR')}{' '}
                          {n.bonus_type}
                        </span>
                      </td>
                      <td className="py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            n.is_active
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {n.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-gray-200"
                            onClick={() => showAgreements(n.id)}
                          >
                            Accords
                          </Button>
                          {canManage && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs border-gray-200"
                                onClick={() => openEdit(n)}
                              >
                                Modifier
                              </Button>
                              <button
                                type="button"
                                onClick={() => deleteMutation.mutate(n.id)}
                                className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all cursor-pointer border-0 inline-flex items-center justify-center active:scale-95"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {agreements && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg bg-white border border-gray-100 shadow-2xl rounded-2xl">
              <CardContent className="pt-6 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider pb-2 border-b border-gray-50">
                  Accords agents
                </h3>
                {agreements.length === 0 ? (
                  <p className="text-xs text-gray-500 py-6 text-center">Aucun accord signé</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {agreements.map((a) => (
                      <div
                        key={a.id}
                        className="flex justify-between items-center rounded-xl border border-gray-100 px-4 py-3"
                      >
                        <span className="text-sm font-semibold text-gray-900">
                          {a.agent_name || a.agent_id}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                          {a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end pt-2">
                  <Button type="button" variant="primary" className="text-white" onClick={() => setAgreements(null)}>
                    Fermer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
