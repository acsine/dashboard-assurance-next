'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  insurersApi,
  tariffApi,
  insurerSupportsLine,
  type CirculationZone,
  type ContractDuration,
  type FeeSchedule,
  type Insurer,
  type RcRate,
  type VehicleCategory,
} from '@/lib/api/mobi-assur'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Plus, Save, Trash2, RefreshCw, KeyRound, Pencil, X } from 'lucide-react'

const FUEL_OPTIONS = ['ESSENCE', 'DIESEL', 'ELECTRIQUE', 'HYBRIDE']

/** Zones CIMA standards — codes canoniques alignés backend (ZONE_A|B|C). */
const CIMA_ZONES = [
  {
    code: 'ZONE_A',
    short: 'A',
    name: 'ZONE_A',
    description: 'Zone urbaine / tarif de référence CIMA',
  },
  {
    code: 'ZONE_B',
    short: 'B',
    name: 'ZONE_B',
    description: 'Zone intermédiaire CIMA',
  },
  {
    code: 'ZONE_C',
    short: 'C',
    name: 'ZONE_C',
    description: 'Zone périphérique / intérieure CIMA',
  },
] as const

function zoneMatchesCode(zoneName: string, code: string) {
  const n = (zoneName || '').trim().toUpperCase()
  const short = code.replace('ZONE_', '')
  return (
    n === code ||
    n === `ZONE ${short}` ||
    n === `ZONE-${short}` ||
    n === short ||
    n.startsWith(`ZONE ${short} `) ||
    n.startsWith(`${code} `)
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
      {children}
    </label>
  )
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
        active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {active ? 'Actif' : 'Inactif'}
    </span>
  )
}

export function CategoriesPanel() {
  const qc = useQueryClient()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCode, setEditCode] = useState('')
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editActive, setEditActive] = useState(true)

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['tariff-categories'],
    queryFn: () => tariffApi.listCategories(),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      tariffApi.createCategory({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || undefined,
        is_active: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tariff-categories'] })
      setCode('')
      setName('')
      setDescription('')
      toast.success('Catégorie créée')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      tariffApi.updateCategory(editingId!, {
        code: editCode.trim().toUpperCase(),
        name: editName.trim(),
        description: editDescription.trim() || null,
        is_active: editActive,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tariff-categories'] })
      setEditingId(null)
      toast.success('Catégorie mise à jour')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tariffApi.deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tariff-categories'] })
      toast.success('Catégorie désactivée')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const startEdit = (c: VehicleCategory) => {
    setEditingId(c.id)
    setEditCode(c.code)
    setEditName(c.name)
    setEditDescription(c.description || '')
    setEditActive(c.is_active)
  }

  const list = Array.isArray(rows) ? rows : []

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardHeader className="pb-4 border-b border-gray-50">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400">
          Catégories de véhicules CIMA
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        ) : (
          <div className="space-y-2">
            {list.map((c: VehicleCategory) => (
              <div
                key={c.id}
                className="border border-gray-100 rounded-lg px-3 py-2 space-y-2"
              >
                {editingId === c.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value)}
                        className="h-10 text-xs"
                        placeholder="Code"
                      />
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-10 text-xs"
                        placeholder="Nom"
                      />
                      <Input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="h-10 text-xs"
                        placeholder="Description"
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={editActive}
                        onChange={(e) => setEditActive(e.target.checked)}
                      />
                      Catégorie active
                    </label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        className="text-white"
                        disabled={updateMutation.isPending}
                        onClick={() => {
                          if (!editCode.trim() || !editName.trim()) {
                            toast.error('Code et nom requis')
                            return
                          }
                          updateMutation.mutate()
                        }}
                      >
                        {updateMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Save className="h-3.5 w-3.5 mr-1" />
                        )}
                        Enregistrer
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900">
                        {c.code} — {c.name}
                      </p>
                      {c.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{c.description}</p>
                      )}
                    </div>
                    <ActiveBadge active={c.is_active} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(c)}
                      title="Modifier"
                    >
                      <Pencil className="h-3.5 w-3.5 text-blue-600" />
                    </Button>
                    {c.is_active && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(c.id)}
                        disabled={deleteMutation.isPending}
                        title="Désactiver"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-gray-50">
          <Input placeholder="Code (ex: CAT1)" value={code} onChange={(e) => setCode(e.target.value)} className="h-10 text-xs" />
          <Input placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} className="h-10 text-xs" />
          <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="h-10 text-xs" />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (!code.trim() || !name.trim()) {
              toast.error('Code et nom requis')
              return
            }
            createMutation.mutate()
          }}
          disabled={createMutation.isPending}
        >
          <Plus className="h-4 w-4 mr-1" />
          Ajouter
        </Button>
      </CardContent>
    </Card>
  )
}

