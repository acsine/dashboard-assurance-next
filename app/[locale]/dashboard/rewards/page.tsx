'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Award, Loader2, Plus, Trash2 } from 'lucide-react'
import { rewardsApi, objectivesApi } from '@/lib/api/mobi-assur'
import { useAuthStore } from '@/lib/stores/auth-store'
import { can } from '@/lib/auth/roles'

type Tab = 'bonus' | 'conversion' | 'challenges'

const labelClass = 'text-[10px] font-bold text-gray-500 uppercase tracking-wider block'
const selectClass =
  'flex h-10 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs transition-colors focus-visible:outline-none'
const thClass = 'pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider'
const trClass = 'border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors'

export default function RewardsPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const canManage = can(user?.role, 'settings:manage')
  const [tab, setTab] = useState<Tab>('bonus')
  const [showForm, setShowForm] = useState(false)

  const [bonusForm, setBonusForm] = useState({
    period: 'DAILY',
    points_threshold: '100',
    reward_amount: '5000',
    label: '',
  })
  const [convForm, setConvForm] = useState({
    points_required: '50',
    fcfa_amount: '2500',
    label: '',
  })
  const [chalForm, setChalForm] = useState({
    title: '',
    description: '',
    scope: 'METRIC',
    metric_id: '',
    period: 'DAILY',
    target_value: '10',
    max_winners: '10',
    reward_amount: '10000',
    reward_points: '0',
    starts_at: '',
    ends_at: '',
    status: 'ACTIVE',
  })

  const { data: bonusData, isLoading: loadingBonus } = useQuery({
    queryKey: ['bonus-rules'],
    queryFn: () => rewardsApi.listBonusRules(),
    enabled: tab === 'bonus',
  })
  const { data: convData, isLoading: loadingConv } = useQuery({
    queryKey: ['conversion-rates'],
    queryFn: () => rewardsApi.listConversionRates(),
    enabled: tab === 'conversion',
  })
  const { data: chalData, isLoading: loadingChal } = useQuery({
    queryKey: ['challenges'],
    queryFn: () => rewardsApi.listChallenges(),
    enabled: tab === 'challenges',
  })
  const { data: metricsData } = useQuery({
    queryKey: ['objective-metrics'],
    queryFn: () => objectivesApi.listMetrics(),
    enabled: tab === 'challenges',
  })

  const createBonus = useMutation({
    mutationFn: () =>
      rewardsApi.createBonusRule({
        period: bonusForm.period as any,
        points_threshold: Number(bonusForm.points_threshold),
        reward_amount: Number(bonusForm.reward_amount),
        label: bonusForm.label || `Bonus ${bonusForm.period}`,
        is_active: true,
      }),
    onSuccess: () => {
      toast.success('Bonus créé')
      setShowForm(false)
      queryClient.invalidateQueries({ queryKey: ['bonus-rules'] })
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur'),
  })

  const createConv = useMutation({
    mutationFn: () =>
      rewardsApi.createConversionRate({
        points_required: Number(convForm.points_required),
        fcfa_amount: Number(convForm.fcfa_amount),
        label: convForm.label || null,
        is_active: true,
      }),
    onSuccess: () => {
      toast.success('Taux créé')
      setShowForm(false)
      queryClient.invalidateQueries({ queryKey: ['conversion-rates'] })
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur'),
  })

  const createChal = useMutation({
    mutationFn: () =>
      rewardsApi.createChallenge({
        title: chalForm.title,
        description: chalForm.description || null,
        scope: chalForm.scope as any,
        metric_id: chalForm.scope === 'METRIC' ? chalForm.metric_id || null : null,
        period: chalForm.scope === 'PERIOD_TYPE' ? chalForm.period : null,
        target_value: Number(chalForm.target_value),
        max_winners: Number(chalForm.max_winners),
        reward_amount: Number(chalForm.reward_amount),
        reward_points: Number(chalForm.reward_points),
        starts_at: new Date(chalForm.starts_at).toISOString(),
        ends_at: new Date(chalForm.ends_at).toISOString(),
        status: chalForm.status as any,
      }),
    onSuccess: () => {
      toast.success('Challenge créé')
      setShowForm(false)
      queryClient.invalidateQueries({ queryKey: ['challenges'] })
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur'),
  })

  const tabLabels: Record<Tab, string> = {
    bonus: 'Nouveau bonus',
    conversion: 'Nouveau taux',
    challenges: 'Nouveau challenge',
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <Header
        title="Récompenses"
        subtitle="Bonus de seuils, conversion points → FCFA et challenges agents."
      />

      <div className="p-8 space-y-6 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-gray-950">Programme de récompenses</h3>
          {canManage && (
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-2 px-5 py-3 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10 cursor-pointer border-0 shrink-0 self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              {tabLabels[tab]}
            </button>
          )}
        </div>

        <div className="flex gap-4 border-b border-gray-100 pb-px w-full">
          {(
            [
              ['bonus', 'Bonus seuils'],
              ['conversion', 'Conversion points'],
              ['challenges', 'Challenges'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id)
                setShowForm(false)
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

        {tab === 'bonus' && (
          <div className="space-y-6">
            {canManage && showForm && (
              <div className="w-full bg-white rounded-2xl border border-gray-100 p-6">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 mb-4">
                  Créer un bonus seuil
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  <div className="space-y-1">
                    <label className={labelClass}>Période</label>
                    <select
                      className={selectClass}
                      value={bonusForm.period}
                      onChange={(e) => setBonusForm({ ...bonusForm, period: e.target.value })}
                    >
                      <option value="DAILY">Journalier</option>
                      <option value="WEEKLY">Hebdomadaire</option>
                      <option value="MONTHLY">Mensuel</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Seuil points</label>
                    <Input
                      type="number"
                      value={bonusForm.points_threshold}
                      onChange={(e) =>
                        setBonusForm({ ...bonusForm, points_threshold: e.target.value })
                      }
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Récompense FCFA</label>
                    <Input
                      type="number"
                      value={bonusForm.reward_amount}
                      onChange={(e) =>
                        setBonusForm({ ...bonusForm, reward_amount: e.target.value })
                      }
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Libellé</label>
                    <Input
                      value={bonusForm.label}
                      onChange={(e) => setBonusForm({ ...bonusForm, label: e.target.value })}
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-end pt-5 border-t border-gray-50 mt-5">
                  <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="text-white"
                    isLoading={createBonus.isPending}
                    onClick={() => createBonus.mutate()}
                  >
                    Créer
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              {loadingBonus ? (
                <div className="py-20 text-center text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-3" />
                </div>
              ) : (bonusData?.items || []).length === 0 ? (
                <div className="py-20 text-center text-gray-400">
                  <Award className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-semibold">Aucun bonus défini</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className={thClass}>Libellé</th>
                        <th className={thClass}>Période</th>
                        <th className={thClass}>Seuil</th>
                        <th className={thClass}>Récompense</th>
                        <th className={`${thClass} text-right`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(bonusData?.items || []).map((r) => (
                        <tr key={r.id} className={trClass}>
                          <td className="py-4 font-bold text-sm text-gray-900">{r.label}</td>
                          <td className="py-4 text-xs text-slate-600">{r.period}</td>
                          <td className="py-4 font-extrabold text-sm">{r.points_threshold} pts</td>
                          <td className="py-4 font-extrabold text-sm text-emerald-700">
                            {Number(r.reward_amount).toLocaleString('fr-FR')} FCFA
                          </td>
                          <td className="py-4 text-right">
                            {canManage && (
                              <button
                                type="button"
                                className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all cursor-pointer border-0 inline-flex"
                                onClick={() =>
                                  rewardsApi.deleteBonusRule(r.id).then(() =>
                                    queryClient.invalidateQueries({ queryKey: ['bonus-rules'] }),
                                  )
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
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

        {tab === 'conversion' && (
          <div className="space-y-6">
            {canManage && showForm && (
              <div className="w-full bg-white rounded-2xl border border-gray-100 p-6">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 mb-4">
                  Créer un taux de conversion
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1">
                    <label className={labelClass}>Points requis</label>
                    <Input
                      type="number"
                      value={convForm.points_required}
                      onChange={(e) =>
                        setConvForm({ ...convForm, points_required: e.target.value })
                      }
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Montant FCFA</label>
                    <Input
                      type="number"
                      value={convForm.fcfa_amount}
                      onChange={(e) => setConvForm({ ...convForm, fcfa_amount: e.target.value })}
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Libellé</label>
                    <Input
                      value={convForm.label}
                      onChange={(e) => setConvForm({ ...convForm, label: e.target.value })}
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-end pt-5 border-t border-gray-50 mt-5">
                  <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="text-white"
                    isLoading={createConv.isPending}
                    onClick={() => createConv.mutate()}
                  >
                    Créer
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              {loadingConv ? (
                <div className="py-20 text-center text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-3" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className={thClass}>Libellé</th>
                        <th className={thClass}>Points</th>
                        <th className={thClass}>FCFA</th>
                        <th className={`${thClass} text-right`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(convData?.items || []).map((r) => (
                        <tr key={r.id} className={trClass}>
                          <td className="py-4 font-bold text-sm text-gray-900">
                            {r.label || '—'}
                          </td>
                          <td className="py-4 font-extrabold text-sm">{r.points_required}</td>
                          <td className="py-4 font-extrabold text-sm text-emerald-700">
                            {Number(r.fcfa_amount).toLocaleString('fr-FR')} FCFA
                          </td>
                          <td className="py-4 text-right">
                            {canManage && (
                              <button
                                type="button"
                                className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all cursor-pointer border-0 inline-flex"
                                onClick={() =>
                                  rewardsApi.deleteConversionRate(r.id).then(() =>
                                    queryClient.invalidateQueries({
                                      queryKey: ['conversion-rates'],
                                    }),
                                  )
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
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

        {tab === 'challenges' && (
          <div className="space-y-6">
            {canManage && showForm && (
              <div className="w-full bg-white rounded-2xl border border-gray-100 p-6">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 mb-4">
                  Créer un challenge
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1">
                    <label className={labelClass}>Titre *</label>
                    <Input
                      value={chalForm.title}
                      onChange={(e) => setChalForm({ ...chalForm, title: e.target.value })}
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Portée</label>
                    <select
                      className={selectClass}
                      value={chalForm.scope}
                      onChange={(e) => setChalForm({ ...chalForm, scope: e.target.value })}
                    >
                      <option value="METRIC">Objectif précis</option>
                      <option value="PERIOD_TYPE">Type d&apos;objectifs</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>
                      {chalForm.scope === 'METRIC' ? 'Métrique' : 'Période'}
                    </label>
                    {chalForm.scope === 'METRIC' ? (
                      <select
                        className={selectClass}
                        value={chalForm.metric_id}
                        onChange={(e) =>
                          setChalForm({ ...chalForm, metric_id: e.target.value })
                        }
                      >
                        <option value="">Choisir…</option>
                        {(metricsData?.items || []).map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label} ({m.period})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        className={selectClass}
                        value={chalForm.period}
                        onChange={(e) => setChalForm({ ...chalForm, period: e.target.value })}
                      >
                        <option value="DAILY">Journalier</option>
                        <option value="WEEKLY">Hebdomadaire</option>
                        <option value="MONTHLY">Mensuel</option>
                      </select>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Cible</label>
                    <Input
                      type="number"
                      value={chalForm.target_value}
                      onChange={(e) =>
                        setChalForm({ ...chalForm, target_value: e.target.value })
                      }
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Top N places</label>
                    <Input
                      type="number"
                      value={chalForm.max_winners}
                      onChange={(e) =>
                        setChalForm({ ...chalForm, max_winners: e.target.value })
                      }
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Récompense FCFA</label>
                    <Input
                      type="number"
                      value={chalForm.reward_amount}
                      onChange={(e) =>
                        setChalForm({ ...chalForm, reward_amount: e.target.value })
                      }
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Récompense points</label>
                    <Input
                      type="number"
                      value={chalForm.reward_points}
                      onChange={(e) =>
                        setChalForm({ ...chalForm, reward_points: e.target.value })
                      }
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Début</label>
                    <Input
                      type="datetime-local"
                      value={chalForm.starts_at}
                      onChange={(e) => setChalForm({ ...chalForm, starts_at: e.target.value })}
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Fin</label>
                    <Input
                      type="datetime-local"
                      value={chalForm.ends_at}
                      onChange={(e) => setChalForm({ ...chalForm, ends_at: e.target.value })}
                      className="h-10 text-xs border-gray-200"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-end pt-5 border-t border-gray-50 mt-5">
                  <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="text-white"
                    disabled={!chalForm.title || !chalForm.starts_at || !chalForm.ends_at}
                    isLoading={createChal.isPending}
                    onClick={() => createChal.mutate()}
                  >
                    Créer
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              {loadingChal ? (
                <div className="py-20 text-center text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-3" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className={thClass}>Titre</th>
                        <th className={thClass}>Statut</th>
                        <th className={thClass}>Cible</th>
                        <th className={thClass}>Top</th>
                        <th className={thClass}>Récompense</th>
                        <th className={`${thClass} text-right`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(chalData?.items || []).map((c) => (
                        <tr key={c.id} className={trClass}>
                          <td className="py-4 font-bold text-sm text-gray-900">{c.title}</td>
                          <td className="py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                c.status === 'ACTIVE'
                                  ? 'bg-green-50 text-green-700'
                                  : c.status === 'CLOSED'
                                    ? 'bg-slate-100 text-slate-600'
                                    : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="py-4 text-sm font-semibold">{c.target_value}</td>
                          <td className="py-4 text-sm">{c.max_winners}</td>
                          <td className="py-4 text-xs text-slate-700">
                            {Number(c.reward_amount).toLocaleString('fr-FR')} FCFA
                            {c.reward_points ? ` / ${c.reward_points} pts` : ''}
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex gap-2 justify-end">
                              {canManage && c.status !== 'CLOSED' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs border-gray-200"
                                  onClick={() =>
                                    rewardsApi.closeChallenge(c.id).then(() => {
                                      toast.success('Challenge clôturé')
                                      queryClient.invalidateQueries({ queryKey: ['challenges'] })
                                    })
                                  }
                                >
                                  Clôturer
                                </Button>
                              )}
                              {canManage && (
                                <button
                                  type="button"
                                  className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all cursor-pointer border-0 inline-flex"
                                  onClick={() =>
                                    rewardsApi.deleteChallenge(c.id).then(() =>
                                      queryClient.invalidateQueries({ queryKey: ['challenges'] }),
                                    )
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
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
      </div>
    </div>
  )
}
