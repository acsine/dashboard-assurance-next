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
  ShieldCheck,
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
  ExternalLink,
  Send,
  HelpCircle,
  Building2,
  Wrench,
  Check,
} from 'lucide-react'

// Chargement SSR-safe de la carte Leaflet
const SinistreMapPreview = dynamicImport(
  () => import('@/components/dashboard/SinistreMapPreview'),
  {
    ssr: false,
    loading: () => (
      <div className="h-44 w-full rounded-2xl bg-slate-100 animate-pulse flex items-center justify-center text-xs text-slate-400">
        Chargement de la carte...
      </div>
    ),
  }
)

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
      toast.success('Rapport d\'expertise transmis avec succès à la compagnie d\'assurance !')
      setIsEditingReport(false)
      queryClient.setQueryData(['expert-claim', token], (prev: any) => ({
        ...prev,
        ...updated,
        status: 'RAPPORT_DEPOSE',
        chiffrage_expert: Number(chiffrageInput),
        valeur_venale: valeurVenaleInput ? Number(valeurVenaleInput) : prev?.valeur_venale,
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
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-sm font-bold text-slate-700">Chargement sécurisé du dossier d'expertise...</p>
          <p className="text-xs text-slate-400">Vérification de la validité du mandat...</p>
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
        <Card className="max-w-md w-full p-8 text-center border-slate-200 shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
            {isExpired ? <Clock className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
          </div>
          <h2 className="text-xl font-black text-slate-950">
            {isExpired ? 'Lien d\'expertise expiré' : 'Dossier introuvable'}
          </h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            {isExpired
              ? 'Ce lien d\'accès sécurisé a dépassé sa durée de validité réglementaire de 72 heures.'
              : 'Ce lien d\'expertise est invalide ou le dossier correspondant n\'existe pas.'}
          </p>
          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-left space-y-1">
            <p className="font-bold text-slate-700">Que devez-vous faire ?</p>
            <p>Veuillez contacter le service indemnisation de la compagnie d'assurance pour solliciter l'émission d'un nouveau lien de mandat.</p>
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
      url.endsWith('.png') ||
      url.endsWith('.jpg') ||
      url.endsWith('.jpeg') ||
      url.endsWith('.webp')
    )
  })

  const hasReportAlready = claim.chiffrage_expert != null || claim.status === 'RAPPORT_DEPOSE'

  return (
    <div className="min-h-screen bg-slate-100/70 pb-16">
      {/* Lightbox Zoom Photo */}
      {zoomPhotoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
          onClick={() => setZoomPhotoUrl(null)}
        >
          <div className="relative max-h-[90vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setZoomPhotoUrl(null)}
              className="absolute -top-12 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
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

      {/* Top Banner Navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900">MOBI-ASSUR CIMA</span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700">
                  PORTAIL EXPERT
                </span>
              </div>
              <p className="text-xs text-slate-500">Cabinet d'expertise automobile mandaté</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/60">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Mandat officiel actif
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              <Clock className="h-3.5 w-3.5" /> 72h Magic Link
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        {/* Banner Dossier Header */}
        <div className="mb-6 rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-blue-950 p-6 sm:p-8 text-white shadow-xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-blue-200">
                RÉFÉRENCE : {claim.reference || 'SINISTRE'}
              </span>
              <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight">
                Mission d'Expertise Automobile
              </h1>
              <p className="mt-1 text-sm text-slate-300 max-w-2xl">
                Expert mandaté : <strong className="text-white">{claim.expert_name || 'Cabinet Agréé'}</strong>.
                Veuillez examiner les pièces techniques, constater les dégâts et transmettre votre chiffrage contradictoire.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4 border border-white/15 backdrop-blur-xs text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Statut du dossier</p>
              <p className="text-lg font-black text-white mt-0.5">
                {claim.status === 'RAPPORT_DEPOSE' ? 'Rapport d\'expertise déposé' : 'En attente de chiffrage'}
              </p>
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Colonne Gauche (7 cols) : Détails Sinistre, Véhicule, Photos & Carte */}
          <div className="space-y-6 lg:col-span-7">
            {/* Card 1: Véhicule sinistré */}
            <Card className="border-slate-200/80 shadow-xs">
              <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Car className="h-5 w-5 text-blue-600" /> Véhicule à examiner
                </CardTitle>
                {claim.vehicle?.immatriculation && (
                  <span className="font-mono text-xs font-black bg-blue-50 text-blue-800 px-3 py-1 rounded-xl border border-blue-200">
                    {claim.vehicle.immatriculation}
                  </span>
                )}
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Marque / Modèle</span>
                    <span className="mt-1 font-bold text-sm text-slate-900 block truncate">
                      {claim.vehicle?.marque_modele || 'Non renseigné'}
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Usage</span>
                    <span className="mt-1 font-bold text-sm text-slate-900 block">
                      {claim.vehicle?.usage || 'Personnel'}
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Valeur déclarée</span>
                    <span className="mt-1 font-bold text-sm text-slate-900 block">
                      {claim.vehicle?.valeur_venale
                        ? `${claim.vehicle.valeur_venale.toLocaleString('fr-FR')} FCFA`
                        : claim.vehicle?.valeur_neuve
                        ? `${claim.vehicle.valeur_neuve.toLocaleString('fr-FR')} FCFA`
                        : 'À dire d\'expert'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Circonstances & Déclaration */}
            <Card className="border-slate-200/80 shadow-xs">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" /> Circonstances et lieu du sinistre
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <span>
                      Date :{' '}
                      <strong>
                        {claim.incident_at
                          ? new Date(claim.incident_at).toLocaleString('fr-FR')
                          : 'Date non précisée'}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                    <MapPin className="h-4 w-4 text-slate-500" />
                    <span>
                      Lieu : <strong>{claim.location || 'Non précisé'}</strong>
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Déclaration de l'assuré
                  </h4>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-800 leading-relaxed font-medium">
                    {claim.description || claim.title || 'Aucune circonstance détaillée fournie.'}
                  </div>
                </div>

                {/* Carte GPS si coordonnées disponibles */}
                {claim.gps_lat != null && claim.gps_lng != null && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-blue-600" /> Position GPS de l'accident
                    </h4>
                    <SinistreMapPreview
                      lat={claim.gps_lat}
                      lng={claim.gps_lng}
                      reference={claim.reference || 'Sinistre'}
                      address={claim.location || undefined}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 3: Photos des dégâts et constat */}
            <Card className="border-slate-200/80 shadow-xs">
              <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-emerald-600" /> Pièces jointes & Photos ({photos.length})
                </CardTitle>
                <span className="text-xs text-slate-400">Cliquez pour agrandir</span>
              </CardHeader>
              <CardContent className="pt-5">
                {photos.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-xs text-slate-400">
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
                        <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-2.5">
                          <span className="text-[11px] font-bold text-white truncate drop-shadow-xs">
                            {doc.doc_type || 'Photo'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Colonne Droite (5 cols) : Formulaire de Dépôt / Chiffrage Technique */}
          <div className="space-y-6 lg:sticky lg:top-20 lg:col-span-5">
            {/* Si un rapport est déjà transmis et qu'on n'est pas en mode édition */}
            {hasReportAlready && !isEditingReport ? (
              <Card className="border-emerald-200 bg-linear-to-br from-emerald-50/60 to-white shadow-sm">
                <CardHeader className="border-b border-emerald-100 pb-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                      <Check className="h-4 w-4" /> Rapport d'expertise enregistré
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setChiffrageInput(String(claim.chiffrage_expert || ''))
                        setValeurVenaleInput(String(claim.valeur_venale || ''))
                        setIsEditingReport(true)
                      }}
                      className="text-xs font-bold text-blue-700 hover:underline"
                    >
                      Modifier le chiffrage
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                  <div className="rounded-2xl bg-white p-4 border border-emerald-100 shadow-2xs space-y-3">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Montant total chiffré des réparations
                      </span>
                      <span className="text-2xl font-black text-emerald-950 block mt-1">
                        {(claim.chiffrage_expert || 0).toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>

                    {claim.valeur_venale != null && (
                      <div className="border-t border-slate-100 pt-2">
                        <span className="text-xs font-bold text-slate-500 block">Valeur vénale retenue</span>
                        <span className="text-base font-bold text-slate-900 block mt-0.5">
                          {claim.valeur_venale.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-600 space-y-1">
                    <p className="font-bold text-slate-800">Transmission à la compagnie :</p>
                    <p>Ce rapport a été consigné dans le dossier CIMA. L'assureur peut désormais émettre la quittance d'indemnisation.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Formulaire de saisie du rapport d'expertise */
              <Card className="border-blue-200 shadow-md">
                <CardHeader className="border-b border-blue-100 bg-blue-50/50 pb-4">
                  <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-blue-700" /> Déposer le Chiffrage Technique
                  </CardTitle>
                  <p className="text-xs text-slate-600 mt-1">
                    Renseignez l'estimation financière contradictoire des réparations à effectuer.
                  </p>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Chiffrage TTC */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                        Montant des réparations (TTC en FCFA) *
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="Ex: 450000"
                          value={chiffrageInput}
                          onChange={(e) => setChiffrageInput(e.target.value)}
                          className="h-12 text-base font-black text-slate-950 pl-3 pr-16 border-slate-300"
                          required
                          min={1}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400">
                          FCFA
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">Total pièces détachées, tôlerie, peinture et main d'œuvre.</p>
                    </div>

                    {/* Valeur Vénale */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                        Valeur vénale estimée avant sinistre (FCFA)
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="Optionnel (ex: 3500000)"
                          value={valeurVenaleInput}
                          onChange={(e) => setValeurVenaleInput(e.target.value)}
                          className="h-11 text-sm font-bold text-slate-900 pl-3 pr-16 border-slate-300"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400">
                          FCFA
                        </span>
                      </div>
                    </div>

                    {/* Réparabilité */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                        Avis sur la réparabilité
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setReparable(true)}
                          className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                            reparable
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <Check className="h-4 w-4" /> Réparable
                        </button>
                        <button
                          type="button"
                          onClick={() => setReparable(false)}
                          className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                            !reparable
                              ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <AlertTriangle className="h-4 w-4" /> Perte totale / Épave
                        </button>
                      </div>
                    </div>

                    {/* Conclusions techniques & Détails */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                        Synthèse & Observations de l'expert
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Précisez les chocs constatés, pièces à remplacer (pare-chocs, optiques...), taux horaire, durée d'immobilisation estimée..."
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>

                    {/* Actions */}
                    <div className="pt-2 space-y-2">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={submitReportMutation.isPending}
                        className="w-full h-12 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center justify-center gap-2"
                      >
                        {submitReportMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Envoi en cours...
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
                          className="w-full text-xs text-slate-500"
                        >
                          Annuler
                        </Button>
                      )}
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
