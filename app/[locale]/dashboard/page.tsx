'use client'

import { useQuery } from '@tanstack/react-query'
import { clientsApi, contractsApi, prospectsApi, walletApi } from '@/lib/api/mobi-assur'
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
  ]

  return (
    <div className="flex-1 flex flex-col bg-transparent">

      <Header
        title="Commandement Global des Opérations"
        subtitle="Supervision en temps réel du réseau national d'assurance MOBI-ASSUR."
      />

      <div className="p-8 space-y-8 flex-1">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((kpi, i) => (
            <div
              key={i}
              className="bg-white/90 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  {kpi.title}
                </span>
                <span
                  className={`p-2.5 rounded-2xl text-sm transition-colors ${
                    kpi.color === 'blue'
                      ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-500/30'
                      : kpi.color === 'emerald'
                      ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-emerald-500/30'
                      : kpi.color === 'amber'
                      ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-amber-500/30'
                      : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-indigo-500/30'
                  }`}
                >
                  <kpi.icon className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-5">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  {kpi.value}
                </span>
                <p className="text-xs font-medium text-slate-500 mt-1.5">{kpi.description}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={kpi.link}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5"
                >
                  Gérer
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Dashboard Content Blocks */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1">
          {/* Contracts List Column */}
          <div className="xl:col-span-2 bg-white/90 backdrop-blur-xl rounded-3xl border border-white/60 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">Polices d'Assurances Récentes</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1.5">
                    Dernières cotisations et devis de l'agence.
                  </p>
                </div>
                <Link href="/dashboard/contracts/new">
                  <button className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10 cursor-pointer">
                    <Plus className="h-3.5 w-3.5" />
                    Nouvelle police
                  </button>
                </Link>
              </div>

              {safeContracts.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <FileText className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm">Aucun contrat ou devis enregistré</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                          N° Police / Produit
                        </th>
                        <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Prime TTC
                        </th>
                        <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Statut
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {safeContracts.slice(0, 5).map((contract) => (
                        <tr key={contract.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                          <td className="py-4 px-2 rounded-l-xl">
                            <span className="font-bold text-sm text-slate-900 block group-hover:text-blue-600 transition-colors">
                              {contract.id.substring(0, 8).toUpperCase()}
                            </span>
                            <span className="text-xs font-medium text-slate-500 block mt-1">
                              {contract.product_type}
                            </span>
                          </td>
                          <td className="py-4 px-2 text-sm font-medium text-slate-600">
                            {contract.subscription_type}
                          </td>
                          <td className="py-4 px-2 font-extrabold text-sm text-slate-900">
                            {(contract.prime_ttc || 0).toLocaleString('fr-FR')} FCFA
                          </td>
                          <td className="py-4 px-2 rounded-r-xl">
                            <span
                              className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${
                                contract.status === 'PAYE'
                                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20'
                                  : 'bg-amber-50 text-amber-700 ring-1 ring-amber-500/20'
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
              <div className="mt-6 pt-4 border-t border-gray-50 text-center">
                <Link
                  href="/dashboard/contracts"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Voir tous les contrats
                </Link>
              </div>
            )}
          </div>

          {/* Activity / Logs Column */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/60 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight mb-8 flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Statut du Réseau
              </h3>

              <div className="space-y-6">
                <div className="space-y-2.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">API Gateway</span>
                    <span className="text-emerald-600 font-bold">Opérationnel</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-emerald-500 rounded-full w-[99.8%] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Service Contrats</span>
                    <span className="text-emerald-600 font-bold">Opérationnel</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-emerald-500 rounded-full w-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Synchronisation Mobile</span>
                    <span className="text-amber-500 font-bold">Actif (323/324)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-amber-500 rounded-full w-[95%] shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-gradient-to-br from-blue-50/80 to-blue-100/50 rounded-2xl border border-blue-200/60 shadow-sm flex items-start gap-3 transition-all hover:shadow-md hover:border-blue-300/50">
              <div className="bg-blue-600/10 p-1.5 rounded-lg shrink-0">
                <AlertCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-blue-900">V1 de MOBI-ASSUR</h4>
                <p className="text-[11px] text-blue-700/90 mt-1.5 leading-relaxed font-medium">
                  Cette version intègre les modules d'émission de polices, validation de retraits et
                  configuration des barèmes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
