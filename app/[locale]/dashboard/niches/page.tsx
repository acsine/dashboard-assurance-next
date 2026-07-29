'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'
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

export default function NichesPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const canManage = can(user?.role, 'settings:manage')
  const [form, setForm] = useState(emptyForm)
  const [edit, setEdit] = useState<Niche | null>(null)
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

  const showAgreements = async (id: string) => {
    const res = await nichesApi.agreements(id)
    setAgreements(res.items || [])
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <Header title="Niches" subtitle="Associations, auto-écoles et autres points de volume" />
      <div className="p-8 space-y-6 flex-1">
        {canManage && (
          <Card className="border-gray-100 shadow-sm bg-white max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base">{edit ? 'Modifier la niche' : 'Nouvelle niche'}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="Nom *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-10 text-xs border-gray-200"
              />
              <Input
                placeholder="Catégorie (ex. moto-taxi)"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="h-10 text-xs border-gray-200"
              />
              <Input
                placeholder="Localisation"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="h-10 text-xs border-gray-200"
              />
              <Input
                placeholder="Contact"
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                className="h-10 text-xs border-gray-200"
              />
              <Input
                placeholder="Téléphone"
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                className="h-10 text-xs border-gray-200"
              />
              <Input
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="h-10 text-xs border-gray-200"
              />
              <Input
                type="number"
                placeholder="Prime spéciale"
                value={form.special_bonus_amount}
                onChange={(e) => setForm({ ...form, special_bonus_amount: e.target.value })}
                className="h-10 text-xs border-gray-200"
              />
              <select
                className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-xs"
                value={form.bonus_type}
                onChange={(e) => setForm({ ...form, bonus_type: e.target.value as 'FCFA' | 'POINTS' })}
              >
                <option value="FCFA">Prime FCFA</option>
                <option value="POINTS">Prime points</option>
              </select>
              <div className="flex gap-2 md:col-span-3">
                <Button
                  onClick={() => (edit ? updateMutation.mutate() : createMutation.mutate())}
                  disabled={!form.name.trim()}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {edit ? 'Enregistrer' : 'Créer'}
                </Button>
                {edit && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEdit(null)
                      setForm(emptyForm)
                    }}
                  >
                    Annuler
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="py-20 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
          </div>
        ) : (
          <Card className="border-gray-100 shadow-sm bg-white">
            <CardContent className="overflow-x-auto pt-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2">Nom</th>
                    <th className="py-2">Catégorie</th>
                    <th className="py-2">Prime</th>
                    <th className="py-2">Statut</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {(data?.items || []).map((n) => (
                    <tr key={n.id} className="border-b">
                      <td className="py-2">
                        <div className="font-medium">{n.name}</div>
                        <div className="text-xs text-muted-foreground">{n.location}</div>
                      </td>
                      <td className="py-2">{n.category || '—'}</td>
                      <td className="py-2">
                        {n.special_bonus_amount} {n.bonus_type}
                      </td>
                      <td className="py-2">{n.is_active ? 'Actif' : 'Inactif'}</td>
                      <td className="py-2 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => showAgreements(n.id)}>
                          Accords
                        </Button>
                        {canManage && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => openEdit(n)}>
                              Modifier
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(n.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {agreements && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <Card className="w-full max-w-lg">
              <CardHeader>
                <CardTitle>Accords agents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {agreements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun accord signé</p>
                ) : (
                  agreements.map((a) => (
                    <div key={a.id} className="flex justify-between border-b py-2 text-sm">
                      <span>{a.agent_name || a.agent_id}</span>
                      <span>{a.status}</span>
                    </div>
                  ))
                )}
                <Button variant="outline" onClick={() => setAgreements(null)}>
                  Fermer
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
