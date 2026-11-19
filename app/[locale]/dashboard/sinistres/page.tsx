'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import SearchableSelect from '@/components/ui/searchable-select'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { 
  Loader2, 
  AlertTriangle, 
  ShieldAlert, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Send, 
  FileSpreadsheet,
  UserCheck,
  MapPin,
  ExternalLink,
  Copy,
  MessageCircle,
  Coins,
  CheckCheck,
  Image as ImageIcon,
  ZoomIn,
  X,
  Search,
  Filter,
  Eye,
  FileCheck,
  TrendingUp,
  Activity,
  Layers
} from 'lucide-react'
import { asList, sinistresApi, type SinistreItem, proxiedAssetUrl } from '@/lib/api/mobi-assur'
import ExcelImportModal from '@/components/excel/ExcelImportModal'
import { useTranslations } from 'next-intl'

const SinistreMapPreview = dynamic(
  () => import('@/components/dashboard/SinistreMapPreview'),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 w-full rounded-2xl bg-amber-50/50 border border-amber-200/60 animate-pulse flex items-center justify-center text-xs font-bold text-amber-700">
        Chargement de la carte GPS...
      </div>
    ),
  }
)

const STATUSES = [
  'DECLARE',
  'DECLARATION_RECUE',
  'EN_COURS',
  'EN_INSTRUCTION',
  'EXPERTISE_MANDATEE',
  'RAPPORT_DEPOSE',
  'OFFRE_ET_QUITTANCE',
  'REGLE_ET_CLOTURE',
  'COMPLEMENT',
  'REJETE',
  'CLOS',
] as const

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DECLARE: { label: '1. Déclaration reçue', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200/60' },
  DECLARATION_RECUE: { label: '1. Déclaration reçue', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200/60' },
  EN_COURS: { label: '2. En instruction', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/60' },
  EN_INSTRUCTION: { label: '2. En instruction', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/60' },
  EXPERTISE_MANDATEE: { label: '3. Expertise mandatée', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200/60' },
  RAPPORT_DEPOSE: { label: '4. Rapport déposé', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200/60' },
  OFFRE_ET_QUITTANCE: { label: '5. Offre & Quittance', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/60' },
  REGLE_ET_CLOTURE: { label: '6. Réglé & Clôturé', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200/60' },
  COMPLEMENT: { label: 'Complément requis', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200/60' },
  VALIDE: { label: 'Validé', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/60' },
  REJETE: { label: 'Rejeté', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200/60' },
  CLOS: { label: 'Clos', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
}

function formatReadableDate(d?: string | null) {
  if (!d) return '—'
  try {
    const date = new Date(d)
    if (isNaN(date.getTime())) return d
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return d
  }
}

export default function SinistresPage() {
  const t = useTranslations('sinistres')
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false)
  const [selected, setSelected] = useState<SinistreItem | null>(null)
  const [note, setNote] = useState('')
  const [newStatus, setNewStatus] = useState('EN_COURS')
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null)

  // Modals CIMA
  const [isMandateModalOpen, setIsMandateModalOpen] = useState(false)
  const [expertName, setExpertName] = useState('')
  const [expertPhone, setExpertPhone] = useState('')
  const [expertEmail, setExpertEmail] = useState('')
  const [expertNote, setExpertNote] = useState('')
  const [magicLinkResult, setMagicLinkResult] = useState<string | null>(null)

  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerNote, setOfferNote] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-sinistres', statusFilter],
    queryFn: () => sinistresApi.list(statusFilter || undefined),
  })
  const items = asList<SinistreItem>(data)

  const detailQ = useQuery({
    queryKey: ['admin-sinistre', selected?.id],
    queryFn: () => sinistresApi.get(selected!.id),
    enabled: !!selected?.id,
  })

  const updateMut = useMutation({
    mutationFn: () =>
      sinistresApi.updateStatus(selected!.id, { status: newStatus, note: note || undefined }),
    onSuccess: () => {
      toast.success('Statut du sinistre mis à jour')
      setNote('')
      qc.invalidateQueries({ queryKey: ['admin-sinistres'] })
      qc.invalidateQueries({ queryKey: ['admin-sinistre', selected?.id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const mandateMut = useMutation({
    mutationFn: () =>
      sinistresApi.mandateExpert(selected!.id, {
        expert_name: expertName.trim(),
        expert_phone: expertPhone.trim() || undefined,
        expert_email: expertEmail.trim() || undefined,
        note: expertNote.trim() || undefined,
      }),
    onSuccess: (res) => {
      toast.success('Expert mandaté avec succès')
      const token = res?.magic_token || selected?.magic_token
      if (token) {
        setMagicLinkResult(`${window.location.origin}/expert/${token}`)
      } else {
        setIsMandateModalOpen(false)
      }
      qc.invalidateQueries({ queryKey: ['admin-sinistres'] })
      qc.invalidateQueries({ queryKey: ['admin-sinistre', selected?.id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const offerMut = useMutation({
    mutationFn: () =>
      sinistresApi.makeOffer(selected!.id, {
        offre_indemnisation: parseFloat(offerAmount),
        note: offerNote.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Proposition d'indemnisation transmise à l'assuré")
      setIsOfferModalOpen(false)
      setOfferAmount('')
      setOfferNote('')
      qc.invalidateQueries({ queryKey: ['admin-sinistres'] })
      qc.invalidateQueries({ queryKey: ['admin-sinistre', selected?.id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const settleMut = useMutation({
    mutationFn: () => sinistresApi.settle(selected!.id),
    onSuccess: () => {
      toast.success('Sinistre clôturé et règlement confirmé (Code CIMA)')
      qc.invalidateQueries({ queryKey: ['admin-sinistres'] })
      qc.invalidateQueries({ queryKey: ['admin-sinistre', selected?.id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const detail = detailQ.data || selected

  // Filter and search
  const filteredItems = useMemo(() => {
    return items.filter((s) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      const ref = (s.reference || '').toLowerCase()
      const tit = (s.title || '').toLowerCase()
      const loc = (s.location || '').toLowerCase()
      const exp = (s.expert_name || '').toLowerCase()
      return ref.includes(q) || tit.includes(q) || loc.includes(q) || exp.includes(q)
    })
  }, [items, searchQuery])

  // Macro KPI counts
  const totalCount = items.length
  const inInstructionCount = items.filter((s) =>
    ['DECLARE', 'DECLARATION_RECUE', 'EN_COURS', 'EN_INSTRUCTION'].includes(s.status)
  ).length
  const expertMandatedCount = items.filter((s) =>
    ['EXPERTISE_MANDATEE', 'RAPPORT_DEPOSE'].includes(s.status)
  ).length
  const settledCount = items.filter((s) =>
    ['OFFRE_ET_QUITTANCE', 'REGLE_ET_CLOTURE', 'CLOS'].includes(s.status)
  ).length

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8 bg-slate-50 min-h-screen">
      <Header
        title={t('title')}
        subtitle={t('subtitle')}
      />

      {/* 4 Macro KPI Cards (Executive FinTech Standard) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Sinistres CIMA</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalCount}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
            <Layers className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">En Instruction</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{inInstructionCount}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Expertises Mandatées</p>
            <p className="text-2xl font-black text-purple-700 mt-1">{expertMandatedCount}</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-700 rounded-xl border border-purple-100">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quittances & Réglés</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{settledCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Full-Width Search & Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher par référence SIN-XXX, lieu, titre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="w-full md:w-60">
            <SearchableSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              placeholder={`Tous les statuts (${items.length})`}
              options={[
                { value: '', label: `Tous les statuts (${items.length})` },
                ...STATUSES.map((s) => ({
                  value: s,
                  label: STATUS_CONFIG[s]?.label || s,
                })),
              ]}
            />
          </div>

          <Button
            type="button"
            onClick={() => setIsExcelModalOpen(true)}
            className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer border-0 shrink-0"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Importer Excel
          </Button>
        </div>
      </div>

      {/* Full-Width Data Table (Linear / Stripe Executive Standard) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-xs font-semibold">Chargement des dossiers de sinistres...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-2">
            <div className="p-4 bg-slate-50 rounded-full border border-slate-200">
              <AlertTriangle className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-800 mt-2">Aucun sinistre trouvé</p>
            <p className="text-xs text-slate-500">Aucun dossier ne correspond à vos critères de recherche.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75">
                  <th className="py-3.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Dossier & Horodatage
                  </th>
                  <th className="py-3.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Titre & Circonstance
                  </th>
                  <th className="py-3.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Localisation / GPS
                  </th>
                  <th className="py-3.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Étape CIMA
                  </th>
                  <th className="py-3.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">
                    Chiffrage / Offre
                  </th>
                  <th className="py-3.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredItems.map((s) => {
                  const statusCfg = STATUS_CONFIG[s.status] || {
                    label: s.status,
                    bg: 'bg-slate-100',
                    text: 'text-slate-700',
                    border: 'border-slate-200',
                  }
                  const hasLocation = Boolean(s.location || (s.gps_lat != null && s.gps_lng != null))
                  const hasChiffrage = s.chiffrage_expert != null || s.offre_indemnisation != null

                  return (
                    <tr
                      key={s.id}
                      onClick={() => {
                        setSelected(s)
                        setNewStatus(s.status)
                      }}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Référence & Date */}
                      <td className="py-4 px-5">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-black text-blue-700 group-hover:underline">
                            {s.reference}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatReadableDate(s.created_at)}
                          </span>
                        </div>
                      </td>

                      {/* Titre & Description */}
                      <td className="py-4 px-5 max-w-xs">
                        <p className="font-bold text-slate-900 truncate">{s.title}</p>
                        {s.description && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{s.description}</p>
                        )}
                      </td>

                      {/* Localisation */}
                      <td className="py-4 px-5">
                        {hasLocation ? (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <span className="truncate max-w-[200px] text-[11px]">
                              {s.location || `GPS (${s.gps_lat?.toFixed(3)}, ${s.gps_lng?.toFixed(3)})`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Non spécifiée</span>
                        )}
                      </td>

                      {/* Étape CIMA */}
                      <td className="py-4 px-5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-extrabold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                        >
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Chiffrage / Offre */}
                      <td className="py-4 px-5 text-right font-semibold">
                        {s.offre_indemnisation != null ? (
                          <span className="font-black text-emerald-700 text-xs">
                            {s.offre_indemnisation.toLocaleString('fr-FR')} FCFA
                          </span>
                        ) : s.chiffrage_expert != null ? (
                          <span className="font-bold text-indigo-700 text-xs">
                            {s.chiffrage_expert.toLocaleString('fr-FR')} FCFA
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-5 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelected(s)
                            setNewStatus(s.status)
                          }}
                          className="h-8 px-3 text-xs font-bold rounded-xl bg-blue-50/70 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all inline-flex items-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Instruire
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL IMMERSIVE D'INSTRUCTION 360° DU DOSSIER SINISTRE */}
      {selected && detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Sticky */}
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100/80 text-blue-700 rounded-2xl border border-blue-200">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      {detail.reference}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${(STATUS_CONFIG[detail.status] || STATUS_CONFIG.DECLARE).bg} ${(STATUS_CONFIG[detail.status] || STATUS_CONFIG.DECLARE).text} ${(STATUS_CONFIG[detail.status] || STATUS_CONFIG.DECLARE).border}`}
                    >
                      {(STATUS_CONFIG[detail.status] || STATUS_CONFIG.DECLARE).label}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                    {detail.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Déclaré le {formatReadableDate(detail.created_at)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              {/* Stepper CIMA 4 Étapes */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/80 border border-blue-100 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-blue-600" />
                    Procédure de Règlement Automobile (Code CIMA - 4 Étapes)
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    Étape active : {(STATUS_CONFIG[detail.status] || STATUS_CONFIG.DECLARE).label}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {[
                    {
                      num: 1,
                      title: "1. Déclaration par l'assuré",
                      desc: "Constat, GPS et photos transmis",
                      active: true,
                      current: ['DECLARE', 'DECLARATION_RECUE', 'EN_COURS', 'EN_INSTRUCTION'].includes(detail.status),
                    },
                    {
                      num: 2,
                      title: "2. Expertise & Chiffrage",
                      desc: "Mandatement expert et rapport",
                      active: ['EXPERTISE_MANDATEE', 'RAPPORT_DEPOSE', 'OFFRE_ET_QUITTANCE', 'REGLE_ET_CLOTURE'].includes(detail.status),
                      current: ['EXPERTISE_MANDATEE', 'RAPPORT_DEPOSE'].includes(detail.status),
                    },
                    {
                      num: 3,
                      title: "3. Quittance d'indemnisation",
                      desc: "Offre d'accord & signature quittance",
                      active: ['OFFRE_ET_QUITTANCE', 'REGLE_ET_CLOTURE'].includes(detail.status),
                      current: detail.status === 'OFFRE_ET_QUITTANCE',
                    },
                    {
                      num: 4,
                      title: "4. Paiement & Clôture",
                      desc: "Règlement MoMo / Virement validé",
                      active: ['REGLE_ET_CLOTURE', 'CLOS'].includes(detail.status),
                      current: ['REGLE_ET_CLOTURE', 'CLOS'].includes(detail.status),
                    },
                  ].map((step) => (
                    <div
                      key={step.num}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        step.current
                          ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs ring-2 ring-blue-500/30'
                          : step.active
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200/80 font-bold'
                          : 'bg-white/80 text-slate-400 border-slate-200/80 font-medium'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          step.current ? 'bg-white/20 text-white' : step.active ? 'bg-emerald-200/60 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          Étape {step.num}
                        </span>
                        {step.active && !step.current && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        )}
                      </div>
                      <p className="text-xs truncate">{step.title}</p>
                      <p className={`text-[10px] truncate mt-0.5 ${step.current ? 'text-blue-100' : 'text-slate-500'}`}>
                        {step.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Location & GPS Interactive Map Preview */}
              {(detail.location || detail.gps_lat != null) && (
                <div className="space-y-3 p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-amber-900 font-semibold">
                      <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>Lieu : {detail.location || 'Localisation GPS de l\'accident'}</span>
                      {detail.incident_at && (
                        <span className="text-amber-700/80 font-normal">
                          · Date accident : {formatReadableDate(detail.incident_at)}
                        </span>
                      )}
                    </div>
                    {detail.gps_lat != null && detail.gps_lng != null && (
                      <a
                        href={`https://www.google.com/maps?q=${detail.gps_lat},${detail.gps_lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-amber-100 text-amber-800 font-bold rounded-lg border border-amber-300 shadow-2xs"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Ouvrir Google Maps ({detail.gps_lat.toFixed(4)}, {detail.gps_lng.toFixed(4)})
                      </a>
                    )}
                  </div>

                  {detail.gps_lat != null && detail.gps_lng != null && (
                    <SinistreMapPreview
                      lat={detail.gps_lat}
                      lng={detail.gps_lng}
                      address={detail.location || undefined}
                      reference={detail.reference}
                    />
                  )}
                </div>
              )}

              {/* CIMA Actions Bar */}
              <div className="flex flex-wrap items-center gap-2 p-3.5 rounded-2xl bg-slate-100/70 border border-slate-200">
                <Button
                  type="button"
                  onClick={() => {
                    setExpertName(detail.expert_name || '')
                    setExpertPhone(detail.expert_phone || '')
                    setExpertEmail(detail.expert_email || '')
                    setIsMandateModalOpen(true)
                  }}
                  className="h-8 px-3 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 shadow-2xs cursor-pointer border-0"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  Mandater un Expert
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    setOfferAmount(detail.chiffrage_expert ? String(detail.chiffrage_expert) : '')
                    setIsOfferModalOpen(true)
                  }}
                  className="h-8 px-3 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-2xs cursor-pointer border-0"
                >
                  <Coins className="h-3.5 w-3.5" />
                  Faire une offre d'indemnisation
                </Button>

                {detail.status === 'OFFRE_ET_QUITTANCE' && (
                  <Button
                    type="button"
                    disabled={settleMut.isPending}
                    onClick={() => {
                      if (confirm("Confirmez-vous le règlement et la clôture définitive de ce dossier CIMA ?")) {
                        settleMut.mutate()
                      }
                    }}
                    className="h-8 px-3 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 shadow-2xs cursor-pointer border-0"
                  >
                    {settleMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                    Régler & Clôturer
                  </Button>
                )}

                {/* WhatsApp Assuré */}
                {Boolean((detail as any).client_phone || (detail as any).client?.phone || (selected as any)?.client_phone) && (
                  <a
                    href={`https://wa.me/${String((detail as any).client_phone || (detail as any).client?.phone || (selected as any)?.client_phone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Bonjour, votre dossier de sinistre automobile réf: ${detail.reference} est actuellement à l'étape : ${(STATUS_CONFIG[detail.status] || STATUS_CONFIG.DECLARE).label}. Votre assureur BETHEL ASSURANCES reste à votre disposition.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center h-8 px-3 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                  >
                    <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                    Alerter l'assuré (WhatsApp)
                  </a>
                )}
              </div>

              {/* Expert Info & Magic Link if active */}
              {detail.expert_name && (
                <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4 text-purple-600" />
                      Expert Automobile Mandaté : {detail.expert_name}
                    </span>
                    {detail.expert_phone && (
                      <span className="text-xs font-medium text-purple-700">Tél : {detail.expert_phone}</span>
                    )}
                  </div>
                  {detail.magic_token && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-purple-200/60">
                      <p className="text-[11px] text-purple-800 font-medium truncate">
                        Magic Link Expert (72h) : {typeof window !== 'undefined' ? `${window.location.origin}/expert/${detail.magic_token}` : `/expert/${detail.magic_token}`}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const link = `${window.location.origin}/expert/${detail.magic_token}`
                            navigator.clipboard.writeText(link)
                            toast.success('Lien copié dans le presse-papier')
                          }}
                          className="h-7 px-2 text-[10px] bg-white border-purple-200 text-purple-800 hover:bg-purple-100"
                        >
                          <Copy className="h-3 w-3 mr-1" /> Copier
                        </Button>
                        {detail.expert_phone && (
                          <a
                            href={`https://wa.me/${detail.expert_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour ${detail.expert_name}, voici votre lien d'accès sécurisé pour l'expertise du sinistre ${detail.reference} : ${window.location.origin}/expert/${detail.magic_token}`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center h-7 px-2 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs"
                          >
                            <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Expert Report Results & Indemnification Offer */}
              {(detail.chiffrage_expert != null || detail.offre_indemnisation != null) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {detail.chiffrage_expert != null && (
                    <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/70 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Chiffrage Expert Automobile</p>
                      <p className="text-lg font-black text-indigo-950">{detail.chiffrage_expert.toLocaleString('fr-FR')} FCFA</p>
                      {detail.valeur_venale != null && (
                        <p className="text-[11px] text-indigo-800">Valeur vénale : {detail.valeur_venale.toLocaleString('fr-FR')} FCFA</p>
                      )}
                    </div>
                  )}
                  {detail.offre_indemnisation != null && (
                    <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/70 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Offre d'Indemnisation Assureur</p>
                      <p className="text-lg font-black text-emerald-950">{detail.offre_indemnisation.toLocaleString('fr-FR')} FCFA</p>
                      {detail.quittance_signee_at ? (
                        <p className="text-[11px] text-emerald-800 font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Quittance signée le {formatReadableDate(detail.quittance_signee_at)} ({detail.mode_reglement} : {detail.compte_reglement})
                        </p>
                      ) : (
                        <p className="text-[11px] text-amber-700">En attente de signature par l'assuré</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Description Body */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description du sinistre</h4>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-sm text-slate-800 leading-relaxed font-medium">
                  {detail.description || 'Aucune description fournie.'}
                </div>
              </div>

              {/* Visual Gallery of Photos */}
              {(() => {
                const allDocs = (detail.documents || []) as any[]
                const photos = allDocs.filter((d: any) => {
                  const url = String(d.file_url || d.signed_url || '')
                  const name = String(d.file_name || '')
                  const type = String(d.doc_type || '').toLowerCase()
                  return (
                    url.match(/\.(jpg|jpeg|png|webp|gif)/i) ||
                    name.match(/\.(jpg|jpeg|png|webp|gif)/i) ||
                    type.includes('photo') ||
                    type.includes('constat') ||
                    type.includes('degat') ||
                    type.includes('choc')
                  )
                })

                if (photos.length === 0) return null

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5 text-blue-600" />
                        Galerie Photos du Sinistre ({photos.length} image{photos.length > 1 ? 's' : ''})
                      </h4>
                      <span className="text-[11px] text-slate-400">Cliquez pour agrandir</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {photos.map((p: any, idx: number) => {
                        const imgUrl = proxiedAssetUrl(p.file_url || p.signed_url)
                        const label = p.file_name || p.doc_type || `Photo ${idx + 1}`
                        return (
                          <div
                            key={p.id || idx}
                            onClick={() => setActivePhotoUrl(imgUrl)}
                            className="group relative h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer shadow-2xs hover:shadow-md transition-all"
                          >
                            <img
                              src={imgUrl}
                              alt={label}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <ZoomIn className="h-5 w-5" />
                            </div>
                            <div className="absolute bottom-0 inset-x-0 p-1 bg-black/60 backdrop-blur-xs text-[10px] text-white truncate font-medium">
                              {label}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* Timeline */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Historique d'instruction</h4>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-3">
                  {(detail.timeline || []).map((t, i) => (
                    <div key={i} className="text-xs border-l-2 border-blue-500 pl-3 py-0.5 space-y-0.5">
                      <div className="flex items-center gap-2 font-semibold text-slate-800">
                        <span>{t.from_status || '—'}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-blue-700 font-bold">{t.to_status}</span>
                      </div>
                      {t.note && <p className="text-slate-600 font-medium">{t.note}</p>}
                      <p className="text-[10px] text-slate-400">{formatReadableDate(t.changed_at)}</p>
                    </div>
                  ))}
                  {(detail.timeline || []).length === 0 && (
                    <p className="text-xs text-slate-400">Aucun historique enregistré pour ce dossier.</p>
                  )}
                </div>
              </div>

              {/* Documents non-images */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Rapports & Pièces jointes</h4>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                  <ul className="space-y-2">
                    {(detail.documents || []).map((d) => (
                      <li key={d.id} className="text-xs flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="font-semibold text-slate-800 truncate max-w-[280px]">
                          {d.file_name || d.doc_type}
                        </span>
                        <a
                          href={proxiedAssetUrl(d.file_url || (d as any).signed_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 underline"
                        >
                          Consulter
                        </a>
                      </li>
                    ))}
                    {(detail.documents || []).length === 0 && (
                      <li className="text-xs text-slate-400">Aucun document joint.</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Action Form */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Send className="h-3.5 w-3.5 text-blue-600" />
                  Mettre à jour le statut du dossier
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Nouveau Statut</label>
                    <SearchableSelect
                      value={newStatus}
                      onChange={(val) => setNewStatus(val)}
                      options={STATUSES.map((s) => ({
                        value: s,
                        label: STATUS_CONFIG[s]?.label || s,
                      }))}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      Motif / Note d'instruction
                    </label>
                    <Input
                      placeholder="Ex: Pièce d'expertise validée, complément demandé..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="bg-white"
                    />
                  </div>

                  <Button
                    variant="primary"
                    className="w-full mt-2 shadow-sm font-bold"
                    disabled={updateMut.isPending}
                    onClick={() => updateMut.mutate()}
                  >
                    {updateMut.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Enregistrer la mise à jour
                  </Button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelected(null)}
                className="px-5 text-xs font-bold rounded-xl"
              >
                Fermer le dossier
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      <ExcelImportModal
        entityType="sinistres"
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['admin-sinistres'] })}
      />

      {/* Mandate Expert Modal */}
      {isMandateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-purple-600" />
                Mandater un Expert Automobile
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsMandateModalOpen(false)
                  setMagicLinkResult(null)
                }}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            {magicLinkResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Expert mandaté avec succès !
                  </p>
                  <p>Voici le lien sécurisé (validité 72h) à transmettre à l'expert :</p>
                  <div className="p-2.5 rounded-lg bg-white border border-emerald-300 font-mono text-[11px] break-all select-all">
                    {magicLinkResult}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(magicLinkResult)
                      toast.success('Lien copié dans le presse-papier')
                    }}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copier le lien
                  </Button>
                  {expertPhone && (
                    <a
                      href={`https://wa.me/${expertPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour ${expertName}, voici votre lien d'accès sécurisé pour l'expertise du sinistre : ${magicLinkResult}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-9 flex items-center justify-center gap-1"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsMandateModalOpen(false)
                    setMagicLinkResult(null)
                  }}
                  className="w-full text-xs font-bold rounded-xl"
                >
                  Fermer
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Nom du Cabinet ou de l'Expert *</label>
                  <Input
                    placeholder="Ex: Cabinet Audit Auto Douala"
                    value={expertName}
                    onChange={(e) => setExpertName(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Téléphone Mobile (WhatsApp)</label>
                  <Input
                    placeholder="Ex: +237699112233"
                    value={expertPhone}
                    onChange={(e) => setExpertPhone(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Email</label>
                  <Input
                    placeholder="expert@audit-auto.cm"
                    type="email"
                    value={expertEmail}
                    onChange={(e) => setExpertEmail(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Instructions pour la mission</label>
                  <Input
                    placeholder="Ex: Vérifier conformité dégâts carrosserie, devis pièces"
                    value={expertNote}
                    onChange={(e) => setExpertNote(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsMandateModalOpen(false)}
                    className="text-xs font-bold rounded-xl"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    disabled={!expertName.trim() || mandateMut.isPending}
                    onClick={() => mandateMut.mutate()}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl"
                  >
                    {mandateMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                    Générer le Magic Link
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Make Offer Modal */}
      {isOfferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Coins className="h-4 w-4 text-emerald-600" />
                Émettre une Offre d'Indemnisation
              </h3>
              <button
                type="button"
                onClick={() => setIsOfferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Montant de l'Indemnité Proposée (FCFA) *
                </label>
                <Input
                  type="number"
                  placeholder="Ex: 350000"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  className="text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Note explicative / Franchise déduite</label>
                <Input
                  placeholder="Ex: Application franchise contractuelle de 30 000 FCFA"
                  value={offerNote}
                  onChange={(e) => setOfferNote(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOfferModalOpen(false)}
                  className="text-xs font-bold rounded-xl"
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  disabled={!offerAmount || parseFloat(offerAmount) <= 0 || offerMut.isPending}
                  onClick={() => offerMut.mutate()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                >
                  {offerMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  Transmettre l'offre
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Photo Preview Modal */}
      {activePhotoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setActivePhotoUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setActivePhotoUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 p-1"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={activePhotoUrl}
              alt="Aperçu du sinistre"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  )
}
