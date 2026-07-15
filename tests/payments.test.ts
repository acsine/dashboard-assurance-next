import { describe, expect, it } from 'vitest'
import { paymentSummary } from '@/lib/payments'
import type { Payment } from '@/lib/api/mobi-assur'

const payment = (amount: number, status: string): Payment => ({
  id: `${status}-${amount}`,
  contract_id: 'contract-id',
  amount,
  method: 'ESPECES',
  status,
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
