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
})
