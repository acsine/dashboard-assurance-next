import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const catalogue = readFileSync(
  join(root, 'app/[locale]/dashboard/niches/page.tsx'),
  'utf8',
)
const assignment = readFileSync(
  join(root, 'app/[locale]/dashboard/niches/[id]/assign/page.tsx'),
  'utf8',
)
const routeLoading = readFileSync(
  join(root, 'app/[locale]/dashboard/niches/[id]/assign/loading.tsx'),
  'utf8',
)

describe('navigation vers l’attribution de niche', () => {
  it('ne conserve plus la modale d’attribution dans le catalogue', () => {
    expect(catalogue).not.toContain('assign-niche-title')
    expect(catalogue).not.toContain('setAssigningNiche')
    expect(catalogue).not.toMatch(/role="dialog"[^>]+assign/i)
  })

  it('utilise la route dédiée depuis le catalogue et après création', () => {
    expect(catalogue).toContain('href={`/dashboard/niches/${n.id}/assign`}')
    expect(catalogue).toContain('router.push(`/dashboard/niches/${createdNiche.id}/assign`)')
  })

  it('protège le nouvel écran et explicite chaque chargement', () => {
    expect(assignment).toContain('<RoleGuard permission="settings:manage">')
    expect(assignment).toContain('Chargement de la niche')
    expect(assignment).toContain('Chargement du classement')
    expect(assignment).toContain('Chargement des objectifs')
    expect(routeLoading).toContain('Chargement de la niche')
    expect(routeLoading).toContain('animate-spin')
  })
})
