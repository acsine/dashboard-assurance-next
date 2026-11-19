'use client'

export const dynamic = 'force-dynamic'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, use } from 'react'
import dynamicImport from 'next/dynamic'
import { expertApi, ExpertClaimDetail, SubmitExpertReportPayload } from '@/lib/api/mobi-assur'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  Car,
  FileText,
  AlertTriangle,
  Clock,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  X,
  Send,
  Wrench,
  Check,
  Lock,
  FileSpreadsheet,
  Maximize2
} from 'lucide-react'

// Chargement SSR-safe de la carte Leaflet
const SinistreMapPreview = dynamicImport(
  () => import('@/components/dashboard/SinistreMapPreview'),
  {
    ssr: false,
    loading: () => (
      <div className="h-44 w-full rounded-2xl bg-slate-100 animate-pulse flex items-center justify-center text-xs text-slate-400">
        Chargement de la carte GPS...
      </div>
    ),
  }
)

function formatFCFA(val?: number | string | null): string {
  if (val == null || val === '') return '—'
  const num = typeof val === 'string' ? parseFloat(val.replace(/\s+/g, '')) : val
  if (isNaN(num)) return '—'
  return `${Math.round(num).toLocaleString('fr-FR')} FCFA`
}

function formatDate(iso?: string | null): string {
  if (!iso) return 'Date non précisée'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function ExpertClaimPortalPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>
}) {
  const { token } = use(params)
  const queryClient = useQueryClient()

  // Formulaire d'expertise
  const [chiffrageInput, setChiffrageInput] = useState<string>('')
  const [valeurVenaleInput, setValeurVenaleInput] = useState<string>('')
  const [reparable, setReparable] = useState<boolean>(true)
  const [summary, setSummary] = useState<string>('')
  const [isEditingReport, setIsEditingReport] = useState<boolean>(false)

  // Zoom photo Lightbox
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null)

  // Requête publique sécurisée via Magic Link
  const {
    data: claim,
    isLoading,
    error,
  } = useQuery<ExpertClaimDetail>({
    queryKey: ['expert-claim', token],
    queryFn: () => expertApi.getClaim(token),
    retry: 1,
  })

  // Mutation de dépôt du rapport
  const submitReportMutation = useMutation({
    mutationFn: (payload: SubmitExpertReportPayload) => expertApi.submitReport(token, payload),
    onSuccess: (updated) => {
      toast.success('Rapport d\'expertise transmis avec succès à Bethel Comprehensive Insurance !')
      setIsEditingReport(false)
      queryClient.setQueryData(['expert-claim', token], (prev: any) => ({
        ...prev,
        ...updated,
        status: 'RAPPORT_DEPOSE',
        chiffrage_expert: Number(chiffrageInput.replace(/\s+/g, '')),
        valeur_venale: valeurVenaleInput ? Number(valeurVenaleInput.replace(/\s+/g, '')) : prev?.valeur_venale,
      }))
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors du dépôt du rapport d\'expertise')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const chiffrage = parseFloat(chiffrageInput.replace(/\s+/g, ''))
    if (isNaN(chiffrage) || chiffrage <= 0) {
      toast.error('Veuillez renseigner un montant de chiffrage valide (> 0 FCFA)')
      return
    }

    const payload: SubmitExpertReportPayload = {
      chiffrage_expert: chiffrage,
      valeur_venale: valeurVenaleInput ? parseFloat(valeurVenaleInput.replace(/\s+/g, '')) : undefined,
      reparable,
      summary: summary.trim() || undefined,
    }

    submitReportMutation.mutate(payload)
  }

  // Écran de chargement
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <img
            src="/bethel-logo.png"
            alt="Bethel Comprehensive Insurance"
            className="h-16 w-auto object-contain drop-shadow-sm mb-2"
          />
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-slate-800">Authentification sécurisée du mandat...</p>
            <p className="text-xs text-slate-400 mt-1">Vérification du token de session expert CIMA...</p>
          </div>
        </div>
      </div>
    )
  }

  // Écran d'erreur (Lien expiré 410 ou invalide 404)
  if (error || !claim) {
    const errorMsg = (error as any)?.message || ''
    const isExpired = errorMsg.toLowerCase().includes('expir') || (error as any)?.status === 410

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center border-slate-200 shadow-xl rounded-3xl">
          <img
            src="/bethel-logo.png"
            alt="Bethel Comprehensive Insurance"
            className="h-14 w-auto mx-auto object-contain drop-shadow-sm mb-6"
          />
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4 border border-rose-100">
            {isExpired ? <Clock className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
          </div>
          <h2 className="text-xl font-black text-slate-900">
            {isExpired ? 'Lien d\'expertise expiré' : 'Mandat introuvable'}
          </h2>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            {isExpired
              ? 'Ce lien d\'accès sécurisé a dépassé sa durée réglementaire de validité (72 heures).'
              : 'Ce lien d\'expertise est invalide ou le dossier correspondant n\'existe pas.'}
          </p>
          <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-left space-y-1.5">
            <p className="font-extrabold text-slate-800">Instruction à l'expert :</p>
            <p className="text-slate-500">
              Veuillez contacter le département Sinistres & Règlements de Bethel Comprehensive Insurance afin de renouveler votre mandat.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  // Photos des dégâts et constats
  const photos = (claim.documents || []).filter((d) => {
    const url = d.file_url?.toLowerCase() || ''
    const type = d.doc_type?.toLowerCase() || ''
    return (
      type.includes('constat') ||
      type.includes('photo') ||
      type.includes('degat') ||
      url.endsWith('.png') ||
      url.endsWith('.jpg') ||
      url.endsWith('.jpeg') ||
      url.endsWith('.webp')
    )
  })

  const otherDocs = (claim.documents || []).filter((d) => !photos.includes(d))
  const hasReportAlready = claim.chiffrage_expert != null || claim.status === 'RAPPORT_DEPOSE'

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20 text-slate-900 font-sans antialiased">
      {/* Lightbox Zoom Photo */}
      {zoomPhotoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md transition-all"
          onClick={() => setZoomPhotoUrl(null)}
        >
          <div className="relative max-h-[90vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setZoomPhotoUrl(null)}
              className="absolute -top-12 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-all cursor-pointer"
              aria-label="Fermer"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={zoomPhotoUrl}
              alt="Vue détaillée"
              className="max-h-[85vh] w-auto rounded-2xl object-contain shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}

      {/* Top Banner Navigation avec Logo Bethel Officiel */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-2xs">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src="/bethel-logo.png"
              alt="Bethel Comprehensive Insurance"
              className="h-10 sm:h-11 w-auto object-contain shrink-0"
            />
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold tracking-tight text-slate-900">
                  BETHEL COMPREHENSIVE INSURANCE
                </span>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700 border border-blue-200/60">
                  PORTAIL EXPERT CIMA
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Cabinet d'expertise automobile mandaté & constat contradictoire
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
              <Lock className="h-3.5 w-3.5 text-slate-500" />
              <span>Chiffrement CIMA SSL</span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700 border border-emerald-200/80 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Mandat officiel actif
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200/60">
              <Clock className="h-3.5 w-3.5" /> 72h Magic Link
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 space-y-6">
        {/* Banner Dossier Header ProMax (Style Institutionnel Haut de Gamme) */}
        <div className="rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-blue-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          {/* Subtle watermarked decorative shape */}
          <div className="absolute right-0 top-0 bottom-0 w-96 bg-white/5 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/20 px-3 py-1 text-xs font-mono font-bold text-blue-200 border border-blue-400/30">
                  RÉFÉRENCE : {claim.reference || 'SINISTRE'}
                </span>
                <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-slate-300 border border-white/10">
                  BRANCHE AUTOMOBILE
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Mission d'Expertise Automobile Contradictoire
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Expert mandaté : <strong className="text-white font-extrabold">{claim.expert_name || 'Cabinet d\'expertise agréé'}</strong>.
                Veuillez examiner les éléments matériels, constater l'imputabilité des dégâts et transmettre votre chiffrage contradictoire.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4 sm:p-5 border border-white/15 backdrop-blur-md shrink-0 flex flex-col justify-center text-left md:text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Statut du mandat</p>
              <div className="mt-1 flex items-center md:justify-end gap-2">
                {claim.status === 'RAPPORT_DEPOSE' ? (
                  <span className="inline-flex items-center gap-1.5 text-base sm:text-lg font-black text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" /> Rapport déposé
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-base sm:text-lg font-black text-amber-300">
                    <Clock className="h-5 w-5" /> En attente de chiffrage
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Conforme Articles 230-235 Code CIMA</p>
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Colonne Gauche (7 cols) : Détails Sinistre, Véhicule, Photos & Carte */}
          <div className="space-y-6 lg:col-span-7">
            {/* Card 1: Véhicule sinistré */}
            <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between py-3.5 px-5">
                <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                    <Car className="h-4 w-4" />
                  </div>
                  Fiche du Véhicule Examiné
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black bg-slate-900 text-white px-3 py-1 rounded-lg tracking-wider shadow-2xs">
                    {claim.vehicle?.immatriculation || 'IMMATRICULATION N/A'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Marque & Modèle
                    </span>
                    <span className="mt-1 font-extrabold text-sm text-slate-900 block truncate">
                      {claim.vehicle?.marque_modele || 'Non renseigné'}
                    </span>
                  </div>

                  <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Usage CIMA
                    </span>
                    <span className="mt-1 font-extrabold text-sm text-slate-900 block">
                      {claim.vehicle?.usage || 'Promenades & Affaires'}
                    </span>
                  </div>

                  <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Valeur de Référence
                    </span>
                    <span className="mt-1 font-extrabold text-sm text-blue-700 block">
                      {claim.vehicle?.valeur_venale
                        ? formatFCFA(claim.vehicle.valeur_venale)
                        : claim.vehicle?.valeur_neuve
                        ? formatFCFA(claim.vehicle.valeur_neuve)
                        : 'À dire d\'expert'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Circonstances & Déclaration */}
            <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3.5 px-5">
                <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <FileText className="h-4 w-4" />
                  </div>
                  Circonstances et Lieu du Sinistre
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-wrap gap-3 text-xs">
                  <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/70">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span>
                      Date de survenance : <strong className="font-bold text-slate-800">{formatDate(claim.incident_at)}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/70">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span>
                      Lieu déclaré : <strong className="font-bold text-slate-800">{claim.location || 'Non précisé'}</strong>
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Déclaration circonstanciée de l'assuré
                  </h4>
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                    « {claim.description || claim.title || 'Déclaration enregistrée auprès des services de Bethel Comprehensive Insurance.'} »
                  </div>
                </div>

                {/* Carte GPS si coordonnées disponibles */}
                {claim.gps_lat != null && claim.gps_lng != null && (
                  <div className="space-y-2 pt-1">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-blue-600" /> Localisation GPS constatée
                    </h4>
                    <div className="rounded-2xl overflow-hidden border border-slate-200">
                      <SinistreMapPreview
                        lat={claim.gps_lat}
                        lng={claim.gps_lng}
                        reference={claim.reference || 'Sinistre'}
                        address={claim.location || undefined}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 3: Photos des dégâts et constat */}
            <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between py-3.5 px-5">
                <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <Eye className="h-4 w-4" />
                  </div>
                  Pièces Justificatives & Photos du Sinistre ({photos.length})
                </CardTitle>
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                  Cliquez sur une image pour l'agrandir
                </span>
              </CardHeader>
              <CardContent className="p-5">
                {photos.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-xs text-slate-400">
                    Aucune photo téléversée pour ce dossier.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {photos.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => setZoomPhotoUrl(doc.file_url)}
                        className="group relative aspect-4/3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 cursor-pointer shadow-2xs hover:shadow-md transition-all"
                      >
                        <img
                          src={doc.file_url}
                          alt={doc.doc_type || 'Photo sinistre'}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-transparent to-transparent flex items-end justify-between p-2.5">
                          <span className="text-[11px] font-bold text-white truncate drop-shadow-xs">
                            {doc.doc_type || 'Photo dégâts'}
                          </span>
                          <Maximize2 className="h-3.5 w-3.5 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Autres documents techniques (Constats PDF, etc.) */}
                {otherDocs.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Autres documents annexés ({otherDocs.length})
                    </p>
                    <div className="space-y-1.5">
                      {otherDocs.map((doc) => (
                        <a
                          key={doc.id}
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-xs font-bold text-slate-700 transition-all"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <FileSpreadsheet className="h-4 w-4 text-blue-600 shrink-0" />
                            <span className="truncate">{doc.file_name || doc.doc_type || 'Document technique'}</span>
                          </span>
                          <span className="text-blue-600 text-[11px] shrink-0 font-extrabold">Ouvrir</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Colonne Droite (5 cols) : Formulaire de Dépôt / Chiffrage Technique */}
          <div className="space-y-6 lg:sticky lg:top-20 lg:col-span-5">
            {/* Si un rapport est déjà transmis et qu'on n'est pas en mode édition */}
            {hasReportAlready && !isEditingReport ? (
              <Card className="rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50/50 via-white to-white shadow-sm overflow-hidden">
                <CardHeader className="border-b border-emerald-100 bg-emerald-50/60 py-4 px-5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white shadow-2xs">
                      <Check className="h-3.5 w-3.5" /> Rapport Validé & Transmis
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setChiffrageInput(String(claim.chiffrage_expert || ''))
                        setValeurVenaleInput(String(claim.valeur_venale || ''))
                        setSummary(claim.summary || '')
                        setIsEditingReport(true)
                      }}
                      className="text-xs font-extrabold text-blue-700 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      Modifier le chiffrage
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="rounded-2xl bg-white p-4 border border-emerald-200/80 shadow-2xs space-y-3">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Montant estimé des réparations
                      </span>
                      <span className="text-3xl font-black text-emerald-950 block mt-1 tracking-tight">
                        {formatFCFA(claim.chiffrage_expert)}
                      </span>
                    </div>

                    {claim.valeur_venale != null && (
                      <div className="border-t border-slate-100 pt-3">
                        <span className="text-xs font-bold text-slate-500 block">Valeur vénale retenue</span>
                        <span className="text-base font-extrabold text-slate-900 block mt-0.5">
                          {formatFCFA(claim.valeur_venale)}
                        </span>
                      </div>
                    )}
                  </div>

                  {claim.summary && (
                    <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Conclusions techniques de l'expert :
                      </p>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {claim.summary}
                      </p>
                    </div>
                  )}

                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 text-xs text-slate-600 space-y-1">
                    <p className="font-extrabold text-slate-800">Dossier CIMA à jour :</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Ce rapport a été enregistré chez Bethel Comprehensive Insurance. La compagnie peut procéder au règlement et à l'émission de la quittance d'indemnisation.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Formulaire de saisie du rapport d'expertise */
              <Card className="rounded-3xl border border-blue-200/80 bg-white shadow-md overflow-hidden">
                <CardHeader className="border-b border-blue-100 bg-blue-50/50 py-4 px-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-blue-600 text-white shadow-2xs">
                      <Wrench className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-black text-slate-900">
                        Déposer le Chiffrage Technique
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Estimation financière contradictoire des réparations
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Chiffrage TTC */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block">
                        Montant estimé des réparations (TTC en FCFA) *
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="Ex: 450000"
                          value={chiffrageInput}
                          onChange={(e) => setChiffrageInput(e.target.value)}
                          className="h-12 text-base font-black text-slate-950 pl-3 pr-16 border-slate-300 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                          required
                          min={1}
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                          FCFA
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Pièces détachées d'origine, tôlerie, peinture et main d'œuvre agréée.
                      </p>
                      {chiffrageInput && !isNaN(Number(chiffrageInput)) && (
                        <p className="text-xs font-black text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-200/60 inline-block">
                          Aperçu : {formatFCFA(Number(chiffrageInput))}
                        </p>
                      )}
                    </div>

                    {/* Valeur Vénale */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block">
                        Valeur vénale estimée avant sinistre (FCFA)
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="Optionnel (ex: 3500000)"
                          value={valeurVenaleInput}
                          onChange={(e) => setValeurVenaleInput(e.target.value)}
                          className="h-11 text-sm font-bold text-slate-900 pl-3 pr-16 border-slate-300 rounded-xl"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                          FCFA
                        </span>
                      </div>
                    </div>

                    {/* Réparabilité */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block">
                        Avis d'expert sur la réparabilité
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setReparable(true)}
                          className={`flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                            reparable
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Check className="h-4 w-4" /> Véhicule Réparable
                        </button>
                        <button
                          type="button"
                          onClick={() => setReparable(false)}
                          className={`flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                            !reparable
                              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <AlertTriangle className="h-4 w-4" /> Perte Totale / Épave
                        </button>
                      </div>
                    </div>

                    {/* Conclusions techniques & Détails */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block">
                        Synthèse & Observations contradictoires
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Précisez les chocs constatés, pièces à remplacer (pare-chocs, optiques...), taux horaire, durée d'immobilisation estimée..."
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 leading-relaxed font-medium"
                      />
                    </div>

                    {/* Actions */}
                    <div className="pt-2 space-y-2">
                      <Button
                        type="submit"
                        disabled={submitReportMutation.isPending}
                        className="w-full h-12 text-sm font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center justify-center gap-2 rounded-xl cursor-pointer"
                      >
                        {submitReportMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Transmission en cours...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" /> Valider et transmettre le rapport
                          </>
                        )}
                      </Button>

                      {isEditingReport && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setIsEditingReport(false)}
                          className="w-full text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                        >
                          Annuler la modification
                        </Button>
                      )}
                    </div>

                    {/* Mentions légales de confiance CIMA */}
                    <div className="pt-2 text-center">
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Conformément au Code CIMA, ce rapport contradictoire engage l'expert agréé vis-à-vis de la compagnie d'assurance et de l'assuré.
                      </p>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
