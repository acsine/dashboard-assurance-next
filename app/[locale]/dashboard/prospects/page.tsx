'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import {
  prospectsApi,
  usersApi,
  proxiedAssetUrl,
  type ConversionPayload,
  type ConversionRequest,
  type Prospect,
} from '@/lib/api/mobi-assur'
import Header from '@/components/dashboard/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { UserCheck, Check, X, Users, Clock, ExternalLink, ArrowRightLeft } from 'lucide-react'
import { RoleGuard } from '@/components/auth/RoleGuard'

type Tab = 'all' | 'pending'

const BLOCKED_CONVERT_STATUSES = new Set(['CONVERTI', 'EN_ATTENTE_VALIDATION'])

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
  return (
    req.prospect?.phone ||
    (payload.phone as string | undefined) ||
    'N/A'
  )
}

function conversionEmail(req: ConversionRequest): string {
  const payload = payloadOf(req)
  return (
    req.prospect?.email ||
    (payload.email as string | undefined) ||
    'N/A'
  )
}

function identityDocsFromConversion(req: ConversionRequest): {
  cni: string | undefined
  permis: string | undefined
} {
  const payload = payloadOf(req)
  return {
    cni:
      (payload.cni_photo_url as string | undefined) ||
      req.prospect?.cni_photo_url,
    permis:
      (payload.permis_photo_url as string | undefined) ||
      req.prospect?.permis_photo_url,
  }
}

function hasIdentityDocs(cni?: string, permis?: string): boolean {
  return Boolean(cni?.trim() && permis?.trim())
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

function DocLink({ label, url }: { label: string; url?: string }) {
  if (!url?.trim()) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-red-500 font-medium">
        {label} manquant
      </span>
    )
  }
  return (
    <a
      href={proxiedAssetUrl(url)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline"
    >
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  )
}

interface ConvertFormState {
  full_name: string
  phone: string
  marque: string
  immatriculation: string
  chassis_num: string
  puissance_cv: string
  cni_photo_url: string
  permis_photo_url: string
}

function emptyConvertForm(): ConvertFormState {
  return {
    full_name: '',
    phone: '',
    marque: '',
    immatriculation: '',
    chassis_num: '',
    puissance_cv: '',
    cni_photo_url: '',
    permis_photo_url: '',
  }
}

function formFromProspect(p: Prospect): ConvertFormState {
  return {
    full_name: p.full_name || '',
    phone: p.phone || '',
    marque: '',
    immatriculation: '',
    chassis_num: '',
    puissance_cv: '',
    cni_photo_url: p.cni_photo_url || '',
    permis_photo_url: p.permis_photo_url || '',
  }
}

