'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { contractsApi, clientsApi } from '@/lib/api/mobi-assur'
import Header from '@/components/dashboard/Header'
import { Input } from '@/components/ui/input'
import { Search, FileText, Eye, Download, ShieldAlert, Plus, Filter } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function ContractsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Query Contracts
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts', statusFilter],
    queryFn: () => contractsApi.list(statusFilter || undefined),
  })

  // Query clients to associate names client-side if needed
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list(),
  })

  const safeContracts = Array.isArray(contracts) ? contracts : []
  const safeClients = Array.isArray(clients) ? clients : []

  const getClientName = (clientId: string) => {
    const client = safeClients.find((c) => c.id === clientId)
    return client ? client.full_name : `ID: ${clientId.substring(0, 8).toUpperCase()}`
  }

  return (
    <div className="flex-1 flex flex-col bg-transparent">

      <Header
        title="Polices d'Assurances & Devis"
        subtitle="Visualisez la liste des polices émises, suivez les devis en cours et validez les règlements."
      />

      <div className="p-6 sm:p-8 space-y-6 flex-1">
        {/* Status filtering and action buttons */}
        <div className="bg-white/95 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 pro-shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500">
              <Filter className="h-4 w-4" />
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-11 w-full sm:w-56 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-xs font-semibold text-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:bg-white"
            >
              <option value="">Tous les statuts ({safeContracts.length})</option>
              <option value="DEVIS">Devis uniquement</option>
              <option value="PAYE">Contrats payés</option>
              <option value="ANNULE">Contrats annulés</option>
            </select>
          </div>

          <Link href="/dashboard/contracts/new">
            <button className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white rounded-xl active:scale-[0.98] transition-all pro-shadow-sm cursor-pointer border-0">
              <Plus className="h-4 w-4" />
              Nouvelle Police
            </button>
          </Link>
        </div>

        {/* Contracts Table */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/80 pro-shadow-sm p-6">
          {isLoading ? (
            <div className="py-20 text-center text-slate-400 font-medium text-xs">
              Chargement des contrats en cours...
            </div>
          ) : safeContracts.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-extrabold text-slate-800">Aucune police ou devis trouvé</p>
              <p className="text-xs text-slate-500 mt-1">
                Générez un premier contrat ou modifiez vos filtres de recherche.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-3 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Code Contrat
                    </th>
                    <th className="pb-3 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="pb-3 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Produit / Formule
                    </th>
                    <th className="pb-3 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Date Effet & Durée
                    </th>
                    <th className="pb-3 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Prime TTC
                    </th>
                    <th className="pb-3 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="pb-3 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {safeContracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-4 px-2">
                        <span className="font-extrabold text-sm text-slate-900 block group-hover:text-blue-700 transition-colors">
                          {contract.id.substring(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-xs font-bold text-slate-800">
                        {safeClients.find((c) => c.id === contract.client_id)?.full_name || `ID: ${contract.client_id?.substring(0, 8)}`}
                      </td>
                      <td className="py-4 px-2">
                        <span className="text-xs text-slate-900 font-bold block">
                          {contract.product_type}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                          {contract.subscription_type}
                        </span>
                      </td>
                      <td className="py-4 px-2">
                        <span className="text-xs text-slate-800 font-semibold block">
                          {new Date(contract.date_effet).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {contract.duree_jours} Jours
                        </span>
                      </td>
                      <td className="py-4 px-2 font-extrabold text-xs text-slate-900">
                        {(contract.prime_ttc || 0).toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="py-4 px-2">
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
                      <td className="py-4 px-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {contract.status === 'PAYE' && (
                            <button 
                              onClick={() => {
                                toast.loading("Génération du pack en cours...", { id: `gen-${contract.id}` })
                                contractsApi.generatePack(contract.id).then(() => {
                                  toast.success("Pack généré! Cliquez sur Gérer pour télécharger.", { id: `gen-${contract.id}` })
                                }).catch(() => {
                                  toast.error("Erreur lors de la génération", { id: `gen-${contract.id}` })
                                })
                              }}
                              title="Générer les documents"
                              className="inline-flex items-center justify-center h-8 w-8 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-all cursor-pointer border border-emerald-200/80"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          )}
                          <Link href={`/dashboard/contracts/${contract.id}`}>
                            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-all pro-shadow-sm cursor-pointer border-0">
                              <Eye className="h-3.5 w-3.5 text-slate-300" />
                              Gérer
                            </button>
                          </Link>
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
    </div>
  )
}
