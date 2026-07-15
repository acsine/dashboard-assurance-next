import { expect, test } from '@playwright/test'
import { SignJWT } from 'jose'

const baseURL = 'http://127.0.0.1:3100'
const secret = new TextEncoder().encode('playwright-session-secret-at-least-32-characters')

async function adminSession(): Promise<string> {
  return new SignJWT({
    session: {
      accessToken: 'server-only-access',
      refreshToken: 'server-only-refresh',
      user: {
        id: 'admin-e2e',
        agency_id: 'agency-e2e',
        full_name: 'Admin E2E',
        role: 'ADMIN_AGENCE',
        is_active: true,
      },
    },
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret)
}

test('affiche et valide le vrai payment_id via le BFF mocké', async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'mobi_session',
      value: await adminSession(),
      url: baseURL,
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ])

  let validatedPaymentId: string | null = null
  await page.route('**/api/backend/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    expect(request.headers().authorization).toBeUndefined()
    expect(request.url()).not.toContain('token=')

    if (path === '/api/backend/contracts/contract-e2e/payments/pay-real-123/validate') {
      validatedPaymentId = 'pay-real-123'
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 200, data: { id: validatedPaymentId, status: 'SUCCESS' } }),
      })
      return
    }
    if (path === '/api/backend/contracts/contract-e2e/payments') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 200,
          data: {
            items: [
              {
                id: 'pay-real-123',
                contract_id: 'contract-e2e',
                amount: 25_000,
                method: 'MTN_MOMO',
                reference_externe: 'MOMO-E2E',
                status: 'PENDING',
              },
            ],
          },
        }),
      })
      return
    }
    if (path === '/api/backend/contracts/contract-e2e/documents') {
      await route.fulfill({ json: { status: 200, data: { items: [] } } })
      return
    }
    if (path === '/api/backend/clients/client-e2e') {
      await route.fulfill({
        json: { status: 200, data: { id: 'client-e2e', full_name: 'Client E2E', phone: '677000000' } },
      })
      return
    }
    if (path === '/api/backend/contracts/contract-e2e') {
      await route.fulfill({
        json: {
          status: 200,
          data: {
            id: 'contract-e2e',
            client_id: 'client-e2e',
            product_type: 'CAT1',
            subscription_type: 'AFFAIRE_NOUVELLE',
            status: 'DEVIS',
            zone_circulation: 'ZONE_C',
            date_effet: '2026-07-15T00:00:00Z',
            duree_jours: 365,
            prime_nette: 80_000,
            prime_ttc: 100_000,
          },
        },
      })
      return
    }
    await route.abort('failed')
  })

  await page.goto('/fr/dashboard/contracts/contract-e2e')
  await expect(page.getByText('25 000 FCFA')).toBeVisible()
  await expect(page.getByText('Solde restant')).toBeVisible()

  await page.getByRole('button', { name: 'Valider ce versement' }).click()

  await expect.poll(() => validatedPaymentId).toBe('pay-real-123')
  await expect(page.getByText(/Paiement validé avec succès/)).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() => [
        localStorage.getItem('mobi_access_token'),
        localStorage.getItem('mobi_refresh_token'),
      ])
    )
    .toEqual([null, null])
})
