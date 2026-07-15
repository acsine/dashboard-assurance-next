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

export const GUARANTEE_OPTIONS = [
  { key: 'RC', label: 'RC — Responsabilité Civile' },
  { key: 'DR', label: 'DR — Défense Recours' },
  { key: 'VOL_INCENDIE', label: 'Vol / Incendie' },
  { key: 'TC', label: 'TC — Tierce Collision' },
  { key: 'BRIS_GLACE', label: 'Bris de Glace' },
  { key: 'DOM', label: 'DOM — Dommages' },
  { key: 'INDIV_ACC', label: 'Individuelle Accidents' },
  { key: 'AUTRES', label: 'Autres garanties' },
] as const
