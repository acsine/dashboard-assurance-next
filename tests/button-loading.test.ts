// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { Button } from '@/components/ui/button'

afterEach(cleanup)

const spinnerCount = (container: HTMLElement) => container.querySelectorAll('.animate-spin').length
const click = (container: HTMLElement) =>
  act(async () => {
    container.querySelector('button')!.click()
  })

describe('indicateur de chargement du bouton', () => {
  it('affiche son propre indicateur pour un onClick asynchrone non piloté', async () => {
    let settle!: () => void
    const pending = new Promise<void>((resolve) => {
      settle = resolve
    })
    const { container } = render(createElement(Button, { onClick: () => pending }, 'Envoyer'))

    await click(container)
    expect(spinnerCount(container)).toBe(1)

    await act(async () => {
      settle()
      await pending
    })
    expect(spinnerCount(container)).toBe(0)
  })

  it('laisse la main à l’appelant dès que isLoading est fourni', async () => {
    const pending = new Promise<void>(() => {})
    const { container } = render(
      createElement(
        Button,
        { onClick: () => pending, isLoading: false },
        createElement('span', { className: 'animate-spin' }, 'indicateur appelant'),
      ),
    )

    await click(container)

    expect(spinnerCount(container)).toBe(1)
  })

  it('n’affiche qu’un seul indicateur et désactive le bouton quand isLoading est vrai', () => {
    const { container } = render(createElement(Button, { isLoading: true }, 'Envoyer'))

    expect(spinnerCount(container)).toBe(1)
    expect(container.querySelector('button')!.disabled).toBe(true)
  })
})
