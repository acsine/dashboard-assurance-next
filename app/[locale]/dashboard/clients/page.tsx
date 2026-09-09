'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { clientsApi, asList } from '@/lib/api/mobi-assur'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Plus, User, Phone, MapPin, Eye, ArrowRight, FileText, Shield } from 'lucide-react'
import Link from 'next/link'
import { LinkButton } from '@/components/ui/link-button'

export default function ClientsPage() {
  const [search, setSearch] = useState('')

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () => clientsApi.list(search),
  })

  const safeClients = asList<any>(clients)

  return (
    <div className="flex-1 flex flex-col bg-transparent">

      <Header
        title="Gestion des Clients Assurés"
        subtitle="Consultez le répertoire national des clients, recherchez ou enregistrez de nouveaux assurés."
      />

      <div className="p-6 sm:p-8 space-y-6 flex-1">
        {/* Search and Action Bar */}
        <div className="bg-white/95 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 pro-shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 h-4 w-4 mt-3.5" />
            <Input
              type="search"
              placeholder="Rechercher par nom, téléphone, CNI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 border-slate-200 focus:border-blue-600 focus:ring-blue-600/20 rounded-xl bg-slate-50/50 focus:bg-white text-xs font-medium"
            />
          </div>
          <LinkButton href="/dashboard/clients/new" className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white rounded-xl active:scale-[0.98] transition-all pro-shadow-sm cursor-pointer border-0">
            <Plus className="h-4 w-4" />
            Nouveau Client
          </LinkButton>
        </div>

        {/* Clients Table / List */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/80 pro-shadow-sm p-6">
          {isLoading ? (
            <div className="py-20 text-center text-slate-400 font-medium text-xs">
              Chargement du répertoire des clients...
            </div>
          ) : safeClients.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <User className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-extrabold text-slate-800">Aucun client trouvé</p>
              <p className="text-xs text-slate-500 mt-1">
                Créez un nouveau dossier client ou modifiez vos critères de recherche.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-3 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Client / Identifiant
                    </th>
                    <th className="pb-3 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="pb-3 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Ville & Pays
                    </th>
                    <th className="pb-3 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Profession
                    </th>
                    <th className="pb-3 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {safeClients.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-700 font-extrabold text-xs flex items-center justify-center border border-blue-100 shrink-0">
                            {client.full_name?.substring(0, 2).toUpperCase() || 'CL'}
                          </div>
                          <div>
                            <span className="font-extrabold text-sm text-slate-900 block group-hover:text-blue-700 transition-colors">
                              {client.full_name}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                              ID: {client.id.substring(0, 8).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <span className="text-xs text-slate-800 font-bold block">
                          {client.phone}
                        </span>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          {client.email || 'Pas d\'email'}
                        </span>
                      </td>
                      <td className="py-4 px-2">
                        <span className="text-xs text-slate-800 font-semibold block">{client.city || 'N/A'}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          ISO: {client.country_code}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-xs text-slate-600 font-medium">
                        {client.profession || 'N/A'}
                      </td>
                      <td className="py-4 px-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <LinkButton 
                            href={`/dashboard/contracts/new?client_id=${client.id}`}
                            title="Nouveau Contrat"
                            className="inline-flex items-center justify-center h-8 w-8 p-0 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all cursor-pointer border border-blue-100"
                            variant="ghost"
                          >
                            <FileText className="h-4 w-4" />
                          </LinkButton>
                          <LinkButton 
                            href={`/dashboard/clients/${client.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-all pro-shadow-sm cursor-pointer border-0"
                          >
                            <Shield className="h-3.5 w-3.5 text-slate-300" />
                            Gérer dossier
                          </LinkButton>
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
