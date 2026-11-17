'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { contractsApi, clientsApi } from '@/lib/api/mobi-assur'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import SearchableSelect from '@/components/ui/searchable-select'
import { FileText, Eye, Plus, Filter, FileSpreadsheet, Search, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import ExcelImportModal from '@/components/excel/ExcelImportModal'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'

export default function ContractsPage() {
  const t = useTranslations('contracts')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false)
  const [exportingPaid, setExportingPaid] = useState(false)
  const queryClient = useQueryClient()

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

  const filteredContracts = safeContracts.filter((contract) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    const clientName = (
      safeClients.find((c) => c.id === contract.client_id)?.full_name || ''
    ).toLowerCase()
    const contractCode = (contract.id || '').toLowerCase()
    const contractNum = (contract.contract_number || '').toLowerCase()
    const productType = (contract.product_type || '').toLowerCase()
    return (
      clientName.includes(q) ||
      contractCode.includes(q) ||
      contractNum.includes(q) ||
      productType.includes(q)
    )
  })

  return (
    <div className="flex-1 flex flex-col bg-transparent">

      <Header
        title={t('title')}
        subtitle={t('subtitle')}
      />

      <div className="p-6 sm:p-8 space-y-6 flex-1">
        {/* Status filtering, client search and action buttons */}
        <div className="relative z-40 bg-white/95 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 pro-shadow-sm flex flex-col xl:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto flex-1 max-w-2xl">
            {/* Search Input for Client Name / Contract Code */}
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher par nom de client, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-slate-50/80 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Status Selector */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hidden sm:inline-flex">
                <Filter className="h-4 w-4" />
              </span>
              <div className="w-full sm:w-60">
                <SearchableSelect
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  placeholder={`Tous les statuts (${safeContracts.length})`}
                  options={[
                    { value: '', label: `Tous les statuts (${safeContracts.length})` },
                    { value: 'DEVIS', label: 'Devis uniquement' },
                    { value: 'PAYE', label: 'Contrats payés' },
                    { value: 'ANNULE', label: 'Contrats annulés' },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end w-full xl:w-auto">
            <Button
              type="button"
              variant="outline"
              disabled={exportingPaid}
              onClick={async () => {
                setExportingPaid(true)
                try {
                  await contractsApi.exportPaidXlsx('PAYE')
                  toast.success('Export Excel téléchargé')
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Export impossible')
                } finally {
                  setExportingPaid(false)
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {exportingPaid ? 'Export…' : 'Export contrats payés'}
            </Button>
            <Button
              type="button"
              onClick={() => setIsExcelModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl active:scale-[0.98] transition-all pro-shadow-sm cursor-pointer border-0"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Importer Excel
            </Button>
            <Link href="/dashboard/contracts/new">
              <button className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white rounded-xl active:scale-[0.98] transition-all pro-shadow-sm cursor-pointer border-0">
                <Plus className="h-4 w-4" />
                Nouvelle Police
              </button>
            </Link>
          </div>
        </div>

        {/* Contracts Table */}
        <div className="relative z-0 isolate bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/80 pro-shadow-sm p-6">
          {isLoading ? (
            <div className="py-20 text-center text-slate-400 font-medium text-xs">
              Chargement des contrats en cours...
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-extrabold text-slate-800">
                {searchQuery ? 'Aucun contrat correspondant à votre recherche' : 'Aucune police ou devis trouvé'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery ? `Aucun résultat pour "${searchQuery}". Essayez avec d'autres termes.` : 'Générez un premier contrat ou modifiez vos filtres de recherche.'}
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
                  {filteredContracts.map((contract) => (
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
                        {(contract.pttc ?? contract.prime_ttc ?? 0).toLocaleString('fr-FR')} FCFA
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
                                  toast.success("Classeur Excel téléchargé.", { id: `gen-${contract.id}` })
                                }).catch((err: any) => {
                                  toast.error(err?.message || "Erreur lors de la génération", { id: `gen-${contract.id}` })
                                })
                              }}
                              title="Télécharger tous les documents en Excel"
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
      {/* Excel Import Modal */}
      <ExcelImportModal
        entityType="contracts"
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['contracts'] })}
      />
    </div>
  )
}
