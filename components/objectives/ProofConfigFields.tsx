'use client'

import SearchableSelect from '@/components/ui/searchable-select'
import { Input } from '@/components/ui/input'
import type { ObjectiveMetric } from '@/lib/api/mobi-assur'
import { PROOF_TYPE_OPTIONS } from '@/lib/objectives/proof-types'

const labelClass = 'text-[10px] font-bold text-gray-500 uppercase tracking-wider block'

type ProofConfigFieldsProps = {
  proofType: ObjectiveMetric['proof_type']
  proofInstructions: string
  onProofTypeChange: (type: ObjectiveMetric['proof_type']) => void
  onProofInstructionsChange: (value: string) => void
  disabled?: boolean
  layout?: 'form' | 'compact'
  instructionsPlaceholder?: string
  /** Désactive le type tant qu’aucune consigne n’est saisie (table template). */
  lockTypeUntilInstructions?: boolean
}

export function ProofConfigFields({
  proofType,
  proofInstructions,
  onProofTypeChange,
  onProofInstructionsChange,
  disabled = false,
  layout = 'form',
  instructionsPlaceholder = 'Consigne ou précision sur la preuve attendue (optionnel)',
  lockTypeUntilInstructions = false,
}: ProofConfigFieldsProps) {
  const proofRequired = true
  const typeDisabled = disabled
  const gridClass =
    layout === 'form'
      ? 'grid grid-cols-1 sm:grid-cols-2 gap-4 sm:col-span-2 lg:col-span-4'
      : 'space-y-2 min-w-[15rem] max-w-md'

  return (
    <div className={gridClass}>
      <div className="space-y-1">
        <label className={labelClass}>Type de preuve</label>
        <SearchableSelect
          value={proofType}
          onChange={(value) => onProofTypeChange(value as ObjectiveMetric['proof_type'])}
          disabled={typeDisabled}
          options={PROOF_TYPE_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Consigne de preuve</label>
        <Input
          value={proofInstructions}
          onChange={(event) => onProofInstructionsChange(event.target.value)}
          disabled={disabled}
          placeholder={instructionsPlaceholder}
          className="h-10 text-xs border-gray-200"
        />
        <p className="text-[10px] font-semibold text-amber-700 mt-1">
          Une preuve par unité · validation admin obligatoire
        </p>
      </div>
    </div>
  )
}
