import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  dailyReportsApi,
  filenameFromResponse,
  nichesApi,
  objectivesApi,
  prospectsApi,
  type DailyReport,
} from '@/lib/api/mobi-assur'
import {
  countCalendarDaysInclusive,
  countExpectedMissingReports,
} from '@/lib/daily-reports'

afterEach(() => vi.unstubAllGlobals())

describe('API des rapports administrateur', () => {
  it('transmet tous les filtres au backend', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await dailyReportsApi.list({
      from_date: '2026-09-01',
      to_date: '2026-09-19',
      status: 'SUBMITTED',
      agent_id: 'agent-1',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/admin/daily-reports?from_date=2026-09-01&to_date=2026-09-19&status=SUBMITTED&agent_id=agent-1',
      expect.objectContaining({ credentials: 'include', cache: 'no-store' }),
    )
  })

  it('n’envoie jamais le statut artificiel MISSING', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await dailyReportsApi.list({ status: 'MISSING' } as never)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/admin/daily-reports',
      expect.any(Object),
    )
  })

  it('demande au backend la liste J-30 filtrée', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await prospectsApi.list({ needs_recontact: true, agent_id: 'agent-1' })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/prospects?needs_recontact=true&agent_id=agent-1',
      expect.any(Object),
    )
  })

  it('décode le nom UTF-8 fourni par Content-Disposition', () => {
    const response = new Response('', {
      headers: {
        'content-disposition': "attachment; filename*=UTF-8''rapport%20journ%C3%A9e.pdf",
      },
    })
    expect(filenameFromResponse(response, 'fallback.pdf')).toBe('rapport journée.pdf')
  })

  it('recompose le classement uniquement si la route directe est indisponible', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/admin/niches/agents-ranking')) {
        return new Response(JSON.stringify({ detail: 'Method Not Allowed' }), { status: 405 })
      }
      if (url.includes('/admin/objectives/performance')) {
        return new Response(JSON.stringify({ items: [{ agent_id: 'agent-1', agent_name: 'Awa', points: 8 }] }), { status: 200 })
      }
      if (url.includes('/wallet/agents')) {
        return new Response(JSON.stringify([{ agent_id: 'agent-1', agent_name: 'Awa', clients_this_month: 2 }]), { status: 200 })
      }
      return new Response(JSON.stringify([]), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await nichesApi.listRankings()

    expect(result.items[0]).toMatchObject({ agent_id: 'agent-1', rank: 1 })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/admin/niches/agents-ranking?period=MONTHLY',
      expect.any(Object),
    )
  })

  it('conserve un résultat vide pour les preuves sur un backend en retard', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: 'Not Found' }), { status: 404 }),
      ),
    )

    await expect(objectivesApi.listProofSubmissions('PENDING')).resolves.toEqual({ items: [] })
  })
})

describe('indicateur des rapports journaliers manquants', () => {
  const report = (agentId: string, date: string): DailyReport => ({
    id: `${agentId}-${date}`,
    agent_id: agentId,
    report_date: date,
    status: 'SUBMITTED',
    visits_count: 1,
    calls_count: 2,
    prospects_count: 3,
    contracts_count: 1,
    collections_amount: 5000,
    attachments: [],
  })

  it('compte les jours calendaires bornes incluses', () => {
    expect(countCalendarDaysInclusive('2026-09-01', '2026-09-03')).toBe(3)
    expect(countCalendarDaysInclusive('2026-09-03', '2026-09-01')).toBe(0)
  })

  it('soustrait les couples agent/date soumis sans compter les doublons', () => {
    const duplicate = report('agent-1', '2026-09-01')
    expect(
      countExpectedMissingReports({
        reports: [duplicate, duplicate, report('agent-2', '2026-09-02')],
        fromDate: '2026-09-01',
        toDate: '2026-09-03',
        terrainAgentCount: 2,
      }),
    ).toBe(4)
  })

  it('utilise une base d’un agent quand le filtre agent est actif', () => {
    expect(
      countExpectedMissingReports({
        reports: [report('agent-1', '2026-09-01')],
        fromDate: '2026-09-01',
        toDate: '2026-09-02',
        selectedAgentId: 'agent-1',
        terrainAgentCount: 12,
      }),
    ).toBe(1)
  })
})
