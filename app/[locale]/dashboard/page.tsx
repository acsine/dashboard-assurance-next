'use client'

import { useQuery } from '@tanstack/react-query'
import { clientsApi, contractsApi, prospectsApi, walletApi, portalClientApi } from '@/lib/api/mobi-assur'
import { useAuthStore } from '@/lib/stores/auth-store'
import Header from '@/components/dashboard/Header'
import SystemSupervisionChart from '@/components/dashboard/SystemSupervisionChart'
import { useState } from 'react'
import {
  Users,
  FileText,
  Clock,
  Wallet,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  Activity,
  ArrowRight,
  Plus,
  AlertTriangle,
  CreditCard,
  Inbox,
  Smartphone,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

function SpinLinkButton({
  href,
  className,
  children,
  icon: Icon,
  iconClassName,
}: {
  href: string
  className?: string
  children: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  iconClassName?: string
}) {
  const [loading, setLoading] = useState(false)

  return (
    <Link
      href={href}
      onClick={() => setLoading(true)}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className={iconClassName || 'h-3.5 w-3.5 shrink-0'} />
      ) : null}
      <span>{children}</span>
    </Link>
  )
}

export default function DashboardOverview() {
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

  const { data: prospects = [] } = useQuery({
    queryKey: ['prospects'],
    queryFn: () => prospectsApi.list(),
  })

  const { data: withdrawals = [] } = useQuery({
    queryKey: ['withdrawals-pending'],
    queryFn: () => walletApi.listPendingWithdrawals(),
  })

  const { data: portalKpis } = useQuery({
    queryKey: ['portal-kpis'],
    queryFn: () => portalClientApi.kpis(),
  })

  // Calculations
  const safeClients = Array.isArray(clients) ? clients : []
  const safeContracts = Array.isArray(contracts) ? contracts : []
  const safeProspects = Array.isArray(prospects) ? prospects : []
  const safeWithdrawals = Array.isArray(withdrawals) ? withdrawals : []

  const paidContracts = safeContracts.filter((c) => c.status?.toUpperCase() === 'PAYE')
  const totalPremium = paidContracts.reduce((acc, c) => acc + (c.pttc ?? c.prime_ttc ?? 0), 0)
  const pendingConversions = safeProspects.filter(
    (p) => p.status === 'EN_ATTENTE_VALIDATION',
  ).length

  const todayDateStr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const kpis = [
    {
      title: 'Clients Assurés Actifs',
      value: safeClients.length || 0,
      icon: Users,
      color: 'blue',
      description: 'Répertoire national clients',
      link: '/dashboard/clients',
      badge: 'Clientele',
    },
    {
      title: 'Volume Primes (TTC)',
      value: `${totalPremium.toLocaleString('fr-FR')} FCFA`,
      icon: TrendingUp,
      color: 'emerald',
      description: `${paidContracts.length} contrats validés`,
      link: '/dashboard/contracts',
      badge: 'Chiffre d\'Affaires',
    },
    {
      title: 'Prospects en Pipeline',
      value: safeProspects.length || 0,
      icon: Clock,
      color: 'amber',
      description:
        pendingConversions > 0
          ? `${pendingConversions} conversion(s) à valider`
          : 'Prospects synchronisés',
      link: '/dashboard/prospects',
      badge: 'Opportunités',
    },
    {
      title: 'Retraits de Wallet',
      value: safeWithdrawals.length || 0,
      icon: Wallet,
      color: 'indigo',
      description: 'Demandes agents en attente',
      link: '/dashboard/wallet',
      badge: 'Commissions',
    },
    {
      title: 'Comptes Portail Client',
      value: portalKpis?.portal_active_clients ?? safeClients.length,
      icon: Smartphone,
      color: 'blue',
      description: 'Utilisateurs d\'application mobile',
      link: '/dashboard/clients',
      badge: 'Digital',
    },
    {
      title: 'Dossiers Sinistres Ouverts',
      value: portalKpis?.open_claims ?? '0',
      icon: AlertTriangle,
      color: 'rose',
      description: 'File d\'instruction sinistres',
      link: '/dashboard/sinistres',
      badge: 'Urgence',
    },
    {
      title: 'Paiements Déclarés',
      value: portalKpis?.pending_client_payments ?? '0',
      icon: CreditCard,
      color: 'indigo',
      description: 'Justificatifs à valider',
      link: '/dashboard/paiements-declares',
      badge: 'Encaissements',
    },
    {
      title: 'Demandes & Avenants',
      value: portalKpis?.open_requests ?? '0',
      icon: Inbox,
      color: 'emerald',
      description: 'Requêtes support ouvertes',
      link: '/dashboard/demandes-clients',
      badge: 'Support',
    },
  ]

  return (
    <div className="flex-1 flex flex-col bg-slate-50/60 min-h-screen">
      <Header
        title="Commandement & Supervision Global"
        subtitle="Tableau de bord de gestion des polices, sinistres et commissions Bethel Insurance."
      />

      <div className="p-6 sm:p-8 space-y-8 flex-1">
        
        {/* Welcome Hero Banner */}
        <div
          className="relative rounded-2xl text-white py-4 px-5 sm:px-6 overflow-hidden shadow-lg border border-blue-900/40"
          style={{ background: 'linear-gradient(135deg, #0b192c 0%, #1b365d 60%, #0f172a 100%)' }}
        >
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/15 backdrop-blur-md border border-amber-400/30 text-amber-300 text-[11px] font-extrabold capitalize shadow-xs">
                <Calendar className="h-3 w-3 text-amber-400" />
                <span>{todayDateStr}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight text-white drop-shadow-xs">
                Bonjour, {user?.full_name || 'Gestionnaire'} 👋
              </h2>
              <p className="text-slate-200 text-xs font-semibold max-w-xl leading-snug">
                Supervision en temps réel des opérations d'assurance, validation des encaissements et suivi du portefeuille client.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link href="/dashboard/contracts/new">
                <button className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer border-0">
                  <Plus className="h-3.5 w-3.5 stroke-[3]" />
                  <span>Créer une Police / Devis</span>
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions Shortcuts Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Actions Opérationnelles Rapides
              </h3>
              <p className="text-xs font-medium text-slate-500">Raccourcis vers les tâches fréquentes</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/clients/new">
              <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl transition-all cursor-pointer">
                <Plus className="h-3.5 w-3.5 text-blue-600" />
                Client
              </button>
            </Link>
            <Link href="/dashboard/sinistres">
              <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl transition-all cursor-pointer">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                Sinistre
              </button>
            </Link>
            <Link href="/dashboard/paiements-declares">
              <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl transition-all cursor-pointer">
                <CreditCard className="h-3.5 w-3.5 text-indigo-600" />
                Paiement
              </button>
            </Link>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {kpis.map((kpi, i) => (
            <div
              key={i}
              className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group"
            >
              <div className="flex justify-between items-start">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  {kpi.badge}
                </span>
                <span
                  className={`p-2.5 rounded-xl text-sm transition-all duration-200 ${
                    kpi.color === 'blue'
                      ? 'bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white'
                      : kpi.color === 'emerald'
                      ? 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white'
                      : kpi.color === 'amber'
                      ? 'bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white'
                      : kpi.color === 'rose'
                      ? 'bg-rose-50 text-rose-700 group-hover:bg-rose-600 group-hover:text-white'
                      : 'bg-indigo-50 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white'
                  }`}
                >
                  <kpi.icon className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-4">
                <span className="text-xs font-bold text-slate-500 block">{kpi.title}</span>
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight block mt-1">
                  {kpi.value}
                </span>
                <p className="text-[11px] font-medium text-slate-400 mt-1">{kpi.description}</p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={kpi.link}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1.5 transition-colors"
                >
                  Gérer
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Contracts List Widget */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                    Polices d'Assurances Récentes
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    Dernières polices émises et devis en cours
                  </p>
                </div>
                <Link href="/dashboard/contracts">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-blue-700 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer">
                    <span>Tout voir</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </Link>
              </div>

              {safeContracts.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <FileText className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-medium">Aucun contrat enregistré</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="pb-3 px-2">N° Police / Produit</th>
                        <th className="pb-3 px-2">Branche</th>
                        <th className="pb-3 px-2">Prime TTC</th>
                        <th className="pb-3 px-2">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {safeContracts.slice(0, 6).map((contract) => (
                        <tr key={contract.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="py-3.5 px-2">
                            <span className="font-extrabold text-sm text-slate-900 block group-hover:text-blue-700 transition-colors">
                              {contract.id.substring(0, 8).toUpperCase()}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400 block mt-0.5">
                              {contract.product_type}
                            </span>
                          </td>
                          <td className="py-3.5 px-2 font-semibold text-slate-700">
                            {contract.product_line || 'AUTO'}
                          </td>
                          <td className="py-3.5 px-2 font-black text-slate-900">
                            {(contract.prime_ttc || 0).toLocaleString('fr-FR')} FCFA
                          </td>
                          <td className="py-3.5 px-2">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-block border ${
                                contract.status === 'PAYE'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {contract.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {safeContracts.length > 6 && (
              <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                <Link
                  href="/dashboard/contracts"
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors"
                >
                  Voir l'intégralité des polices d'assurance →
                </Link>
              </div>
            )}
          </div>

          {/* Network System Health Widget */}
          <SystemSupervisionChart />

        </div>

      </div>
    </div>
  )
}
