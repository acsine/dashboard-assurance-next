'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { NicheObjective } from '@/lib/api/mobi-assur'
import { PROOF_TYPE_OPTIONS } from '@/lib/objectives/proof-types'

const labelClass = 'block text-[10px] font-bold uppercase tracking-wider text-slate-500'
const selectClass =
  'flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600'

export const newObjective = (sortOrder = 0): NicheObjective => ({
  code: '',
  label: '',
  description: null,
  kind: 'QUANTITATIVE',
  target_value: 1,
  recurrence: 'MONTHLY',
  custom_interval_days: null,
  anchor_date: null,
  proof_type: 'REFERENCE',
  proof_instructions: null,
  points: 0,
  is_active: true,
  sort_order: sortOrder,
})

export function ObjectiveEditor({
  items,
  onChange,
}: {
  items: NicheObjective[]
  onChange: (items: NicheObjective[]) => void
}) {
  const update = (index: number, patch: Partial<NicheObjective>) =>
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)))

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <fieldset key={item.id || index} className="rounded-2xl border border-slate-200 bg-white p-4">
          <legend className="px-2 text-xs font-bold text-slate-700">Objectif {index + 1}</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1 sm:col-span-2">
              <label className={labelClass}>Libellé *</label>
              <Input value={item.label} onChange={(event) => update(index, { label: event.target.value })} />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Code *</label>
              <Input
                value={item.code}
                onChange={(event) =>
                  update(index, {
                    code: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
                  })
                }
                placeholder="CONTRACTS"
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Nature</label>
              <select
                className={selectClass}
                value={item.kind}
                onChange={(event) =>
                  update(index, { kind: event.target.value as NicheObjective['kind'] })
                }
              >
                <option value="QUANTITATIVE">Quantitatif</option>
                <option value="MONETARY">Monétaire (FCFA)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Cible *</label>
              <Input
                type="number"
                min="0.01"
                step={item.kind === 'MONETARY' ? '100' : '1'}
                value={item.target_value}
                onChange={(event) => update(index, { target_value: Number(event.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Période</label>
              <select
                className={selectClass}
                value={item.recurrence}
                onChange={(event) =>
                  update(index, {
                    recurrence: event.target.value as NicheObjective['recurrence'],
                  })
                }
              >
                <option value="MONTHLY">Mensuelle</option>
                <option value="QUARTERLY">Trimestrielle</option>
                <option value="ANNUAL">Annuelle</option>
                <option value="CUSTOM">Personnalisée</option>
              </select>
            </div>
            {item.recurrence === 'CUSTOM' && (
              <div className="space-y-1">
                <label className={labelClass}>Intervalle (jours) *</label>
                <Input
                  type="number"
                  min="1"
                  max="3660"
                  value={item.custom_interval_days || ''}
                  onChange={(event) =>
                    update(index, { custom_interval_days: Number(event.target.value) || null })
                  }
                />
              </div>
            )}
            <div className="space-y-1">
              <label className={labelClass}>Date d’ancrage</label>
              <Input
                type="date"
                value={item.anchor_date || ''}
                onChange={(event) => update(index, { anchor_date: event.target.value || null })}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Type de preuve</label>
              <select
                className={selectClass}
                value={item.proof_type}
                onChange={(event) =>
                  update(index, {
                    proof_type: event.target.value as NicheObjective['proof_type'],
                  })
                }
              >
                {PROOF_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Points</label>
              <Input
                type="number"
                min="0"
                value={item.points}
                onChange={(event) => update(index, { points: Number(event.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2 lg:col-span-3">
              <label className={labelClass}>Consigne de preuve</label>
              <Input
                value={item.proof_instructions || ''}
                onChange={(event) =>
                  update(index, { proof_instructions: event.target.value || null })
                }
                placeholder="Décrivez la preuve attendue"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full border-red-200 text-red-700"
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
              >
                <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" /> Retirer
              </Button>
            </div>
          </div>
        </fieldset>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange([...items, newObjective(items.length)])}
      >
        <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Ajouter un objectif
      </Button>
    </div>
  )
}
