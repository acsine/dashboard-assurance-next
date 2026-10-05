'use client'

import React, { useState, useMemo } from 'react'
import {
  FileSpreadsheet,
  FileDown,
  X,
  Users,
  Calendar,
  Filter,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import SearchableSelect from '@/components/ui/searchable-select'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  prospectsApi,
  type Prospect,
  type User,
  type ProspectExportParams,
} from '@/lib/api/mobi-assur'
import * as XLSX from 'xlsx'

export interface ExportProspectsModalProps {
  isOpen: boolean
  onClose: () => void
  agents: User[]
  allProspects?: Prospect[]
  defaultAgentId?: string
  defaultDays?: number | null
  defaultStatus?: string
  defaultExpiryDate?: string
}

export default function ExportProspectsModal({
  isOpen,
  onClose,
  agents = [],
  allProspects = [],
  defaultAgentId = '',
  defaultDays = 30,
  defaultStatus = '',
  defaultExpiryDate = '',
}: ExportProspectsModalProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(defaultAgentId)
  const [selectedStatus, setSelectedStatus] = useState<string>(defaultStatus)
  const [onlyExpiring, setOnlyExpiring] = useState<boolean>(true)
  const [periodPreset, setPeriodPreset] = useState<string>(
    defaultDays ? String(defaultDays) : defaultExpiryDate ? 'exact' : '30',
  )
  const [exactDate, setExactDate] = useState<string>(defaultExpiryDate)
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'xlsx' | null>(null)

  // Options pour le SearchableSelect des agents (avec option "Tous")
  const agentOptions = useMemo(() => {
    const list = [
      {
        value: '',
        label: 'Tous les agents (Tout le portefeuille)',
        sublabel: 'Exporter tous les prospects sans distinction d’agent',
      },
    ]
    const safeAgents = Array.isArray(agents) ? agents : []
    safeAgents.forEach((a) => {
      const code = a.agent_code ? ` [${a.agent_code}]` : ''
      const email = a.email ? ` · ${a.email}` : ''
      list.push({
        value: a.id,
        label: `${a.full_name || 'Agent'} ${code}`,
        sublabel: email || a.id.substring(0, 8).toUpperCase(),
      })
    })
    return list
  }, [agents])

  // Options pour les statuts / types de prospects
  const statusOptions = [
    { value: '', label: 'Tous les types et statuts' },
    { value: 'NOUVEAU', label: 'NOUVEAU — Nouveau prospect' },
    { value: 'CONTACTE', label: 'CONTACTE — Prospect contacté' },
    { value: 'INTERESSE', label: 'INTERESSE — Intéressé (Devis généré)' },
    { value: 'EN_ATTENTE_VALIDATION', label: 'EN_ATTENTE_VALIDATION — En cours de conversion' },
    { value: 'CONVERTI', label: 'CONVERTI — Converti en client' },
    { value: 'PERDU', label: 'PERDU — Prospect perdu / sans suite' },
  ]

  // Calcul en direct du nombre de prospects correspondants
  const matchingProspects = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return allProspects.filter((p) => {
      // Filtre agent
      if (selectedAgentId && p.agent_id !== selectedAgentId) {
        return false
      }

      // Filtre statut
      if (selectedStatus && p.status !== selectedStatus) {
        return false
      }

      // Filtre assurance externe
      if (onlyExpiring && !p.has_external_insurance) {
        return false
      }

      // Filtre date / période
      if (onlyExpiring || periodPreset !== 'all' || exactDate || dateFrom || dateTo) {
        if (!p.external_policy_expires_on) return false
        const expiry = new Date(p.external_policy_expires_on)
        if (Number.isNaN(expiry.getTime())) return false
        expiry.setHours(0, 0, 0, 0)

        if (periodPreset === 'exact' && exactDate) {
          return p.external_policy_expires_on.startsWith(exactDate)
        }

        if (periodPreset === 'range') {
          if (dateFrom) {
            const dFrom = new Date(dateFrom)
            dFrom.setHours(0, 0, 0, 0)
            if (expiry < dFrom) return false
          }
          if (dateTo) {
            const dTo = new Date(dateTo)
            dTo.setHours(0, 0, 0, 0)
            if (expiry > dTo) return false
          }
          return true
        }

        const daysNum = parseInt(periodPreset, 10)
        if (!Number.isNaN(daysNum)) {
          const diffDays = Math.round((expiry.getTime() - today.getTime()) / 86400000)
          return diffDays >= 0 && diffDays <= daysNum
        }
      }

      return true
    })
  }, [allProspects, selectedAgentId, selectedStatus, onlyExpiring, periodPreset, exactDate, dateFrom, dateTo])

  if (!isOpen) return null

  // Fallback client-side Excel export au cas où l'API backend rencontrerait un souci
  const exportClientSideExcel = () => {
    const headers = [
      'Prospect',
      'Téléphone',
      'CNI',
      'Statut',
      'Assureur concurrent',
      'Date fin contrat',
      'Jours restants',
      'Agent',
      'Devis total (FCFA)',
    ]

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const agentMap = new Map<string, string>()
    agents.forEach((a) => {
      agentMap.set(a.id, a.full_name || a.email || a.id.substring(0, 8).toUpperCase())
    })

    const rows = matchingProspects.map((p) => {
      let daysRemaining: number | string = '—'
      if (p.external_policy_expires_on) {
        const d = new Date(p.external_policy_expires_on)
        if (!Number.isNaN(d.getTime())) {
          d.setHours(0, 0, 0, 0)
          daysRemaining = Math.round((d.getTime() - today.getTime()) / 86400000)
        }
      }
      return [
        p.full_name || 'Sans nom',
        p.phone || '—',
        p.cni_number || '—',
        p.status || 'NOUVEAU',
        p.external_insurer_name || '—',
        p.external_policy_expires_on || '—',
        daysRemaining,
        p.agent_id ? agentMap.get(p.agent_id) || p.agent_id : 'Non assigné',
        p.quote_total != null ? Math.round(p.quote_total) : '—',
      ]
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!cols'] = [
      { wch: 25 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
      { wch: 16 },
      { wch: 14 },
      { wch: 25 },
      { wch: 18 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'Prospects')
    XLSX.writeFile(
      wb,
      `prospects-${selectedAgentId ? 'agent' : 'agence'}-${new Date().toISOString().slice(0, 10)}.xlsx`,
    )
  }

  const handleExport = async (format: 'pdf' | 'xlsx') => {
    if (exportingFormat) return
    setExportingFormat(format)

    try {
      const params: ProspectExportParams = {
        agent_id: selectedAgentId || undefined,
        status: selectedStatus || undefined,
        has_external_insurance: onlyExpiring ? true : undefined,
      }

      if (periodPreset === 'exact' && exactDate) {
        params.expiry_date = exactDate
      } else if (periodPreset === 'range') {
        if (dateFrom) params.date_from = dateFrom
        if (dateTo) params.date_to = dateTo
      } else if (periodPreset !== 'all') {
        const num = parseInt(periodPreset, 10)
        if (!Number.isNaN(num)) {
          params.days = num
        }
      }

      if (format === 'pdf') {
        await prospectsApi.exportExpiringPdf(params)
        toast.success('Rapport PDF généré et téléchargé avec succès')
      } else {
        try {
          await prospectsApi.exportExpiringExcel(params)
          toast.success('Fichier Excel exporté avec succès')
        } catch (excelErr) {
          console.warn('API backend Excel a échoué, bascule sur export direct client:', excelErr)
          exportClientSideExcel()
          toast.success('Export Excel généré avec succès')
        }
      }
      onClose()
    } catch (err: any) {
      console.error('Erreur export:', err)
      toast.error(err?.message || "Erreur lors de l'exportation")
    } finally {
      setExportingFormat(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 px-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-blue-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <FileDown className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                Exporter les prospects
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  PDF & Excel
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Personnalisez les filtres par agent, type et échéances de contrat
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto scrollbar-hide flex-1">
          {/* Section 1 : Sélection de l'Agent (avec recherche intégrée) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-blue-600" />
              Agent assigné
            </label>
            <p className="text-[11px] text-slate-500">
              Sélectionnez un agent pour restreindre l'export à ses prospects, ou choisissez &laquo; Tous les agents &raquo;.
            </p>
            <SearchableSelect
              value={selectedAgentId}
              onChange={setSelectedAgentId}
              placeholder="Tous les agents..."
              searchPlaceholder="Rechercher par nom, email, code agent..."
              options={agentOptions}
              className="w-full text-xs"
            />
          </div>

          {/* Section 2 : Types de prospects & Statut */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-blue-600" />
                Type / Statut du prospect
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50/70 cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={onlyExpiring}
                onChange={(e) => setOnlyExpiring(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 block">
                  Échéances concurrentes uniquement (Relance fin de contrat)
                </span>
                <span className="text-[11px] text-slate-500">
                  Ne cibler que les prospects disposant d'un contrat en cours chez un autre assureur
                </span>
              </div>
            </label>
          </div>

          {/* Section 3 : Échéance du contrat dans l'autre assurance */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-amber-600" />
              Échéance du contrat dans l'autre assurance
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: '7', label: '1 semaine', sub: '≤ 7 jours' },
                { id: '14', label: '2 semaines', sub: '≤ 14 jours' },
                { id: '21', label: '3 semaines', sub: '≤ 21 jours' },
                { id: '30', label: '1 mois', sub: '≤ 30 jours' },
                { id: 'all', label: 'Toutes dates', sub: 'Sans limite' },
                { id: 'exact', label: 'Date précise', sub: 'Calendrier' },
              ].map((p) => {
                const isSelected = periodPreset === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPeriodPreset(p.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs block font-bold">{p.label}</span>
                    <span className="text-[10px] text-slate-500 font-medium">{p.sub}</span>
                  </button>
                )
              })}
            </div>

            {/* Sélecteur de date précise si choisi */}
            {periodPreset === 'exact' && (
              <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-1.5 animate-in fade-in">
                <label className="text-[11px] font-bold text-amber-900 block">
                  Date d'échéance précise à filtrer :
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={exactDate}
                    onChange={(e) => setExactDate(e.target.value)}
                    className="h-9 text-xs bg-white border-amber-200"
                  />
                  {exactDate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setExactDate('')}
                      className="h-9 px-2 text-xs text-amber-800 hover:bg-amber-100"
                    >
                      Effacer
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Live Preview Count Card */}
          <div className="rounded-2xl border border-blue-200/70 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 p-4 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <span className="font-extrabold text-blue-950 block">
                  {matchingProspects.length} prospect{matchingProspects.length > 1 ? 's' : ''} correspondant{matchingProspects.length > 1 ? 's' : ''}
                </span>
                <span className="text-blue-800 text-[11px]">
                  {selectedAgentId
                    ? `Filtre actif : ${agents.find((a) => a.id === selectedAgentId)?.full_name || '1 agent'}`
                    : 'Filtre actif : Tous les agents'}
                  {selectedStatus ? ` · Statut : ${selectedStatus}` : ''}
                  {periodPreset !== 'all' ? ` · Échéance : ${periodPreset === 'exact' ? (exactDate || 'Date') : `${periodPreset}j`}` : ''}
                </span>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-600 text-white shrink-0">
              Prêt
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-10 text-xs font-semibold rounded-xl text-slate-700"
            disabled={exportingFormat !== null}
          >
            Annuler
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => handleExport('pdf')}
              disabled={exportingFormat !== null}
              className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all"
            >
              {exportingFormat === 'pdf' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Génération PDF...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" />
                  Exporter en PDF
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={() => handleExport('xlsx')}
              disabled={exportingFormat !== null}
              className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all"
            >
              {exportingFormat === 'xlsx' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Export Excel...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4" />
                  Exporter en Excel
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
