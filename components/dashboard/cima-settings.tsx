'use client'

import dynamic from 'next/dynamic'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import {
  tariffApi,
  type CirculationZone,
  type ContractDuration,
  type FeeSchedule,
  type RcRate,
  type VehicleCategory,
} from '@/lib/api/mobi-assur'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Plus, Save, Trash2, RefreshCw, KeyRound, Pencil, X } from 'lucide-react'

const CameroonZonesMap = dynamic(() => import('./CameroonZonesMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-400">
      Chargement de la carte…
    </div>
  ),
})

const FUEL_OPTIONS = ['ESSENCE', 'DIESEL', 'ELECTRIQUE', 'HYBRIDE']

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
  const [name, setName] = useState('')
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [citySearch, setCitySearch] = useState('')

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['tariff-zones'],
    queryFn: () => tariffApi.listZones(),
  })

  const { data: regions = [] } = useQuery({
    queryKey: ['geo-regions-cm'],
    queryFn: () => tariffApi.geoRegions(),
  })

  const regionList = useMemo(() => {
    const raw = Array.isArray(regions) ? regions : []
    const q = citySearch.trim().toLowerCase()
    if (!q) return raw
    return raw.filter((r) => r.name?.toLowerCase().includes(q))
  }, [regions, citySearch])

  const createMutation = useMutation({
    mutationFn: () =>
      tariffApi.createZone({
        name: name.trim(),
        cities: selectedCities,
        is_active: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tariff-zones'] })
      setName('')
      setSelectedCities([])
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

  const toggleCity = (city: string) => {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city],
    )
  }

  const list = Array.isArray(zones) ? zones : []

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardHeader className="pb-4 border-b border-gray-50">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400">
          Zones de circulation
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        ) : (
          list.map((z: CirculationZone) => (
            <div key={z.id} className="border border-gray-100 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-slate-900 flex-1">{z.name}</p>
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
              <p className="text-[11px] text-slate-500 mt-1">
                {(z.cities || []).join(', ') || 'Aucune ville'}
              </p>
            </div>
          ))
        )}

        <div className="space-y-3 pt-2 border-t border-gray-50">
          <FieldLabel>Nom de la zone</FieldLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 text-xs" />

          <FieldLabel>Carte du Cameroun</FieldLabel>
          <CameroonZonesMap
            regions={Array.isArray(regions) ? regions : []}
            selectedCities={selectedCities}
            onToggleCity={toggleCity}
          />

          <FieldLabel>Villes / régions (liste)</FieldLabel>
          <Input
            placeholder="Filtrer les régions…"
            value={citySearch}
            onChange={(e) => setCitySearch(e.target.value)}
            className="h-10 text-xs"
          />
          <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-lg p-2 flex flex-wrap gap-1.5">
            {regionList.map((r) => {
              const label = r.name || ''
              const selected = selectedCities.includes(label)
              return (
                <button
                  key={`${r.code || label}`}
                  type="button"
                  onClick={() => toggleCity(label)}
                  className={`px-2 py-1 rounded-md text-[10px] font-semibold border transition-colors ${
                    selected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          {selectedCities.length > 0 && (
            <p className="text-[11px] text-slate-500">
              Sélection : {selectedCities.join(', ')}
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!name.trim()) {
                toast.error('Nom de zone requis')
                return
              }
              createMutation.mutate()
            }}
            disabled={createMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-1" />
            Créer la zone
          </Button>
        </div>
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
  const [categoryId, setCategoryId] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [fuel, setFuel] = useState('ESSENCE')
  const [powerMin, setPowerMin] = useState('1')
  const [powerMax, setPowerMax] = useState('99')
  const [trailer, setTrailer] = useState(false)
  const [rcAmount, setRcAmount] = useState('')

  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['tariff-lines'],
    queryFn: () => tariffApi.listTariffLines(),
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
      qc.invalidateQueries({ queryKey: ['tariff-lines'] })
      setRcAmount('')
      toast.success('Ligne RC créée')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tariffApi.deleteTariffLine(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tariff-lines'] })
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

        {/* Tableau lisible */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
            Lignes enregistrées
          </p>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          ) : list.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
              Aucune ligne tarifaire. Remplissez le formulaire ci-dessus pour en ajouter une.
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
      </CardContent>
    </Card>
  )
}

export function FeeSchedulePanel() {
  const qc = useQueryClient()
  const [form, setForm] = useState<Partial<FeeSchedule>>({})

  const { data: fees, isLoading } = useQuery({
    queryKey: ['fee-schedule'],
    queryFn: () => tariffApi.getFeeSchedule(),
  })

  const saveMutation = useMutation({
    mutationFn: () => tariffApi.setFeeSchedule(form),
    onSuccess: (data) => {
      setForm(data)
      qc.invalidateQueries({ queryKey: ['fee-schedule'] })
      toast.success('Grille de frais enregistrée')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const current = { ...fees, ...form }

  const setNum = (key: keyof FeeSchedule, value: string, pct = false) => {
    const n = Number(value)
    setForm((prev) => ({
      ...prev,
      [key]: pct ? n / 100 : n,
    }))
  }

  if (isLoading && !fees) {
    return <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
  }

  const fields: Array<{ key: keyof FeeSchedule; label: string; pct?: boolean }> = [
    { key: 'dr_amount', label: 'DR (FCFA)' },
    { key: 'ipt_amount', label: 'IPT (FCFA)' },
    { key: 'acc_amount', label: 'Accessoires (FCFA)' },
    { key: 'fc_amount', label: 'FC / ASAC (FCFA)' },
    { key: 'cr_amount', label: 'Carte rose (FCFA)' },
    { key: 'vignette_amount', label: 'Vignette (FCFA)' },
    { key: 'tax_rate_assurance', label: 'Taxe assurance (%)', pct: true },
    { key: 'tva_rate', label: 'TVA (%)', pct: true },
    { key: 'remise_max_pct', label: 'Remise max (%)' },
  ]

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardHeader className="pb-4 border-b border-gray-50">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400">
          Grille des frais légaux
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
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
      </CardContent>
    </Card>
  )
}

export function ValidationCodePanel() {
  const user = useAuthStore((s) => s.user)
  const [customCode, setCustomCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState('')

  const setMutation = useMutation({
    mutationFn: () => tariffApi.setValidationCode(user!.id, customCode),
    onSuccess: () => {
      toast.success('Code de validation enregistré')
      setCustomCode('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const generateMutation = useMutation({
    mutationFn: () => tariffApi.generateValidationCode(user!.id),
    onSuccess: (data) => {
      setGeneratedCode(data.code)
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
          Utilisateur connecté : <strong>{user.full_name || user.email || user.id.slice(0, 8)}</strong>
        </p>

        <div className="space-y-2">
          <FieldLabel>Définir un code personnalisé</FieldLabel>
          <div className="flex gap-2">
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
            onClick={() => generateMutation.mutate()}
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
              onClick={() => {
                if (verifyCode.length !== 6) {
                  toast.error('Code à 6 chiffres requis')
                  return
                }
                verifyMutation.mutate()
              }}
              disabled={verifyMutation.isPending}
            >
              Vérifier
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
