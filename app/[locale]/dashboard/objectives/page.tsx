'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Plus, Save, Trash2 } from 'lucide-react'
import {
  objectivesApi,
  type ObjectiveMetric,
  type TemplateItem,
} from '@/lib/api/mobi-assur'
import { useAuthStore } from '@/lib/stores/auth-store'
import { can } from '@/lib/auth/roles'

type Tab = 'template' | 'agents' | 'performance'

const PERIODS = [
  { id: 'DAILY', label: 'Journalier' },
  { id: 'WEEKLY', label: 'Hebdomadaire' },
  { id: 'MONTHLY', label: 'Mensuel' },
  { id: 'ACTIVITY', label: 'Activités' },
] as const

export default function ObjectivesPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const canManage = can(user?.role, 'settings:manage') || can(user?.role, 'users:manage')
  const [tab, setTab] = useState<Tab>('template')
  const [periodFilter, setPeriodFilter] = useState<string>('DAILY')
  const [items, setItems] = useState<TemplateItem[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editAgent, setEditAgent] = useState<any | null>(null)
  const [agentItems, setAgentItems] = useState<TemplateItem[]>([])
  const [newMetric, setNewMetric] = useState({
    code: '',
    label: '',
    period: 'DAILY',
    kind: 'QUANTITATIVE',
    default_points: '1',
    default_minimum: '0',
    default_target: '0',
  })

  const { data: template, isLoading } = useQuery({
    queryKey: ['objectives-template'],
    queryFn: () => objectivesApi.getTemplate(),
  })

  const { data: agentsData, isLoading: loadingAgents } = useQuery({
    queryKey: ['objectives-agents', periodFilter],
    queryFn: () => objectivesApi.listAgents(periodFilter),
    enabled: tab === 'agents',
  })

  const { data: perfData, isLoading: loadingPerf } = useQuery({
    queryKey: ['objectives-performance', periodFilter],
    queryFn: () => objectivesApi.performance(periodFilter),
    enabled: tab === 'performance',
  })

  useEffect(() => {
    if (template?.items) setItems(template.items)
  }, [template])

  const grouped = useMemo(() => {
    const map: Record<string, TemplateItem[]> = {
      DAILY: [],
      WEEKLY: [],
      MONTHLY: [],
      ACTIVITY: [],
    }
    for (const it of items) {
      const p = it.metric?.period || 'DAILY'
      if (!map[p]) map[p] = []
      map[p].push(it)
    }
    return map
  }, [items])

  const saveMutation = useMutation({
    mutationFn: () =>
      objectivesApi.putTemplate(
        items.map((i) => ({
          metric_id: i.metric_id,
          target_value: Number(i.target_value) || 0,
          points: Number(i.points) || 0,
          minimum: Number(i.minimum) || 0,
        })),
      ),
    onSuccess: () => {
      toast.success('Template appliqué à tous les agents')
      setConfirmOpen(false)
      queryClient.invalidateQueries({ queryKey: ['objectives-template'] })
      queryClient.invalidateQueries({ queryKey: ['objectives-agents'] })
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur'),
  })

  const createMetricMutation = useMutation({
    mutationFn: () =>
      objectivesApi.createMetric({
        code: newMetric.code.trim(),
        label: newMetric.label.trim(),
        period: newMetric.period,
        kind: newMetric.kind,
        default_points: Number(newMetric.default_points) || 1,
        default_minimum: Number(newMetric.default_minimum) || 0,
        default_target: Number(newMetric.default_target) || 0,
      } as any),
    onSuccess: async () => {
      toast.success('Objectif ajouté')
      setNewMetric({
        code: '',
        label: '',
        period: 'DAILY',
        kind: 'QUANTITATIVE',
        default_points: '1',
        default_minimum: '0',
        default_target: '0',
      })
      await queryClient.invalidateQueries({ queryKey: ['objectives-template'] })
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur'),
  })

  const deleteMetricMutation = useMutation({
    mutationFn: (id: string) => objectivesApi.deleteMetric(id),
    onSuccess: async () => {
      toast.success('Objectif supprimé')
      await queryClient.invalidateQueries({ queryKey: ['objectives-template'] })
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur'),
  })

  const agentSaveMutation = useMutation({
    mutationFn: () =>
      objectivesApi.putAgent(
        editAgent.agent_id,
        agentItems.map((i) => ({
          metric_id: i.metric_id,
          target_value: Number(i.target_value) || 0,
          points: Number(i.points) || 0,
          minimum: Number(i.minimum) || 0,
        })),
      ),
    onSuccess: () => {
      toast.success('Objectifs agent mis à jour')
      setEditAgent(null)
      queryClient.invalidateQueries({ queryKey: ['objectives-agents'] })
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur'),
  })

  const updateItem = (metricId: string, field: keyof TemplateItem, value: number) => {
    setItems((prev) =>
      prev.map((it) => (it.metric_id === metricId ? { ...it, [field]: value } : it)),
    )
  }

  const openAgentEdit = async (agent: any) => {
    setEditAgent(agent)
    const detail = await objectivesApi.getAgent(agent.agent_id)
    const all = [
      ...(detail.daily?.items || []),
      ...(detail.weekly?.items || []),
      ...(detail.monthly?.items || []),
    ]
    setAgentItems(
      all.map((o: any) => ({
        metric_id: o.id,
        target_value: o.target_value,
        points: o.points,
        minimum: o.minimum,
        metric: o,
      })),
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <Header
        title="Objectifs agents"
        subtitle="Template global, overrides par agent et performance"
      />

      <div className="p-8 space-y-6 flex-1">
        <div className="flex gap-4 border-b border-gray-100 pb-px">
          {(
            [
              ['template', 'Template global'],
              ['agents', 'Par agent'],
              ['performance', 'Performance'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`pb-4 text-sm font-bold tracking-tight border-b-2 px-1 transition-all cursor-pointer ${
                tab === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

      {tab === 'template' && (
        <div className="space-y-4">
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ajouter un objectif</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-4">
                <Input
                  placeholder="code (snake_case)"
                  value={newMetric.code}
                  onChange={(e) => setNewMetric({ ...newMetric, code: e.target.value })}
                />
                <Input
                  placeholder="Libellé"
                  value={newMetric.label}
                  onChange={(e) => setNewMetric({ ...newMetric, label: e.target.value })}
                />
                <select
                  className="h-10 rounded-md border px-3 text-sm"
                  value={newMetric.period}
                  onChange={(e) => setNewMetric({ ...newMetric, period: e.target.value })}
                >
                  {PERIODS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-md border px-3 text-sm"
                  value={newMetric.kind}
                  onChange={(e) => setNewMetric({ ...newMetric, kind: e.target.value })}
                >
                  <option value="QUANTITATIVE">Quantitatif</option>
                  <option value="BOOLEAN">Checklist</option>
                </select>
                <Input
                  type="number"
                  placeholder="Points"
                  value={newMetric.default_points}
                  onChange={(e) => setNewMetric({ ...newMetric, default_points: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Minimum"
                  value={newMetric.default_minimum}
                  onChange={(e) => setNewMetric({ ...newMetric, default_minimum: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Cible"
                  value={newMetric.default_target}
                  onChange={(e) => setNewMetric({ ...newMetric, default_target: e.target.value })}
                />
                <Button
                  onClick={() => createMetricMutation.mutate()}
                  disabled={!newMetric.code || !newMetric.label || createMetricMutation.isPending}
                >
                  <Plus className="mr-2 h-4 w-4" /> Ajouter
                </Button>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            PERIODS.map((p) => (
              <Card key={p.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{p.label}</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    v{template?.version ?? 1}
                  </span>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                        <th className="py-2">Objectif</th>
                        <th className="py-2">Cible</th>
                        <th className="py-2">Points</th>
                        <th className="py-2">Minimum</th>
                        <th className="py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {(grouped[p.id] || []).map((it) => (
                        <tr key={it.metric_id} className="border-b">
                          <td className="py-2">
                            <div className="font-medium">{it.metric?.label || it.metric_id}</div>
                            <div className="text-xs text-muted-foreground">{it.metric?.code}</div>
                          </td>
                          <td className="py-2">
                            <Input
                              type="number"
                              className="w-24"
                              value={it.target_value}
                              onChange={(e) =>
                                updateItem(it.metric_id, 'target_value', Number(e.target.value))
                              }
                              disabled={!canManage}
                            />
                          </td>
                          <td className="py-2">
                            <Input
                              type="number"
                              className="w-24"
                              value={it.points}
                              onChange={(e) =>
                                updateItem(it.metric_id, 'points', Number(e.target.value))
                              }
                              disabled={!canManage}
                            />
                          </td>
                          <td className="py-2">
                            <Input
                              type="number"
                              className="w-24"
                              value={it.minimum}
                              onChange={(e) =>
                                updateItem(it.metric_id, 'minimum', Number(e.target.value))
                              }
                              disabled={!canManage}
                            />
                          </td>
                          <td className="py-2">
                            {canManage && it.metric && !it.metric.is_system && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMetricMutation.mutate(it.metric_id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))
          )}

          {canManage && (
            <Button onClick={() => setConfirmOpen(true)} disabled={saveMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              Enregistrer et appliquer à tous les agents
            </Button>
          )}
        </div>
      )}

      {tab === 'agents' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {PERIODS.filter((p) => p.id !== 'ACTIVITY').map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant={periodFilter === p.id ? 'default' : 'outline'}
                onClick={() => setPeriodFilter(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          {loadingAgents ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          ) : (
            <Card>
              <CardContent className="overflow-x-auto pt-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2">Agent</th>
                      <th className="py-2">Points</th>
                      <th className="py-2">Sous minimum</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {(agentsData?.items || []).map((a: any) => (
                      <tr key={a.agent_id} className="border-b">
                        <td className="py-2">
                          <div className="font-medium">{a.agent_name}</div>
                          <div className="text-xs text-muted-foreground">{a.agent_email}</div>
                        </td>
                        <td className="py-2">{a.points_balance}</td>
                        <td className="py-2">
                          <span
                            className={
                              a.below_minimum_count > 0 ? 'text-red-600 font-medium' : ''
                            }
                          >
                            {a.below_minimum_count}
                          </span>
                        </td>
                        <td className="py-2">
                          {canManage && (
                            <Button size="sm" variant="outline" onClick={() => openAgentEdit(a)}>
                              Modifier
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === 'performance' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {PERIODS.filter((p) => p.id !== 'ACTIVITY').map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant={periodFilter === p.id ? 'default' : 'outline'}
                onClick={() => setPeriodFilter(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          {loadingPerf ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          ) : (
            <Card>
              <CardContent className="overflow-x-auto pt-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2">Agent</th>
                      <th className="py-2">Points période</th>
                      <th className="py-2">OK</th>
                      <th className="py-2">Sous minimum</th>
                      <th className="py-2">Total métriques</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(perfData?.items || []).map((r: any) => (
                      <tr key={r.agent_id} className="border-b">
                        <td className="py-2 font-medium">{r.agent_name}</td>
                        <td className="py-2">{r.points_period}</td>
                        <td className="py-2">{r.metrics_ok}</td>
                        <td className="py-2 text-red-600">{r.metrics_below}</td>
                        <td className="py-2">{r.metrics_total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirmer l&apos;application</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Cela réinitialisera les objectifs de tous les agents avec les valeurs du template
                (y compris les overrides individuels).
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Confirmer'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {editAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
            <CardHeader>
              <CardTitle>Objectifs — {editAgent.agent_name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2">Objectif</th>
                    <th className="py-2">Période</th>
                    <th className="py-2">Cible</th>
                    <th className="py-2">Points</th>
                    <th className="py-2">Minimum</th>
                  </tr>
                </thead>
                <tbody>
                  {agentItems.map((it) => (
                    <tr key={it.metric_id} className="border-b">
                      <td className="py-2">{(it.metric as ObjectiveMetric)?.label}</td>
                      <td className="py-2">{(it.metric as ObjectiveMetric)?.period}</td>
                      <td className="py-2">
                        <Input
                          type="number"
                          className="w-20"
                          value={it.target_value}
                          onChange={(e) =>
                            setAgentItems((prev) =>
                              prev.map((x) =>
                                x.metric_id === it.metric_id
                                  ? { ...x, target_value: Number(e.target.value) }
                                  : x,
                              ),
                            )
                          }
                        />
                      </td>
                      <td className="py-2">
                        <Input
                          type="number"
                          className="w-20"
                          value={it.points}
                          onChange={(e) =>
                            setAgentItems((prev) =>
                              prev.map((x) =>
                                x.metric_id === it.metric_id
                                  ? { ...x, points: Number(e.target.value) }
                                  : x,
                              ),
                            )
                          }
                        />
                      </td>
                      <td className="py-2">
                        <Input
                          type="number"
                          className="w-20"
                          value={it.minimum}
                          onChange={(e) =>
                            setAgentItems((prev) =>
                              prev.map((x) =>
                                x.metric_id === it.metric_id
                                  ? { ...x, minimum: Number(e.target.value) }
                                  : x,
                              ),
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditAgent(null)}>
                  Annuler
                </Button>
                <Button onClick={() => agentSaveMutation.mutate()} disabled={agentSaveMutation.isPending}>
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </div>
  )
}
