import type { Payment, PaymentMethod } from './api/mobi-assur'

/** Preuve obligatoire pour toutes les méthodes sauf espèces en agence. */
export function paymentProofRequired(method: PaymentMethod): boolean {
  return method !== 'ESPECES'
}

/** Validation admin sans saisie de référence (preuve ou espèces agence). */
export function paymentReadyToValidate(
  payment: Pick<Payment, 'method' | 'has_reference' | 'declared_by_client'>,
  proofCount: number,
): boolean {
  const needsReference = Boolean(payment.has_reference) || Boolean(payment.declared_by_client)
  if (needsReference) return true
  if (!paymentProofRequired(payment.method)) return true
  return proofCount > 0
}

export function paymentSummary(totalDue: number, payments: Payment[]) {
  const paid = payments
    .filter((payment) => payment.status === 'SUCCESS')
    .reduce((sum, payment) => sum + Number(payment.amount), 0)
  return {
    paid,
    balance: Math.max(Number(totalDue) - paid, 0),
  }
}
