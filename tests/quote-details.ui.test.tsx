// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it } from 'vitest'
import QuoteDetailsAndGuarantees from '@/components/insurance/QuoteDetailsAndGuarantees'

describe('détail du devis', () => {
  it('affiche les lignes backend, l’assureur et le mieux-disant', () => {
    render(
      <NextIntlClientProvider
        locale="fr"
        messages={{
          quote: {
            breakdown: 'Décomposition',
            taxes: 'Taxes',
            compare: 'Comparaison',
          },
        }}
      >
        <QuoteDetailsAndGuarantees
          breakdown={{ total: 120000 }}
          insurerName="Assureur retenu"
          lineItems={[
            { code: 'RC', label: 'Responsabilité civile', amount: 100000 },
            { code: 'TAX', label: 'Taxes', amount: 20000 },
          ]}
          total={120000}
          comparison={[
            {
              insurer_id: 'best',
              insurer_name: 'Assureur retenu',
              total: 120000,
              is_best_price: true,
            },
          ]}
        />
      </NextIntlClientProvider>,
    )

    expect(screen.getByText('Responsabilité civile')).toBeTruthy()
    expect(screen.getAllByText('Assureur retenu').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: /Voir les autres compagnies/i }))
    expect(screen.getByText('Mieux-disant')).toBeTruthy()
  })
})
