'use client'

import { useQuery } from '@tanstack/react-query'
import { clientsApi, contractsApi, prospectsApi, walletApi, portalClientApi } from '@/lib/api/mobi-assur'
import Header from '@/components/dashboard/Header'
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
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardOverview() {
  // Query clients
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list(),
  })

  // Query contracts
  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => contractsApi.list(),
  })

  // Query prospects
  const { data: prospects = [] } = useQuery({
    queryKey: ['prospects'],
    queryFn: () => prospectsApi.list(),
  })

  // Query withdrawals
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

  const totalPremium = safeContracts.reduce((acc, c) => acc + (c.prime_ttc || 0), 0)
  const paidContracts = safeContracts.filter((c) => c.status?.toUpperCase() === 'PAYE')
  const pendingContracts = safeContracts.filter((c) => c.status?.toUpperCase() === 'DEVIS')

  const pendingConversions = safeProspects.filter(
    (p) => p.status === 'EN_ATTENTE_VALIDATION',
  ).length

  const kpis = [
    {
      title: 'Clients Actifs',
      value: safeClients.length || 0,
      icon: Users,
      color: 'blue',
      description: 'Total enregistrés',
      link: '/dashboard/clients',
    },
    {
      title: 'Volume Primes (TTC)',
      value: `${totalPremium.toLocaleString('fr-FR')} FCFA`,
      icon: TrendingUp,
      color: 'emerald',
      description: `${paidContracts.length} contrats payés`,
      link: '/dashboard/contracts',
    },
    {
      title: 'Prospects (agence)',
      value: safeProspects.length || 0,
      icon: Clock,
      color: 'amber',
      description:
        pendingConversions > 0
          ? `${pendingConversions} conversion(s) à valider`
          : 'Tous les prospects synchronisés',
      link: '/dashboard/prospects',
    },
    {
      title: 'Retraits de Wallet',
      value: safeWithdrawals.length || 0,
      icon: Wallet,
      color: 'indigo',
      description: 'Demandes en attente',
      link: '/dashboard/wallet',
    },
    {
      title: 'Comptes portail',
      value: portalKpis?.portal_active_clients ?? '—',
      icon: Smartphone,
      color: 'blue',
      description: 'Clients app actifs',
      link: '/dashboard/clients',
    },
    {
      title: 'Sinistres ouverts',
      value: portalKpis?.open_claims ?? '—',
      icon: AlertTriangle,
      color: 'amber',
      description: 'File sinistres',
      link: '/dashboard/sinistres',
    },
    {
      title: 'Paiements pending',
      value: portalKpis?.pending_client_payments ?? '—',
      icon: CreditCard,
      color: 'indigo',
      description: 'Déclarations client',
      link: '/dashboard/paiements-declares',
    },
    {
      title: 'Demandes ouvertes',
      value: portalKpis?.open_requests ?? '—',
      icon: Inbox,
      color: 'emerald',
      description: 'Avenants / support',
      link: '/dashboard/demandes-clients',
    },
  ]

  return (
    <div className="flex-1 flex flex-col bg-transparent">

      <Header
        title="Commandement Global des Opérations"
        subtitle="Supervision en temps réel du réseau national d'assurance Bethel Comprehensive Insurance."
      />

      <div className="p-6 sm:p-8 space-y-8 flex-1">

        {/* Quick Actions Bar */}
        <div className="bg-white/90 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 pro-shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl font-bold">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Actions Rapides Opérationnelles</h3>
              <p className="text-xs font-medium text-slate-500">Accès direct aux tâches fréquentes</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/dashboard/contracts">
              <button className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white rounded-xl transition-all pro-shadow-sm cursor-pointer active:scale-[0.98]">
                <Plus className="h-4 w-4" />
                Nouvelle Police
              </button>
            </Link>
            <Link href="/dashboard/sinistres">
              <button className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-all cursor-pointer">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Déclarer Sinistre
              </button>
            </Link>
            <Link href="/dashboard/paiements-declares">
              <button className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-all cursor-pointer">
                <CreditCard className="h-4 w-4 text-indigo-600" />
                Valider Paiement
              </button>
            </Link>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {kpis.map((kpi, i) => (
            <div
              key={i}
              className="bg-white/95 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-slate-200/80 pro-shadow-sm hover:pro-shadow-lg hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group"
            >
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  {kpi.title}
                </span>
                <span
                  className={`p-2.5 rounded-xl text-sm transition-all duration-200 ${
                    kpi.color === 'blue'
                      ? 'bg-blue-50 text-blue-700 group-hover:bg-blue-700 group-hover:text-white'
                      : kpi.color === 'emerald'
                      ? 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white'
                      : kpi.color === 'amber'
                      ? 'bg-amber-50 text-amber-700 group-hover:bg-amber-700 group-hover:text-white'
                      : 'bg-indigo-50 text-indigo-700 group-hover:bg-indigo-700 group-hover:text-white'
                  }`}
                >
                  <kpi.icon className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-4">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight block">
                  {kpi.value}
                </span>
                <p className="text-xs font-medium text-slate-500 mt-1">{kpi.description}</p>
              </div>
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={kpi.link}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1.5 transition-colors"
                >
                  Consulter
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Dashboard Content Blocks */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1">
          {/* Contracts List Column */}
          <div className="xl:col-span-2 bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/80 pro-shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">Polices d'Assurances Récentes</h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    Dernières cotisations et devis émis par l'agence.
                  </p>
                </div>
                <Link href="/dashboard/contracts">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer">
                    Voir tout
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </Link>
              </div>

              {safeContracts.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <FileText className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-medium">Aucun contrat ou devis enregistré</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-3 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          N° Police / Produit
                        </th>
                        <th className="pb-3 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Formule
                        </th>
                        <th className="pb-3 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Prime TTC
                        </th>
                        <th className="pb-3 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Statut
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {safeContracts.slice(0, 5).map((contract) => (
                        <tr key={contract.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="py-3.5 px-2">
                            <span className="font-extrabold text-sm text-slate-900 block group-hover:text-blue-700 transition-colors">
                              {contract.id.substring(0, 8).toUpperCase()}
                            </span>
                            <span className="text-xs font-medium text-slate-500 block mt-0.5">
                              {contract.product_type}
                            </span>
                          </td>
                          <td className="py-3.5 px-2 text-xs font-semibold text-slate-600">
                            {contract.subscription_type}
                          </td>
                          <td className="py-3.5 px-2 font-extrabold text-xs text-slate-900">
                            {(contract.prime_ttc || 0).toLocaleString('fr-FR')} FCFA
                          </td>
                          <td className="py-3.5 px-2">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-block border ${
                                contract.status === 'PAYE'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                                  : 'bg-amber-50 text-amber-800 border-amber-200/80'
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

            {safeContracts.length > 5 && (
              <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                <Link
                  href="/dashboard/contracts"
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors"
                >
                  Voir l'intégralité des contrats →
                </Link>
              </div>
            )}
          </div>

          {/* Activity / Logs Column */}
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/80 pro-shadow-sm p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight mb-6 flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-700" />
                Statut du Réseau National
              </h3>

              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600">API Gateway MobiAssur</span>
                    <span className="text-emerald-700 font-extrabold inline-flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-ping" />
                      Opérationnel
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full w-[99.8%]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600">Service Émission Polices</span>
                    <span className="text-emerald-700 font-extrabold inline-flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-ping" />
                      Opérationnel
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full w-full" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600">Synchro App Mobile</span>
                    <span className="text-amber-700 font-extrabold">Actif (323/324)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full w-[95%]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl border border-blue-200/80 pro-shadow-sm flex items-start gap-3">
              <div className="bg-blue-700/10 p-2 rounded-lg shrink-0">
                <AlertCircle className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900">MobiAssur Management System</h4>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed font-medium">
                  Plateforme certifiée conforme aux exigences CIMA et de résilience réseau des opérations d'assurance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
