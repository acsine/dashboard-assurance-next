import { z } from 'zod'

export const optionalEmailSchema = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || z.string().email().safeParse(v).success, {
    message: 'Adresse email invalide',
  })

export function isAtLeast18(dateStr: string, today = new Date()): boolean {
  if (!dateStr) return false
  const dob = new Date(dateStr)
  if (Number.isNaN(dob.getTime())) return false
  const cutoff = new Date(today)
  cutoff.setFullYear(cutoff.getFullYear() - 18)
  return dob <= cutoff
}

const requiredText = (message: string) => z.string().trim().min(1, message)

export const insuredStepSchema = z.object({
  full_name: requiredText('Le nom complet est requis').min(2, 'Le nom doit contenir au moins 2 caractères'),
  country_code: z.string().length(2, 'Le code pays est requis'),
  phone: requiredText('Le téléphone est requis'),
  email: optionalEmailSchema,
  date_naissance: z
    .string()
    .refine((value) => isAtLeast18(value), 'L’assuré doit avoir au moins 18 ans'),
})

export const vehicleStepSchema = z.object({
  marque: requiredText('La marque est requise'),
  chassis_num: z
    .string()
    .trim()
    .transform((value) => value.replace(/\s/g, '').toUpperCase())
    .refine((value) => /^[A-Z0-9]{17}$/.test(value), 'Le VIN doit contenir exactement 17 caractères'),
  category_id: requiredText('La catégorie tarifaire est requise'),
  energie: requiredText('L’énergie est requise'),
  puissance_cv: z.coerce.number().int().min(1).max(99),
  usage: requiredText('L’usage est requis'),
  genre: requiredText('Le genre est requis'),
})

export const driverSchema = z.object({
  conducteur_nom: requiredText('Le nom du conducteur est requis'),
  conducteur_date_naissance: z
    .string()
    .refine((value) => isAtLeast18(value), 'Le conducteur doit avoir au moins 18 ans'),
  conducteur_permis_cat: requiredText('La catégorie du permis est requise'),
  conducteur_permis_num: requiredText('Le numéro de permis est requis'),
  conducteur_permis_date: requiredText('La date du permis est requise'),
})

export const contractStepSchema = driverSchema.extend({
  zone_id: requiredText('La zone est requise'),
  duration_id: requiredText('La durée est requise'),
  date_effet: requiredText('La date d’effet est requise'),
})

export type ValidationErrors = Record<string, string>

export function validationErrors(result: z.ZodSafeParseResult<unknown>): ValidationErrors {
  if (result.success) return {}
  return Object.fromEntries(
    result.error.issues.map((issue) => [String(issue.path[0] ?? 'form'), issue.message]),
  )
}

export function validateInsuredStep(values: unknown): ValidationErrors {
  return validationErrors(insuredStepSchema.safeParse(values))
}

export function validateVehicleStep(values: unknown): ValidationErrors {
  return validationErrors(vehicleStepSchema.safeParse(values))
}

export function validateContractStep(values: unknown): ValidationErrors {
  return validationErrors(contractStepSchema.safeParse(values))
}

export interface DriverFields {
  conducteur_nom?: string
  conducteur_date_naissance?: string
  conducteur_permis_cat?: string
  conducteur_permis_num?: string
  conducteur_permis_date?: string
}

export const DRIVER_FIELD_KEYS = [
  'conducteur_nom',
  'conducteur_date_naissance',
  'conducteur_permis_cat',
  'conducteur_permis_num',
  'conducteur_permis_date',
] as const

export function missingDriverFields(value: DriverFields): string[] {
  return DRIVER_FIELD_KEYS.filter((key) => !value[key]?.trim())
}

export interface TariffVehicleFields {
  category_id?: string | null
  energie?: string | null
  puissance_cv?: number | null
  zone_circulation?: string | null
}

export const VEHICLE_TARIFF_FIELD_KEYS = [
  'category_id',
  'energie',
  'puissance_cv',
  'zone_circulation',
] as const

export function missingVehicleTariffFields(vehicle?: TariffVehicleFields | null): string[] {
  if (!vehicle) return [...VEHICLE_TARIFF_FIELD_KEYS]
  return VEHICLE_TARIFF_FIELD_KEYS.filter((key) => {
    const value = vehicle[key]
    return value == null || value === '' || (key === 'puissance_cv' && Number(value) <= 0)
  })
}

export function durationMonthsToDays(months: number): number {
  return Math.min(365, Math.max(30, Math.round(months * (365 / 12))))
}

export function isUnconvertedProspectClient(client: {
  id: string
  prospect_id?: string
  att_num?: string
}): boolean {
  return !!client.prospect_id && (
    client.id === client.prospect_id ||
    client.att_num?.startsWith('CLI-P-') === true
  )
}
