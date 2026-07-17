'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, useEffect, useCallback } from 'react'
import {
  prospectsApi,
  tariffApi,
  usersApi,
  type ConversionPayload,
  type ConversionRequest,
  type Prospect,
  type QuoteBreakdown,
  type QuoteComputeResult,
} from '@/lib/api/mobi-assur'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  UserCheck,
  Check,
  X,
  Users,
  Clock,
  ArrowRightLeft,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { RoleGuard } from '@/components/auth/RoleGuard'

type Tab = 'all' | 'pending'

const BLOCKED_CONVERT_STATUSES = new Set(['CONVERTI', 'EN_ATTENTE_VALIDATION'])
const FUEL_OPTIONS = ['ESSENCE', 'DIESEL', 'ELECTRIQUE', 'HYBRIDE']

function payloadOf(req: ConversionRequest): Record<string, unknown> {
  return (req.payload || {}) as Record<string, unknown>
}

function conversionDisplayName(req: ConversionRequest): string {
  const payload = payloadOf(req)
  const fromPayload =
    (payload.full_name as string | undefined) ||
    (payload.name as string | undefined)
  return (
    req.prospect?.full_name ||
    fromPayload ||
    `Prospect ${(req.prospect_id || req.id).substring(0, 8).toUpperCase()}`
  )
}

function conversionPhone(req: ConversionRequest): string {
  const payload = payloadOf(req)
  return req.prospect?.phone || (payload.phone as string | undefined) || 'N/A'
}

