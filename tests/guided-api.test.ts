import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clientsApi,
  formOptionsApi,
  type CreateDossierRequest,
} from '@/lib/api/mobi-assur'

afterEach(() => vi.unstubAllGlobals())

describe('API des formulaires guidés', () => {
  it('envoie la mise à jour du véhicule sur la route imbriquée', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'vehicle-id', has_trailer: true }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await clientsApi.updateVehicle('client-id', 'vehicle-id', {
      category_id: 'category-id',
      has_trailer: true,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/clients/client-id/vehicles/vehicle-id',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ category_id: 'category-id', has_trailer: true }),
      }),
    )
  })

  it('conserve le payload typé et transactionnel du dossier', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ client: { id: 'client-id' } }), { status: 201 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const payload: CreateDossierRequest = {
      client: {
        full_name: 'Aline Assurée',
        country_code: 'CM',
        phone: '+237690000000',
        vehicle: {
          marque: 'Toyota',
          chassis_num: '12345678901234567',
          category_id: 'category-id',
          has_trailer: false,
        },
      },
      contract: {
        quote_id: 'quote-id',
        product_type: 'CAT1',
        product_line: 'AUTO',
        subscription_type: 'AFFAIRE_NOUVELLE',
        zone_circulation: 'ZONE_C',
        date_effet: '2026-10-01T00:00:00.000Z',
        duree_jours: 365,
        driver_type: 'ASSURE',
        conducteur_nom: 'Aline Assurée',
        conducteur_date_naissance: '1990-01-01',
        conducteur_permis_cat: 'B',
        conducteur_permis_num: 'P-123',
        conducteur_permis_date: '2010-01-01',
        vehicles: [{ guarantees: { RC: true } }],
        insurer_id: 'insurer-id',
      },
    }

    await clientsApi.createDossier(payload)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/clients/dossier',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }),
    )
  })

  it('charge les options depuis le backend', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ energies: [], usages: [], genres: [], garanties: [] }), {
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    await formOptionsApi.get()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/settings/form-options',
      expect.any(Object),
    )
  })
})
