'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { clientsApi } from '@/lib/api/mobi-assur'
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

  const safeClients = Array.isArray(clients) ? clients : []

  return (
    <div className="flex-1 flex flex-col bg-white">

      <Header
        title="Gestion des Clients"
        subtitle="Consultez, recherchez ou créez de nouveaux clients assurés."
      />

      <div className="p-8 space-y-6 flex-1">
        {/* Search and Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 h-4.5 w-4.5 mt-3.5" />
            <Input
              type="search"
              placeholder="Rechercher par nom, téléphone, CNI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 border-gray-200 focus:border-blue-500 rounded-xl"
            />
          </div>
          <LinkButton href="/dashboard/clients/new" className="flex items-center gap-2 px-5 py-3 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10 cursor-pointer">
            <Plus className="h-4 w-4" />
            Nouveau Client
          </LinkButton>
        </div>

        {/* Clients Table / List */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          {isLoading ? (
            <div className="py-20 text-center text-gray-400 font-medium">
              Chargement des clients en cours...
            </div>
          ) : safeClients.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <User className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-semibold">Aucun client trouvé</p>
              <p className="text-xs text-gray-500 mt-1">
                Créez un nouveau client ou ajustez vos critères de recherche.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Nom complet / ID
                    </th>
                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Ville & Pays
                    </th>
                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Profession
                    </th>
                    <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {safeClients.map((client) => (
                    <tr key={client.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors">
                      <td className="py-4.5">
                        <span className="font-bold text-sm text-gray-900 block">
                          {client.full_name}
                        </span>
                        <span className="text-[10px] text-gray-400 block font-mono mt-0.5">
                          ID: {client.id.substring(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4.5">
                        <span className="text-sm text-gray-700 font-medium block">
                          {client.phone}
                        </span>
                        <span className="text-xs text-gray-400 block mt-0.5">
                          {client.email || 'Pas d\'email'}
                        </span>
                      </td>
                      <td className="py-4.5">
                        <span className="text-sm text-gray-700 block">{client.city || 'N/A'}</span>
                        <span className="text-xs text-gray-400 block mt-0.5">
                          ISO: {client.country_code}
                        </span>
                      </td>
                      <td className="py-4.5 text-sm text-gray-600 font-medium">
                        {client.profession || 'N/A'}
                      </td>
                      <td className="py-4.5 text-right flex items-center justify-end gap-2">
                        <LinkButton 
                          href={`/dashboard/contracts/new?client_id=${client.id}`}
                          title="Nouveau Contrat"
                          className="inline-flex items-center justify-center h-8 w-8 p-0 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all cursor-pointer border-0"
                          variant="ghost"
                        >
                          <FileText className="h-4 w-4" />
                        </LinkButton>
                        <LinkButton 
                          href={`/dashboard/clients/${client.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-all shadow-sm cursor-pointer border-0"
                        >
                          <Shield className="h-3.5 w-3.5 text-slate-300" />
                          Gérer le dossier
                        </LinkButton>
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
