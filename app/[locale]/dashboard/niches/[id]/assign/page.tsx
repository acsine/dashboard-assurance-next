'use client'

import { use, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  Phone,
  Search,
  Target,
  Trophy,
  UserRound,
  WalletCards,
} from 'lucide-react'
import Header from '@/components/dashboard/Header'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ObjectiveEditor } from '@/components/niches/ObjectiveEditor'
import { Link, useRouter } from '@/i18n/navigation'
import {
  asList,
  nichesApi,
  type AgentRanking,
  type Niche,
  type NicheAgreement,
  type NicheObjective,
} from '@/lib/api/mobi-assur'
import { toast } from 'sonner'

const labelClass = 'block text-[10px] font-bold uppercase tracking-wider text-slate-500'

type AssignmentForm = {
  objective_members: string
  objective_contracts: string
  objective_premium: string
  objective_due_at: string
  objective_note: string
  notes: string
}

const emptyForm: AssignmentForm = {
  objective_members: '0',
  objective_contracts: '0',
  objective_premium: '0',
  objective_due_at: '',
  objective_note: '',
  notes: '',
}

function LoadingSection({
  title,
  message,
  rows = 3,
}: {
  title: string
  message: string
  rows?: number
}) {
  return (
    <Card className="rounded-2xl border-slate-200" aria-busy="true" aria-live="polite">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-700" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-600">{message}</p>
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-xl bg-slate-100" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string
  message: string
  onRetry: () => void
}) {
  return (
    <Card className="rounded-2xl border-red-200 bg-red-50/40">
      <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-bold text-red-900">{title}</h2>
            <p className="mt-1 text-xs text-red-700">{message}</p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={onRetry}>
          Réessayer
        </Button>
      </CardContent>
    </Card>
  )
}

