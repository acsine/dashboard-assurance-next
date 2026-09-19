import { afterEach, describe, expect, it, vi } from 'vitest'
import { nichesApi, objectivesApi } from '@/lib/api/mobi-assur'

afterEach(() => vi.unstubAllGlobals())

describe('API attribution des niches', () => {
  it('envoie l’attribution avec les objectifs de niche', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'agr-1', status: 'ASSIGNED' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await nichesApi.assign('niche-1', {
      agent_id: 'agent-1',
      objective_members: 20,
      objective_contracts: 5,
      objective_premium: 150000,
      objective_due_at: '2026-12-31',
      objective_note: 'Prospecter le syndicat',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/admin/niches/niche-1/assign',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          agent_id: 'agent-1',
          objective_members: 20,
          objective_contracts: 5,
          objective_premium: 150000,
          objective_due_at: '2026-12-31',
          objective_note: 'Prospecter le syndicat',
        }),
      }),
    )
  })

  it('retire une attribution', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: 'agr-1', status: 'CANCELLED' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await nichesApi.unassign('niche-1')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/admin/niches/niche-1/unassign',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('envoie les objectifs personnalisés lors de l’attribution', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'agr-1', status: 'ASSIGNED' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await nichesApi.assign('niche-1', {
      agent_id: 'agent-1',
      objectives: [{
        code: 'PREMIUM',
        label: 'Primes collectées',
        kind: 'MONETARY',
        target_value: 500000,
        recurrence: 'QUARTERLY',
        custom_interval_days: null,
        anchor_date: '2026-09-01',
        proof_type: 'REFERENCE',
        proof_instructions: 'Référence du bordereau',
        points: 25,
        is_active: true,
      }],
    })

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      agent_id: 'agent-1',
      objectives: [{ code: 'PREMIUM', kind: 'MONETARY', recurrence: 'QUARTERLY' }],
    })
  })
})

describe('API modèles d’objectifs de niche', () => {
  it('remplace plusieurs modèles via PUT', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const items = [{
      code: 'MEMBERS',
      label: 'Membres',
      kind: 'QUANTITATIVE' as const,
      target_value: 50,
      recurrence: 'MONTHLY' as const,
      proof_type: 'PHONE' as const,
      points: 10,
      is_active: true,
    }]

    await nichesApi.putObjectiveTemplates('niche-1', items)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/admin/niches/niche-1/objective-templates',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ items }) }),
    )
  })

  it('expose le CRUD unitaire des modèles', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ id: 'tpl-1' }), { status: 200 })),
    )
    vi.stubGlobal('fetch', fetchMock)
    const item = {
      code: 'CONTRACTS',
      label: 'Contrats',
      kind: 'QUANTITATIVE' as const,
      target_value: 5,
      recurrence: 'CUSTOM' as const,
      custom_interval_days: 45,
      proof_type: 'FILE' as const,
      points: 15,
      is_active: true,
    }

    await nichesApi.createObjectiveTemplate('niche-1', item)
    await nichesApi.updateObjectiveTemplate('niche-1', 'tpl-1', item)
    await nichesApi.deleteObjectiveTemplate('niche-1', 'tpl-1')

    expect(fetchMock.mock.calls.map((call) => [call[0], call[1]?.method])).toEqual([
      ['/api/backend/admin/niches/niche-1/objective-templates', 'POST'],
      ['/api/backend/admin/niches/niche-1/objective-templates/tpl-1', 'PATCH'],
      ['/api/backend/admin/niches/niche-1/objective-templates/tpl-1', 'DELETE'],
    ])
  })
})

describe('Classement des agents via le backend', () => {
  it('lit GET /admin/niches/agents-ranking', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              agent_id: 'agent-2',
              agent_name: 'Bob',
              rank: 1,
              score: 88,
              objectives_pct: 100,
              niche_objectives_ok: 2,
              niche_objectives_total: 2,
            },
            { agent_id: 'agent-1', agent_name: 'Alice', rank: 2, score: 40, objectives_pct: 50 },
          ],
          period: 'MONTHLY',
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { items, period } = await nichesApi.listRankings()

    expect(period).toBe('MONTHLY')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/admin/niches/agents-ranking?period=MONTHLY',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(items.map((row) => row.agent_id)).toEqual(['agent-2', 'agent-1'])
    expect(items[0].niche_objectives_ok).toBe(2)
  })

  it('lit GET /admin/niches/agents-ranking/{id} avec périodes de niche', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          agent_id: 'agent-1',
          agent_name: 'Alice',
          assigned_niches: [
            {
              id: 'agr-1',
              niche_id: 'n-1',
              niche_name: 'Syndicat',
              objectives: [
                {
                  code: 'PREMIUM',
                  label: 'Primes',
                  kind: 'MONETARY',
                  period: { approved_progress: 200000, pending_progress: 50000, succeeded: false },
                },
              ],
            },
          ],
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const ranking = await nichesApi.getAgentRanking('agent-1')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/admin/niches/agents-ranking/agent-1',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(ranking?.assigned_niches?.[0].objectives?.[0].period?.approved_progress).toBe(200000)
  })

  it('retourne null quand l’agent est introuvable', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Agent introuvable' }), { status: 404 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(nichesApi.getAgentRanking('agent-inconnu')).resolves.toBeNull()
  })
})

describe('API preuves et métriques d’objectifs', () => {
  it('liste les preuves en attente', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [{ id: 'proof-1', status: 'PENDING', proof_type: 'PHONE', declared_value: 3 }],
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await objectivesApi.listProofSubmissions('PENDING')

    expect(result.items).toHaveLength(1)
    expect(result.items[0].status).toBe('PENDING')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/admin/objectives/proof-submissions?status=PENDING',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('filtre les preuves par portée, niche et période', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await objectivesApi.listProofSubmissions({
      status: 'PENDING',
      scope: 'NICHE_OBJECTIVE',
      niche_id: 'niche-1',
      period_key: '2026-Q3',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/admin/objectives/proof-submissions?status=PENDING&scope=NICHE_OBJECTIVE&niche_id=niche-1&period_key=2026-Q3',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('approuve une preuve avec des notes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ id: 'proof-1', status: 'APPROVED', approved_value: 3, points_awarded: 15 }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await objectivesApi.approveProofSubmission('proof-1', 'Contrôle téléphone OK')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/admin/objectives/proof-submissions/proof-1/approve',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ notes: 'Contrôle téléphone OK' }),
      }),
    )
  })

  it('rejette une preuve avec un motif', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'proof-1', status: 'REJECTED' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await objectivesApi.rejectProofSubmission('proof-1', 'Numéro invalide')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/admin/objectives/proof-submissions/proof-1/reject',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ rejection_reason: 'Numéro invalide' }),
      }),
    )
  })

  it('met à jour une métrique avec proof_type PHONE', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ id: 'metric-1', proof_required: true, proof_type: 'PHONE' }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await objectivesApi.updateMetric('metric-1', {
      proof_required: true,
      proof_type: 'PHONE',
      proof_instructions: 'Saisir le numéro appelé',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/admin/objective-metrics/metric-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          proof_required: true,
          proof_type: 'PHONE',
          proof_instructions: 'Saisir le numéro appelé',
        }),
      }),
    )
  })
})
