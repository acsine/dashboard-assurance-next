import { beforeAll, describe, expect, it } from 'vitest'
import { readSession, signSession, type Session } from '@/lib/auth/session'

const session: Session = {
  accessToken: 'access',
  refreshToken: 'refresh',
  user: {
    id: 'user-id',
    agency_id: 'agency-id',
    full_name: 'Admin agence',
    role: 'ADMIN_AGENCE',
    is_active: true,
  },
}

describe('session signée', () => {
  beforeAll(() => {
    process.env.SESSION_SECRET = 'test-secret-with-at-least-thirty-two-characters'
  })

  it('restitue une session intacte', async () => {
    expect(await readSession(await signSession(session))).toEqual(session)
  })

  it('rejette un cookie altéré', async () => {
    const token = await signSession(session)
    const parts = token.split('.')
    parts[2] = `${parts[2][0] === 'a' ? 'b' : 'a'}${parts[2].slice(1)}`
    expect(await readSession(parts.join('.'))).toBeNull()
  })
})
