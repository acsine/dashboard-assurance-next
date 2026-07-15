export const ROLES = {
  ADMIN: 'ADMIN_AGENCE',
  RESPONSABLE: 'RESPONSABLE_AGENCE',
  AGENT: 'AGENT_TERRAIN',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export type Permission =
  | 'portal:access'
  | 'agency:read'
  | 'agency:prepare'
  | 'agency:mutate'
  | 'payments:manage'
  | 'users:manage'
  | 'settings:manage'

const permissions: Record<Role, ReadonlySet<Permission>> = {
  ADMIN_AGENCE: new Set([
    'portal:access',
    'agency:read',
    'agency:prepare',
    'agency:mutate',
    'payments:manage',
    'users:manage',
    'settings:manage',
  ]),
  RESPONSABLE_AGENCE: new Set(['portal:access', 'agency:read', 'agency:prepare']),
  AGENT_TERRAIN: new Set(),
}

export const PORTAL_ROLES: Role[] = [ROLES.ADMIN, ROLES.RESPONSABLE]

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && Object.values(ROLES).includes(value as Role)
}

export function can(role: Role | null | undefined, permission: Permission): boolean {
  return role ? permissions[role].has(permission) : false
}

export function canProxy(role: Role, method: string, path: string): boolean {
  if (!can(role, 'portal:access')) return false
  const verb = method.toUpperCase()
  if (verb === 'GET' || verb === 'HEAD' || verb === 'OPTIONS') return can(role, 'agency:read')
  if (role === ROLES.ADMIN) return true

  // Le responsable prépare les dossiers, sans effectuer d'acte administratif/financier.
  return (
    can(role, 'agency:prepare') &&
    ((verb === 'POST' && path === '/contracts') ||
      (verb === 'PATCH' && /^\/contracts\/[^/]+$/.test(path)))
  )
}
