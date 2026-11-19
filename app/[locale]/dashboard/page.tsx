'use client'

import { useQuery } from '@tanstack/react-query'
import { clientsApi, contractsApi, prospectsApi, walletApi, portalClientApi } from '@/lib/api/mobi-assur'
import { useAuthStore } from '@/lib/stores/auth-store'
import Header from '@/components/dashboard/Header'
import SystemSupervisionChart from '@/components/dashboard/SystemSupervisionChart'
import {
  Users,
  FileText,
  Clock,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Inbox,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Car,
  ChevronRight,
  Activity,
  Layers,
} from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function DashboardOverview() {
  const t = useTranslations('dashboard')
  const { user } = useAuthStore()

  // Queries
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list(),
  })

  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => contractsApi.list(),
  })

  const { data: prospects = [], isLoading: loadingProspects } = useQuery({
    queryKey: ['prospects'],
    queryFn: () => prospectsApi.list(),
  })

  const { data: portalKpis, isLoading: loadingPortalKpis } = useQuery({
    queryKey: ['portal-kpis'],
    queryFn: () => portalClientApi.kpis(),
  })

  // Safe data arrays
  const safeClients = Array.isArray(clients) ? clients : []
  const safeContracts = Array.isArray(contracts) ? contracts : []
  const safeProspects = Array.isArray(prospects) ? prospects : []

  // Metrics calculation
  const paidContracts = safeContracts.filter((c) => c.status?.toUpperCase() === 'PAYE')
  const totalPremium = paidContracts.reduce((acc, c) => acc + (c.pttc ?? c.prime_ttc ?? 0), 0)
  const pendingConversions = safeProspects.filter((p) => p.status === 'EN_ATTENTE_VALIDATION').length
  const pendingPaymentsCount = Number(portalKpis?.pending_client_payments ?? 0)
  const openClaimsCount = Number(portalKpis?.open_claims ?? 0)
  const openRequestsCount = Number(portalKpis?.open_requests ?? 0)

  const todayDateStr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // 4 Macro KPIs Stratégiques
  const macroKpis = [
    {
      title: 'Primes Encaissées (TTC)',
      value: `${totalPremium.toLocaleString('fr-FR')} FCFA`,
      subtitle: `${paidContracts.length} contrat(s) soldé(s)`,
      icon: TrendingUp,
      color: 'emerald',
      href: '/dashboard/contracts',
      loading: loadingContracts,
    },
    {
      title: 'Polices & Devis CIMA',
      value: safeContracts.length || 0,
      subtitle: `${paidContracts.length} actives · ${safeContracts.length - paidContracts.length} devis/attente`,
      icon: ShieldCheck,
      color: 'blue',
      href: '/dashboard/contracts',
      loading: loadingContracts,
    },
    {
      title: 'Dossiers Sinistres CIMA',
      value: openClaimsCount,
      subtitle: openClaimsCount > 0 ? 'Dossiers sous instruction / expertise' : 'Aucun sinistre en cours',
      icon: AlertTriangle,
      color: openClaimsCount > 0 ? 'rose' : 'slate',
      href: '/dashboard/sinistres',
      loading: loadingPortalKpis,
    },
    {
      title: 'Portefeuille Assurés',
      value: safeClients.length || 0,
      subtitle: `${portalKpis?.portal_active_clients ?? safeClients.length} comptes mobiles actifs`,
      icon: Users,
      color: 'indigo',
      href: '/dashboard/clients',
      loading: loadingClients || loadingPortalKpis,
    },
  ]

  // Cartes du Centre d'Action Prioritaire (Tâches en attente d'arbitrage)
  const priorityTasks = [
    {
      title: 'Encaissements à Valider',
      count: pendingPaymentsCount,
      description: 'Paiements déclarés en attente de vérification bancaire/MM',
      actionLabel: 'Traiter les paiements',
      href: '/dashboard/paiements-declares',
      tone: pendingPaymentsCount > 0 ? 'amber' : 'neutral',
      icon: CreditCard,
    },
    {
      title: 'Sinistres à Instruire',
      count: openClaimsCount,
      description: 'Déclarations CIMA nécessitant un mandat ou un chiffrage',
      actionLabel: 'Gérer les sinistres',
      href: '/dashboard/sinistres',
      tone: openClaimsCount > 0 ? 'rose' : 'neutral',
      icon: AlertTriangle,
    },
    {
      title: 'Prospects à Convertir',
      count: pendingConversions,
      description: 'Demandes de devis éligibles à une souscription immédiate',
      actionLabel: 'Convertir en contrat',
      href: '/dashboard/prospects',
      tone: pendingConversions > 0 ? 'blue' : 'neutral',
      icon: Clock,
    },
    {
      title: 'Demandes & Avenants',
      count: openRequestsCount,
      description: 'Sollicitations et modifications contractuelles des assurés',
      actionLabel: 'Consulter le support',
      href: '/dashboard/demandes-clients',
      tone: openRequestsCount > 0 ? 'emerald' : 'neutral',
      icon: Inbox,
    },
  ]

  return (
    <div className="flex-1 flex flex-col bg-slate-50/70 min-h-screen">
      <Header title={t('title')} subtitle={t('subtitle')} />

      <main className="p-5 sm:p-7 space-y-7 flex-1 max-w-7xl w-full mx-auto">
        {/* Bannière Executive ProMax */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 capitalize">
                <Calendar className="h-3 w-3 text-slate-500" />
                {todayDateStr}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Système Opérationnel
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Bonjour, {user?.full_name || 'Gestionnaire'} 👋
            </h1>
            <p className="text-xs text-slate-500 font-medium max-w-2xl">
              Supervision de la production d'assurance automobile, suivi des encaissements et pilotage des dossiers sinistres CIMA.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link href="/dashboard/contracts/new">
              <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer border-0">
                <Plus className="h-4 w-4" />
                <span>Créer une Police / Devis</span>
              </button>
            </Link>
          </div>
        </section>

        {/* 4 KPIs Macro Stratégiques */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {macroKpis.map((kpi, idx) => {
            const Icon = kpi.icon
            return (
              <Link
                key={idx}
                href={kpi.href}
                className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">{kpi.title}</span>
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                      kpi.color === 'emerald'
                        ? 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white'
                        : kpi.color === 'blue'
                        ? 'bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white'
                        : kpi.color === 'rose'
                        ? 'bg-rose-50 text-rose-700 group-hover:bg-rose-600 group-hover:text-white'
                        : 'bg-indigo-50 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                </div>

                <div className="mt-4">
                  {kpi.loading ? (
                    <div className="h-7 w-24 bg-slate-100 rounded-md animate-pulse my-1" />
                  ) : (
                    <p className="text-2xl font-black text-slate-900 tracking-tight">{kpi.value}</p>
                  )}
                  <p className="text-[11px] font-medium text-slate-400 mt-1 truncate">{kpi.subtitle}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-blue-700 group-hover:text-blue-900">
                  <span>Accéder à la gestion</span>
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            )
          })}
        </section>

        {/* Centre d'Arbitrage & Actions Prioritaires (Tasks & Urgences) */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60">
                <Activity className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  Centre d'Actions Prioritaires
                </h2>
                <p className="text-xs text-slate-500">Dossiers en attente d'arbitrage ou de validation par le gestionnaire</p>
              </div>
            </div>

            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {pendingPaymentsCount + openClaimsCount + pendingConversions + openRequestsCount} tâche(s) active(s)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {priorityTasks.map((task, idx) => {
              const Icon = task.icon
              const hasAlert = task.count > 0

              const toneStyles = {
                amber: 'border-amber-200 bg-amber-50/50 text-amber-900 hover:bg-amber-50',
                rose: 'border-rose-200 bg-rose-50/50 text-rose-900 hover:bg-rose-50',
                blue: 'border-blue-200 bg-blue-50/50 text-blue-900 hover:bg-blue-50',
                emerald: 'border-emerald-200 bg-emerald-50/50 text-emerald-900 hover:bg-emerald-50',
                neutral: 'border-slate-200/70 bg-slate-50/40 text-slate-700 hover:bg-slate-50',
              }[task.tone]

              const badgeColor = {
                amber: 'bg-amber-500 text-white',
                rose: 'bg-rose-500 text-white',
                blue: 'bg-blue-600 text-white',
                emerald: 'bg-emerald-600 text-white',
                neutral: 'bg-slate-200 text-slate-600',
              }[task.tone]

              return (
                <Link
                  key={idx}
                  href={task.href}
                  className={`rounded-2xl border p-4 flex flex-col justify-between transition-all hover:shadow-xs group cursor-pointer ${toneStyles}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Icon className="h-4.5 w-4.5 opacity-80" />
                      <span className={`px-2 py-0.5 rounded-full text-xs font-black shadow-2xs ${badgeColor}`}>
                        {task.count}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm tracking-tight text-slate-900">{task.title}</h3>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">{task.description}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-slate-800 group-hover:text-blue-700">
                    <span>{task.actionLabel}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Section Double Colonne : Dernières Polices (2/3) & Graphique de Supervision (1/3) */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* Polices Récentes */}
          <div className="xl:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  Dernières Polices & Souscriptions
                </h2>
                <p className="text-xs text-slate-500">Flux des récents contrats émis et devis automobiles</p>
              </div>

              <Link href="/dashboard/contracts">
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer">
                  <span>Voir tous les contrats</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </Link>
            </div>

            {loadingContracts ? (
              <div className="space-y-2.5 py-4">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : safeContracts.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <FileText className="h-9 w-9 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold">Aucune police enregistrée</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 px-2">ID Police</th>
                      <th className="pb-3 px-2">Formule / Branche</th>
                      <th className="pb-3 px-2">Prime TTC</th>
                      <th className="pb-3 px-2">Statut</th>
                      <th className="pb-3 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {safeContracts.slice(0, 5).map((contract) => (
                      <tr key={contract.id} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="py-3 px-2">
                          <Link
                            href={`/dashboard/contracts/${contract.id}`}
                            className="font-mono font-bold text-slate-900 group-hover:text-blue-700 transition-colors"
                          >
                            {contract.contract_number || contract.id.substring(0, 8).toUpperCase()}
                          </Link>
                        </td>
                        <td className="py-3 px-2 text-slate-600 font-medium">
                          {contract.product_type} · {contract.subscription_type || 'Annuelle'}
                        </td>
                        <td className="py-3 px-2 font-black text-slate-900 font-mono">
                          {(contract.pttc ?? contract.prime_ttc ?? 0).toLocaleString('fr-FR')} XAF
                        </td>
                        <td className="py-3 px-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block border ${
                              contract.status === 'PAYE'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {contract.status === 'PAYE' ? 'Actif / Soldé' : contract.status}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Link
                            href={`/dashboard/contracts/${contract.id}`}
                            className="text-xs font-bold text-blue-700 hover:underline"
                          >
                            Détails &rarr;
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Graphique de Production Mensuelle */}
          <div className="xl:col-span-1">
            <SystemSupervisionChart />
          </div>
        </section>
      </main>
    </div>
  )
}
