'use client'

export const dynamic = 'force-dynamic'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import Header from '@/components/dashboard/Header'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Card, CardContent } from '@/components/ui/card'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { nichesApi, usersApi, asList, type AgentRanking } from '@/lib/api/mobi-assur'
import { Link } from '@/i18n/navigation'
import { Loader2, Trophy, Target, FileSignature, Coins, Layers, UserRound } from 'lucide-react'

function Sparkline({ values }: { values: number[] }) {
  if (!values.length) {
    return (
      <div className="h-16 rounded-xl bg-slate-50 flex items-center justify-center text-xs text-slate-400">
        Pas encore d’historique
      </div>
    )
  }
  const max = Math.max(...values, 1)
  const width = 320
  const height = 64
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width
      const y = height - (value / max) * (height - 8) - 4
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16" role="img" aria-label="Tendance des points">
      <polyline fill="none" stroke="#1d4ed8" strokeWidth="3" points={points} />
    </svg>
  )
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-semibold text-slate-600">
        <span>{label}</span>
        <span>{value.toFixed(1)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  )
}

function AgentDetailContent({ id }: { id: string }) {
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  })
  const { data: ranking, isLoading: loadingRanking } = useQuery({
    queryKey: ['agent-ranking', id],
    queryFn: () => nichesApi.getAgentRanking(id),
  })

  const agent = asList<{ id: string; full_name: string; email?: string; phone?: string; agent_code?: string; role: string }>(users).find(
    (item) => item.id === id,
  )
  const performance: AgentRanking | undefined = ranking ?? undefined
  const history = performance?.history?.map((item) => item.points) || []

  if (loadingUsers || loadingRanking) {
    return (
      <div className="flex-1 flex flex-col bg-white">
        <Header title="Fiche agent" subtitle="Performance et missions de niche" />
        <div className="py-24 text-center text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-600" />
          Chargement de la fiche…
        </div>
      </div>
    )
  }

  if (!performance) {
    return (
      <div className="flex-1 flex flex-col bg-white">
        <Header title="Fiche agent" subtitle="Performance et missions de niche" />
        <div className="p-8">
          <p className="text-sm text-slate-500">Aucune donnée de performance pour cet agent.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <Header title={agent?.full_name || performance.agent_name} subtitle="Classement, objectifs globaux et missions de niche" />
      <div className="p-8 space-y-6">
        <Breadcrumb
          items={[
            { label: 'Collaborateurs', href: '/dashboard/users' },
            { label: agent?.full_name || performance.agent_name },
          ]}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { icon: Trophy, label: 'Score équilibré', value: `${performance.score}/100`, hint: `Rang #${performance.rank}` },
            { icon: Target, label: 'Objectifs du mois', value: `${performance.objectives_pct}%`, hint: `${performance.metrics_ok}/${performance.metrics_total} atteints` },
            { icon: FileSignature, label: 'Conversions', value: String(performance.clients_month + performance.contracts_month), hint: `${performance.contracts_month} contrats · ${performance.clients_month} clients` },
            { icon: Layers, label: 'Niches actives', value: String(performance.active_niches), hint: `${performance.points_period} pts période` },
          ].map((item) => (
            <Card key={item.label} className="border-slate-100 rounded-2xl shadow-sm">
              <CardContent className="p-5 space-y-2">
                <item.icon className="h-4 w-4 text-blue-600" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.label}</p>
                <p className="text-2xl font-black text-slate-900">{item.value}</p>
                <p className="text-xs text-slate-500">{item.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-slate-100 rounded-2xl shadow-sm">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Composantes du score</h3>
              <ScoreBar label="Objectifs (35%)" value={performance.score_breakdown.objectives} />
              <ScoreBar label="Ventes / conversions (30%)" value={performance.score_breakdown.sales} />
              <ScoreBar label="Points de période (20%)" value={performance.score_breakdown.points} />
              <ScoreBar label="Disponibilité niches (15%)" value={performance.score_breakdown.availability} />
            </CardContent>
          </Card>
          <Card className="border-slate-100 rounded-2xl shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Tendance des points</h3>
                <Coins className="h-4 w-4 text-amber-500" />
              </div>
              <Sparkline values={history} />
              <p className="text-xs text-slate-500">Solde actuel : {performance.points_balance} points</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-100 rounded-2xl shadow-sm">
          <CardContent className="p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Statut des objectifs et preuves
            </h3>
            {[...(performance.daily_objectives || []), ...(performance.monthly_objectives || [])]
              .filter(
                (objective: any, index: number, all: any[]) =>
                  all.findIndex(
                    (candidate) =>
                      candidate.id === objective.id &&
                      candidate.period_key === objective.period_key,
                  ) === index,
              )
              .map((objective: any) => (
                <div
                  key={`${objective.id}-${objective.period_key}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{objective.label}</p>
                    <p className="text-xs text-slate-500">
                      Validé : {objective.value || 0}/{objective.target_value || 0}
                      {objective.pending_value
                        ? ` · ${objective.pending_value} en attente`
                        : ''}
                    </p>
                    {objective.rejection_reason ? (
                      <p className="text-xs text-red-600 mt-1">
                        Motif : {objective.rejection_reason}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      objective.validation_status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : objective.validation_status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700'
                          : objective.validation_status === 'REJECTED'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {objective.validation_status === 'APPROVED'
                      ? 'Validé'
                      : objective.validation_status === 'PENDING'
                        ? 'En attente'
                        : objective.validation_status === 'REJECTED'
                          ? 'Rejeté'
                          : 'Non soumis'}
                  </span>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card className="border-slate-100 rounded-2xl shadow-sm">
          <CardContent className="p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Niches attribuées</h3>
            {(performance.assigned_niches || []).length === 0 ? (
              <p className="text-sm text-slate-500">Aucune niche active pour cet agent.</p>
            ) : (
              <div className="space-y-3">
                {performance.assigned_niches!.map((niche) => (
                  <div key={niche.id} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex flex-wrap justify-between gap-2">
                      <div>
                        <p className="font-bold text-sm text-slate-900">{niche.niche_name || 'Niche'}</p>
                        <p className="text-xs text-slate-500">{niche.status}</p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          niche.collect_contact_required && !niche.collect_contact_done
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {niche.collect_contact_required && !niche.collect_contact_done
                          ? 'Collecter le responsable'
                          : 'Contact renseigné'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">
                      Objectifs : {niche.objective_members || 0} membres · {niche.objective_contracts || 0} contrats
                      {niche.objective_due_at ? ` · échéance ${niche.objective_due_at}` : ''}
                    </p>
                    {niche.objective_note ? <p className="text-xs text-slate-500 mt-1">{niche.objective_note}</p> : null}
                    {(niche.objectives || []).length > 0 ? (
                      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                        {niche.objectives!.map((objective) => {
                          const period = objective.period
                          const formatValue = (value: number) =>
                            objective.kind === 'MONETARY'
                              ? `${Number(value).toLocaleString('fr-FR')} FCFA`
                              : Number(value).toLocaleString('fr-FR')
                          return (
                            <div key={objective.id || objective.code} className="rounded-xl bg-slate-50 p-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="text-xs font-bold text-slate-900">{objective.label}</p>
                                  <p className="text-[11px] text-slate-600 mt-0.5">
                                    Approuvé : {formatValue(period?.approved_progress || 0)} / {formatValue(objective.target_value)}
                                    {(period?.pending_progress || 0) > 0
                                      ? ` · En attente : ${formatValue(period?.pending_progress || 0)}`
                                      : ''}
                                  </p>
                                  <p className="text-[10px] text-slate-500 mt-1">
                                    {objective.recurrence}
                                    {period?.ends_on ? ` · échéance ${new Date(`${period.ends_on}T00:00:00`).toLocaleDateString('fr-FR')}` : ''}
                                  </p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                  period?.succeeded
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : (period?.pending_progress || 0) > 0
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {period?.succeeded ? 'Atteint' : (period?.pending_progress || 0) > 0 ? 'En attente' : 'En cours'}
                                </span>
                              </div>
                              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200" aria-label={`Progression ${Math.round(period?.progress_pct || 0)} %`}>
                                <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, period?.progress_pct || 0)}%` }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mt-3">Aucun objectif détaillé pour cette niche.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <UserRound className="h-4 w-4" />
          <Link href="/dashboard/users" className="text-blue-700 hover:underline">
            Retour à la liste
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <RoleGuard permission="agency:read">
      <AgentDetailContent id={id} />
    </RoleGuard>
  )
}
