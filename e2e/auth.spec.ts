import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { SignJWT } from 'jose'

const baseURL = 'http://127.0.0.1:3100'
const secret = new TextEncoder().encode('playwright-session-secret-at-least-32-characters')

type Role = 'ADMIN_AGENCE' | 'RESPONSABLE_AGENCE' | 'AGENT_TERRAIN'

async function signedSession(role: Role): Promise<string> {
  return new SignJWT({
    session: {
      accessToken: `server-access-${role}`,
      refreshToken: `server-refresh-${role}`,
      user: {
        id: `user-${role}`,
        agency_id: 'agency-e2e',
        full_name: `Utilisateur ${role}`,
        role,
        is_active: true,
      },
    },
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret)
}

async function setSession(context: BrowserContext, role: Role) {
  await context.addCookies([
    {
      name: 'mobi_session',
      value: await signedSession(role),
      url: baseURL,
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ])
}

async function mockDashboardApi(page: Page) {
  await page.route('**/api/backend/**', async (route) => {
    expect(route.request().headers().authorization).toBeUndefined()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 200, data: { items: [] } }),
    })
  })
}

async function expectNoBrowserTokens(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => ({
        access: localStorage.getItem('mobi_access_token'),
        refresh: localStorage.getItem('mobi_refresh_token'),
      }))
    )
    .toEqual({ access: null, refresh: null })
}

test('redirige un dashboard sans session vers le login', async ({ page }) => {
  await page.goto('/fr/dashboard')
  await expect(page).toHaveURL(/\/fr\/login$/)
  await expect(page.getByRole('heading', { name: 'Portail MOBI-ASSUR' })).toBeVisible()
})

for (const role of ['ADMIN_AGENCE', 'RESPONSABLE_AGENCE'] as const) {
  test(`${role} accède au portail sans jeton navigateur`, async ({ context, page }) => {
    await setSession(context, role)
    await mockDashboardApi(page)

    await page.goto('/fr/dashboard')

    await expect(page).toHaveURL(/\/fr\/dashboard$/)
    await expect(page.getByRole('heading', { name: 'Commandement Global des Opérations' })).toBeVisible()
    await expectNoBrowserTokens(page)
  })
}

test('refuse AGENT_TERRAIN même avec une session correctement signée', async ({ context, page }) => {
  await setSession(context, 'AGENT_TERRAIN')
  await page.goto('/fr/dashboard')

  await expect(page).toHaveURL(/\/fr\/login$/)
  await expectNoBrowserTokens(page)
})
