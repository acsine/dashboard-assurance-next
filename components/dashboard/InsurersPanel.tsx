'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  insurersApi,
  tariffApi,
  insurerProductLines,
  insurerSupportsLine,
  type FeeSchedule,
  type Insurer,
  type InsurerPolicy,
  type InsurerWithFees,
  type ProductLineCode,
} from '@/lib/api/mobi-assur'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus, RefreshCw, Upload } from 'lucide-react'

const ALL_PRODUCT_LINES: { code: ProductLineCode; label: string }[] = [
  { code: 'AUTO', label: 'Automobile' },
  { code: 'SANTE', label: 'Santé' },
  { code: 'VOYAGE', label: 'Voyage' },
  { code: 'AUTRE', label: 'Autre' },
]

function ProductLinesCheckboxes({
  value,
  onChange,
}: {
  value: ProductLineCode[]
  onChange: (next: ProductLineCode[]) => void
}) {
  const toggle = (code: ProductLineCode) => {
    if (value.includes(code)) {
      const next = value.filter((c) => c !== code)
      if (next.length === 0) {
        toast.error('Sélectionnez au moins une branche')
        return
      }
      onChange(next)
    } else {
      onChange([...value, code])
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {ALL_PRODUCT_LINES.map((line) => {
        const checked = value.includes(line.code)
        return (
          <label
            key={line.code}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] cursor-pointer ${
              checked
                ? 'border-blue-500 bg-blue-50 text-blue-800 font-semibold'
                : 'border-gray-200 bg-white text-gray-600'
            }`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={checked}
              onChange={() => toggle(line.code)}
            />
            {line.label}
          </label>
        )
      })}
    </div>
  )
}

function generateInsurerCode(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 10)
  const rand = Math.random().toString(16).slice(2, 6).toUpperCase()
  const ts = Date.now().toString(36).toUpperCase().slice(-6)
  const base = slug || 'INS'
  return `${base}_${rand}_${ts}`.slice(0, 30)
}

function formatMoney(n?: number | null) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('fr-FR')
}

function formatPct(n?: number | null) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return `${(Number(n) * 100).toFixed(2)} %`
}

const FEE_FIELDS: Array<{ key: keyof FeeSchedule; label: string; pct?: boolean }> = [
  { key: 'dr_rate', label: 'Taux DR (%)', pct: true },
  { key: 'dr_amount', label: 'DR fixe (FCFA)' },
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

function FeesComparisonChart({ items }: { items: InsurerWithFees[] }) {
  const rows = items.filter((i) => i.is_active && i.fees)
  const maxVal = Math.max(
    1,
    ...rows.flatMap((i) => [
      Number(i.fees?.acc_amount || 0),
      Number(i.fees?.fc_amount || 0),
      Number(i.fees?.cr_amount || 0),
    ]),
  )

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
        Aucune grille de frais à comparer. Importez un Excel ou éditez les frais.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" /> ACC
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> FC/ASAC
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Carte rose
        </span>
      </div>
      <div className="space-y-3">
        {rows.map((ins) => {
          const acc = Number(ins.fees?.acc_amount || 0)
          const fc = Number(ins.fees?.fc_amount || 0)
          const cr = Number(ins.fees?.cr_amount || 0)
          return (
            <div key={ins.id} className="space-y-1">
              <p className="text-xs font-semibold text-slate-700">
                {ins.name}{' '}
                <span className="text-slate-400 font-normal">({ins.code})</span>
              </p>
              <div className="flex gap-1.5 h-7 items-end">
                <div
                  className="bg-blue-500 rounded-t min-w-[4px] transition-all"
                  style={{ height: `${Math.max(8, (acc / maxVal) * 100)}%`, width: '28%' }}
                  title={`ACC ${formatMoney(acc)}`}
                />
                <div
                  className="bg-emerald-500 rounded-t min-w-[4px] transition-all"
                  style={{ height: `${Math.max(8, (fc / maxVal) * 100)}%`, width: '28%' }}
                  title={`FC ${formatMoney(fc)}`}
                />
                <div
                  className="bg-amber-500 rounded-t min-w-[4px] transition-all"
                  style={{ height: `${Math.max(8, (cr / maxVal) * 100)}%`, width: '28%' }}
                  title={`CR ${formatMoney(cr)}`}
                />
              </div>
              <div className="flex gap-3 text-[10px] text-slate-500 font-mono">
                <span>{formatMoney(acc)}</span>
                <span>{formatMoney(fc)}</span>
                <span>{formatMoney(cr)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function InsurerFeesEditModal({
  insurer,
  fees,
  onClose,
}: {
  insurer: Insurer
  fees: FeeSchedule | null | undefined
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Partial<FeeSchedule>>({})

  useEffect(() => {
    setForm({})
  }, [insurer.id, fees])

  const current = { ...(fees || {}), ...form }

  const setNum = (key: keyof FeeSchedule, value: string, pct = false) => {
    const n = Number(value)
    setForm((prev) => ({
      ...prev,
      [key]: pct ? n / 100 : n,
    }))
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      tariffApi.setFeeSchedule({
        ...fees,
        ...form,
        insurer_id: insurer.id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insurers-with-fees'] })
      qc.invalidateQueries({ queryKey: ['fee-schedule'] })
      toast.success('Frais enregistrés')
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide rounded-2xl bg-white shadow-2xl border border-gray-100">
        <div className="p-5 border-b border-gray-50">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Modifier les tarifs — {insurer.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1">{insurer.code}</p>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEE_FIELDS.map(({ key, label, pct }) => {
            const raw = current[key]
            const display =
              raw == null
                ? ''
                : pct
                  ? String(Number(raw) * 100)
                  : String(raw)
            return (
              <div key={String(key)} className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  {label}
                </label>
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
        <div className="p-5 pt-0 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="button"
            variant="primary"
            className="text-white"
            disabled={saveMutation.isPending}
            isLoading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  )
}

export function InsurersPanelContent() {
  const [newInsurerCode, setNewInsurerCode] = useState('')
  const [newInsurerName, setNewInsurerName] = useState('')
  const [newInsurerLines, setNewInsurerLines] = useState<ProductLineCode[]>(['AUTO'])
  const [editingLinesInsurerId, setEditingLinesInsurerId] = useState<string | null>(null)
  const [editingLinesDraft, setEditingLinesDraft] = useState<ProductLineCode[]>(['AUTO'])
  const [pickingInsurerId, setPickingInsurerId] = useState<string | null>(null)
  const [importingInsurerId, setImportingInsurerId] = useState<string | null>(null)
  const [lastImportSummary, setLastImportSummary] = useState<string | null>(null)
  const [lastImportedInsurerId, setLastImportedInsurerId] = useState<string | null>(null)
  const [editingInsurer, setEditingInsurer] = useState<InsurerWithFees | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingInsurerIdRef = useRef<string | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['insurers-with-fees'],
    queryFn: () => insurersApi.listWithFees(),
  })

  const insurers = useMemo(() => {
    if (data?.items && Array.isArray(data.items)) return data.items
    return [] as InsurerWithFees[]
  }, [data])

  const policy: InsurerPolicy = data?.policy || { mode: 'AUTO', selected_insurer_id: null }

  useEffect(() => {
    const onFocus = () => {
      window.setTimeout(() => setPickingInsurerId(null), 250)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['insurers-with-fees'] })
    queryClient.invalidateQueries({ queryKey: ['insurers'] })
    queryClient.invalidateQueries({ queryKey: ['fee-schedule'] })
  }

  const createInsurerMutation = useMutation({
    mutationFn: ({
      code,
      name,
      product_lines,
    }: {
      code: string
      name: string
      product_lines: ProductLineCode[]
    }) => insurersApi.create({ code, name, product_lines, is_active: true }),
    onSuccess: () => {
      setNewInsurerCode('')
      setNewInsurerName('')
      setNewInsurerLines(['AUTO'])
      refresh()
      toast.success('Assureur créé avec succès')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur lors de la création'),
  })

  const toggleInsurerMutation = useMutation({
    mutationFn: (ins: InsurerWithFees) =>
      insurersApi.update(ins.id, {
        code: ins.code,
        name: ins.name,
        product_lines: insurerProductLines(ins),
        is_active: !ins.is_active,
      }),
    onSuccess: () => {
      refresh()
      toast.success("Statut de l'assureur mis à jour")
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur lors de la mise à jour'),
  })

  const updateLinesMutation = useMutation({
    mutationFn: ({
      ins,
      product_lines,
    }: {
      ins: InsurerWithFees
      product_lines: ProductLineCode[]
    }) =>
      insurersApi.update(ins.id, {
        code: ins.code,
        name: ins.name,
        product_lines,
        is_active: ins.is_active,
      }),
    onSuccess: () => {
      setEditingLinesInsurerId(null)
      refresh()
      toast.success('Branches mises à jour')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur branches'),
  })

  const policyMutation = useMutation({
    mutationFn: (payload: InsurerPolicy) => insurersApi.setPolicy(payload),
    onSuccess: () => {
      refresh()
      toast.success('Politique tarifaire mise à jour (utilisée par les agents)')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur politique'),
  })

  const importTariffMutation = useMutation({
    mutationFn: ({ insurerId, file }: { insurerId: string; file: File }) =>
      insurersApi.importTariff(insurerId, file),
    onSuccess: (result, variables) => {
      const payload = (result && typeof result === 'object' ? result : {}) as Record<string, unknown>
      const created = payload.created ?? 0
      const updated = payload.updated ?? 0
      const applied = payload.applied_as_defaults === true
      const warnings = Array.isArray(payload.warnings) ? payload.warnings : []
      const sheets = Array.isArray(payload.sheets_parsed) ? payload.sheets_parsed : []
      setLastImportedInsurerId(variables.insurerId)
      setLastImportSummary(
        [
          `créées=${created}`,
          `mises à jour=${updated}`,
          sheets.length ? `feuilles=${sheets.join(',')}` : null,
          applied ? 'appliqué comme défauts agence' : null,
          warnings.length ? `alertes=${warnings.length}` : null,
        ]
          .filter(Boolean)
          .join(' · ') || 'Tarif importé',
      )
      queryClient.invalidateQueries({ queryKey: ['tariff-lines'] })
      queryClient.invalidateQueries({ queryKey: ['tariff-categories'] })
      queryClient.invalidateQueries({ queryKey: ['tariff-zones'] })
      queryClient.invalidateQueries({ queryKey: ['pricing-settings'] })
      refresh()
      toast.success(
        applied
          ? 'Tarif importé et appliqué comme paramètres par défaut'
          : 'Tarif Excel importé avec succès',
      )
      if (warnings.length > 0) toast.message(String(warnings[0]))
    },
    onError: (err: Error, variables) => {
      setLastImportedInsurerId(variables.insurerId)
      toast.error(err.message || "Erreur lors de l'import du tarif")
      setLastImportSummary(`Échec : ${err.message}`)
    },
    onSettled: () => {
      setImportingInsurerId(null)
      pendingInsurerIdRef.current = null
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
  })

  const openFilePicker = async (insurerId: string) => {
    if (importTariffMutation.isPending || pickingInsurerId) return
    pendingInsurerIdRef.current = insurerId
    setPickingInsurerId(insurerId)
    setLastImportSummary(null)
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })
    await new Promise((r) => setTimeout(r, 80))
    fileInputRef.current?.click()
  }

  const handleFileSelected = (file: File | null) => {
    const insurerId = pendingInsurerIdRef.current
    setPickingInsurerId(null)
    if (!file || !insurerId) {
      pendingInsurerIdRef.current = null
      return
    }
    setImportingInsurerId(insurerId)
    importTariffMutation.mutate({ insurerId, file })
  }

  const handleGenerateCode = () => {
    if (!newInsurerName.trim()) {
      toast.error("Saisissez d'abord le nom")
      return
    }
    setNewInsurerCode(generateInsurerCode(newInsurerName.trim()))
  }

  const autoInsurers = insurers.filter(
    (i) => i.is_active && insurerSupportsLine(i, 'AUTO'),
  )
  const autoWithFees = autoInsurers.filter((i) => i.fees != null)
  let agentsBlockReason: string | null = null
  if (autoInsurers.length === 0) {
    agentsBlockReason =
      'créez au moins un assureur AUTO actif et importez son tarif Excel'
  } else if (policy.mode === 'MANUAL' && !policy.selected_insurer_id) {
    agentsBlockReason = 'sélectionnez l’assureur agents en mode MANUEL'
  } else if (autoWithFees.length === 0) {
    agentsBlockReason =
      'importez une grille de frais (FeeSchedule) pour au moins un assureur AUTO'
  } else if (
    policy.mode === 'MANUAL' &&
    policy.selected_insurer_id &&
    !autoWithFees.some((i) => i.id === policy.selected_insurer_id)
  ) {
    agentsBlockReason =
      'l’assureur agents n’a pas de grille de frais — importez son tarif'
  }
  const agentsQuoteReady = agentsBlockReason == null

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
      />

      {importingInsurerId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/35 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-6 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm font-semibold text-slate-700">Import du tarif Excel…</p>
          </div>
        </div>
      )}

      {editingInsurer && (
        <InsurerFeesEditModal
          insurer={editingInsurer}
          fees={editingInsurer.fees}
          onClose={() => setEditingInsurer(null)}
        />
      )}

      {isLoading ? (
        <div className="py-8 text-center text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500 mb-2" />
          Chargement des assureurs...
        </div>
      ) : (
        <>
          <div className="p-4 border border-blue-100 rounded-lg bg-blue-50/40 space-y-3">
            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider">
              Politique tarifaire globale
            </h4>
            {!agentsQuoteReady && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 font-medium">
                Les devis agents sont bloqués : {agentsBlockReason}
              </div>
            )}
            <p className="text-xs text-gray-600">
              AUTO = meilleur PTTC parmi les assureurs actifs. MANUEL = tous les devis agents
              utilisent la compagnie sélectionnée (frais + barème RC de cet assureur).
            </p>
            {policy.mode === 'MANUAL' && policy.selected_insurer && (
              <p className="text-xs font-semibold text-blue-700">
                Assureur agents actuel : {policy.selected_insurer.name} (
                {policy.selected_insurer.code})
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={policy.mode === 'AUTO' ? 'default' : 'outline'}
                onClick={() =>
                  policyMutation.mutate({ mode: 'AUTO', selected_insurer_id: null })
                }
              >
                AUTO — meilleur prix
              </Button>
              <Button
                type="button"
                size="sm"
                variant={policy.mode === 'MANUAL' ? 'default' : 'outline'}
                onClick={() => {
                  const first = autoInsurers[0]
                  if (!first) {
                    toast.error('Créez d’abord un assureur AUTO actif')
                    return
                  }
                  policyMutation.mutate({
                    mode: 'MANUAL',
                    selected_insurer_id: first.id,
                  })
                }}
              >
                MANUEL
              </Button>
            </div>
            {policy.mode === 'MANUAL' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {autoInsurers.map((ins) => (
                  <button
                    key={ins.id}
                    type="button"
                    onClick={() =>
                      policyMutation.mutate({
                        mode: 'MANUAL',
                        selected_insurer_id: ins.id,
                      })
                    }
                    className={`text-left p-3 rounded border text-xs ${
                      policy.selected_insurer_id === ins.id
                        ? 'border-blue-500 bg-blue-50 font-semibold'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    {ins.name}
                    <div className="text-gray-400">{ins.code}</div>
                    {policy.selected_insurer_id === ins.id && (
                      <span className="mt-1 inline-block text-[10px] font-bold text-blue-600 uppercase">
                        Assureur agents
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!newInsurerCode.trim() || !newInsurerName.trim()) {
                toast.error('Veuillez remplir tous les champs')
                return
              }
              if (newInsurerLines.length === 0) {
                toast.error('Sélectionnez au moins une branche')
                return
              }
              createInsurerMutation.mutate({
                code: newInsurerCode,
                name: newInsurerName,
                product_lines: newInsurerLines,
              })
            }}
            className="p-4 border border-gray-100 rounded-lg bg-gray-50/30 space-y-3"
          >
            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              Ajouter un Assureur
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex gap-1.5">
                <Input
                  placeholder="Code"
                  value={newInsurerCode}
                  onChange={(e) => setNewInsurerCode(e.target.value)}
                  className="h-10 text-xs border-gray-200"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-10 px-2"
                  title="Générer depuis le nom"
                  onClick={handleGenerateCode}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Input
                placeholder="Nom"
                value={newInsurerName}
                onChange={(e) => setNewInsurerName(e.target.value)}
                className="h-10 text-xs border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Branches couvertes
              </p>
              <ProductLinesCheckboxes value={newInsurerLines} onChange={setNewInsurerLines} />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={createInsurerMutation.isPending}
              isLoading={createInsurerMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-1" /> Créer
            </Button>
          </form>

          <div className="space-y-3">
            {insurers.map((insurer) => {
              const lines = insurerProductLines(insurer)
              const hasAuto = insurerSupportsLine(insurer, 'AUTO')
              const hasOtherBranches = lines.some((l) => l !== 'AUTO')
              const isEditingLines = editingLinesInsurerId === insurer.id
              return (
              <div
                key={insurer.id}
                className="p-4 border border-gray-100 rounded-lg bg-white space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="font-bold text-sm text-gray-900">{insurer.name}</h5>
                      {insurer.is_selected_for_agents && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                          Assureur agents
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{insurer.code}</span>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {lines.map((line) => (
                        <span
                          key={line}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600"
                        >
                          {line}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleInsurerMutation.mutate(insurer)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      insurer.is_active
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {insurer.is_active ? 'Actif' : 'Inactif'}
                  </button>
                </div>

                {isEditingLines ? (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 space-y-2">
                    <p className="text-[10px] font-bold text-blue-800 uppercase">Branches</p>
                    <ProductLinesCheckboxes
                      value={editingLinesDraft}
                      onChange={setEditingLinesDraft}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={updateLinesMutation.isPending}
                        isLoading={updateLinesMutation.isPending}
                        onClick={() =>
                          updateLinesMutation.mutate({
                            ins: insurer,
                            product_lines: editingLinesDraft,
                          })
                        }
                      >
                        Enregistrer
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingLinesInsurerId(null)}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="pt-3 border-t border-gray-50 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => setEditingInsurer(insurer)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Éditer frais
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      setEditingLinesInsurerId(insurer.id)
                      setEditingLinesDraft(lines)
                    }}
                  >
                    Branches
                  </Button>
                  {hasAuto ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      isLoading={
                        pickingInsurerId === insurer.id || importingInsurerId === insurer.id
                      }
                      disabled={
                        !!pickingInsurerId ||
                        !!importingInsurerId ||
                        importTariffMutation.isPending
                      }
                      onClick={() => openFilePicker(insurer.id)}
                      className="text-xs"
                    >
                      {pickingInsurerId === insurer.id ? (
                        <>Ouverture du sélecteur…</>
                      ) : importingInsurerId === insurer.id ? (
                        <>Import en cours…</>
                      ) : (
                        <>
                          <Upload className="h-3.5 w-3.5 mr-1" /> Importer Tarif Excel (.xlsx)
                        </>
                      )}
                    </Button>
                  ) : null}
                  {hasOtherBranches ? (
                    <p className="text-[11px] text-slate-500 self-center">
                      Tarifs hors auto : onglet Santé / Voyage.
                    </p>
                  ) : null}
                  {lastImportedInsurerId === insurer.id && lastImportSummary && (
                    <p className="w-full text-[10px] text-slate-500 break-all leading-relaxed">
                      {lastImportSummary}
                    </p>
                  )}
                </div>
              </div>
              )
            })}
            {insurers.length === 0 && (
              <div className="py-8 text-center text-gray-400">
                <p className="text-sm">Aucun assureur créé</p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Tableau des frais par assureur
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-500 uppercase">
                  <tr>
                    <th className="py-3 px-3">Assureur</th>
                    <th className="py-3 px-3">Code</th>
                    <th className="py-3 px-3">ACC</th>
                    <th className="py-3 px-3">FC/ASAC</th>
                    <th className="py-3 px-3">Carte rose</th>
                    <th className="py-3 px-3">IPT</th>
                    <th className="py-3 px-3">DR %</th>
                    <th className="py-3 px-3">TVA %</th>
                    <th className="py-3 px-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {insurers.map((ins) => (
                    <tr key={ins.id}>
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {ins.name}
                        {ins.is_selected_for_agents && (
                          <span className="ml-1 text-[10px] text-blue-600">agents</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-500">{ins.code}</td>
                      <td className="py-3 px-3 font-mono">{formatMoney(ins.fees?.acc_amount)}</td>
                      <td className="py-3 px-3 font-mono">{formatMoney(ins.fees?.fc_amount)}</td>
                      <td className="py-3 px-3 font-mono">{formatMoney(ins.fees?.cr_amount)}</td>
                      <td className="py-3 px-3 font-mono">{formatMoney(ins.fees?.ipt_amount)}</td>
                      <td className="py-3 px-3 font-mono">{formatPct(ins.fees?.dr_rate)}</td>
                      <td className="py-3 px-3 font-mono">{formatPct(ins.fees?.tva_rate)}</td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingInsurer(ins)}
                        >
                          <Pencil className="h-3.5 w-3.5 text-blue-600" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Comparaison ACC / FC / Carte rose
            </h4>
            <FeesComparisonChart items={insurers} />
          </div>
        </>
      )}
    </div>
  )
}
