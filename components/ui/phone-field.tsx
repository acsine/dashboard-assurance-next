'use client'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { PHONE_COUNTRIES } from '@/lib/phone'
import type { CountryCode } from 'libphonenumber-js'

interface PhoneFieldProps {
  value: string
  onChange: (value: string) => void
  country: CountryCode | string
  onCountryChange: (country: CountryCode) => void
  required?: boolean
  disabled?: boolean
  placeholder?: string
  error?: string
  className?: string
  id?: string
  name?: string
}

export function PhoneField({
  value,
  onChange,
  country,
  onCountryChange,
  required,
  disabled,
  placeholder,
  error,
  className,
  id,
  name,
}: PhoneFieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex">
        <select
          value={country}
          onChange={(e) => onCountryChange(e.target.value as CountryCode)}
          disabled={disabled}
          className="w-28 h-11 rounded-l-xl border border-slate-200 border-r-0 bg-white px-2 text-xs font-bold text-slate-900 disabled:opacity-50"
          aria-label="Country code"
        >
          {PHONE_COUNTRIES.map((c) => (
            <option key={c.iso} value={c.iso}>
              {c.flag} {c.iso} ({c.dial})
            </option>
          ))}
        </select>
        <Input
          id={id}
          name={name}
          type="tel"
          autoComplete="tel"
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-11 text-xs border-slate-200 rounded-l-none rounded-r-xl"
        />
      </div>
      {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
    </div>
  )
}
