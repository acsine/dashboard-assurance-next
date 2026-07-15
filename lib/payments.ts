import type { Payment } from './api/mobi-assur'

export function paymentSummary(totalDue: number, payments: Payment[]) {
  const paid = payments
    .filter((payment) => payment.status === 'SUCCESS')
    .reduce((sum, payment) => sum + Number(payment.amount), 0)
  return {
    paid,
    balance: Math.max(Number(totalDue) - paid, 0),
  }
}
