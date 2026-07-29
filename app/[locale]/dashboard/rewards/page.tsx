'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { rewardsApi, objectivesApi } from '@/lib/api/mobi-assur'
import { useAuthStore } from '@/lib/stores/auth-store'
import { can } from '@/lib/auth/roles'

type Tab = 'bonus' | 'conversion' | 'challenges'

export default function RewardsPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const canManage = can(user?.role, 'settings:manage')
  const [tab, setTab] = useState<Tab>('bonus')

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
      queryClient.invalidateQueries({ queryKey: ['challenges'] })
    },
    onError: (e: any) => toast.error(e?.message || 'Erreur'),
  })

  return (
    <div className="space-y-6">
      <Header title="Récompenses" subtitle="Bonus points, conversion et challenges" />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['bonus', 'Bonus seuils'],
            ['conversion', 'Conversion points'],
            ['challenges', 'Challenges'],
          ] as const
        ).map(([id, label]) => (
          <Button key={id} size="sm" variant={tab === id ? 'default' : 'outline'} onClick={() => setTab(id)}>
            {label}
          </Button>
        ))}
      </div>

      {tab === 'bonus' && (
        <div className="space-y-4">
          {canManage && (
            <Card>
              <CardHeader><CardTitle className="text-base">Nouveau bonus</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-4">
                <select className="h-10 rounded-md border px-3 text-sm" value={bonusForm.period} onChange={(e) => setBonusForm({ ...bonusForm, period: e.target.value })}>
                  <option value="DAILY">Journalier</option>
                  <option value="WEEKLY">Hebdomadaire</option>
                  <option value="MONTHLY">Mensuel</option>
                </select>
                <Input type="number" placeholder="Seuil points" value={bonusForm.points_threshold} onChange={(e) => setBonusForm({ ...bonusForm, points_threshold: e.target.value })} />
                <Input type="number" placeholder="Récompense FCFA" value={bonusForm.reward_amount} onChange={(e) => setBonusForm({ ...bonusForm, reward_amount: e.target.value })} />
                <Input placeholder="Libellé" value={bonusForm.label} onChange={(e) => setBonusForm({ ...bonusForm, label: e.target.value })} />
                <Button onClick={() => createBonus.mutate()}><Plus className="mr-2 h-4 w-4" />Créer</Button>
              </CardContent>
            </Card>
          )}
          {loadingBonus ? <Loader2 className="mx-auto h-6 w-6 animate-spin" /> : (
            <Card>
              <CardContent className="pt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase text-muted-foreground text-left">
                      <th className="py-2">Libellé</th><th>Période</th><th>Seuil</th><th>Récompense</th><th />
                    </tr>
                  </thead>
                  <tbody>
                    {(bonusData?.items || []).map((r) => (
                      <tr key={r.id} className="border-b">
                        <td className="py-2">{r.label}</td>
                        <td>{r.period}</td>
                        <td>{r.points_threshold} pts</td>
                        <td>{r.reward_amount} FCFA</td>
                        <td>
                          {canManage && (
                            <Button size="sm" variant="ghost" onClick={() => rewardsApi.deleteBonusRule(r.id).then(() => queryClient.invalidateQueries({ queryKey: ['bonus-rules'] }))}>
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
          )}
        </div>
      )}

      {tab === 'conversion' && (
        <div className="space-y-4">
          {canManage && (
            <Card>
              <CardHeader><CardTitle className="text-base">Nouveau taux de conversion</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-4">
                <Input type="number" placeholder="Points requis" value={convForm.points_required} onChange={(e) => setConvForm({ ...convForm, points_required: e.target.value })} />
                <Input type="number" placeholder="FCFA" value={convForm.fcfa_amount} onChange={(e) => setConvForm({ ...convForm, fcfa_amount: e.target.value })} />
                <Input placeholder="Libellé" value={convForm.label} onChange={(e) => setConvForm({ ...convForm, label: e.target.value })} />
                <Button onClick={() => createConv.mutate()}><Plus className="mr-2 h-4 w-4" />Créer</Button>
              </CardContent>
            </Card>
          )}
          {loadingConv ? <Loader2 className="mx-auto h-6 w-6 animate-spin" /> : (
            <Card>
              <CardContent className="pt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase text-muted-foreground text-left">
                      <th className="py-2">Libellé</th><th>Points</th><th>FCFA</th><th />
                    </tr>
                  </thead>
                  <tbody>
                    {(convData?.items || []).map((r) => (
                      <tr key={r.id} className="border-b">
                        <td className="py-2">{r.label || '—'}</td>
                        <td>{r.points_required}</td>
                        <td>{r.fcfa_amount}</td>
                        <td>
                          {canManage && (
                            <Button size="sm" variant="ghost" onClick={() => rewardsApi.deleteConversionRate(r.id).then(() => queryClient.invalidateQueries({ queryKey: ['conversion-rates'] }))}>
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
          )}
        </div>
      )}

      {tab === 'challenges' && (
        <div className="space-y-4">
          {canManage && (
            <Card>
              <CardHeader><CardTitle className="text-base">Nouveau challenge</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <Input placeholder="Titre *" value={chalForm.title} onChange={(e) => setChalForm({ ...chalForm, title: e.target.value })} />
                <select className="h-10 rounded-md border px-3 text-sm" value={chalForm.scope} onChange={(e) => setChalForm({ ...chalForm, scope: e.target.value })}>
                  <option value="METRIC">Objectif précis</option>
                  <option value="PERIOD_TYPE">Type d&apos;objectifs</option>
                </select>
                {chalForm.scope === 'METRIC' ? (
                  <select className="h-10 rounded-md border px-3 text-sm" value={chalForm.metric_id} onChange={(e) => setChalForm({ ...chalForm, metric_id: e.target.value })}>
                    <option value="">Choisir une métrique</option>
                    {(metricsData?.items || []).map((m) => (
                      <option key={m.id} value={m.id}>{m.label} ({m.period})</option>
                    ))}
                  </select>
                ) : (
                  <select className="h-10 rounded-md border px-3 text-sm" value={chalForm.period} onChange={(e) => setChalForm({ ...chalForm, period: e.target.value })}>
                    <option value="DAILY">Journalier</option>
                    <option value="WEEKLY">Hebdomadaire</option>
                    <option value="MONTHLY">Mensuel</option>
                  </select>
                )}
                <Input type="number" placeholder="Cible" value={chalForm.target_value} onChange={(e) => setChalForm({ ...chalForm, target_value: e.target.value })} />
                <Input type="number" placeholder="Top N places" value={chalForm.max_winners} onChange={(e) => setChalForm({ ...chalForm, max_winners: e.target.value })} />
                <Input type="number" placeholder="Récompense FCFA" value={chalForm.reward_amount} onChange={(e) => setChalForm({ ...chalForm, reward_amount: e.target.value })} />
                <Input type="number" placeholder="Récompense points" value={chalForm.reward_points} onChange={(e) => setChalForm({ ...chalForm, reward_points: e.target.value })} />
                <Input type="datetime-local" value={chalForm.starts_at} onChange={(e) => setChalForm({ ...chalForm, starts_at: e.target.value })} />
                <Input type="datetime-local" value={chalForm.ends_at} onChange={(e) => setChalForm({ ...chalForm, ends_at: e.target.value })} />
                <Button onClick={() => createChal.mutate()} disabled={!chalForm.title || !chalForm.starts_at || !chalForm.ends_at}>
                  <Plus className="mr-2 h-4 w-4" />Créer
                </Button>
              </CardContent>
            </Card>
          )}
          {loadingChal ? <Loader2 className="mx-auto h-6 w-6 animate-spin" /> : (
            <Card>
              <CardContent className="pt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase text-muted-foreground text-left">
                      <th className="py-2">Titre</th><th>Statut</th><th>Cible</th><th>Top</th><th>Récompense</th><th />
                    </tr>
                  </thead>
                  <tbody>
                    {(chalData?.items || []).map((c) => (
                      <tr key={c.id} className="border-b">
                        <td className="py-2 font-medium">{c.title}</td>
                        <td>{c.status}</td>
                        <td>{c.target_value}</td>
                        <td>{c.max_winners}</td>
                        <td>{c.reward_amount} FCFA / {c.reward_points} pts</td>
                        <td className="flex gap-2 py-2">
                          {canManage && c.status !== 'CLOSED' && (
                            <Button size="sm" variant="outline" onClick={() => rewardsApi.closeChallenge(c.id).then(() => { toast.success('Challenge clôturé'); queryClient.invalidateQueries({ queryKey: ['challenges'] }) })}>
                              Clôturer
                            </Button>
                          )}
                          {canManage && (
                            <Button size="sm" variant="ghost" onClick={() => rewardsApi.deleteChallenge(c.id).then(() => queryClient.invalidateQueries({ queryKey: ['challenges'] }))}>
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
          )}
        </div>
      )}
    </div>
  )
}
