import { describe, expect, it } from 'vitest'
import {
  durationMonthsToDays,
  isUnconvertedProspectClient,
  isAtLeast18,
  missingDriverFields,
  missingVehicleTariffFields,
  validateContractStep,
  validateInsuredStep,
  validateVehicleStep,
} from '@/lib/schemas/client-form'

describe('validation du dossier guidé', () => {
  it('valide les dates de majorité à la date de référence', () => {
    const today = new Date('2026-09-18T12:00:00Z')
    expect(isAtLeast18('2008-09-18', today)).toBe(true)
    expect(isAtLeast18('2008-09-19', today)).toBe(false)
  })

  it('retourne les erreurs de chaque étape', () => {
    expect(validateInsuredStep({
      full_name: 'A',
      country_code: 'CM',
      phone: '',
      email: 'invalide',
      date_naissance: '2015-01-01',
    })).toMatchObject({
      full_name: expect.any(String),
      phone: expect.any(String),
      email: expect.any(String),
      date_naissance: expect.any(String),
    })

    expect(validateVehicleStep({
      marque: 'Toyota',
      chassis_num: 'COURT',
      category_id: '',
      energie: '',
      puissance_cv: 0,
      usage: '',
      genre: '',
    })).toMatchObject({
      chassis_num: expect.any(String),
      category_id: expect.any(String),
      puissance_cv: expect.any(String),
    })

    expect(validateContractStep({
      zone_id: 'zone-id',
      duration_id: 'duration-id',
      date_effet: '2026-10-01',
    })).toMatchObject({
      conducteur_nom: expect.any(String),
      conducteur_permis_num: expect.any(String),
    })
  })

  it('identifie uniquement les données véhicule absentes', () => {
    expect(missingVehicleTariffFields({
      category_id: 'cat-id',
      energie: 'ESSENCE',
      puissance_cv: 9,
      zone_circulation: null,
    })).toEqual(['zone_circulation'])
  })

  it('identifie les cinq champs conducteur et borne la durée à 365 jours', () => {
    expect(missingDriverFields({ conducteur_nom: 'Aline' })).toEqual([
      'conducteur_date_naissance',
      'conducteur_permis_cat',
      'conducteur_permis_num',
      'conducteur_permis_date',
    ])
    expect(durationMonthsToDays(1)).toBe(30)
    expect(durationMonthsToDays(6)).toBe(183)
    expect(durationMonthsToDays(36)).toBe(365)
  })

  it('distingue un pseudo-prospect d’un client réellement converti', () => {
    expect(isUnconvertedProspectClient({
      id: 'prospect-id',
      prospect_id: 'prospect-id',
      att_num: 'CLI-P-12345678',
    })).toBe(true)
    expect(isUnconvertedProspectClient({
      id: 'client-id',
      prospect_id: 'prospect-id',
      att_num: 'CLI-2026-001',
    })).toBe(false)
  })
})