function AssignmentContent({ id }: { id: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [form, setForm] = useState<AssignmentForm>(emptyForm)
  const [objectives, setObjectives] = useState<NicheObjective[]>([])
  const [confirmReassign, setConfirmReassign] = useState(false)
  const [initializedNicheId, setInitializedNicheId] = useState<string | null>(null)

  const nicheQuery = useQuery({
    queryKey: ['niches', id],
    queryFn: async () => asList<Niche>(await nichesApi.list()).find((item) => item.id === id) || null,
  })

  const rankingsQuery = useQuery({
    queryKey: ['agent-rankings'],
    queryFn: () => nichesApi.listRankings(),
  })

  const objectivesQuery = useQuery({
    queryKey: ['niche-assignment-objectives', id, nicheQuery.data?.assignment?.id],
    enabled: Boolean(nicheQuery.data),
    queryFn: async () => {
      const niche = nicheQuery.data!
      if (niche.assignment?.id) {
        const agreements = asList<NicheAgreement>(await nichesApi.agreements(id))
        const current = agreements.find((agreement) => agreement.id === niche.assignment?.id)
        if (current?.objectives?.length) {
          return { items: current.objectives, source: 'agreement' as const }
        }
      }
      const templates = asList<NicheObjective>(await nichesApi.listObjectiveTemplates(id))
      return {
        items: templates.map((objective) => ({
          ...objective,
          source_template_id: objective.id || null,
        })),
        source: 'templates' as const,
      }
    },
  })

  const niche = nicheQuery.data
  const rankings = asList<AgentRanking>(rankingsQuery.data)

  useEffect(() => {
    if (!niche || objectivesQuery.data === undefined || initializedNicheId === niche.id) return
    setSelectedAgentId(niche.assigned_agent_id || '')
    setForm({
      objective_members: String(niche.assignment?.objective_members || 0),
      objective_contracts: String(niche.assignment?.objective_contracts || 0),
      objective_premium: String(niche.assignment?.objective_premium || 0),
      objective_due_at: niche.assignment?.objective_due_at || '',
      objective_note: niche.assignment?.objective_note || '',
      notes: niche.assignment?.notes || '',
    })
    setObjectives(objectivesQuery.data.items.map((objective) => ({ ...objective })))
    setInitializedNicheId(niche.id)
  }, [initializedNicheId, niche, objectivesQuery.data])

  const filteredRankings = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rankings
    return rankings.filter(
      (agent) =>
        agent.agent_name.toLowerCase().includes(query) ||
        (agent.agent_code || '').toLowerCase().includes(query),
    )
  }, [rankings, search])

  const selectedAgent = rankings.find((agent) => agent.agent_id === selectedAgentId)
  const isReassignment = Boolean(
    niche?.assigned_agent_id &&
      selectedAgentId &&
      niche.assigned_agent_id !== selectedAgentId,
  )
  const hasInvalidObjectives = objectives.some(
    (objective) =>
      !objective.code.trim() ||
      !objective.label.trim() ||
      objective.target_value <= 0 ||
      (objective.recurrence === 'CUSTOM' && !objective.custom_interval_days),
  )

  const returnToCatalogue = () => router.push('/dashboard/niches')

  const assignMutation = useMutation({
    mutationFn: () =>
      nichesApi.assign(id, {
        agent_id: selectedAgentId,
        objective_members: Number(form.objective_members) || 0,
        objective_contracts: Number(form.objective_contracts) || 0,
        objective_premium: Number(form.objective_premium) || 0,
        objective_due_at: form.objective_due_at || null,
        objective_note: form.objective_note.trim() || null,
        notes: form.notes.trim() || null,
        objectives: objectives.map((objective, index) => ({
          ...objective,
          code: objective.code.trim().toUpperCase(),
          label: objective.label.trim(),
          sort_order: index,
          source_template_id: objective.source_template_id || objective.id || null,
        })),
      }),
    onSuccess: async () => {
      toast.success(isReassignment ? 'Niche réattribuée' : 'Niche attribuée')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['niches'] }),
        queryClient.invalidateQueries({ queryKey: ['niche-agreements'] }),
        queryClient.invalidateQueries({ queryKey: ['agent-rankings'] }),
      ])
      returnToCatalogue()
    },
    onError: (error: Error) => toast.error(error.message || "Erreur d'attribution"),
  })

  const unassignMutation = useMutation({
    mutationFn: () => nichesApi.unassign(id),
    onSuccess: async () => {
      toast.success('Attribution retirée')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['niches'] }),
        queryClient.invalidateQueries({ queryKey: ['niche-agreements'] }),
        queryClient.invalidateQueries({ queryKey: ['agent-rankings'] }),
      ])
      returnToCatalogue()
    },
    onError: (error: Error) => toast.error(error.message || "Erreur lors du retrait"),
  })

  if (nicheQuery.isLoading) {
    return (
      <div className="flex min-h-screen flex-1 flex-col bg-slate-50/60">
        <Header title="Attribution d’une niche" subtitle="Sélection et objectifs de l’agent" />
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          <LoadingSection
            title="Chargement de la niche"
            message="Récupération des informations et de l’attribution actuelle."
            rows={4}
          />
        </main>
      </div>
    )
  }

  if (nicheQuery.isError) {
    return (
      <div className="flex min-h-screen flex-1 flex-col bg-slate-50/60">
        <Header title="Attribution d’une niche" subtitle="Sélection et objectifs de l’agent" />
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          <ErrorState
            title="Impossible de charger la niche"
            message="Vérifiez votre connexion puis relancez le chargement."
            onRetry={() => nicheQuery.refetch()}
          />
        </main>
      </div>
    )
  }

  if (!niche) {
    return (
      <div className="flex min-h-screen flex-1 flex-col bg-slate-50/60">
        <Header title="Niche introuvable" subtitle="Cette niche n’existe pas ou a été supprimée" />
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          <Card className="rounded-2xl border-slate-200">
            <CardContent className="p-8 text-center">
              <Building2 className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
              <h1 className="mt-3 text-base font-bold text-slate-900">Niche introuvable</h1>
              <p className="mt-1 text-sm text-slate-600">Aucune niche ne correspond à cet identifiant.</p>
              <Button type="button" className="mt-5" onClick={returnToCatalogue}>
                Retour aux niches
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-slate-50/60">
      <Header
        title={niche.assigned_agent_id ? 'Réattribuer la niche' : 'Attribuer la niche'}
        subtitle="Choisissez l’agent et cadrez précisément sa mission"
      />
      <main className="mx-auto w-full max-w-7xl space-y-5 p-4 pb-28 sm:p-6 sm:pb-28 lg:p-8 lg:pb-28">
        <Breadcrumb
          items={[
            { label: 'Niches', href: '/dashboard/niches' },
            { label: niche.name },
            { label: 'Attribution' },
          ]}
        />

        <Card className="overflow-hidden rounded-2xl border-blue-100 bg-white shadow-sm">
          <CardContent className="p-0">
            <div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-5">
              {[
                { icon: Building2, label: 'Niche', value: niche.name, hint: niche.category || 'Sans catégorie' },
                { icon: UserRound, label: 'Agent actuel', value: niche.assigned_agent_name || 'Non attribuée', hint: niche.assigned_agent_id ? 'Attribution active' : 'Disponible' },
                { icon: MapPin, label: 'Zone', value: niche.location || 'Non renseignée', hint: niche.contact_name || 'Contact à collecter' },
                { icon: Phone, label: 'Contact', value: niche.contact_phone || 'Non renseigné', hint: niche.contact_incomplete ? 'Collecte obligatoire' : 'Coordonnées disponibles' },
                { icon: WalletCards, label: 'Bonus', value: `${Number(niche.special_bonus_amount || 0).toLocaleString('fr-FR')} ${niche.bonus_type}`, hint: 'Prime spéciale' },
              ].map((item) => (
                <div key={item.label} className="min-w-0 bg-white p-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <item.icon className="h-4 w-4 text-blue-700" aria-hidden="true" />
                    {item.label}
                  </div>
                  <p className="mt-2 truncate text-sm font-bold text-slate-900">{item.value}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-600">{item.hint}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {(niche.contact_incomplete || (!niche.contact_name && !niche.contact_phone)) && (
          <div
            className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950"
            role="status"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold">Responsable de la niche non renseigné</p>
              <p className="mt-1 text-xs text-amber-800">
                Sa collecte sera transmise à l’agent sélectionné comme objectif obligatoire.
              </p>
            </div>
          </div>
        )}

        <section aria-labelledby="agent-selection-title" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="agent-selection-title" className="text-base font-bold text-slate-950">1. Sélectionner un agent</h2>
              <p className="mt-1 text-xs text-slate-600">Classement mensuel, composantes du score et charge active.</p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
              <label htmlFor="agent-search" className="sr-only">Rechercher un agent</label>
              <Input
                id="agent-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nom ou code agent"
                className="pl-9"
              />
            </div>
          </div>

          {rankingsQuery.isLoading ? (
            <LoadingSection
              title="Chargement du classement"
              message="Calcul des scores, performances et charges des agents."
              rows={5}
            />
          ) : rankingsQuery.isError ? (
            <ErrorState
              title="Impossible de charger le classement"
              message="Le classement des agents n’est pas disponible."
              onRetry={() => rankingsQuery.refetch()}
            />
          ) : (
            <Card className="overflow-hidden rounded-2xl border-slate-200">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        {['Choix', 'Rang', 'Agent', 'Score', 'Objectifs', 'Ventes', 'Points', 'Disponibilité', 'Charge'].map((heading) => (
                          <th key={heading} scope="col" className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRankings.map((agent) => {
                        const selected = selectedAgentId === agent.agent_id
                        return (
                          <tr
                            key={agent.agent_id}
                            className={`cursor-pointer transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                            onClick={() => {
                              setSelectedAgentId(agent.agent_id)
                              setConfirmReassign(false)
                            }}
                          >
                            <td className="px-3 py-3">
                              <input
                                type="radio"
                                name="selected-agent"
                                value={agent.agent_id}
                                checked={selected}
                                onChange={() => {
                                  setSelectedAgentId(agent.agent_id)
                                  setConfirmReassign(false)
                                }}
                                aria-label={`Sélectionner ${agent.agent_name}`}
                                className="h-4 w-4 accent-blue-700"
                              />
                            </td>
                            <td className="px-3 py-3 text-sm font-black text-slate-900">#{agent.rank}</td>
                            <td className="px-3 py-3">
                              <p className="text-sm font-bold text-slate-900">{agent.agent_name}</p>
                              <p className="text-[11px] text-slate-600">{agent.agent_code || agent.agent_id.slice(0, 8)}</p>
                            </td>
                            <td className="px-3 py-3 text-sm font-black text-blue-800">{agent.score.toFixed(1)}</td>
                            <td className="px-3 py-3 text-xs font-semibold text-slate-700">{agent.score_breakdown.objectives.toFixed(1)}</td>
                            <td className="px-3 py-3 text-xs font-semibold text-slate-700">{agent.score_breakdown.sales.toFixed(1)}</td>
                            <td className="px-3 py-3 text-xs font-semibold text-slate-700">{agent.score_breakdown.points.toFixed(1)}</td>
                            <td className="px-3 py-3 text-xs font-semibold text-slate-700">{agent.score_breakdown.availability.toFixed(1)}</td>
                            <td className="px-3 py-3 text-xs text-slate-700">{agent.active_niches} niche{agent.active_niches > 1 ? 's' : ''}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {!filteredRankings.length && (
                  <p className="p-8 text-center text-sm text-slate-600">Aucun agent ne correspond à la recherche.</p>
                )}
              </CardContent>
            </Card>
          )}
        </section>

        {selectedAgent && (
          <Card className="rounded-2xl border-blue-200 bg-blue-50/50">
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
              <div className="sm:col-span-2">
                <p className={labelClass}>Agent sélectionné</p>
                <p className="mt-1 text-base font-bold text-slate-950">{selectedAgent.agent_name}</p>
                <p className="text-xs text-slate-600">{selectedAgent.agent_code || 'Code non renseigné'}</p>
              </div>
              <div><p className={labelClass}>Rang / score</p><p className="mt-1 text-sm font-bold text-slate-900">#{selectedAgent.rank} · {selectedAgent.score.toFixed(1)}</p></div>
              <div><p className={labelClass}>Production du mois</p><p className="mt-1 text-sm font-bold text-slate-900">{selectedAgent.contracts_month} contrats · {selectedAgent.clients_month} clients</p></div>
              <div><p className={labelClass}>Objectifs atteints</p><p className="mt-1 text-sm font-bold text-slate-900">{selectedAgent.metrics_ok}/{selectedAgent.metrics_total} · {selectedAgent.objectives_pct}%</p></div>
            </CardContent>
          </Card>
        )}

        <section aria-labelledby="mission-title" className="space-y-4">
          <div>
            <h2 id="mission-title" className="text-base font-bold text-slate-950">2. Cadrer la mission</h2>
            <p className="mt-1 text-xs text-slate-600">Volumes, échéance et consignes transmis à l’agent.</p>
          </div>
          <Card className="rounded-2xl border-slate-200">
            <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Membres / prospects visés', 'objective_members'],
                ['Contrats visés', 'objective_contracts'],
                ['Prime estimée (FCFA)', 'objective_premium'],
              ].map(([label, key]) => (
                <div key={key} className="space-y-1">
                  <label htmlFor={key} className={labelClass}>{label}</label>
                  <Input id={key} type="number" min="0" value={form[key as keyof AssignmentForm]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
                </div>
              ))}
              <div className="space-y-1">
                <label htmlFor="objective_due_at" className={labelClass}>Échéance</label>
                <Input id="objective_due_at" type="date" value={form.objective_due_at} onChange={(event) => setForm({ ...form, objective_due_at: event.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="objective_note" className={labelClass}>Consigne commerciale</label>
                <Input id="objective_note" value={form.objective_note} onChange={(event) => setForm({ ...form, objective_note: event.target.value })} placeholder="Instruction commerciale pour cette niche" />
              </div>
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <label htmlFor="assignment_notes" className={labelClass}>Note interne</label>
                <Input id="assignment_notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Contexte utile au suivi de l’attribution" />
              </div>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="objectives-title" className="space-y-4">
          <div className="flex items-start gap-3">
            <Target className="mt-0.5 h-5 w-5 text-blue-700" aria-hidden="true" />
            <div>
              <h2 id="objectives-title" className="text-base font-bold text-slate-950">3. Personnaliser les objectifs</h2>
              <p className="mt-1 text-xs text-slate-600">Préremplis depuis l’accord actif, sinon depuis les modèles de la niche.</p>
            </div>
          </div>
          {objectivesQuery.isLoading || objectivesQuery.isPending ? (
            <LoadingSection
              title="Chargement des objectifs"
              message="Préparation des objectifs existants ou des modèles de la niche."
              rows={4}
            />
          ) : objectivesQuery.isError ? (
            <ErrorState
              title="Impossible de charger les objectifs"
              message="Les objectifs actuels et les modèles n’ont pas pu être récupérés."
              onRetry={() => objectivesQuery.refetch()}
            />
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {objectivesQuery.data?.source === 'agreement'
                  ? 'Objectifs repris depuis l’accord actif.'
                  : 'Objectifs préremplis depuis les modèles de la niche.'}
              </div>
              <ObjectiveEditor items={objectives} onChange={setObjectives} />
            </>
          )}
        </section>

        {isReassignment && (
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <input
              type="checkbox"
              checked={confirmReassign}
              onChange={(event) => setConfirmReassign(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-amber-700"
            />
            <span>
              <strong>Confirmer explicitement la réattribution.</strong>
              <span className="mt-1 block text-xs text-amber-800">
                {niche.assigned_agent_name} sera remplacé par {selectedAgent?.agent_name}. L’attribution précédente restera dans l’historique.
              </span>
            </span>
          </label>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:left-[var(--sidebar-width,0px)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {niche.assigned_agent_id ? (
              <Button
                type="button"
                variant="outline"
                className="w-full border-red-200 text-red-700 sm:w-auto"
                isLoading={unassignMutation.isPending}
                onClick={() => unassignMutation.mutate()}
              >
                Retirer l’attribution
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="flex-1 sm:flex-none" asChild>
              <Link href="/dashboard/niches">
                <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" /> Annuler
              </Link>
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-1 sm:flex-none"
              disabled={
                !selectedAgentId ||
                rankingsQuery.isLoading ||
                rankingsQuery.isError ||
                objectivesQuery.isError ||
                objectivesQuery.isLoading ||
                hasInvalidObjectives ||
                (isReassignment && !confirmReassign)
              }
              isLoading={assignMutation.isPending}
              onClick={() => assignMutation.mutate()}
            >
              <Trophy className="mr-1 h-4 w-4" aria-hidden="true" />
              {isReassignment ? 'Confirmer la réattribution' : 'Confirmer l’attribution'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AssignNichePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <RoleGuard permission="settings:manage">
      <AssignmentContent id={id} />
    </RoleGuard>
  )
}
