import {
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js'

export const DEFAULT_PHONE_COUNTRY: CountryCode = 'CM'

export const PHONE_COUNTRIES: { iso: CountryCode; dial: string; flag: string }[] = [
  { iso: 'CM', dial: '+237', flag: '🇨🇲' },
  { iso: 'CI', dial: '+225', flag: '🇨🇮' },
  { iso: 'SN', dial: '+221', flag: '🇸🇳' },
  { iso: 'GA', dial: '+241', flag: '🇬🇦' },
  { iso: 'CG', dial: '+242', flag: '🇨🇬' },
  { iso: 'TD', dial: '+235', flag: '🇹🇩' },
  { iso: 'CF', dial: '+236', flag: '🇨🇫' },
  { iso: 'GQ', dial: '+240', flag: '🇬🇶' },
  { iso: 'FR', dial: '+33', flag: '🇫🇷' },
]

export interface ParsedPhone {
  e164: string
  nationalNumber: string
  country: CountryCode
}

const DIAL_TO_ISO: Record<string, CountryCode> = {
  '237': 'CM',
  '225': 'CI',
  '221': 'SN',
  '241': 'GA',
  '242': 'CG',
  '235': 'TD',
  '236': 'CF',
  '240': 'GQ',
  '33': 'FR',
}

export function resolvePhoneCountry(raw?: string | null): CountryCode {
  if (!raw) return DEFAULT_PHONE_COUNTRY
  const value = String(raw).trim().toUpperCase().replace(/^\+/, '')
  if (/^[A-Z]{2}$/.test(value)) return value as CountryCode
  if (DIAL_TO_ISO[value]) return DIAL_TO_ISO[value]
  return DEFAULT_PHONE_COUNTRY
}

export function parseValidPhone(
  raw: string,
  country: CountryCode = DEFAULT_PHONE_COUNTRY,
): ParsedPhone | null {
  const trimmed = raw?.trim()
  if (!trimmed) return null
  const phoneNumber = parsePhoneNumberFromString(trimmed, country)
  if (!phoneNumber?.isValid()) return null
  return {
    e164: phoneNumber.number,
    nationalNumber: phoneNumber.nationalNumber,
    country: phoneNumber.country || country,
  }
}

export function toE164OrThrow(
  raw: string,
  countryHint?: string | null,
  lineLabel?: string,
): ParsedPhone {
  const country = resolvePhoneCountry(countryHint)
  const parsed = parseValidPhone(String(raw), country)
  if (!parsed) {
    const prefix = lineLabel ? `${lineLabel}: ` : ''
    throw new Error(`${prefix}Numéro de téléphone invalide`)
  }
  return parsed
}
