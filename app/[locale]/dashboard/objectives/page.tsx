'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Plus, Save, Target, Trash2 } from 'lucide-react'
import {
  objectivesApi,
  asList,
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

const selectClass =
  'flex h-10 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs transition-colors focus-visible:outline-none'
const labelClass = 'text-[10px] font-bold text-gray-500 uppercase tracking-wider block'
const thClass = 'pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider'
const trClass = 'border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors'

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
  const [showAddForm, setShowAddForm] = useState(false)
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

  const periodItems = useMemo(
    () => items.filter((it) => (it.metric?.period || 'DAILY') === periodFilter),
    [items, periodFilter],
  )

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
      queryClient.invalidateQueries({ queryKey: ['agent-wallets'] })
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
      setShowAddForm(false)
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
      queryClient.invalidateQueries({ queryKey: ['agent-wallets'] })
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
      ...((detail as any).activity?.items || []),
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

  const PeriodTabs = ({ includeActivity = true }: { includeActivity?: boolean }) => (
    <div className="flex flex-wrap gap-2">
      {PERIODS.filter((p) => includeActivity || p.id !== 'ACTIVITY').map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => setPeriodFilter(p.id)}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
            periodFilter === p.id
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10'
              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )

  return (
    <div className="flex-1 flex flex-col bg-white">
      <Header
        title="Objectifs agents"
        subtitle="Définissez le template global ici — les cibles sont ensuite appliquées à tous les agents (modifiables individuellement)."
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
              onClick={() => {
                setTab(id)
                if (id !== 'template' && periodFilter === 'ACTIVITY') setPeriodFilter('DAILY')
              }}
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
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-950">Objectifs du template</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Version v{template?.version ?? 1} — un seul endroit pour fixer les objectifs de
                  l&apos;agence
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setShowAddForm((v) => !v)}
                    className="flex items-center gap-2 px-5 py-3 text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-xl active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Nouvel objectif
                  </button>
                )}
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(true)}
                    disabled={saveMutation.isPending}
                    className="flex items-center gap-2 px-5 py-3 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10 cursor-pointer border-0 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    Appliquer à tous les agents
                  </button>
                )}
              </div>
            </div>

            <PeriodTabs />

            {canManage && showAddForm && (
              <div className="w-full bg-white rounded-2xl border border-gray-100 p-6">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 mb-4">
                  Créer un objectif
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  <div className="space-y-1">
                    <label className={labelClass}>Code *</label>
                    <Input
                      placeholder="ex: field_visits"
                      value={newMetric.code}
                      onChange={(e) => setNewMetric({ ...newMetric, code: e.target.value })}
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Libellé *</label>
                    <Input
                      placeholder="Ex: Visites terrain"
                      value={newMetric.label}
                      onChange={(e) => setNewMetric({ ...newMetric, label: e.target.value })}
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Période</label>
                    <select
                      className={selectClass}
                      value={newMetric.period}
                      onChange={(e) => setNewMetric({ ...newMetric, period: e.target.value })}
                    >
                      {PERIODS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Type</label>
                    <select
                      className={selectClass}
                      value={newMetric.kind}
                      onChange={(e) => setNewMetric({ ...newMetric, kind: e.target.value })}
                    >
                      <option value="QUANTITATIVE">Quantitatif</option>
                      <option value="BOOLEAN">Checklist</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Cible</label>
                    <Input
                      type="number"
                      value={newMetric.default_target}
                      onChange={(e) =>
                        setNewMetric({ ...newMetric, default_target: e.target.value })
                      }
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Points</label>
                    <Input
                      type="number"
                      value={newMetric.default_points}
                      onChange={(e) =>
                        setNewMetric({ ...newMetric, default_points: e.target.value })
                      }
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Minimum</label>
                    <Input
                      type="number"
                      value={newMetric.default_minimum}
                      onChange={(e) =>
                        setNewMetric({ ...newMetric, default_minimum: e.target.value })
                      }
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-end pt-5 border-t border-gray-50 mt-5">
                  <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="text-white"
                    disabled={
                      !newMetric.code || !newMetric.label || createMetricMutation.isPending
                    }
                    isLoading={createMetricMutation.isPending}
                    onClick={() => createMetricMutation.mutate()}
                  >
                    Ajouter
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              {isLoading ? (
                <div className="py-20 text-center text-gray-400 font-medium">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-3" />
                  Chargement du template…
                </div>
              ) : periodItems.length === 0 ? (
                <div className="py-20 text-center text-gray-400">
                  <Target className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-semibold">Aucun objectif pour cette période</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className={thClass}>Objectif</th>
                        <th className={thClass}>Cible</th>
                        <th className={thClass}>Points</th>
                        <th className={thClass}>Minimum</th>
                        <th className={`${thClass} text-right`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periodItems.map((it) => (
                        <tr key={it.metric_id} className={trClass}>
                          <td className="py-4">
                            <span className="font-bold text-sm text-gray-900 block">
                              {it.metric?.label || it.metric_id}
                            </span>
                            <span className="text-[10px] text-gray-400 block font-mono">
                              {it.metric?.code}
                              {it.metric?.kind === 'BOOLEAN' ? ' · checklist' : ''}
                            </span>
                          </td>
                          <td className="py-4">
                            <Input
                              type="number"
                              value={it.target_value}
                              onChange={(e) =>
                                updateItem(it.metric_id, 'target_value', Number(e.target.value))
                              }
                              disabled={!canManage}
                              className="h-10 w-24 text-xs border-gray-200"
                            />
                          </td>
                          <td className="py-4">
                            <Input
                              type="number"
                              value={it.points}
                              onChange={(e) =>
                                updateItem(it.metric_id, 'points', Number(e.target.value))
                              }
                              disabled={!canManage}
                              className="h-10 w-24 text-xs border-gray-200"
                            />
                          </td>
                          <td className="py-4">
                            <Input
                              type="number"
                              value={it.minimum}
                              onChange={(e) =>
                                updateItem(it.metric_id, 'minimum', Number(e.target.value))
                              }
                              disabled={!canManage}
                              className="h-10 w-24 text-xs border-gray-200"
                            />
                          </td>
                          <td className="py-4 text-right">
                            {canManage && it.metric && !it.metric.is_system ? (
                              <button
                                type="button"
                                onClick={() => deleteMetricMutation.mutate(it.metric_id)}
                                className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all cursor-pointer border-0 inline-flex items-center justify-center active:scale-95"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-400 font-medium">Système</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'agents' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-gray-950">Overrides par agent</h3>
              <p className="text-xs text-gray-500 mt-1">
                Modifiez uniquement un agent si besoin — le template global reste la source
                principale
              </p>
            </div>
            <PeriodTabs includeActivity={false} />
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              {loadingAgents ? (
                <div className="py-20 text-center text-gray-400 font-medium">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-3" />
                  Chargement des agents…
                </div>
              ) : asList(agentsData).length === 0 ? (
                <div className="py-20 text-center text-gray-400">
                  <Target className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-semibold">Aucun agent terrain</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className={thClass}>Agent</th>
                        <th className={thClass}>Points</th>
                        <th className={thClass}>Sous minimum</th>
                        <th className={`${thClass} text-right`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {asList<any>(agentsData).map((a: any) => (
                        <tr key={a.agent_id} className={trClass}>
                          <td className="py-4">
                            <span className="font-bold text-sm text-gray-900 block">
                              {a.agent_name}
                            </span>
                            <span className="text-[10px] text-gray-400 block">
                              {a.agent_email || a.agent_id?.substring?.(0, 8)}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className="font-extrabold text-sm text-slate-800">
                              {a.points_balance ?? 0}
                            </span>
                          </td>
                          <td className="py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                a.below_minimum_count > 0
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-green-50 text-green-700'
                              }`}
                            >
                              {a.below_minimum_count ?? 0}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            {canManage ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs border-gray-200"
                                onClick={() => openAgentEdit(a)}
                              >
                                Modifier
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-400">Lecture seule</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'performance' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-gray-950">Performance période</h3>
              <p className="text-xs text-gray-500 mt-1">
                Suivi des objectifs atteints vs sous le seuil minimum
              </p>
            </div>
            <PeriodTabs includeActivity={false} />
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              {loadingPerf ? (
                <div className="py-20 text-center text-gray-400 font-medium">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-3" />
                  Chargement de la performance…
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className={thClass}>Agent</th>
                        <th className={thClass}>Points période</th>
                        <th className={thClass}>OK</th>
                        <th className={thClass}>Sous minimum</th>
                        <th className={thClass}>Total métriques</th>
                      </tr>
                    </thead>
                    <tbody>
                      {asList<any>(perfData).map((r: any) => (
                        <tr key={r.agent_id} className={trClass}>
                          <td className="py-4">
                            <span className="font-bold text-sm text-gray-900">
                              {r.agent_name}
                            </span>
                          </td>
                          <td className="py-4 font-extrabold text-sm text-slate-800">
                            {r.points_period ?? 0}
                          </td>
                          <td className="py-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700">
                              {r.metrics_ok ?? 0}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700">
                              {r.metrics_below ?? 0}
                            </span>
                          </td>
                          <td className="py-4 text-sm text-slate-700">{r.metrics_total ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {confirmOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-white border border-gray-100 shadow-2xl rounded-2xl">
              <CardContent className="pt-6 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider pb-2 border-b border-gray-50">
                  Confirmer l&apos;application
                </h3>
                <p className="text-xs text-gray-500">
                  Les objectifs de tous les agents seront remplacés par ce template (y compris les
                  overrides individuels).
                </p>
                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="text-white"
                    disabled={saveMutation.isPending}
                    isLoading={saveMutation.isPending}
                    onClick={() => saveMutation.mutate()}
                  >
                    Confirmer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {editAgent && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-3xl bg-white border border-gray-100 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
              <CardContent className="pt-6 space-y-4">
                <div className="pb-2 border-b border-gray-50">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    Objectifs — {editAgent.agent_name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Override individuel (sans modifier le template global)
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className={thClass}>Objectif</th>
                        <th className={thClass}>Période</th>
                        <th className={thClass}>Cible</th>
                        <th className={thClass}>Points</th>
                        <th className={thClass}>Minimum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agentItems.map((it) => (
                        <tr key={it.metric_id} className={trClass}>
                          <td className="py-3 text-sm font-semibold text-gray-900">
                            {(it.metric as ObjectiveMetric)?.label}
                          </td>
                          <td className="py-3 text-xs text-gray-500">
                            {(it.metric as ObjectiveMetric)?.period}
                          </td>
                          <td className="py-3">
                            <Input
                              type="number"
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
                              className="h-10 w-20 text-xs border-gray-200"
                            />
                          </td>
                          <td className="py-3">
                            <Input
                              type="number"
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
                              className="h-10 w-20 text-xs border-gray-200"
                            />
                          </td>
                          <td className="py-3">
                            <Input
                              type="number"
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
                              className="h-10 w-20 text-xs border-gray-200"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="ghost" onClick={() => setEditAgent(null)}>
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="text-white"
                    disabled={agentSaveMutation.isPending}
                    isLoading={agentSaveMutation.isPending}
                    onClick={() => agentSaveMutation.mutate()}
                  >
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