export function ZonesPanel() {
  const qc = useQueryClient()

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['tariff-zones'],
    queryFn: () => tariffApi.listZones(),
  })

  const list = Array.isArray(zones) ? zones : []

  const findZone = (code: string) => list.find((z) => zoneMatchesCode(z.name, code))

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; cities: string[] }) =>
      tariffApi.createZone({
        name: payload.name,
        cities: payload.cities,
        is_active: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tariff-zones'] })
      toast.success('Zone créée')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tariffApi.deleteZone(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tariff-zones'] })
      toast.success('Zone désactivée')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const ensureAllMutation = useMutation({
    mutationFn: async () => {
      const current = await tariffApi.listZones()
      const currentList = Array.isArray(current) ? current : []
      const hasCode = (code: string) => currentList.some((z) => zoneMatchesCode(z.name, code))
      const created: string[] = []
      for (const z of CIMA_ZONES) {
        if (!hasCode(z.code)) {
          await tariffApi.createZone({
            name: z.name,
            cities: [],
            is_active: true,
          })
          created.push(z.short)
        }
      }
      return created
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['tariff-zones'] })
      if (created.length === 0) toast.success('Les zones A, B et C sont déjà présentes')
      else toast.success(`Zones créées : ${created.join(', ')}`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardHeader className="pb-4 border-b border-gray-50">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400">
          Zones de circulation CIMA
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs text-slate-600">
          Le barème automobile utilise uniquement <strong>3 zones</strong> :{' '}
          <strong>A</strong>, <strong>B</strong> et <strong>C</strong>. Aucune carte géographique
          n’est requise — la tarification vient des fichiers Excel assureurs (catégorie × puissance
          × durée).
        </div>

        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CIMA_ZONES.map((def) => {
              const existing = findZone(def.code)
              return (
                <div
                  key={def.code}
                  className="rounded-xl border border-gray-100 bg-white p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-extrabold text-slate-900">Zone {def.short}</p>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        {def.description}
                      </p>
                    </div>
                    {existing ? (
                      <ActiveBadge active={existing.is_active} />
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                        Absente
                      </span>
                    )}
                  </div>

                  {existing ? (
                    existing.is_active && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => deleteMutation.mutate(existing.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500 mr-1" />
                        Désactiver
                      </Button>
                    )
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={createMutation.isPending}
                      onClick={() =>
                        createMutation.mutate({ name: def.name, cities: [] })
                      }
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Créer Zone {def.short}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <Button
          type="button"
          variant="primary"
          className="text-white"
          disabled={ensureAllMutation.isPending || isLoading}
          onClick={() => ensureAllMutation.mutate()}
        >
          {ensureAllMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Plus className="h-4 w-4 mr-1" />
          )}
          Créer les zones manquantes (A, B, C)
        </Button>

        {list.filter((z) => {
          const n = (z.name || '').toUpperCase()
          return !['A', 'B', 'C', 'ZONE A', 'ZONE B', 'ZONE C', 'ZONE-A', 'ZONE-B', 'ZONE-C'].some(
            (k) => n === k || n.startsWith(`${k} `),
          )
        }).length > 0 && (
          <div className="pt-2 border-t border-gray-50 space-y-2">
            <p className="text-[10px] font-bold uppercase text-slate-400">Autres zones (héritées)</p>
            {list
              .filter((z) => {
                const n = (z.name || '').toUpperCase()
                return ![
                  'A',
                  'B',
                  'C',
                  'ZONE A',
                  'ZONE B',
                  'ZONE C',
                  'ZONE-A',
                  'ZONE-B',
                  'ZONE-C',
                ].some((k) => n === k || n.startsWith(`${k} `))
              })
              .map((z: CirculationZone) => (
                <div
                  key={z.id}
                  className="flex items-center gap-2 border border-gray-100 rounded-lg px-3 py-2"
                >
                  <p className="text-xs font-semibold flex-1">{z.name}</p>
                  <ActiveBadge active={z.is_active} />
                  {z.is_active && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(z.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DurationsPanel() {
  const qc = useQueryClient()
  const [label, setLabel] = useState('')
  const [months, setMonths] = useState('12')

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['tariff-durations'],
    queryFn: () => tariffApi.listDurations(),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      tariffApi.createDuration({
        label: label.trim(),
        months: Number(months),
        is_active: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tariff-durations'] })
      setLabel('')
      setMonths('12')
      toast.success('Durée créée')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tariffApi.deleteDuration(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tariff-durations'] })
      toast.success('Durée désactivée')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const list = Array.isArray(rows) ? rows : []

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardHeader className="pb-4 border-b border-gray-50">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400">
          Durées de contrat
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        ) : (
          list.map((d: ContractDuration) => (
            <div key={d.id} className="flex items-center gap-2 border border-gray-100 rounded-lg px-3 py-2">
              <span className="text-xs font-semibold flex-1">
                {d.label} ({d.months} mois)
              </span>
              <ActiveBadge active={d.is_active} />
              {d.is_active && (
                <Button type="button" variant="ghost" size="sm" onClick={() => deleteMutation.mutate(d.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </Button>
              )}
            </div>
          ))
        )}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
          <Input placeholder="Libellé" value={label} onChange={(e) => setLabel(e.target.value)} className="h-10 text-xs" />
          <Input type="number" placeholder="Mois" value={months} onChange={(e) => setMonths(e.target.value)} className="h-10 text-xs" />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (!label.trim() || !months) {
              toast.error('Libellé et durée requis')
              return
            }
            createMutation.mutate()
          }}
          disabled={createMutation.isPending}
        >
          <Plus className="h-4 w-4 mr-1" />
          Ajouter
        </Button>
      </CardContent>
    </Card>
  )
}

export function RcTariffPanel() {
  const qc = useQueryClient()
  const [insurerId, setInsurerId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [fuel, setFuel] = useState('ESSENCE')
  const [powerMin, setPowerMin] = useState('1')
  const [powerMax, setPowerMax] = useState('99')
  const [trailer, setTrailer] = useState(false)
  const [rcAmount, setRcAmount] = useState('')

  const { data: insurers = [] } = useQuery({
    queryKey: ['insurers'],
    queryFn: () => insurersApi.list(),
  })
  const autoInsurers = (Array.isArray(insurers) ? insurers : []).filter(
    (i) => i.is_active && insurerSupportsLine(i, 'AUTO'),
  )

  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['tariff-lines', insurerId],
    queryFn: () => tariffApi.listTariffLines(insurerId),
    enabled: !!insurerId,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['tariff-categories'],
    queryFn: () => tariffApi.listCategories(),
  })

  const { data: zones = [] } = useQuery({
    queryKey: ['tariff-zones'],
    queryFn: () => tariffApi.listZones(),
  })

  const catList = Array.isArray(categories) ? categories : []
  const zoneList = Array.isArray(zones) ? zones : []

  const resolveCategory = (id: string) => {
    const cat = catList.find((c) => c.id === id)
    if (!cat) return { code: id.slice(0, 8), name: 'Catégorie inconnue' }
    return { code: cat.code, name: cat.name }
  }

  const resolveZone = (id?: string | null) => {
    if (!id) return { name: 'Toutes zones', regions: 'Toutes les régions' }
    const zone = zoneList.find((z) => z.id === id)
    if (!zone) return { name: id.slice(0, 8), regions: '—' }
    const regions = (zone.cities || []).length > 0 ? zone.cities.join(', ') : 'Aucune région'
    return { name: zone.name, regions }
  }

  const createMutation = useMutation({
    mutationFn: () =>
      tariffApi.createTariffLine({
        insurer_id: insurerId,
        category_id: categoryId,
        zone_id: zoneId || undefined,
        fuel,
        power_min: Number(powerMin),
        power_max: Number(powerMax),
        trailer,
        rc_amount: Number(rcAmount),
        is_active: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tariff-lines', insurerId] })
      setRcAmount('')
      toast.success('Ligne RC créée')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tariffApi.deleteTariffLine(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tariff-lines', insurerId] })
      toast.success('Ligne RC désactivée')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const list = Array.isArray(lines) ? lines : []
  const selectedCategory = categoryId ? resolveCategory(categoryId) : null
  const selectedZone = resolveZone(zoneId || null)

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardHeader className="pb-4 border-b border-gray-50">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400">
          Barème RC (lignes tarifaires)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-2">
          <FieldLabel>Assureur (obligatoire)</FieldLabel>
          <select
            value={insurerId}
            onChange={(e) => setInsurerId(e.target.value)}
            className="w-full h-10 text-xs border border-gray-200 rounded-md px-2 bg-white max-w-md"
          >
            <option value="">Choisir un assureur auto…</option>
            {autoInsurers.map((i) => (
              <option key={i.id} value={i.id}>
                {i.code} — {i.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500">
            Les tarifs RC sont stockés par assureur. Importez un Excel ou saisissez manuellement.
          </p>
        </div>

        {!insurerId ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
            Sélectionnez un assureur pour voir et modifier son barème RC.
          </div>
        ) : (
          <>
        <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-4 text-xs text-amber-900 space-y-1.5">
          <p className="font-bold">Comment remplir les valeurs numériques ?</p>
          <ul className="list-disc pl-4 space-y-1 text-amber-800">
            <li>
              <strong>Puissance min / max (CV)</strong> : plage de chevaux fiscaux couverte
              (ex. de <strong>1</strong> à <strong>7</strong> CV pour les petites voitures).
            </li>
            <li>
              <strong>Prime RC annuelle</strong> : montant en <strong>FCFA</strong> pour 12 mois
              (ex. <strong>58&nbsp;473</strong>). C’est le seul montant monétaire à saisir.
            </li>
            <li>
              La case <strong>Avec remorque</strong> n’est pas un montant : cochez-la seulement
              si la ligne s’applique aux véhicules avec remorque.
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-5">
          <p className="text-xs font-bold text-slate-800">1. Choix catégorie & région</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <FieldLabel>Catégorie véhicule (nom)</FieldLabel>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-10 text-xs border border-gray-200 rounded-md px-2 bg-white"
              >
                <option value="">Choisir une catégorie…</option>
                {catList.filter((c) => c.is_active).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
              {selectedCategory && (
                <p className="text-[11px] text-slate-500">
                  Nom enregistré : <strong>{selectedCategory.name}</strong> ({selectedCategory.code})
                </p>
              )}
            </div>

            <div className="space-y-1">
              <FieldLabel>Zone / région</FieldLabel>
              <select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                className="w-full h-10 text-xs border border-gray-200 rounded-md px-2 bg-white"
              >
                <option value="">Toutes zones</option>
                {zoneList.filter((z) => z.is_active).map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                    {(z.cities || []).length > 0 ? ` — ${(z.cities || []).join(', ')}` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                Région(s) : <strong>{selectedZone.regions}</strong>
              </p>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <FieldLabel>Carburant</FieldLabel>
              <select
                value={fuel}
                onChange={(e) => setFuel(e.target.value)}
                className="w-full h-10 text-xs border border-gray-200 rounded-md px-2 bg-white max-w-xs"
              >
                {FUEL_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-blue-100 pt-4 space-y-4">
            <p className="text-xs font-bold text-slate-800">2. Valeurs numériques à saisir</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-white bg-white p-3 space-y-2 shadow-sm">
                <FieldLabel>Puissance minimale</FieldLabel>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="99"
                    value={powerMin}
                    onChange={(e) => setPowerMin(e.target.value)}
                    className="h-11 text-sm font-semibold"
                    aria-label="Puissance minimale en CV"
                  />
                  <span className="text-xs font-bold text-slate-500 shrink-0">CV</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Plus petit nombre de chevaux fiscaux pour cette ligne.
                  <br />
                  Exemple : <strong>1</strong>
                </p>
              </div>

              <div className="rounded-lg border border-white bg-white p-3 space-y-2 shadow-sm">
                <FieldLabel>Puissance maximale</FieldLabel>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="99"
                    value={powerMax}
                    onChange={(e) => setPowerMax(e.target.value)}
                    className="h-11 text-sm font-semibold"
                    aria-label="Puissance maximale en CV"
                  />
                  <span className="text-xs font-bold text-slate-500 shrink-0">CV</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Plus grand nombre de chevaux fiscaux pour cette ligne.
                  <br />
                  Exemple : <strong>7</strong> ou <strong>11</strong>
                </p>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2 shadow-sm">
                <FieldLabel>Prime RC annuelle</FieldLabel>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="58473"
                    value={rcAmount}
                    onChange={(e) => setRcAmount(e.target.value)}
                    className="h-11 text-sm font-semibold border-blue-200"
                    aria-label="Prime RC annuelle en FCFA"
                  />
                  <span className="text-xs font-bold text-blue-700 shrink-0">FCFA</span>
                </div>
                <p className="text-[11px] text-blue-800/80 leading-snug">
                  Montant de la responsabilité civile pour 12 mois.
                  <br />
                  Exemple : <strong>58&nbsp;473</strong>
                </p>
              </div>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" checked={trailer} onChange={(e) => setTrailer(e.target.checked)} />
            Avec remorque (cochez seulement si cette ligne concerne les véhicules avec remorque)
          </label>

          <Button
            type="button"
            variant="primary"
            className="text-white"
            onClick={() => {
              if (!insurerId) {
                toast.error('Choisissez un assureur')
                return
              }
              if (!categoryId) {
                toast.error('Choisissez une catégorie (nom)')
                return
              }
              if (!rcAmount || Number(rcAmount) <= 0) {
                toast.error('Saisissez la prime RC annuelle en FCFA (ex. 58473)')
                return
              }
              if (!powerMin || !powerMax) {
                toast.error('Indiquez la puissance min et max en CV')
                return
              }
              if (Number(powerMin) > Number(powerMax)) {
                toast.error('La puissance min ne peut pas dépasser la puissance max')
                return
              }
              createMutation.mutate()
            }}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            Ajouter la ligne RC
          </Button>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
            Lignes enregistrées
          </p>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          ) : list.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
              Aucune ligne tarifaire. Importez un Excel ou remplissez le formulaire.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50">
                  <tr className="text-slate-500 uppercase">
                    <th className="py-3 px-3">Catégorie (nom)</th>
                    <th className="py-3 px-3">Zone / région</th>
                    <th className="py-3 px-3">Carburant</th>
                    <th className="py-3 px-3">Puissance CV</th>
                    <th className="py-3 px-3">Remorque</th>
                    <th className="py-3 px-3">RC annuel</th>
                    <th className="py-3 px-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {list.map((r: RcRate) => {
                    const cat = resolveCategory(r.category_id)
                    const zone = resolveZone(r.zone_id)
                    return (
                      <tr key={r.id} className="align-top">
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900">{cat.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{cat.code}</p>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-800">{zone.name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 max-w-[180px]">
                            {zone.regions}
                          </p>
                        </td>
                        <td className="py-3 px-3 font-medium">{r.fuel}</td>
                        <td className="py-3 px-3">
                          {r.power_min} – {r.power_max} CV
                        </td>
                        <td className="py-3 px-3">{r.trailer ? 'Oui' : 'Non'}</td>
                        <td className="py-3 px-3 font-mono font-semibold text-blue-700">
                          {Number(r.rc_amount).toLocaleString('fr-FR')} F
                        </td>
                        <td className="py-3 px-3 text-right">
                          {r.is_active && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMutation.mutate(r.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function FeeSchedulePanel() {
  const qc = useQueryClient()
  const [selectedInsurerId, setSelectedInsurerId] = useState('')
  const [form, setForm] = useState<Partial<FeeSchedule>>({})

  const { data: insurers = [] } = useQuery({
    queryKey: ['insurers'],
    queryFn: () => insurersApi.list(),
  })

  const activeInsurers = (insurers as Insurer[]).filter(
    (i) => i.is_active && insurerSupportsLine(i, 'AUTO'),
  )

  useEffect(() => {
    if (!selectedInsurerId && activeInsurers.length > 0) {
      setSelectedInsurerId(activeInsurers[0].id)
    }
  }, [activeInsurers, selectedInsurerId])

  const { data: fees, isLoading } = useQuery({
    queryKey: ['fee-schedule', selectedInsurerId],
    queryFn: () => tariffApi.getFeeSchedule(selectedInsurerId) as Promise<FeeSchedule>,
    enabled: !!selectedInsurerId,
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedInsurerId) throw new Error('Sélectionnez un assureur')
      return tariffApi.setFeeSchedule({
        ...fees,
        ...form,
        insurer_id: selectedInsurerId,
      })
    },
    onSuccess: (data) => {
      setForm({})
      qc.invalidateQueries({ queryKey: ['fee-schedule', selectedInsurerId] })
      toast.success('Grille de frais enregistrée')
      void data
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const current = { ...(fees || {}), ...form }

  const setNum = (key: keyof FeeSchedule, value: string, pct = false) => {
    const n = Number(value)
    setForm((prev) => ({
      ...prev,
      [key]: pct ? n / 100 : n,
    }))
  }

  const fields: Array<{ key: keyof FeeSchedule; label: string; pct?: boolean }> = [
    { key: 'dr_rate', label: 'Taux DR (%)', pct: true },
    { key: 'dr_amount', label: 'DR fixe (FCFA) — si taux = 0' },
    { key: 'ipt_amount', label: 'IPT (FCFA)' },
    { key: 'acc_amount', label: 'Accessoires (FCFA)' },
    { key: 'fc_amount', label: 'FC / ASAC (FCFA)' },
    { key: 'cr_amount', label: 'Carte rose (FCFA)' },
    { key: 'tva_rate', label: 'TVA (%)', pct: true },
    { key: 'remise_max_pct', label: 'Remise max (%)' },
    { key: 'coeff_2m', label: 'Coeff. 2 mois (%)', pct: true },
    { key: 'coeff_4m', label: 'Coeff. 4 mois (%)', pct: true },
    { key: 'coeff_6m', label: 'Coeff. 6 mois (%)', pct: true },
    { key: 'coeff_12m', label: 'Coeff. 12 mois (%)', pct: true },
  ]

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardHeader className="pb-4 border-b border-gray-50">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400">
          Grille des frais par assureur
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-1 max-w-sm">
          <FieldLabel>Assureur</FieldLabel>
          <select
            className="w-full h-10 text-xs border border-gray-200 rounded-md px-2"
            value={selectedInsurerId}
            onChange={(e) => {
              setSelectedInsurerId(e.target.value)
              setForm({})
            }}
          >
            <option value="">— Sélectionner —</option>
            {activeInsurers.map((ins) => (
              <option key={ins.id} value={ins.id}>
                {ins.name} ({ins.code})
              </option>
            ))}
          </select>
        </div>

        {!selectedInsurerId ? (
          <p className="text-xs text-gray-400">
            Créez et sélectionnez un assureur pour éditer ses frais.
          </p>
        ) : isLoading && !fees ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map(({ key, label, pct }) => {
                const raw = current[key]
                const display =
                  raw === undefined || raw === null
                    ? ''
                    : pct
                      ? String(Number(raw) * 100)
                      : String(raw)
                return (
                  <div key={key} className="space-y-1">
                    <FieldLabel>{label}</FieldLabel>
                    <Input
                      type="number"
                      step={pct ? '0.01' : '1'}
                      value={display}
                      onChange={(e) => setNum(key, e.target.value, pct)}
                      className="h-10 text-xs"
                    />
                  </div>
                )
              })}
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="text-white"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Enregistrer les frais
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function ValidationCodePanel() {
  const user = useAuthStore((s) => s.user)
  const [customCode, setCustomCode] = useState('')
  const [password, setPassword] = useState('')
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState('')

  const setMutation = useMutation({
    mutationFn: () => tariffApi.setValidationCode(user!.id, customCode, password),
    onSuccess: () => {
      toast.success('Code de validation enregistré')
      setCustomCode('')
      setPassword('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const generateMutation = useMutation({
    mutationFn: () => tariffApi.generateValidationCode(user!.id, password),
    onSuccess: (data) => {
      setGeneratedCode(data.code)
      setPassword('')
      toast.success('Code généré — notez-le maintenant')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const verifyMutation = useMutation({
    mutationFn: () => tariffApi.verifyValidationCode(verifyCode),
    onSuccess: () => toast.success('Code valide'),
    onError: (e: Error) => toast.error(e.message),
  })

  if (!user?.id) {
    return (
      <Card className="border-gray-100 shadow-sm">
        <CardContent className="pt-6 text-xs text-slate-500">
          Session requise pour gérer le code de validation.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardHeader className="pb-4 border-b border-gray-50">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-blue-500" />
          Code de validation admin
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <p className="text-xs text-slate-600">
          Ce code à 6 chiffres est requis pour approuver les conversions prospects.
          La génération / modification exige votre <strong>mot de passe</strong>.
        </p>

        <div className="space-y-1 max-w-sm">
          <FieldLabel>Mot de passe (obligatoire)</FieldLabel>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Votre mot de passe"
            className="h-10 text-xs"
          />
        </div>

        <div className="space-y-2">
          <FieldLabel>Définir un code personnalisé</FieldLabel>
          <div className="flex gap-2 flex-wrap">
            <Input
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="h-10 text-xs font-mono tracking-widest max-w-[140px]"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!password) {
                  toast.error('Saisissez votre mot de passe')
                  return
                }
                if (customCode.length !== 6) {
                  toast.error('Le code doit contenir 6 chiffres')
                  return
                }
                setMutation.mutate()
              }}
              disabled={setMutation.isPending}
            >
              Enregistrer
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel>Générer un code aléatoire</FieldLabel>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!password) {
                toast.error('Saisissez votre mot de passe')
                return
              }
              generateMutation.mutate()
            }}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Générer
          </Button>
          {generatedCode && (
            <p className="text-lg font-mono font-bold text-blue-600 tracking-[0.3em]">
              {generatedCode}
            </p>
          )}
        </div>

        <div className="space-y-2 pt-2 border-t border-gray-50">
          <FieldLabel>Tester le code actuel</FieldLabel>
          <div className="flex gap-2">
            <Input
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="h-10 text-xs font-mono tracking-widest max-w-[140px]"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => verifyMutation.mutate()}
              disabled={verifyMutation.isPending || verifyCode.length !== 6}
            >
              Vérifier
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ProductLineTariffPanel() {
  const qc = useQueryClient()
  const [productLine, setProductLine] = useState<'SANTE' | 'VOYAGE' | 'AUTRE'>('SANTE')
  const [insurerId, setInsurerId] = useState('')
  const [label, setLabel] = useState('')
  const [baseAmount, setBaseAmount] = useState('')

  const { data: insurers = [] } = useQuery({
    queryKey: ['insurers'],
    queryFn: () => insurersApi.list(),
  })
  const branchInsurers = (Array.isArray(insurers) ? insurers : []).filter(
    (i) => i.is_active && insurerSupportsLine(i, productLine),
  )

  const { data: tariffs = [], isLoading } = useQuery({
    queryKey: ['product-line-tariffs', productLine],
    queryFn: () => tariffApi.listProductLineTariffs({ product_line: productLine }),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      tariffApi.createProductLineTariff({
        insurer_id: insurerId,
        product_line: productLine,
        label: label.trim(),
        base_amount: Number(baseAmount),
        is_active: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-line-tariffs'] })
      setLabel('')
      setBaseAmount('')
      toast.success('Tarif branche créé')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tariffApi.deleteProductLineTariff(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-line-tariffs'] })
      toast.success('Tarif désactivé')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const list = Array.isArray(tariffs) ? tariffs : []

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardHeader className="pb-4 border-b border-gray-50">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400">
          Tarifs Santé / Voyage / Autre
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-5">
        <div className="flex flex-wrap gap-2">
          {(['SANTE', 'VOYAGE', 'AUTRE'] as const).map((line) => (
            <Button
              key={line}
              type="button"
              size="sm"
              variant={productLine === line ? 'default' : 'outline'}
              onClick={() => {
                setProductLine(line)
                setInsurerId('')
              }}
            >
              {line}
            </Button>
          ))}
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <FieldLabel>Assureur ({productLine})</FieldLabel>
            <select
              value={insurerId}
              onChange={(e) => setInsurerId(e.target.value)}
              className="w-full h-10 text-xs border border-gray-200 rounded-md px-2 bg-white"
            >
              <option value="">Choisir…</option>
              {branchInsurers.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.code} — {i.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <FieldLabel>Libellé produit</FieldLabel>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex. Santé Famille Plus"
              className="h-10 text-xs"
            />
          </div>
          <div className="space-y-1">
            <FieldLabel>Montant de base (FCFA)</FieldLabel>
            <Input
              type="number"
              min="0"
              value={baseAmount}
              onChange={(e) => setBaseAmount(e.target.value)}
              className="h-10 text-xs"
            />
          </div>
          <Button
            type="button"
            variant="primary"
            className="text-white sm:col-span-3 w-fit"
            disabled={createMutation.isPending}
            onClick={() => {
              if (!insurerId) {
                toast.error('Choisissez un assureur de cette branche')
                return
              }
              if (!label.trim()) {
                toast.error('Saisissez un libellé')
                return
              }
              if (!baseAmount || Number(baseAmount) < 0) {
                toast.error('Montant invalide')
                return
              }
              createMutation.mutate()
            }}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            Ajouter le tarif
          </Button>
        </div>

        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        ) : list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
            Aucun tarif {productLine}. Créez d’abord un assureur de cette branche, puis un tarif.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50">
                <tr className="text-slate-500 uppercase">
                  <th className="py-3 px-3">Libellé</th>
                  <th className="py-3 px-3">Assureur</th>
                  <th className="py-3 px-3">Montant</th>
                  <th className="py-3 px-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {list.map((t) => {
                  const ins = (Array.isArray(insurers) ? insurers : []).find(
                    (i) => i.id === t.insurer_id,
                  )
                  return (
                    <tr key={t.id}>
                      <td className="py-3 px-3 font-semibold">{t.label}</td>
                      <td className="py-3 px-3">
                        {ins ? `${ins.code} — ${ins.name}` : t.insurer_id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-3 font-mono text-blue-700">
                        {Number(t.base_amount).toLocaleString('fr-FR')} F
                      </td>
                      <td className="py-3 px-3 text-right">
                        {t.is_active && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(t.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
