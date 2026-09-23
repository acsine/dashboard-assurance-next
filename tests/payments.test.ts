import { describe, expect, it } from 'vitest'
import { paymentProofRequired, paymentReadyToValidate, paymentSummary } from '@/lib/payments'
import type { Payment } from '@/lib/api/mobi-assur'

const payment = (amount: number, status: string): Payment => ({
  id: `${status}-${amount}`,
  contract_id: 'contract-id',
  amount,
  method: 'ESPECES',
  status,
})

describe('preuve de paiement', () => {
  it('n’exige pas de preuve pour les espèces en agence', () => {
    expect(paymentProofRequired('ESPECES')).toBe(false)
    expect(paymentProofRequired('ORANGE_MONEY')).toBe(true)
    expect(paymentProofRequired('VIREMENT')).toBe(true)
  })

  it('autorise la validation espèces sans preuve', () => {
    expect(
      paymentReadyToValidate(
        { method: 'ESPECES', has_reference: false, declared_by_client: false },
        0,
      ),
    ).toBe(true)
    expect(
      paymentReadyToValidate(
        { method: 'ORANGE_MONEY', has_reference: false, declared_by_client: false },
        0,
      ),
    ).toBe(false)
    expect(
      paymentReadyToValidate(
        { method: 'ORANGE_MONEY', has_reference: false, declared_by_client: false },
        1,
      ),
    ).toBe(true)
  })
})

describe('cumul des versements partiels', () => {
  it('ne crédite que les versements validés et calcule le solde', () => {
    expect(paymentSummary(100_000, [
      payment(25_000, 'SUCCESS'),
      payment(10_000, 'PENDING'),
      payment(35_000, 'SUCCESS'),
    ])).toEqual({ paid: 60_000, balance: 40_000 })
  })

  it('ne produit jamais de solde négatif', () => {
    expect(paymentSummary(50_000, [payment(55_000, 'SUCCESS')])).toEqual({
      paid: 55_000,
      balance: 0,
    })
  })
})
