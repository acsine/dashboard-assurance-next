import { describe, expect, it } from 'vitest'
import { can, canProxy, ROLES } from '@/lib/auth/roles'

describe('matrice des rôles', () => {
  it('exclut les agents terrain du portail', () => {
    expect(can(ROLES.AGENT, 'portal:access')).toBe(false)
  })

  it('réserve les mutations sensibles à l’administrateur', () => {
    expect(can(ROLES.ADMIN, 'payments:manage')).toBe(true)
    expect(can(ROLES.RESPONSABLE, 'payments:manage')).toBe(false)
    expect(canProxy(ROLES.RESPONSABLE, 'POST', '/contracts/id/payments')).toBe(false)
  })

  it('autorise la préparation de contrat au responsable', () => {
    expect(canProxy(ROLES.RESPONSABLE, 'POST', '/contracts')).toBe(true)
    expect(canProxy(ROLES.RESPONSABLE, 'PATCH', '/contracts/id')).toBe(true)
  })

  it('autorise la lecture et le téléchargement des rapports au backoffice uniquement', () => {
    expect(canProxy(ROLES.ADMIN, 'GET', '/admin/daily-reports')).toBe(true)
    expect(canProxy(ROLES.RESPONSABLE, 'GET', '/admin/daily-reports/report-1/pdf')).toBe(true)
    expect(canProxy(ROLES.RESPONSABLE, 'GET', '/admin/prospects/expiring/export.xlsx')).toBe(true)
    expect(canProxy(ROLES.AGENT, 'GET', '/admin/daily-reports')).toBe(false)
  })
})