function conversionCni(req: ConversionRequest): string | undefined {
  const payload = payloadOf(req)
  return (
    req.prospect?.cni_number ||
    (payload.cni_number as string | undefined)
  )
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'NOUVEAU':
      return 'bg-slate-100 text-slate-700'
    case 'CONTACTE':
      return 'bg-blue-50 text-blue-700'
    case 'INTERESSE':
      return 'bg-emerald-50 text-emerald-700'
    case 'EN_ATTENTE_VALIDATION':
      return 'bg-amber-50 text-amber-700'
    case 'PERDU':
      return 'bg-red-50 text-red-700'
    case 'CONVERTI':
    case 'APPROUVEE':
      return 'bg-green-50 text-green-700'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

function formatFcfa(value?: number | null): string {
  if (value == null) return '—'
  return `${Math.round(value).toLocaleString('fr-FR')} FCFA`
}

interface TariffFormState {
  cni_number: string
  category_id: string
  zone_id: string
  duration_id: string
  fuel: string
  power_cv: string
  trailer: boolean
  include_dr: boolean
  include_ipt: boolean
  remise_pct: string
}

function emptyTariffForm(p?: Prospect): TariffFormState {
  return {
    cni_number: p?.cni_number || '',
    category_id: p?.category_id || '',
    zone_id: p?.zone_id || '',
    duration_id: p?.duration_id || '',
    fuel: p?.fuel || 'ESSENCE',
    power_cv: p?.power_cv ? String(p.power_cv) : '',
    trailer: p?.trailer ?? false,
    include_dr: p?.include_dr ?? false,
    include_ipt: p?.include_ipt ?? false,
    remise_pct: p?.remise_pct != null ? String(p.remise_pct) : '0',
  }
}

interface ConvertFormState {
  full_name: string
  phone: string
  cni_number: string
  validation_code: string
  marque: string
  immatriculation: string
  chassis_num: string
  puissance_cv: string
}

function emptyConvertForm(p?: Prospect): ConvertFormState {
  return {
    full_name: p?.full_name || '',
    phone: p?.phone || '',
    cni_number: p?.cni_number || '',
    validation_code: '',
    marque: '',
    immatriculation: '',
    chassis_num: '',
    puissance_cv: p?.power_cv ? String(p.power_cv) : '',
  }
}

function QuoteBreakdownView({ breakdown, total }: { breakdown?: QuoteBreakdown; total?: number }) {
  if (!breakdown && total == null) return null
  return (
    <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 text-[11px] space-y-1">
      <p className="font-bold text-emerald-800 uppercase tracking-wider">Devis estimé</p>
      {breakdown?.rc_net != null && (
        <p>RC nette : {formatFcfa(breakdown.rc_net)}</p>
      )}
      {breakdown?.dr != null && breakdown.dr > 0 && <p>DR : {formatFcfa(breakdown.dr)}</p>}
      {breakdown?.ipt != null && breakdown.ipt > 0 && <p>IPT : {formatFcfa(breakdown.ipt)}</p>}
      {breakdown?.acc != null && <p>Accessoires : {formatFcfa(breakdown.acc)}</p>}
      {breakdown?.vignette != null && breakdown.vignette > 0 && (
        <p>Vignette : {formatFcfa(breakdown.vignette)}</p>
      )}
      <p className="font-bold text-emerald-900 pt-1 border-t border-emerald-100">
        Total : {formatFcfa(total ?? breakdown?.total)}
      </p>
    </div>
  )
}

function TariffFields({
  form,
  setForm,
  categories,
  zones,
  durations,
}: {
  form: TariffFormState
  setForm: React.Dispatch<React.SetStateAction<TariffFormState>>
  categories: Array<{ id: string; code: string; name: string; is_active: boolean }>
  zones: Array<{ id: string; name: string; is_active: boolean }>
  durations: Array<{ id: string; label: string; months: number; is_active: boolean }>
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
          N° CNI *
        </label>
        <Input
          value={form.cni_number}
          onChange={(e) => setForm({ ...form, cni_number: e.target.value })}
          className="h-10 text-xs border-gray-200"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            Catégorie *
          </label>
          <select
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className="w-full h-10 text-xs border border-gray-200 rounded-md px-2"
            required
          >
            <option value="">—</option>
            {categories.filter((c) => c.is_active).map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            Zone
          </label>
          <select
            value={form.zone_id}
            onChange={(e) => setForm({ ...form, zone_id: e.target.value })}
            className="w-full h-10 text-xs border border-gray-200 rounded-md px-2"
          >
            <option value="">—</option>
            {zones.filter((z) => z.is_active).map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            Durée *
          </label>
          <select
            value={form.duration_id}
            onChange={(e) => setForm({ ...form, duration_id: e.target.value })}
            className="w-full h-10 text-xs border border-gray-200 rounded-md px-2"
            required
          >
            <option value="">—</option>
            {durations.filter((d) => d.is_active).map((d) => (
              <option key={d.id} value={d.id}>
                {d.label} ({d.months} mois)
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            Carburant
          </label>
          <select
            value={form.fuel}
            onChange={(e) => setForm({ ...form, fuel: e.target.value })}
            className="w-full h-10 text-xs border border-gray-200 rounded-md px-2"
          >
            {FUEL_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            Puissance (CV) *
          </label>
          <Input
            type="number"
            value={form.power_cv}
            onChange={(e) => setForm({ ...form, power_cv: e.target.value })}
            className="h-10 text-xs border-gray-200"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            Remise (%)
          </label>
          <Input
            type="number"
            value={form.remise_pct}
            onChange={(e) => setForm({ ...form, remise_pct: e.target.value })}
            className="h-10 text-xs border-gray-200"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.trailer}
            onChange={(e) => setForm({ ...form, trailer: e.target.checked })}
          />
          Remorque
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.include_dr}
            onChange={(e) => setForm({ ...form, include_dr: e.target.checked })}
          />
          Inclure DR
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.include_ipt}
            onChange={(e) => setForm({ ...form, include_ipt: e.target.checked })}
          />
          Inclure IPT
        </label>
      </div>
    </div>
  )
}

export default function ProspectsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('all')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectMotif, setRejectMotif] = useState('')
  const [search, setSearch] = useState('')
  const [convertingProspect, setConvertingProspect] = useState<Prospect | null>(null)
  const [convertForm, setConvertForm] = useState<ConvertFormState>(emptyConvertForm())
  const [interestedProspect, setInterestedProspect] = useState<Prospect | null>(null)
  const [tariffForm, setTariffForm] = useState<TariffFormState>(emptyTariffForm())
  const [liveQuote, setLiveQuote] = useState<QuoteComputeResult | null>(null)
  const [approvingRequest, setApprovingRequest] = useState<ConversionRequest | null>(null)
  const [approvalCode, setApprovalCode] = useState('')
  const [approvalPaymentRef, setApprovalPaymentRef] = useState('')

  const { data: prospects = [], isLoading: loadingProspects } = useQuery({
    queryKey: ['prospects'],
    queryFn: () => prospectsApi.list(),
  })

  const { data: pendingRequests = [], isLoading: loadingPending } = useQuery({
    queryKey: ['pending-conversions'],
    queryFn: () => prospectsApi.listPendingConversions(),
  })

  const { data: agents = [] } = useQuery({
    queryKey: ['users', 'AGENT_TERRAIN'],
    queryFn: () => usersApi.list({ role: 'AGENT_TERRAIN' }),
  })

  const { data: bootstrap } = useQuery({
    queryKey: ['tariff-bootstrap'],
    queryFn: () => tariffApi.bootstrap(),
  })

  const categories = bootstrap?.categories ?? []
  const zones = bootstrap?.zones ?? []
  const durations = bootstrap?.durations ?? []

  const agentNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of Array.isArray(agents) ? agents : []) {
      map.set(a.id, a.full_name || a.email || a.id.substring(0, 8).toUpperCase())
    }
    return map
  }, [agents])

  const resolveAgentLabel = (agentId?: string) => {
    if (!agentId) return 'Agent inconnu'
    const name = agentNameById.get(agentId)
    const shortId = agentId.substring(0, 8).toUpperCase()
    return name ? `${name} (${shortId})` : shortId
  }

  const canComputeQuote = useCallback(
    (form: TariffFormState) =>
      Boolean(
        form.category_id &&
          form.duration_id &&
          form.power_cv &&
          Number(form.power_cv) >= 1,
      ),
    [],
  )

  const buildQuotePayload = useCallback(
    (form: TariffFormState, prospectId?: string) => ({
      category_id: form.category_id,
      zone_id: form.zone_id || undefined,
      duration_id: form.duration_id,
      fuel: form.fuel,
      power_cv: Number(form.power_cv),
      trailer: form.trailer,
      include_dr: form.include_dr,
      include_ipt: form.include_ipt,
      remise_pct: Number(form.remise_pct || 0),
      prospect_id: prospectId,
      cni_number: form.cni_number.trim() || undefined,
    }),
    [],
  )

  useEffect(() => {
    if (!interestedProspect || !canComputeQuote(tariffForm)) {
      setLiveQuote(null)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const result = await tariffApi.computeQuote(
          buildQuotePayload(tariffForm, interestedProspect.id),
        )
        setLiveQuote(result)
      } catch {
        setLiveQuote(null)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [interestedProspect, tariffForm, canComputeQuote, buildQuotePayload])

  const approveMutation = useMutation({
    mutationFn: ({
      id,
      validation_code,
      received_payment_reference,
    }: {
      id: string
      validation_code: string
      received_payment_reference?: string
    }) =>
      prospectsApi.approveConversion(id, {
        validation_code,
        received_payment_reference,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-conversions'] })
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
      toast.success('Demande approuvée. Client créé et prospect converti.')
      setApprovingRequest(null)
      setApprovalCode('')
      setApprovalPaymentRef('')
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erreur lors de l'approbation")
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) =>
      prospectsApi.rejectConversion(id, motif),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-conversions'] })
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
      toast.success('Demande rejetée.')
      setRejectingId(null)
      setRejectMotif('')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors du rejet')
    },
  })

  const convertMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: ConversionPayload & { validation_code: string } }) =>
      prospectsApi.convertDirect(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-conversions'] })
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
      toast.success('Prospect converti en client. La commission ira à l’agent prospecteur.')
      setConvertingProspect(null)
      setConvertForm(emptyConvertForm())
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la conversion')
    },
  })

  const markInterestedMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReturnType<typeof buildQuotePayload> & { cni_number: string } }) =>
      prospectsApi.markInterested(id, {
        cni_number: body.cni_number,
        category_id: body.category_id,
        zone_id: body.zone_id,
        duration_id: body.duration_id,
        fuel: body.fuel,
        power_cv: body.power_cv,
        trailer: body.trailer,
        include_dr: body.include_dr,
        include_ipt: body.include_ipt,
        remise_pct: body.remise_pct,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
      toast.success('Prospect marqué comme intéressé avec devis enregistré.')
      setInterestedProspect(null)
      setTariffForm(emptyTariffForm())
      setLiveQuote(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleRejectSubmit = (e: React.FormEvent, id: string) => {
    e.preventDefault()
    if (!rejectMotif.trim()) {
      toast.error('Motif de rejet requis')
      return
    }
    rejectMutation.mutate({ id, motif: rejectMotif })
  }

  const openConvertDialog = (p: Prospect) => {
    setConvertingProspect(p)
    setConvertForm(emptyConvertForm(p))
  }

  const openInterestedDialog = (p: Prospect) => {
    setInterestedProspect(p)
    setTariffForm(emptyTariffForm(p))
    setLiveQuote(null)
  }

  const handleConvertSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!convertingProspect) return
    if (!convertForm.full_name.trim() || !convertForm.phone.trim()) {
      toast.error('Nom et téléphone sont requis')
      return
    }
    if (!convertForm.cni_number.trim()) {
      toast.error('Numéro CNI requis')
      return
    }
    if (convertForm.validation_code.length !== 6) {
      toast.error('Code de validation à 6 chiffres requis')
      return
    }

    const body: ConversionPayload & { validation_code: string } = {
      full_name: convertForm.full_name.trim(),
      phone: convertForm.phone.trim(),
      country_code: 'CM',
      cni_number: convertForm.cni_number.trim(),
      validation_code: convertForm.validation_code,
    }

    const hasVehicle =
      convertForm.marque.trim() ||
      convertForm.chassis_num.trim() ||
      convertForm.immatriculation.trim()
    if (hasVehicle) {
      if (!convertForm.marque.trim() || !convertForm.chassis_num.trim()) {
        toast.error('Marque et n° de châssis sont requis pour le véhicule')
        return
      }
      body.vehicle = {
        marque: convertForm.marque.trim(),
        chassis_num: convertForm.chassis_num.trim().toUpperCase(),
        immatriculation: convertForm.immatriculation.trim() || undefined,
        puissance_cv: convertForm.puissance_cv
          ? parseInt(convertForm.puissance_cv, 10)
          : undefined,
      }
    }

    convertMutation.mutate({ id: convertingProspect.id, body })
  }

  const handleMarkInterestedSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!interestedProspect) return
    if (!tariffForm.cni_number.trim()) {
      toast.error('Numéro CNI requis')
      return
    }
    if (!canComputeQuote(tariffForm)) {
      toast.error('Paramètres tarifaires incomplets')
      return
    }
    markInterestedMutation.mutate({
      id: interestedProspect.id,
      body: {
        ...buildQuotePayload(tariffForm, interestedProspect.id),
        cni_number: tariffForm.cni_number.trim(),
      },
    })
  }

  const handleApproveSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!approvingRequest) return
    if (approvalCode.length !== 6) {
      toast.error('Code de validation à 6 chiffres requis')
      return
    }
    const needsPaymentRef = approvingRequest.payment_mode === 'MANUAL_PAYMENT'
    if (needsPaymentRef && !approvalPaymentRef.trim()) {
      toast.error('Référence de paiement requise')
      return
    }
    approveMutation.mutate({
      id: approvingRequest.id,
      validation_code: approvalCode,
      received_payment_reference: needsPaymentRef
        ? approvalPaymentRef.trim()
        : undefined,
    })
  }

  const safeProspects = Array.isArray(prospects) ? prospects : []
  const safePendingRequests = Array.isArray(pendingRequests) ? pendingRequests : []

  const filteredProspects = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return safeProspects
    return safeProspects.filter((p: Prospect) => {
      const agentLabel = p.agent_id ? resolveAgentLabel(p.agent_id).toLowerCase() : ''
      const hay = `${p.full_name || ''} ${p.phone || ''} ${p.status || ''} ${p.cni_number || ''} ${p.agent_id || ''} ${agentLabel}`.toLowerCase()
      return hay.includes(q)
    })
  }, [safeProspects, search, agentNameById])

  return (
    <div className="flex-1 flex flex-col bg-white">
      <Header
        title="Prospects & Conversions"
        subtitle="Consultez les prospects, marquez les intéressés avec devis CIMA et validez les conversions."
      />

      <div className="p-8 space-y-6 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('all')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
              tab === 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Tous les prospects ({safeProspects.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('pending')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
              tab === 'pending'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Conversions en attente ({safePendingRequests.length})
          </button>
        </div>

        {tab === 'all' ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">Prospects de l&apos;agence</h3>
              <Input
                placeholder="Rechercher nom, téléphone, CNI, statut…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 text-xs border-gray-200 w-full sm:w-72"
              />
            </div>

            {loadingProspects ? (
              <div className="py-20 text-center text-gray-400 font-medium">
                Chargement des prospects...
              </div>
            ) : filteredProspects.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-semibold">Aucun prospect trouvé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 uppercase tracking-wider">
                      <th className="py-3 pr-4 font-bold">Nom</th>
                      <th className="py-3 pr-4 font-bold">Téléphone</th>
                      <th className="py-3 pr-4 font-bold">CNI</th>
                      <th className="py-3 pr-4 font-bold">Devis</th>
                      <th className="py-3 pr-4 font-bold">Statut</th>
                      <th className="py-3 pr-4 font-bold">Agent</th>
                      <th className="py-3 pr-4 font-bold">Créé le</th>
                      <th className="py-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredProspects.map((p) => {
                      const canConvert = !BLOCKED_CONVERT_STATUSES.has(p.status)
                      const canMarkInterested = !['CONVERTI', 'INTERESSE', 'EN_ATTENTE_VALIDATION'].includes(
                        p.status,
                      )
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80">
                          <td className="py-3 pr-4 font-semibold text-slate-900">
                            {p.full_name || 'Sans nom'}
                          </td>
                          <td className="py-3 pr-4 text-slate-600 font-mono">{p.phone || '—'}</td>
                          <td className="py-3 pr-4 text-slate-600 font-mono">
                            {p.cni_number || '—'}
                          </td>
                          <td className="py-3 pr-4 text-emerald-700 font-semibold">
                            {p.quote_total != null ? formatFcfa(p.quote_total) : '—'}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadgeClass(
                                p.status,
                              )}`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-slate-600">
                            {resolveAgentLabel(p.agent_id)}
                          </td>
                          <td className="py-3 pr-4 text-slate-500">
                            {p.created_at
                              ? new Date(p.created_at).toLocaleDateString('fr-FR')
                              : '—'}
                          </td>
                          <td className="py-3 text-right">
                            <RoleGuard permission="agency:mutate" fallback={null}>
                              <div className="flex flex-wrap justify-end gap-1.5">
                                {canMarkInterested && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => openInterestedDialog(p)}
                                  >
                                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                                    Intéressé
                                  </Button>
                                )}
                                {canConvert && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => openConvertDialog(p)}
                                  >
                                    <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                                    Convertir
                                  </Button>
                                )}
                              </div>
                            </RoleGuard>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            {loadingPending ? (
              <div className="py-20 text-center text-gray-400 font-medium">
                Chargement des demandes en cours...
              </div>
            ) : safePendingRequests.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                <UserCheck className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-semibold">Aucune demande en attente</p>
              </div>
            ) : (
              <div className="space-y-4">
                {safePendingRequests.map((req) => {
                  const agentId = req.agent_id || req.prospect?.agent_id
                  const cni = conversionCni(req)
                  const quoteTotal = req.prospect?.quote_total
                  return (
                    <div
                      key={req.id}
                      className="p-5 border border-gray-100 rounded-2xl bg-gray-50/20 flex flex-col md:flex-row md:items-center justify-between gap-6"
                    >
                      <div className="space-y-2">
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                          Demande #{req.id.substring(0, 8).toUpperCase()}
                        </span>
                        <h4 className="font-bold text-sm text-gray-900">
                          {conversionDisplayName(req)}
                        </h4>
                        <span className="text-xs text-gray-500 block">
                          Tél. {conversionPhone(req)}
                          {cni ? ` | CNI ${cni}` : ''}
                        </span>
                        {quoteTotal != null && (
                          <span className="text-xs text-emerald-700 font-semibold block">
                            Devis : {formatFcfa(quoteTotal)}
                          </span>
                        )}
                        <span className="text-xs text-slate-700 font-semibold block">
                          Agent : {resolveAgentLabel(agentId)}
                        </span>
                        {req.payment_mode === 'MANUAL_PAYMENT' && (
                          <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 inline-block">
                            Paiement manuel — ref. attendue : {req.payment_reference || '—'}
                            {req.payment_amount != null && ` (${formatFcfa(req.payment_amount)})`}
                          </span>
                        )}
                        <QuoteBreakdownView
                          breakdown={req.prospect?.quote_breakdown}
                          total={quoteTotal}
                        />
                      </div>

                      {rejectingId === req.id ? (
                        <form
                          onSubmit={(e) => handleRejectSubmit(e, req.id)}
                          className="flex items-center gap-2 w-full md:w-auto"
                        >
                          <Input
                            placeholder="Motif du rejet..."
                            value={rejectMotif}
                            onChange={(e) => setRejectMotif(e.target.value)}
                            className="h-10 text-xs border-gray-200 w-full md:w-60 bg-white"
                            required
                          />
                          <Button
                            type="submit"
                            variant="destructive"
                            size="sm"
                            disabled={rejectMutation.isPending}
                            isLoading={rejectMutation.isPending}
                          >
                            Valider rejet
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setRejectingId(null)}
                          >
                            Annuler
                          </Button>
                        </form>
                      ) : (
                        <RoleGuard permission="agency:mutate" fallback={null}>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              onClick={() => {
                                setApprovingRequest(req)
                                setApprovalCode('')
                                setApprovalPaymentRef('')
                              }}
                              disabled={approveMutation.isPending}
                              variant="success"
                              size="sm"
                            >
                              <Check className="h-4 w-4 mr-1.5" />
                              Approuver
                            </Button>
                            <Button
                              onClick={() => setRejectingId(req.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            >
                              <X className="h-4 w-4 mr-1.5" />
                              Rejeter
                            </Button>
                          </div>
                        </RoleGuard>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal marquer intéressé */}
      {interestedProspect && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-white border border-gray-100 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
            <CardContent className="pt-6 space-y-4">
              <div className="pb-2 border-b border-gray-50">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Marquer intéressé — {interestedProspect.full_name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  CNI + paramètres tarifaires CIMA. Le devis se calcule automatiquement.
                </p>
              </div>
              <form onSubmit={handleMarkInterestedSubmit} className="space-y-4">
                <TariffFields
                  form={tariffForm}
                  setForm={setTariffForm}
                  categories={categories}
                  zones={zones}
                  durations={durations}
                />
                {canComputeQuote(tariffForm) && !liveQuote && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Calcul du devis…
                  </div>
                )}
                <QuoteBreakdownView breakdown={liveQuote?.breakdown} total={liveQuote?.total} />
                <div className="flex gap-2 justify-end pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setInterestedProspect(null)
                      setTariffForm(emptyTariffForm())
                      setLiveQuote(null)
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={markInterestedMutation.isPending || !liveQuote}
                    isLoading={markInterestedMutation.isPending}
                  >
                    Enregistrer INTERESSE
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal conversion directe */}
      {convertingProspect && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-white border border-gray-100 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
            <CardContent className="pt-6 space-y-4">
              <div className="pb-2 border-b border-gray-50">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Convertir le prospect
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Agent : <strong>{resolveAgentLabel(convertingProspect.agent_id)}</strong>
                </p>
                {convertingProspect.quote_total != null && (
                  <p className="text-xs text-emerald-700 font-semibold mt-1">
                    Devis enregistré : {formatFcfa(convertingProspect.quote_total)}
                  </p>
                )}
              </div>

              <form onSubmit={handleConvertSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Nom complet *
                  </label>
                  <Input
                    value={convertForm.full_name}
                    onChange={(e) =>
                      setConvertForm({ ...convertForm, full_name: e.target.value })
                    }
                    className="h-10 text-xs border-gray-200"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Téléphone *
                  </label>
                  <Input
                    value={convertForm.phone}
                    onChange={(e) =>
                      setConvertForm({ ...convertForm, phone: e.target.value })
                    }
                    className="h-10 text-xs border-gray-200"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    N° CNI *
                  </label>
                  <Input
                    value={convertForm.cni_number}
                    onChange={(e) =>
                      setConvertForm({ ...convertForm, cni_number: e.target.value })
                    }
                    className="h-10 text-xs border-gray-200 font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Code validation admin (6 chiffres) *
                  </label>
                  <Input
                    value={convertForm.validation_code}
                    onChange={(e) =>
                      setConvertForm({
                        ...convertForm,
                        validation_code: e.target.value.replace(/\D/g, '').slice(0, 6),
                      })
                    }
                    maxLength={6}
                    className="h-10 text-xs border-gray-200 font-mono tracking-widest"
                    required
                  />
                </div>

                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pt-1">
                  Véhicule (optionnel)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Marque"
                    value={convertForm.marque}
                    onChange={(e) =>
                      setConvertForm({ ...convertForm, marque: e.target.value })
                    }
                    className="h-10 text-xs border-gray-200"
                  />
                  <Input
                    placeholder="Immatriculation"
                    value={convertForm.immatriculation}
                    onChange={(e) =>
                      setConvertForm({ ...convertForm, immatriculation: e.target.value })
                    }
                    className="h-10 text-xs border-gray-200"
                  />
                  <Input
                    placeholder="N° châssis"
                    value={convertForm.chassis_num}
                    onChange={(e) =>
                      setConvertForm({ ...convertForm, chassis_num: e.target.value })
                    }
                    className="h-10 text-xs border-gray-200"
                  />
                  <Input
                    type="number"
                    placeholder="Puissance CV"
                    value={convertForm.puissance_cv}
                    onChange={(e) =>
                      setConvertForm({ ...convertForm, puissance_cv: e.target.value })
                    }
                    className="h-10 text-xs border-gray-200"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setConvertingProspect(null)
                      setConvertForm(emptyConvertForm())
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={convertMutation.isPending}
                    isLoading={convertMutation.isPending}
                  >
                    Convertir
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal approbation conversion */}
      {approvingRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white border border-gray-100 shadow-2xl rounded-2xl">
            <CardContent className="pt-6 space-y-4">
              <div className="pb-2 border-b border-gray-50">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Approuver la conversion
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {conversionDisplayName(approvingRequest)}
                </p>
              </div>
              <form onSubmit={handleApproveSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Code validation (6 chiffres) *
                  </label>
                  <Input
                    value={approvalCode}
                    onChange={(e) =>
                      setApprovalCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    maxLength={6}
                    className="h-10 text-xs font-mono tracking-widest"
                    required
                  />
                </div>
                {approvingRequest.payment_mode === 'MANUAL_PAYMENT' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Référence paiement reçue *
                    </label>
                    <Input
                      value={approvalPaymentRef}
                      onChange={(e) => setApprovalPaymentRef(e.target.value)}
                      placeholder={approvingRequest.payment_reference || ''}
                      className="h-10 text-xs"
                      required
                    />
                    <p className="text-[10px] text-amber-600">
                      Doit correspondre à la référence déclarée par l&apos;agent.
                    </p>
                  </div>
                )}
                <div className="flex gap-2 justify-end pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setApprovingRequest(null)
                      setApprovalCode('')
                      setApprovalPaymentRef('')
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    variant="success"
                    disabled={approveMutation.isPending}
                    isLoading={approveMutation.isPending}
                  >
                    Confirmer
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
