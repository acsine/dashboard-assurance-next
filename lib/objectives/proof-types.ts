import type { ObjectiveMetric } from '@/lib/api/mobi-assur'

export const PROOF_TYPE_OPTIONS: {
  value: ObjectiveMetric['proof_type']
  label: string
}[] = [
  { value: 'PHONE', label: 'Téléphone' },
  { value: 'REFERENCE', label: 'Référence' },
  { value: 'FILE', label: 'Fichier / photo' },
]

export function proofTypeLabel(type: string | undefined | null): string {
  return PROOF_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type ?? '—'
}
