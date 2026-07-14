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
    <div className="flex-1 flex flex-col bg-white">

      <Header
        title="Polices d'Assurances & Devis"
        subtitle="Visualisez la liste des polices émises, des devis en cours et validez les règlements."
      />

      <div className="p-8 space-y-6 flex-1">
        {/* Status filtering and action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-500">
              <Filter className="h-4 w-4" />
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-11 w-full sm:w-48 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-transparent font-medium"
            >
              <option value="">Tous les statuts</option>
              <option value="DEVIS">Devis uniquement</option>
              <option value="PAYE">Contrats payés</option>
              <option value="ANNULE">Contrats annulés</option>
            </select>
          </div>

          <Link href="/dashboard/contracts/new">
            <button className="flex items-center gap-2 px-5 py-3 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10 cursor-pointer">
              <Plus className="h-4 w-4" />
              Nouvelle Police
            </button>
          </Link>
        </div>

        {/* Contracts Table */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          {isLoading ? (
            <div className="py-20 text-center text-gray-400 font-medium">
              Chargement des contrats en cours...
            </div>
          ) : safeContracts.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-semibold">Aucune police ou devis trouvé</p>
              <p className="text-xs text-gray-500 mt-1">
                Générez un premier contrat ou modifiez vos filtres.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Code Contrat
                    </th>
                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Produit / Type
                    </th>
                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Date Effet & Durée
                    </th>
                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Prime TTC
                    </th>
                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {safeContracts.map((contract) => (
                    <tr
                      key={contract.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors"
                    >
                      <td className="py-4.5 font-mono font-bold text-sm text-gray-900">
                        {contract.id.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="py-4.5 text-sm font-semibold text-gray-850">
                        {safeClients.find((c) => c.id === contract.client_id)?.full_name || 'Inconnu'}
                      </td>
                      <td className="py-4.5">
                        <span className="text-sm text-gray-700 font-medium block">
                          {contract.product_type}
                        </span>
                        <span className="text-xs text-gray-400 block mt-0.5">
                          {contract.subscription_type}
                        </span>
                      </td>
                      <td className="py-4.5">
                        <span className="text-sm text-gray-700 block">
                          {new Date(contract.date_effet).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="text-xs text-gray-400 block mt-0.5">
                          {contract.duree_jours} Jours
                        </span>
                      </td>
                      <td className="py-4.5 font-bold text-sm text-gray-900">
                        {(contract.prime_ttc || 0).toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="py-4.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            contract.status === 'PAYE'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {contract.status}
                        </span>
                      </td>
                      <td className="py-4.5 text-right flex items-center justify-end gap-2">
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
                            className="inline-flex items-center justify-center h-8 w-8 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-all cursor-pointer border border-emerald-200/50"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        )}
                        <Link href={`/dashboard/contracts/${contract.id}`}>
                          <button className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl transition-all border border-gray-200/60 cursor-pointer">
                            <Eye className="h-3.5 w-3.5 text-gray-500" />
                            Gérer
                          </button>
                        </Link>
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