export default function ProspectsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('all')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectMotif, setRejectMotif] = useState('')
  const [search, setSearch] = useState('')
  const [convertingProspect, setConvertingProspect] = useState<Prospect | null>(null)
  const [convertForm, setConvertForm] = useState<ConvertFormState>(emptyConvertForm())

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

  const approveMutation = useMutation({
    mutationFn: (id: string) => prospectsApi.approveConversion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-conversions'] })
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
      toast.success('Demande approuvée. Client créé et prospect converti.')
    },
    onError: (err: any) => {
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
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors du rejet')
    },
  })

  const convertMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: ConversionPayload }) =>
      prospectsApi.convertDirect(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-conversions'] })
      queryClient.invalidateQueries({ queryKey: ['prospects'] })
      toast.success('Prospect converti en client. La commission ira à l’agent prospecteur.')
      setConvertingProspect(null)
      setConvertForm(emptyConvertForm())
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la conversion')
    },
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
    setConvertForm(formFromProspect(p))
  }

  const handleConvertSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!convertingProspect) return
    if (!convertForm.full_name.trim() || !convertForm.phone.trim()) {
      toast.error('Nom et téléphone sont requis')
      return
    }
    if (!hasIdentityDocs(convertForm.cni_photo_url, convertForm.permis_photo_url)) {
      toast.error('CNI et permis sont requis pour convertir')
      return
    }

    const body: ConversionPayload = {
      full_name: convertForm.full_name.trim(),
      phone: convertForm.phone.trim(),
      country_code: 'CM',
      cni_photo_url: convertForm.cni_photo_url.trim() || undefined,
      permis_photo_url: convertForm.permis_photo_url.trim() || undefined,
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

  const safeProspects = Array.isArray(prospects) ? prospects : []
  const safePendingRequests = Array.isArray(pendingRequests) ? pendingRequests : []

  const filteredProspects = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return safeProspects
    return safeProspects.filter((p: Prospect) => {
      const agentLabel = p.agent_id ? resolveAgentLabel(p.agent_id).toLowerCase() : ''
      const hay = `${p.full_name || ''} ${p.phone || ''} ${p.status || ''} ${p.agent_id || ''} ${agentLabel}`.toLowerCase()
      return hay.includes(q)
    })
  }, [safeProspects, search, agentNameById])

  return (
    <div className="flex-1 flex flex-col bg-white">
      <Header
        title="Prospects & Conversions"
        subtitle="Consultez les prospects synchronisés par les agents et validez les demandes de conversion."
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
                placeholder="Rechercher nom, téléphone, statut…"
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
                <p className="text-xs text-gray-500 mt-1">
                  Les prospects apparaîtront ici après synchronisation mobile des agents.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 uppercase tracking-wider">
                      <th className="py-3 pr-4 font-bold">Nom</th>
                      <th className="py-3 pr-4 font-bold">Téléphone</th>
                      <th className="py-3 pr-4 font-bold">Statut</th>
                      <th className="py-3 pr-4 font-bold">Agent prospecteur</th>
                      <th className="py-3 pr-4 font-bold">Créé le</th>
                      <th className="py-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredProspects.map((p) => {
                      const canConvert = !BLOCKED_CONVERT_STATUSES.has(p.status)
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80">
                          <td className="py-3 pr-4 font-semibold text-slate-900">
                            {p.full_name || 'Sans nom'}
                          </td>
                          <td className="py-3 pr-4 text-slate-600 font-mono">
                            {p.phone || '—'}
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
                            <span className="font-medium block">
                              {resolveAgentLabel(p.agent_id)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Commission → cet agent
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-slate-500">
                            {p.created_at
                              ? new Date(p.created_at).toLocaleDateString('fr-FR')
                              : '—'}
                          </td>
                          <td className="py-3 text-right">
                            {canConvert ? (
                              <RoleGuard permission="agency:mutate" fallback={null}>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() => openConvertDialog(p)}
                                >
                                  <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
                                  Valider / convertir
                                </Button>
                              </RoleGuard>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium">
                                —
                              </span>
                            )}
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
                <p className="text-xs text-gray-500 mt-1">
                  Toutes les conversions prospects de l&apos;agence ont été validées.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {safePendingRequests.map((req) => {
                  const docs = identityDocsFromConversion(req)
                  const docsOk = hasIdentityDocs(docs.cni, docs.permis)
                  const agentId = req.agent_id || req.prospect?.agent_id
                  return (
                    <div
                      key={req.id}
                      className="p-5 border border-gray-100 rounded-2xl bg-gray-50/20 flex flex-col md:flex-row md:items-center justify-between gap-6"
                    >
                      <div className="space-y-2">
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                          Demande #{req.id.substring(0, 8).toUpperCase()}
                        </span>
                        <h4 className="font-bold text-sm text-gray-900 mt-1">
                          {conversionDisplayName(req)}
                        </h4>
                        <span className="text-xs text-gray-500 block">
                          Téléphone: {conversionPhone(req)} | Email: {conversionEmail(req)}
                        </span>
                        <span className="text-xs text-slate-700 font-semibold block">
                          Agent prospecteur: {resolveAgentLabel(agentId)}
                        </span>
                        <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 inline-block">
                          La commission sera créditée à cet agent (prospecteur), pas à l&apos;admin.
                        </span>
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <DocLink label="CNI" url={docs.cni} />
                          <DocLink label="Permis" url={docs.permis} />
                        </div>
                        {!docsOk && (
                          <span className="text-[11px] text-red-600 font-medium block">
                            Documents d&apos;identité incomplets — approbation désactivée.
                          </span>
                        )}
                        <span className="text-xs text-blue-600 font-semibold block mt-1">
                          Statut Demande: {req.status || 'EN_ATTENTE'}
                        </span>
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
                            Valider Rejet
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
                              onClick={() => approveMutation.mutate(req.id)}
                              disabled={approveMutation.isPending || !docsOk}
                              isLoading={approveMutation.isPending}
                              variant="success"
                              size="sm"
                              title={
                                !docsOk
                                  ? 'CNI et permis requis'
                                  : 'Approuver la conversion'
                              }
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

      {convertingProspect && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-white border border-gray-100 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
            <CardContent className="pt-6 space-y-4">
              <div className="pb-2 border-b border-gray-50">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Valider / convertir le prospect
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Agent prospecteur:{' '}
                  <strong>{resolveAgentLabel(convertingProspect.agent_id)}</strong>
                  {' — '}la commission ira à cet agent.
                </p>
              </div>

              <form onSubmit={handleConvertSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Nom complet
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
                    Téléphone
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

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      URL photo CNI
                    </label>
                    <Input
                      value={convertForm.cni_photo_url}
                      onChange={(e) =>
                        setConvertForm({ ...convertForm, cni_photo_url: e.target.value })
                      }
                      placeholder="https://…"
                      className="h-10 text-xs border-gray-200"
                    />
                    {convertForm.cni_photo_url && (
                      <DocLink label="Aperçu CNI" url={convertForm.cni_photo_url} />
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      URL photo permis
                    </label>
                    <Input
                      value={convertForm.permis_photo_url}
                      onChange={(e) =>
                        setConvertForm({
                          ...convertForm,
                          permis_photo_url: e.target.value,
                        })
                      }
                      placeholder="https://…"
                      className="h-10 text-xs border-gray-200"
                    />
                    {convertForm.permis_photo_url && (
                      <DocLink label="Aperçu permis" url={convertForm.permis_photo_url} />
                    )}
                  </div>
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
                    disabled={
                      convertMutation.isPending ||
                      !hasIdentityDocs(
                        convertForm.cni_photo_url,
                        convertForm.permis_photo_url,
                      )
                    }
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
    </div>
  )
}
