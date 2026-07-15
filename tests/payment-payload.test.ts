import { afterEach, describe, expect, it, vi } from 'vitest'
import { contractsApi } from '@/lib/api/mobi-assur'

describe('payload de paiement manuel', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('envoie amount, method et reference_externe sans jeton navigateur', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 201,
          data: { id: 'payment-id', amount: 25000, method: 'MTN_MOMO', status: 'PENDING' },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    await contractsApi.addPayment('contract-id', {
      amount: 25000,
      method: 'MTN_MOMO',
      reference_externe: 'MOMO-42',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/contracts/contract-id/payments',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          amount: 25000,
          method: 'MTN_MOMO',
          reference_externe: 'MOMO-42',
        }),
      })
    )
    const headers = fetchMock.mock.calls[0][1].headers as Headers
    expect(headers.has('Authorization')).toBe(false)
  })
})
