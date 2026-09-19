import { describe, expect, it } from 'vitest'
import { ENTITY_SCHEMAS, validateHeaders, type EntityType } from '@/lib/excel/import-engine'

const ENTITY_TYPES = Object.keys(ENTITY_SCHEMAS) as EntityType[]

describe('détection des colonnes à l’import Excel', () => {
  it.each(ENTITY_TYPES)('accepte les libellés du modèle officiel (%s)', (entityType) => {
    const headers = ENTITY_SCHEMAS[entityType].fields.map((field) => field.label)

    const result = validateHeaders(headers, entityType)

    expect(result.missingFieldLabels).toEqual([])
    expect(result.isValid).toBe(true)
  })

  it('accepte encore les alias courts', () => {
    const result = validateHeaders(['Nom', 'Tel'], 'clients')

    expect(result.isValid).toBe(true)
    expect(result.mappedFields).toEqual({ Nom: 'full_name', Tel: 'phone' })
  })

  it('tolère un libellé enrichi d’un suffixe technique', () => {
    const result = validateHeaders(
      ['Nom complet (full_name)', 'Numéro de Téléphone (phone)', 'Code Pays (ex: 237)'],
      'clients',
    )

    expect(result.isValid).toBe(true)
    expect(result.mappedFields['Code Pays (ex: 237)']).toBe('country_code')
  })

  it('n’affecte pas deux fois le même en-tête', () => {
    const result = validateHeaders(['Marque Véhicule', 'Modèle Véhicule'], 'clients')

    expect(Object.values(result.mappedFields)).toEqual(['vehicle_marque', 'vehicle_modele'])
  })

  it('signale les colonnes obligatoires réellement absentes', () => {
    const result = validateHeaders(['Nom complet', 'Adresse Email'], 'clients')

    expect(result.isValid).toBe(false)
    expect(result.missingFieldLabels).toEqual(['Numéro de Téléphone'])
  })
})
