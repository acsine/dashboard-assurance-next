import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { contractsApi } from '@/lib/api/mobi-assur'

const links: { href: string; download: string }[] = []

function stubDom() {
  links.length = 0
  const createObjectURL = vi.fn(() => 'blob:contract-pack')
  const revokeObjectURL = vi.fn()
  vi.stubGlobal('window', { URL: { createObjectURL, revokeObjectURL } })
  vi.stubGlobal('document', {
    createElement: vi.fn(() => {
      const link = { href: '', download: '', click: vi.fn() }
      links.push(link)
      return link
    }),
    body: { appendChild: vi.fn(), removeChild: vi.fn() },
  })
  return { createObjectURL, revokeObjectURL }
}

beforeEach(stubDom)
afterEach(() => vi.unstubAllGlobals())

describe('pack documentaire d’un contrat', () => {
  it('enregistre directement le fichier quand le serveur en renvoie un', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Blob(['xlsx']), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await contractsApi.generatePack('contract-123456789')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/contracts/contract-123456789/documents/generate-pack',
      { credentials: 'include', method: 'POST' },
    )
    expect(links[0].download).toBe('documents-contrat-contract.xlsx')
  })

  it('respecte le nom de fichier imposé par le serveur', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Blob(['pdf']), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="pack-contrat.pdf"',
        },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await contractsApi.generatePack('contract-123456789')

    expect(links[0].download).toBe('pack-contrat.pdf')
  })

  it('télécharge chaque document quand le serveur ne renvoie que des métadonnées', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/generate-pack')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              items: [
                { id: 'doc-1', doc_type: 'CARTE_ROSE', format: 'PDF' },
                { id: 'doc-2', doc_type: 'ATTESTATION', format: 'XLSX' },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        )
      }
      return Promise.resolve(
        new Response(new Blob(['binaire']), {
          status: 200,
          headers: { 'Content-Type': 'application/octet-stream' },
        }),
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    await contractsApi.generatePack('contract-123456789')

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      '/api/backend/contracts/contract-123456789/documents/generate-pack',
      '/api/backend/contracts/contract-123456789/documents/doc-1/download',
      '/api/backend/contracts/contract-123456789/documents/doc-2/download',
    ])
    expect(links.map((link) => link.download)).toEqual([
      'carte-rose-contract.pdf',
      'attestation-contract.xlsx',
    ])
  })

  it('échoue explicitement au lieu d’écrire du JSON dans un fichier bureautique', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Method Not Allowed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(contractsApi.downloadDoc('contract-1', 'doc-1')).rejects.toThrow(
      /JSON au lieu du fichier attendu/,
    )
    expect(links).toHaveLength(0)
  })
})
