'use client'

import { Input } from '@/components/ui/input'
import type { DriverType } from '@/lib/api/mobi-assur'
import type { DriverFields as DriverValues } from '@/lib/schemas/client-form'

type FieldKey = keyof DriverValues

export function DriverFields({
  driverType,
  values,
  errors = {},
  onTypeChange,
  onChange,
}: {
  driverType: DriverType
  values: DriverValues
  errors?: Record<string, string>
  onTypeChange: (value: DriverType) => void
  onChange: (key: FieldKey, value: string) => void
}) {
  const fields: Array<{ key: FieldKey; label: string; type?: string; disabled?: boolean }> = [
    {
      key: 'conducteur_nom',
      label: 'Nom complet',
      disabled: driverType === 'ASSURE' && !!values.conducteur_nom,
    },
    {
      key: 'conducteur_date_naissance',
      label: 'Date de naissance',
      type: 'date',
      disabled: driverType === 'ASSURE' && !!values.conducteur_date_naissance,
    },
    { key: 'conducteur_permis_cat', label: 'Catégorie du permis' },
    { key: 'conducteur_permis_num', label: 'Numéro du permis' },
    { key: 'conducteur_permis_date', label: 'Date du permis', type: 'date' },
  ]

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-black text-slate-900">Conducteur principal</legend>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Identité du conducteur">
        {(['ASSURE', 'AUTRE'] as const).map((type) => (
          <label
            key={type}
            className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-xs font-bold ${
              driverType === type ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200'
            }`}
          >
            <input
              type="radio"
              name="driver_type"
              value={type}
              checked={driverType === type}
              onChange={() => onTypeChange(type)}
            />
            {type === 'ASSURE' ? 'L’assuré' : 'Une autre personne'}
          </label>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field.key} className="space-y-1 text-xs font-bold text-slate-600">
            {field.label} *
            <Input
              type={field.type}
              value={values[field.key] ?? ''}
              disabled={field.disabled}
              onChange={(event) => onChange(field.key, event.target.value)}
              aria-invalid={!!errors[field.key]}
              className="h-11 text-xs"
            />
            {errors[field.key] && (
              <span className="block text-[11px] font-medium text-red-600">{errors[field.key]}</span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
