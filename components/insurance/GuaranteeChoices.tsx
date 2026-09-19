'use client'

import type { FormOption } from '@/lib/api/mobi-assur'

export function GuaranteeChoices({
  options,
  value,
  onChange,
}: {
  options: FormOption[]
  value: Record<string, boolean>
  onChange: (value: Record<string, boolean>) => void
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-black text-slate-900">Garanties</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold hover:border-blue-300"
          >
            <input
              type="checkbox"
              checked={!!value[option.value]}
              onChange={() => onChange({ ...value, [option.value]: !value[option.value] })}
              className="h-4 w-4 rounded border-slate-300"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
