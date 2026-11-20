'use client'

export const dynamic = 'force-dynamic'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, use, useRef, useEffect, useMemo } from 'react'
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
  Maximize2,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Printer,
  ShieldCheck,
  FileCheck2,
  PenTool,
  RotateCcw,
  Sparkles,
  Info,
  ShieldAlert,
  HelpCircle,
  Percent,
  Layers,
  ClipboardList
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
  if (val == null || val === '') return '0 FCFA'
  const num = typeof val === 'string' ? parseFloat(val.replace(/\s+/g, '')) : val
  if (isNaN(num)) return '0 FCFA'
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

// ---------------------------------------------------------------------------
// TYPES ET MODÈLE D'EXPERTISE PROFESSIONNELLE CIMA
// ---------------------------------------------------------------------------

export type ChiffrageCategory = 'PIECE' | 'TOLERIE' | 'PEINTURE' | 'MECANIQUE' | 'CONTROLE'

export interface ChiffrageLineItem {
  id: string
  type: ChiffrageCategory
  designation: string
  refOem: string
  quantite: number
  prixUnitaire: number // FCFA HT
  tempsMO: number // Heures
  tauxHoraire: number // FCFA/heure
  vetusteTaux: number // % appliqué sur le prix de la pièce
}

export interface StructuredExpertReport {
  version: '2.0_CIMA_PRO'
  expertName: string
  expertCabinet: string
  expertAgreation: string
  vin: string
  kilometrage: string
  energie: string
  genreVehicule: string
  concordance: 'CONCORDANT' | 'PARTIEL' | 'NON_CONCORDANT'
  pointChoc: string
  etatCirculation: 'ROULANT' | 'NON_ROULANT' | 'VGE_DANGER'
  concordanceNotes: string
  lineItems: ChiffrageLineItem[]
  valeurVenale: number
  valeurEpave: number
  dureeImmobilisation: number
  reparable: boolean
  isVge: boolean
  observations: string
  signatureDataUrl?: string
  signedAt?: string
}

const TEMPLATES_CHIFFRAGE: Record<string, { label: string; items: Omit<ChiffrageLineItem, 'id'>[] }> = {
  choc_avant: {
    label: 'Choc Avant (Bouclier, Optique, Tôlerie)',
    items: [
      { type: 'PIECE', designation: 'Bouclier / Pare-chocs avant d\'origine', refOem: 'OEM-52119', quantite: 1, prixUnitaire: 135000, tempsMO: 1.5, tauxHoraire: 12000, vetusteTaux: 0 },
      { type: 'PIECE', designation: 'Bloc optique droit LED', refOem: 'OEM-81110', quantite: 1, prixUnitaire: 110000, tempsMO: 0.8, tauxHoraire: 12000, vetusteTaux: 0 },
      { type: 'TOLERIE', designation: 'Redressage traverse inférieure & jupe', refOem: 'MO-TOL', quantite: 1, prixUnitaire: 0, tempsMO: 3.5, tauxHoraire: 12000, vetusteTaux: 0 },
      { type: 'PEINTURE', designation: 'Peinture complète bouclier avant (vernis bicouche)', refOem: 'ING-PEINT', quantite: 1, prixUnitaire: 40000, tempsMO: 2.5, tauxHoraire: 12000, vetusteTaux: 0 },
    ],
  },
  choc_arriere: {
    label: 'Choc Arrière (Bouclier, Malle, Feux)',
    items: [
      { type: 'PIECE', designation: 'Pare-chocs arrière complet', refOem: 'OEM-52159', quantite: 1, prixUnitaire: 120000, tempsMO: 1.2, tauxHoraire: 12000, vetusteTaux: 0 },
      { type: 'PIECE', designation: 'Feu arrière gauche', refOem: 'OEM-81561', quantite: 1, prixUnitaire: 65000, tempsMO: 0.5, tauxHoraire: 12000, vetusteTaux: 0 },
      { type: 'TOLERIE', designation: 'Débosselage plancher de coffre et jupe AR', refOem: 'MO-TOL', quantite: 1, prixUnitaire: 0, tempsMO: 3.0, tauxHoraire: 12000, vetusteTaux: 0 },
      { type: 'PEINTURE', designation: 'Peinture bouclier arrière & retouche malle', refOem: 'ING-PEINT', quantite: 1, prixUnitaire: 35000, tempsMO: 2.0, tauxHoraire: 12000, vetusteTaux: 0 },
    ],
  },
  choc_lateral: {
    label: 'Choc Latéral (Aile, Portière, Rétroviseur)',
    items: [
      { type: 'PIECE', designation: 'Coque et miroir rétroviseur extérieur', refOem: 'OEM-87910', quantite: 1, prixUnitaire: 55000, tempsMO: 0.6, tauxHoraire: 12000, vetusteTaux: 0 },
      { type: 'TOLERIE', designation: 'Débosselage panneau portière avant et aile', refOem: 'MO-TOL', quantite: 1, prixUnitaire: 0, tempsMO: 5.0, tauxHoraire: 12000, vetusteTaux: 0 },
      { type: 'PEINTURE', designation: 'Peinture et raccord aile + portière', refOem: 'ING-PEINT', quantite: 1, prixUnitaire: 55000, tempsMO: 3.0, tauxHoraire: 12000, vetusteTaux: 0 },
    ],
  },
}

// ---------------------------------------------------------------------------
// COMPOSANT SIGNATURE PAD DIGITALE HAUTE PRÉCISION
// ---------------------------------------------------------------------------

function SignatureCanvas({
  value,
  onChange,
  disabled = false,
}: {
  value?: string
  onChange: (val: string) => void
  disabled?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawing = useRef<boolean>(false)
  const [hasStroke, setHasStroke] = useState<boolean>(Boolean(value))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Setup high DPI
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    ctx.scale(ratio, ratio)

    // Background blanc
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Si on a déjà une image sauvegardée, la redessiner
    if (value) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height)
      }
      img.src = value
    }
  }, [])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    isDrawing.current = true
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.strokeStyle = '#0f274a' // Bleu encre officiel CIMA
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(clientX - rect.left, clientY - rect.top)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.lineTo(clientX - rect.left, clientY - rect.top)
    ctx.stroke()
    setHasStroke(true)
  }

  const stopDrawing = () => {
    if (!isDrawing.current) return
    isDrawing.current = false
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    onChange(dataUrl)
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
    setHasStroke(false)
    onChange('')
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl border-2 border-dashed border-slate-300 bg-white overflow-hidden shadow-inner">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`h-40 w-full touch-none ${disabled ? 'cursor-not-allowed opacity-90' : 'cursor-crosshair'}`}
        />
        {!hasStroke && !disabled && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <PenTool className="h-4 w-4 text-slate-400" />
              Signez ici avec votre souris, doigt ou stylet
            </span>
          </div>
        )}
      </div>
      {!disabled && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium flex items-center gap-1">
            <Lock className="h-3 w-3 text-emerald-600" /> Signature cryptographique horodatée
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 text-xs font-extrabold text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Effacer
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// PAGE PRINCIPALE EXPERT
// ---------------------------------------------------------------------------

export default function ExpertClaimPortalPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>
}) {
  const { token } = use(params)
  const queryClient = useQueryClient()

  // Stepper d'expertise en 4 étapes
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)
  const [isEditingReport, setIsEditingReport] = useState<boolean>(false)

  // Zoom photo Lightbox
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null)

  // État de chargement initial
  const {
    data: claim,
    isLoading,
    error,
  } = useQuery<ExpertClaimDetail>({
    queryKey: ['expert-claim', token],
    queryFn: () => expertApi.getClaim(token),
    retry: 1,
  })

  // -------------------------------------------------------------------------
  // FORMULAIRE PROGRESSIF D'EXPERTISE CIMA
  // -------------------------------------------------------------------------

  // Étape 1 : Fiche Technique & Identification
  const [vin, setVin] = useState<string>('')
  const [kilometrage, setKilometrage] = useState<string>('')
  const [energie, setEnergie] = useState<string>('Essence')
  const [genreVehicule, setGenreVehicule] = useState<string>('VP - Véhicule Particulier')
  const [concordance, setConcordance] = useState<'CONCORDANT' | 'PARTIEL' | 'NON_CONCORDANT'>('CONCORDANT')
  const [pointChoc, setPointChoc] = useState<string>('Face avant')
  const [etatCirculation, setEtatCirculation] = useState<'ROULANT' | 'NON_ROULANT' | 'VGE_DANGER'>('NON_ROULANT')
  const [concordanceNotes, setConcordanceNotes] = useState<string>('')

  // Étape 2 : Chiffrage Analytique (Lignes de devis CIMA)
  const [lineItems, setLineItems] = useState<ChiffrageLineItem[]>([
    {
      id: '1',
      type: 'PIECE',
      designation: 'Pare-chocs / Bouclier avant',
      refOem: 'OEM-52119',
      quantite: 1,
      prixUnitaire: 140000,
      tempsMO: 1.5,
      tauxHoraire: 12000,
      vetusteTaux: 0,
    },
    {
      id: '2',
      type: 'TOLERIE',
      designation: 'Redressage traverse et fixation aile',
      refOem: 'MO-TOL',
      quantite: 1,
      prixUnitaire: 0,
      tempsMO: 3.0,
      tauxHoraire: 12000,
      vetusteTaux: 0,
    },
    {
      id: '3',
      type: 'PEINTURE',
      designation: 'Peinture vernie bouclier avant & apprêt',
      refOem: 'ING-PEINT',
      quantite: 1,
      prixUnitaire: 35000,
      tempsMO: 2.0,
      tauxHoraire: 12000,
      vetusteTaux: 0,
    },
  ])

  // Étape 3 : Analyse Économique & Ratio VEI
  const [valeurVenale, setValeurVenale] = useState<string>('')
  const [valeurEpave, setValeurEpave] = useState<string>('')
  const [reparable, setReparable] = useState<boolean>(true)
  const [isVge, setIsVge] = useState<boolean>(false)
  const [dureeImmobilisation, setDureeImmobilisation] = useState<string>('5')
  const [observations, setObservations] = useState<string>('')

  // Étape 4 : Identité & Signature de l'expert
  const [expertName, setExpertName] = useState<string>('')
  const [expertCabinet, setExpertCabinet] = useState<string>('Cabinet Bethel Expertises Associés')
  const [expertAgreation, setExpertAgreation] = useState<string>('EXP-CIMA-2026/048')
  const [swornDeclaration, setSwornDeclaration] = useState<boolean>(true)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('')

  // Initialisation à partir des données existantes si déjà enregistré
  useEffect(() => {
    if (!claim) return

    // Nom de l'expert
    if (claim.expert_name) {
      setExpertName(claim.expert_name)
    }

    // Valeur vénale
    if (claim.valeur_venale != null) {
      setValeurVenale(String(claim.valeur_venale))
    } else if (claim.vehicle?.valeur_venale != null) {
      setValeurVenale(String(claim.vehicle.valeur_venale))
    }

    // Réparabilité
    if (claim.reparable != null) {
      setReparable(claim.reparable)
    }

    // Parsing du rapport JSON s'il a été précédemment sauvegardé
    if (claim.summary) {
      try {
        const parsed = JSON.parse(claim.summary) as StructuredExpertReport
        if (parsed.version === '2.0_CIMA_PRO') {
          if (parsed.expertName) setExpertName(parsed.expertName)
          if (parsed.expertCabinet) setExpertCabinet(parsed.expertCabinet)
          if (parsed.expertAgreation) setExpertAgreation(parsed.expertAgreation)
          if (parsed.vin) setVin(parsed.vin)
          if (parsed.kilometrage) setKilometrage(parsed.kilometrage)
          if (parsed.energie) setEnergie(parsed.energie)
          if (parsed.genreVehicule) setGenreVehicule(parsed.genreVehicule)
          if (parsed.concordance) setConcordance(parsed.concordance)
          if (parsed.pointChoc) setPointChoc(parsed.pointChoc)
          if (parsed.etatCirculation) setEtatCirculation(parsed.etatCirculation)
          if (parsed.concordanceNotes) setConcordanceNotes(parsed.concordanceNotes)
          if (parsed.lineItems && parsed.lineItems.length > 0) setLineItems(parsed.lineItems)
          if (parsed.valeurVenale) setValeurVenale(String(parsed.valeurVenale))
          if (parsed.valeurEpave) setValeurEpave(String(parsed.valeurEpave))
          if (parsed.dureeImmobilisation) setDureeImmobilisation(String(parsed.dureeImmobilisation))
          if (parsed.isVge != null) setIsVge(parsed.isVge)
          if (parsed.observations) setObservations(parsed.observations)
          if (parsed.signatureDataUrl) setSignatureDataUrl(parsed.signatureDataUrl)
        } else {
          setObservations(claim.summary)
        }
      } catch {
        setObservations(claim.summary)
      }
    }
  }, [claim])

  // -------------------------------------------------------------------------
  // CALCULS ANALYTIQUES DU CHIFFRAGE
  // -------------------------------------------------------------------------

  const totals = useMemo(() => {
    let piecesBrut = 0
    let vetusteDeduite = 0
    let totalMoTolerer = 0
    let totalMoMecanique = 0
    let totalPeinture = 0

    for (const item of lineItems) {
      const qte = item.quantite || 1
      const prixPieces = (item.prixUnitaire || 0) * qte
      const moCost = (item.tempsMO || 0) * (item.tauxHoraire || 0)
      const vetusteAmount = prixPieces * ((item.vetusteTaux || 0) / 100)

      piecesBrut += prixPieces
      vetusteDeduite += vetusteAmount

      if (item.type === 'PEINTURE') {
        totalPeinture += prixPieces + moCost
      } else if (item.type === 'MECANIQUE') {
        totalMoMecanique += moCost
      } else {
        totalMoTolerer += moCost
      }
    }

    const piecesNettes = Math.max(0, piecesBrut - vetusteDeduite)
    const totalMainOeuvre = totalMoTolerer + totalMoMecanique
    const totalTtc = piecesNettes + totalMainOeuvre + totalPeinture

    return {
      piecesBrut,
      vetusteDeduite,
      piecesNettes,
      totalMoTolerer,
      totalMoMecanique,
      totalMainOeuvre,
      totalPeinture,
      totalTtc,
    }
  }, [lineItems])

  // Calcul du ratio VEI (Véhicule Économiquement Irréparable)
  const numericValeurVenale = useMemo(() => {
    const val = parseFloat(valeurVenale.replace(/\s+/g, ''))
    return isNaN(val) ? 0 : val
  }, [valeurVenale])

  const veiRatio = useMemo(() => {
    if (numericValeurVenale <= 0) return 0
    return Math.round((totals.totalTtc / numericValeurVenale) * 1000) / 10
  }, [totals.totalTtc, numericValeurVenale])

  const isVeiDetected = veiRatio >= 75

  // -------------------------------------------------------------------------
  // GESTION DES LIGNES DU DEVIS
  // -------------------------------------------------------------------------

  const handleAddLine = (type: ChiffrageCategory = 'PIECE') => {
    const newItem: ChiffrageLineItem = {
      id: String(Date.now()),
      type,
      designation: '',
      refOem: '',
      quantite: 1,
      prixUnitaire: 0,
      tempsMO: type === 'PIECE' ? 0.5 : 1.5,
      tauxHoraire: 12000,
      vetusteTaux: 0,
    }
    setLineItems((prev) => [...prev, newItem])
  }

  const handleRemoveLine = (id: string) => {
    if (lineItems.length <= 1) {
      toast.error('Le devis contradictoire doit contenir au moins une ligne.')
      return
    }
    setLineItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleUpdateLine = (id: string, field: keyof ChiffrageLineItem, val: any) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    )
  }

  const handleApplyTemplate = (key: string) => {
    const tpl = TEMPLATES_CHIFFRAGE[key]
    if (!tpl) return
    const newItems: ChiffrageLineItem[] = tpl.items.map((it, idx) => ({
      ...it,
      id: `${Date.now()}_${idx}`,
    }))
    setLineItems((prev) => [...prev, ...newItems])
    toast.success(`Gabarit appliqué : ${tpl.label}`)
  }

  // -------------------------------------------------------------------------
  // MUTATION DE SOUMISSION DU RAPPORT OFFICIEL
  // -------------------------------------------------------------------------

  const submitReportMutation = useMutation({
    mutationFn: (payload: SubmitExpertReportPayload) => expertApi.submitReport(token, payload),
    onSuccess: (updated) => {
      toast.success('Procès-Verbal d\'expertise contradictoire transmis avec succès !')
      setIsEditingReport(false)
      queryClient.setQueryData(['expert-claim', token], (prev: any) => ({
        ...prev,
        ...updated,
        status: 'RAPPORT_DEPOSE',
        chiffrage_expert: totals.totalTtc,
        valeur_venale: numericValeurVenale || prev?.valeur_venale,
      }))
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la transmission du rapport d\'expertise')
    },
  })

  const handleFinalSubmit = () => {
    if (totals.totalTtc <= 0) {
      toast.error('Le montant total des réparations doit être supérieur à 0 FCFA.')
      setCurrentStep(2)
      return
    }

    if (!swornDeclaration) {
      toast.error('Veuillez certifier sur l\'honneur l\'exactitude de votre expertise CIMA.')
      return
    }

    if (!signatureDataUrl) {
      toast.error('Veuillez apposer votre signature électronique d\'expert agréé.')
      return
    }

    // Construction du document JSON structuré conforme CIMA
    const structuredReport: StructuredExpertReport = {
      version: '2.0_CIMA_PRO',
      expertName: expertName.trim() || 'Expert Automobile Agréé',
      expertCabinet: expertCabinet.trim() || 'Cabinet d\'expertise agréé CIMA',
      expertAgreation: expertAgreation.trim() || 'EXP-CIMA-OFFICIEL',
      vin: vin.trim() || claim?.vehicle?.immatriculation || '',
      kilometrage: kilometrage.trim(),
      energie,
      genreVehicule,
      concordance,
      pointChoc,
      etatCirculation,
      concordanceNotes: concordanceNotes.trim(),
      lineItems,
      valeurVenale: numericValeurVenale,
      valeurEpave: parseFloat(valeurEpave.replace(/\s+/g, '')) || 0,
      dureeImmobilisation: parseInt(dureeImmobilisation, 10) || 5,
      reparable,
      isVge,
      observations: observations.trim(),
      signatureDataUrl,
      signedAt: new Date().toISOString(),
    }

    const payload: SubmitExpertReportPayload = {
      chiffrage_expert: totals.totalTtc,
      valeur_venale: numericValeurVenale > 0 ? numericValeurVenale : undefined,
      reparable,
      summary: JSON.stringify(structuredReport),
    }

    submitReportMutation.mutate(payload)
  }

  // -------------------------------------------------------------------------
  // ÉCRANS D'ÉTAT : CHARGEMENT ET ERREURS
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <img
            src="/bethel-logo.png"
            alt="Bethel Comprehensive Insurance"
            className="h-16 w-auto object-contain drop-shadow-sm mb-2"
          />
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-white">Connexion au Portail Expert CIMA...</p>
            <p className="text-xs text-slate-400 mt-1">Authentification sécurisée du mandat contradictoire...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !claim) {
    const errorMsg = (error as any)?.message || ''
    const isExpired = errorMsg.toLowerCase().includes('expir') || (error as any)?.status === 410

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
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
              : 'Ce lien d\'expertise est invalide ou le dossier d\'assurance correspondant n\'existe pas.'}
          </p>
          <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-left space-y-1.5">
            <p className="font-extrabold text-slate-800">Instruction réglementaire :</p>
            <p className="text-slate-500">
              Veuillez contacter le département Sinistres & Règlements de Bethel Comprehensive Insurance pour la réémission du mandat.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  // Filtrage photos et documents
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
  const isAlreadySubmitted = claim.status === 'RAPPORT_DEPOSE' || claim.chiffrage_expert != null

  return (
    <div className="min-h-screen bg-slate-100/70 pb-20 text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Lightbox Zoom Photo */}
      {zoomPhotoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md transition-all"
          onClick={() => setZoomPhotoUrl(null)}
        >
          <div className="relative max-h-[92vh] max-w-5xl" onClick={(e) => e.stopPropagation()}>
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

      {/* Top Banner Navigation Institutionnelle CIMA */}
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-2xs print:hidden">
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
                <span className="text-sm font-black tracking-tight text-slate-900">
                  BETHEL COMPREHENSIVE INSURANCE
                </span>
                <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-black uppercase text-amber-300 tracking-wider">
                  CIMA LIVRE II
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold">
                Portail Professionnel d'Expertise Automobile Contradictoire & Chiffrage Analytique
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
              <Lock className="h-3.5 w-3.5 text-blue-600" />
              <span>Chiffrement SSL CIMA</span>
            </div>
            {isAlreadySubmitted ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-black text-emerald-700 border border-emerald-200 shadow-2xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                PV Officiel Déposé
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3.5 py-1 text-xs font-black text-amber-800 border border-amber-200 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                Mandat Contradictoire Actif
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 text-xs font-bold border-slate-300 hover:bg-slate-50 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" /> Imprimer PV
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 space-y-6">
        {/* Header Institutionnel Haut de Gamme (Style Dossier Judiciaire & Assurantiel) */}
        <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/20 px-3 py-1 text-xs font-mono font-black text-blue-300 border border-blue-400/30">
                  RÉFÉRENCE SINISTRE : {claim.reference || 'SINISTRE'}
                </span>
                <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-slate-300 border border-white/10">
                  SECTION CORPOREL & MATÉRIEL
                </span>
                <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-mono text-slate-300">
                  POLICE : {claim.policy_number || 'CONTRAT ACTIF'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white print:text-black">
                Mission d'Expertise Automobile Contradictoire
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed print:text-slate-600">
                Mandat délivré à l'ordre de <strong className="text-white font-black">{expertName || claim.expert_name || 'Cabinet d\'expertise agréé'}</strong> en application des articles 230 à 235 du Code CIMA. Établissement du procès-verbal contradictoire, vérification des points d'impact et arrêté du montant des réparations.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-5 border border-white/15 backdrop-blur-md shrink-0 flex flex-col justify-center text-left md:text-right print:hidden">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Chiffrage retenu</p>
              <p className="text-2xl sm:text-3xl font-black text-amber-300 mt-1">
                {formatFCFA(totals.totalTtc > 0 ? totals.totalTtc : claim.chiffrage_expert)}
              </p>
              <div className="mt-2 flex items-center md:justify-end gap-2 text-xs font-bold text-slate-300">
                <span>VAVS : {formatFCFA(numericValeurVenale || claim.valeur_venale)}</span>
                <span>•</span>
                <span className={veiRatio >= 75 ? 'text-rose-400' : 'text-emerald-400'}>
                  Ratio : {veiRatio > 0 ? `${veiRatio}%` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bannière d'alerte si déjà déposé avec possibilité de modifier */}
        {isAlreadySubmitted && !isEditingReport && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs print:hidden">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-2xs">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-emerald-950">
                  Procès-Verbal d'Expertise validé et enregistré
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Ce dossier a été certifié conforme au Code CIMA. Le chiffrage de <strong className="font-black">{formatFCFA(claim.chiffrage_expert || totals.totalTtc)}</strong> a été transmis à la compagnie pour l'émission des règlements.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingReport(true)}
                className="text-xs font-bold border-emerald-300 text-emerald-900 bg-white hover:bg-emerald-100 cursor-pointer"
              >
                Rectifier l'expertise
              </Button>
              <Button
                size="sm"
                onClick={() => setCurrentStep(4)}
                className="text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
              >
                Consulter le PV Officiel
              </Button>
            </div>
          </div>
        )}

        {/* STEPPER PROGRESSIF PROFESSIONNEL (4 ÉTAPES) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-xs print:hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              {
                step: 1,
                title: '1. Identification & Pièces',
                desc: 'VIN, Châssis & Concordance',
                icon: Car,
              },
              {
                step: 2,
                title: '2. Chiffrage Analytique',
                desc: 'Devis détaillé & Vétusté CIMA',
                icon: Wrench,
              },
              {
                step: 3,
                title: '3. Analyse VEI & Ratio',
                desc: 'VAVS, Épave & Sécurité',
                icon: AlertTriangle,
              },
              {
                step: 4,
                title: '4. PV Officiel & Signature',
                desc: 'Attestation & Transmission',
                icon: FileCheck2,
              },
            ].map((st) => {
              const isActive = currentStep === st.step
              const isPassed = currentStep > st.step
              const IconComp = st.icon

              return (
                <button
                  key={st.step}
                  type="button"
                  onClick={() => setCurrentStep(st.step as 1 | 2 | 3 | 4)}
                  className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900'
                      : isPassed
                      ? 'bg-slate-50 text-slate-800 hover:bg-slate-100 border border-slate-200/60'
                      : 'bg-transparent text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-black text-xs transition-colors ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : isPassed
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isPassed ? <Check className="h-4 w-4" /> : <IconComp className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-black truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>
                      {st.title}
                    </p>
                    <p className={`text-[11px] truncate ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                      {st.desc}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* ÉTAPE 1 : IDENTIFICATION, CONCORDANCE & DOSSIER PIÈCES           */}
        {/* ----------------------------------------------------------------- */}
        {currentStep === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Colonne Gauche : Identification Technique & Circonstances */}
            <div className="space-y-6 lg:col-span-7">
              {/* Card 1 : Vérification Technique du Véhicule */}
              <Card className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/70 py-3.5 px-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                        <Car className="h-4 w-4" />
                      </div>
                      Vérification Technique du Véhicule Examiné
                    </CardTitle>
                    <span className="font-mono text-xs font-black bg-slate-900 text-white px-3 py-1 rounded-lg">
                      {claim.vehicle?.immatriculation || 'IMMATRICULATION N/A'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">
                        Marque, Modèle & Version
                      </label>
                      <Input
                        value={claim.vehicle?.marque_modele || ''}
                        disabled
                        className="bg-slate-50 text-slate-800 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">
                        Numéro de Châssis (VIN) vérifié *
                      </label>
                      <Input
                        placeholder="Ex: VF33C9HR8HS123456"
                        value={vin}
                        onChange={(e) => setVin(e.target.value.toUpperCase())}
                        className="font-mono uppercase font-extrabold tracking-wider"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">
                        Kilométrage au compteur *
                      </label>
                      <div className="relative">
                        <Input
                          placeholder="Ex: 84500"
                          value={kilometrage}
                          onChange={(e) => setKilometrage(e.target.value)}
                          className="font-black pr-12"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          KM
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">
                        Motorisation / Énergie
                      </label>
                      <select
                        value={energie}
                        onChange={(e) => setEnergie(e.target.value)}
                        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="Essence">Essence</option>
                        <option value="Diesel">Diesel</option>
                        <option value="Hybride">Hybride</option>
                        <option value="Électrique">100% Électrique</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">
                        Genre Véhicule CIMA
                      </label>
                      <select
                        value={genreVehicule}
                        onChange={(e) => setGenreVehicule(e.target.value)}
                        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="VP - Véhicule Particulier">VP - Véhicule Particulier</option>
                        <option value="VU - Véhicule Utilitaire">VU - Véhicule Utilitaire</option>
                        <option value="PL - Poids Lourd / Transport">PL - Transport Marchandises</option>
                        <option value="2R - Moto / Deux-roues">2R - Deux-roues</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2 : Examen de Concordance & Imputabilité */}
              <Card className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/70 py-3.5 px-5">
                  <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                    Examen de Concordance & Imputabilité des Dégâts
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  {/* Verdict Concordance */}
                  <div>
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-2">
                      Concordance entre le récit du sinistre et les déformations physiques *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[
                        {
                          val: 'CONCORDANT',
                          label: 'Dégâts Concordants',
                          desc: 'Chocs compatibles avec la déclaration',
                          color: 'bg-emerald-50 text-emerald-800 border-emerald-300',
                          active: 'bg-emerald-600 text-white border-emerald-600',
                        },
                        {
                          val: 'PARTIEL',
                          label: 'Concordance Partielle',
                          desc: 'Traces antérieures relevées',
                          color: 'bg-amber-50 text-amber-800 border-amber-300',
                          active: 'bg-amber-600 text-white border-amber-600',
                        },
                        {
                          val: 'NON_CONCORDANT',
                          label: 'Non Concordant',
                          desc: 'Incompatibilité matérielle manifeste',
                          color: 'bg-rose-50 text-rose-800 border-rose-300',
                          active: 'bg-rose-600 text-white border-rose-600',
                        },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setConcordance(opt.val as any)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            concordance === opt.val ? opt.active : opt.color
                          }`}
                        >
                          <span className="text-xs font-black block">{opt.label}</span>
                          <span className="text-[10px] block opacity-90 mt-0.5">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Point de choc principal & État circulation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">
                        Point d'impact principal
                      </label>
                      <select
                        value={pointChoc}
                        onChange={(e) => setPointChoc(e.target.value)}
                        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="Face avant">Face avant centrale</option>
                        <option value="3/4 Avant Droit">3/4 Avant Droit</option>
                        <option value="3/4 Avant Gauche">3/4 Avant Gauche</option>
                        <option value="Flanc Droit">Flanc / Portières Droites</option>
                        <option value="Flanc Gauche">Flanc / Portières Gauches</option>
                        <option value="Face arrière">Face arrière / Coffre</option>
                        <option value="Soubassement">Soubassement / Train roulant</option>
                        <option value="Chocs multiples">Chocs multiples en chaîne</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">
                        Aptitude à la circulation
                      </label>
                      <select
                        value={etatCirculation}
                        onChange={(e) => setEtatCirculation(e.target.value as any)}
                        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="ROULANT">Véhicule roulant par ses propres moyens</option>
                        <option value="NON_ROULANT">Non roulant (Dégâts mécaniques / Remorqué)</option>
                        <option value="VGE_DANGER">VGE - Danger immédiat (Organe de sécurité touché)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">
                      Observations sur l'imputabilité matérielle
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Indiquez la cohérence avec les traces de peinture du tiers, hauteur des boucliers, déformations élastiques ou plastiques..."
                      value={concordanceNotes}
                      onChange={(e) => setConcordanceNotes(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Colonne Droite : Dossier Photos & Constat */}
            <div className="space-y-6 lg:col-span-5">
              {/* Card 3 : Photos des dégâts */}
              <Card className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/70 py-3.5 px-5 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <Eye className="h-4 w-4" />
                    </div>
                    Dossier Photographique ({photos.length})
                  </CardTitle>
                  <span className="text-[11px] text-slate-400 font-medium">Zoom Lightbox</span>
                </CardHeader>
                <CardContent className="p-5">
                  {photos.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-xs text-slate-400">
                      Aucune photo téléversée pour ce dossier.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {photos.map((doc) => (
                        <div
                          key={doc.id}
                          onClick={() => setZoomPhotoUrl(doc.file_url)}
                          className="group relative aspect-4/3 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 cursor-pointer shadow-2xs hover:shadow-md transition-all"
                        >
                          <img
                            src={doc.file_url}
                            alt={doc.doc_type || 'Photo sinistre'}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-transparent to-transparent flex items-end justify-between p-2">
                            <span className="text-[10px] font-bold text-white truncate">
                              {doc.doc_type || 'Photo dégâts'}
                            </span>
                            <Maximize2 className="h-3 w-3 text-white/80 shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {otherDocs.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5">
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                        Pièces annexées ({otherDocs.length})
                      </p>
                      {otherDocs.map((doc) => (
                        <a
                          key={doc.id}
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <FileSpreadsheet className="h-4 w-4 text-blue-600 shrink-0" />
                            <span className="truncate">{doc.file_name || doc.doc_type}</span>
                          </span>
                          <span className="text-blue-700 text-[11px] shrink-0 font-black">Consulter</span>
                        </a>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card 4 : Déclaration Assuré & Localisation GPS */}
              <Card className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/70 py-3.5 px-5">
                  <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    Déclaration & Lieu du Sinistre
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-3">
                  <div className="text-xs space-y-1">
                    <p className="text-slate-500 font-medium">
                      Date : <strong className="text-slate-800">{formatDate(claim.incident_at)}</strong>
                    </p>
                    <p className="text-slate-500 font-medium">
                      Lieu : <strong className="text-slate-800">{claim.location || 'Non précisé'}</strong>
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 leading-relaxed italic">
                    « {claim.description || claim.title || 'Déclaration enregistrée auprès des services de Bethel Comprehensive Insurance.'} »
                  </div>

                  {claim.gps_lat != null && claim.gps_lng != null && (
                    <div className="pt-2">
                      <div className="rounded-xl overflow-hidden border border-slate-200">
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

              {/* Bouton Suivant Étape 2 */}
              <div className="pt-2">
                <Button
                  onClick={() => setCurrentStep(2)}
                  className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm flex items-center justify-center gap-2 rounded-xl shadow-md cursor-pointer"
                >
                  Continuer vers le Chiffrage Analytique (Étape 2) <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* ÉTAPE 2 : CHIFFRAGE ANALYTIQUE CIMA (TABLEAU DES LIGNES)         */}
        {/* ----------------------------------------------------------------- */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Barre d'outils et Gabarits rapides */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-blue-600" />
                  Devis Contradictoire Détaillé (Pièces, Tôlerie, Peinture & Ingrédients)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ventilation poste par poste avec calcul automatique de la vétusté sur pièces d'usure.
                </p>
              </div>

              {/* Gabarits Rapides */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-black uppercase text-slate-400">Gabarits rapides :</span>
                {Object.entries(TEMPLATES_CHIFFRAGE).map(([k, tpl]) => (
                  <Button
                    key={k}
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyTemplate(k)}
                    className="text-xs font-bold border-slate-200 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                  >
                    <Plus className="h-3 w-3 mr-1" /> {tpl.label.split('(')[0].trim()}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tableau Interactif des Postes de Chiffrage */}
            <Card className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3 w-32">Poste</th>
                      <th className="py-3 px-3 min-w-[200px]">Désignation de la pièce / Opération</th>
                      <th className="py-3 px-3 w-28">Réf OEM</th>
                      <th className="py-3 px-2 w-16 text-center">Qté</th>
                      <th className="py-3 px-3 w-28 text-right">Prix Unitaire</th>
                      <th className="py-3 px-2 w-20 text-center">M.O (h)</th>
                      <th className="py-3 px-2 w-20 text-center">Vétusté %</th>
                      <th className="py-3 px-3 w-32 text-right">Total Poste</th>
                      <th className="py-3 px-2 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lineItems.map((item, index) => {
                      const qte = item.quantite || 1
                      const brutPieces = (item.prixUnitaire || 0) * qte
                      const vetuste = brutPieces * ((item.vetusteTaux || 0) / 100)
                      const netPieces = Math.max(0, brutPieces - vetuste)
                      const mo = (item.tempsMO || 0) * (item.tauxHoraire || 0)
                      const totalLigne = netPieces + mo

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Catégorie */}
                          <td className="p-2.5">
                            <select
                              value={item.type}
                              onChange={(e) => handleUpdateLine(item.id, 'type', e.target.value)}
                              className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-black text-slate-800"
                            >
                              <option value="PIECE">Pièce Neuve</option>
                              <option value="TOLERIE">Tôlerie</option>
                              <option value="PEINTURE">Peinture</option>
                              <option value="MECANIQUE">Mécanique</option>
                              <option value="CONTROLE">Contrôle / Marbre</option>
                            </select>
                          </td>

                          {/* Désignation */}
                          <td className="p-2.5">
                            <Input
                              placeholder="Ex: Pare-chocs avant, Aile AVG..."
                              value={item.designation}
                              onChange={(e) => handleUpdateLine(item.id, 'designation', e.target.value)}
                              className="h-8 text-xs font-bold text-slate-900"
                            />
                          </td>

                          {/* Réf OEM */}
                          <td className="p-2.5">
                            <Input
                              placeholder="Réf OEM"
                              value={item.refOem}
                              onChange={(e) => handleUpdateLine(item.id, 'refOem', e.target.value)}
                              className="h-8 text-[11px] font-mono text-slate-600 uppercase"
                            />
                          </td>

                          {/* Quantité */}
                          <td className="p-2.5 text-center">
                            <Input
                              type="number"
                              min={1}
                              value={item.quantite}
                              onChange={(e) => handleUpdateLine(item.id, 'quantite', parseInt(e.target.value, 10) || 1)}
                              className="h-8 text-xs font-black text-center"
                            />
                          </td>

                          {/* Prix Unitaire */}
                          <td className="p-2.5">
                            <Input
                              type="number"
                              min={0}
                              placeholder="0"
                              value={item.prixUnitaire || ''}
                              onChange={(e) => handleUpdateLine(item.id, 'prixUnitaire', parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs font-bold text-right"
                            />
                          </td>

                          {/* Temps Main d'œuvre */}
                          <td className="p-2.5 text-center">
                            <Input
                              type="number"
                              step="0.1"
                              min={0}
                              placeholder="0.0"
                              value={item.tempsMO || ''}
                              onChange={(e) => handleUpdateLine(item.id, 'tempsMO', parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs font-bold text-center"
                            />
                          </td>

                          {/* Vétusté % */}
                          <td className="p-2.5 text-center">
                            <Input
                              type="number"
                              min={0}
                              max={80}
                              placeholder="0%"
                              value={item.vetusteTaux || ''}
                              onChange={(e) => handleUpdateLine(item.id, 'vetusteTaux', parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs font-bold text-center text-rose-600"
                            />
                          </td>

                          {/* Total Ligne */}
                          <td className="p-2.5 text-right font-black text-slate-900 whitespace-nowrap">
                            {formatFCFA(totalLigne)}
                          </td>

                          {/* Suppression */}
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(item.id)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                              title="Supprimer la ligne"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bouton d'ajout de ligne */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddLine('PIECE')}
                    className="text-xs font-extrabold bg-white border-slate-300 hover:bg-slate-50 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1 text-blue-600" /> Ajouter une pièce détachée
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddLine('TOLERIE')}
                    className="text-xs font-extrabold bg-white border-slate-300 hover:bg-slate-50 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1 text-amber-600" /> Ajouter opération tôlerie
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddLine('PEINTURE')}
                    className="text-xs font-extrabold bg-white border-slate-300 hover:bg-slate-50 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Ajouter peinture & apprêt
                  </Button>
                </div>

                <div className="text-xs text-slate-500 font-semibold">
                  Taux horaire de base : <strong className="text-slate-800">12 000 FCFA/h</strong>
                </div>
              </div>
            </Card>

            {/* Récapitulatif Financier Analytique */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Pièces Détachées Nettes
                </span>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  {formatFCFA(totals.piecesNettes)}
                </span>
                {totals.vetusteDeduite > 0 && (
                  <span className="text-[11px] text-rose-600 font-bold block mt-0.5">
                    (-{formatFCFA(totals.vetusteDeduite)} de vétusté)
                  </span>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Main d'Œuvre Totale (Tôlerie/Méca)
                </span>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  {formatFCFA(totals.totalMainOeuvre)}
                </span>
                <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                  Tôlerie + Mécanique agréée
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Peinture & Ingrédients
                </span>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  {formatFCFA(totals.totalPeinture)}
                </span>
                <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                  Produits & application
                </span>
              </div>

              <div className="rounded-2xl border-2 border-slate-900 bg-slate-900 text-white p-4 shadow-md">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block">
                  TOTAL ESTIMÉ DES RÉPARATIONS (TTC)
                </span>
                <span className="text-2xl font-black text-white mt-1 block tracking-tight">
                  {formatFCFA(totals.totalTtc)}
                </span>
                <span className="text-[11px] text-slate-300 font-medium block mt-0.5">
                  Conforme Barème CIMA
                </span>
              </div>
            </div>

            {/* Navigation Stepper */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="gap-1.5 font-bold cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" /> Retour Identification
              </Button>
              <Button
                onClick={() => setCurrentStep(3)}
                className="gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black cursor-pointer"
              >
                Passer à l'Analyse VEI & Conclusions (Étape 3) <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* ÉTAPE 3 : ANALYSE ÉCONOMIQUE, RATIO VEI & CONCLUSIONS            */}
        {/* ----------------------------------------------------------------- */}
        {currentStep === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Colonne Gauche : Ratio VEI et Valeur Vénale */}
            <div className="space-y-6 lg:col-span-7">
              {/* Card Valeur Vénale Avant Sinistre (VAVS) */}
              <Card className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/70 py-3.5 px-5">
                  <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Percent className="h-4 w-4 text-blue-600" />
                    Détermination de la Valeur Vénale Avant Sinistre (VAVS)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">
                        Valeur Vénale Estimée Avant Sinistre (FCFA) *
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="Ex: 3500000"
                          value={valeurVenale}
                          onChange={(e) => setValeurVenale(e.target.value)}
                          className="h-11 text-base font-black pl-3 pr-16"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                          FCFA
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Cote du véhicule sur le marché local de l'occasion au jour du sinistre.
                      </p>
                    </div>

                    <div>
                      <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">
                        Durée estimée d'immobilisation en atelier
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          min={1}
                          placeholder="5"
                          value={dureeImmobilisation}
                          onChange={(e) => setDureeImmobilisation(e.target.value)}
                          className="h-11 text-sm font-bold pl-3 pr-16"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          Jours
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Indicateur de Ratio VEI (CIMA 75%) */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-700">
                        Ratio Économique de Réparabilité CIMA
                      </span>
                      <span
                        className={`text-sm font-black px-2.5 py-1 rounded-lg ${
                          veiRatio >= 75
                            ? 'bg-rose-100 text-rose-800'
                            : veiRatio >= 50
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {veiRatio > 0 ? `${veiRatio} %` : 'À calculer'}
                      </span>
                    </div>

                    {/* Barre de progression du ratio */}
                    <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden relative">
                      <div
                        className={`h-full transition-all duration-500 ${
                          veiRatio >= 75
                            ? 'bg-rose-600'
                            : veiRatio >= 50
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(veiRatio, 100)}%` }}
                      />
                      {/* Ligne seuil 75% CIMA */}
                      <div className="absolute top-0 bottom-0 left-[75%] w-0.5 bg-rose-950 z-10" />
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                      <span>0% Économique</span>
                      <span className="text-amber-600">50% Vigilance</span>
                      <span className="text-rose-600">75% Seuil VEI CIMA (Perte Totale)</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Alerte VEI si le ratio dépasse 75% */}
                  {isVeiDetected && (
                    <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-900 space-y-2">
                      <div className="flex items-center gap-2 font-black text-rose-800">
                        <AlertTriangle className="h-4 w-4 text-rose-600" />
                        PROCÉDURE VEI DÉCLENCHÉE (Véhicule Économiquement Irréparable)
                      </div>
                      <p className="leading-relaxed">
                        Le montant des réparations ({formatFCFA(totals.totalTtc)}) excède 75% de la valeur vénale ({formatFCFA(numericValeurVenale)}). Conformément au Code CIMA, le sinistre bascule en <strong>Perte Totale</strong> avec indemnisation basée sur la valeur de sauvetage.
                      </p>
                      <div>
                        <label className="text-[11px] font-black text-rose-950 uppercase tracking-wider block mb-1">
                          Estimation de la Valeur d'Épave / Sauvetage (FCFA)
                        </label>
                        <Input
                          type="number"
                          placeholder="Ex: 400000"
                          value={valeurEpave}
                          onChange={(e) => setValeurEpave(e.target.value)}
                          className="bg-white border-rose-200 text-rose-950 font-bold"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card Décision de Réparabilité & Sécurité Routière */}
              <Card className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/70 py-3.5 px-5">
                  <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Décision Technique de l'Expert & Mesures de Sécurité
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  {/* Toggle Réparable */}
                  <div>
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-2">
                      Avis formel sur la réparabilité physique
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setReparable(true)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          reparable
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-xs font-black block">Véhicule Techniquement Réparable</span>
                        <span className="text-[10px] opacity-80 block mt-0.5">Remise en état sans altération structurelle</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setReparable(false)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          !reparable
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-xs font-black block">Perte Totale / Irréparable</span>
                        <span className="text-[10px] opacity-80 block mt-0.5">Destruction ou cession pour pièces</span>
                      </button>
                    </div>
                  </div>

                  {/* Toggle VGE */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <span className="text-xs font-black text-slate-900 block">
                        Procédure VGE (Véhicule Gravement Endommagé)
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium block">
                        Organes de sécurité défaillants nécessitant un retrait conservatoire de la carte grise.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isVge}
                      onChange={(e) => setIsVge(e.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Colonne Droite : Synthèse & Conclusions Techniques */}
            <div className="space-y-6 lg:col-span-5">
              <Card className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/70 py-3.5 px-5">
                  <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Conclusions & Observations Contradictoires
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div>
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">
                      Rapport technique motivé *
                    </label>
                    <textarea
                      rows={8}
                      placeholder="Détaillez les constatations mécaniques, réserves éventuelles lors du démontage, vérification de la géométrie, pièces de réemploi autorisées..."
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium leading-relaxed"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 space-y-1">
                    <p className="font-black flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 text-blue-700" /> Remarque Déontologique CIMA
                    </p>
                    <p className="text-[11px] text-blue-800 leading-relaxed">
                      L'expert mandaté opère en toute indépendance conformément à la législation CIMA. Ses conclusions techniques lient les parties pour l'estimation matérielle du préjudice.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Navigation Stepper */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="gap-1.5 font-bold cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" /> Retour Chiffrage
                </Button>
                <Button
                  onClick={() => setCurrentStep(4)}
                  className="gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black cursor-pointer"
                >
                  Valider et Signer le PV (Étape 4) <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* ÉTAPE 4 : PROCÈS-VERBAL OFFICIEL D'EXPERTISE CIMA & SIGNATURE    */}
        {/* ----------------------------------------------------------------- */}
        {currentStep === 4 && (
          <div className="space-y-6">
            {/* Document Officiel Imprimable (Procès-Verbal Formatisé CIMA) */}
            <div className="bg-white rounded-3xl border-2 border-slate-300 p-6 sm:p-10 shadow-lg space-y-8 print:border-none print:shadow-none print:p-0">
              {/* En-tête officiel de certificat */}
              <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
                <div className="flex items-center gap-4">
                  <img
                    src="/bethel-logo.png"
                    alt="Bethel Comprehensive Insurance"
                    className="h-16 w-auto object-contain"
                  />
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-slate-950 uppercase">
                      Bethel Comprehensive Insurance
                    </h2>
                    <p className="text-xs font-bold text-slate-600">
                      Direction Générale • Département Sinistres & Règlements Automobiles
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Organisation des Assurances Africaines • Code CIMA Livre II
                    </p>
                  </div>
                </div>

                <div className="text-center sm:text-right">
                  <div className="inline-block bg-slate-900 text-white px-3 py-1 text-xs font-black uppercase tracking-wider rounded-md">
                    PROCÈS-VERBAL D'EXPERTISE CONTRADICTOIRE
                  </div>
                  <p className="font-mono text-xs font-black text-slate-900 mt-2">
                    PV N° EXP-{claim.reference || 'SINISTRE'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    Date du rapport : {new Date().toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              {/* Grille Synthétique Officielle */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Véhicule & Assuré */}
                <div className="rounded-2xl border border-slate-200 p-4 space-y-2 bg-slate-50/50">
                  <h4 className="font-black text-slate-900 uppercase text-[11px] border-b border-slate-200 pb-1">
                    1. Renseignements Véhicule & Identification
                  </h4>
                  <div className="space-y-1 text-slate-700">
                    <p>
                      <strong>Immatriculation :</strong> {claim.vehicle?.immatriculation || 'Non renseigné'}
                    </p>
                    <p>
                      <strong>Marque & Modèle :</strong> {claim.vehicle?.marque_modele || 'Non renseigné'}
                    </p>
                    <p>
                      <strong>N° Châssis (VIN vérifié) :</strong> <span className="font-mono font-bold">{vin || 'Vérifié conforme'}</span>
                    </p>
                    <p>
                      <strong>Compteur relevé :</strong> {kilometrage ? `${kilometrage} km` : 'Relevé au constat'}
                    </p>
                    <p>
                      <strong>Énergie & Genre :</strong> {energie} • {genreVehicule}
                    </p>
                  </div>
                </div>

                {/* Données Sinistre & Imputabilité */}
                <div className="rounded-2xl border border-slate-200 p-4 space-y-2 bg-slate-50/50">
                  <h4 className="font-black text-slate-900 uppercase text-[11px] border-b border-slate-200 pb-1">
                    2. Circonstances & Concordance Matérielle
                  </h4>
                  <div className="space-y-1 text-slate-700">
                    <p>
                      <strong>Réf Sinistre :</strong> {claim.reference}
                    </p>
                    <p>
                      <strong>Date survenance :</strong> {formatDate(claim.incident_at)}
                    </p>
                    <p>
                      <strong>Lieu constaté :</strong> {claim.location || 'Localité déclarée'}
                    </p>
                    <p>
                      <strong>Point d'impact :</strong> {pointChoc}
                    </p>
                    <p>
                      <strong>Concordance :</strong>{' '}
                      <span className="font-black uppercase text-emerald-800">
                        {concordance}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Récapitulatif Exhaustif du Chiffrage */}
              <div className="space-y-3">
                <h4 className="font-black text-slate-900 uppercase text-xs border-b border-slate-200 pb-1 flex items-center justify-between">
                  <span>3. Décompte Contradictoire des Fournitures et Main d'Œuvre</span>
                  <span className="text-[11px] text-slate-500 font-semibold">{lineItems.length} postes retenus</span>
                </h4>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/70 font-black text-slate-800 text-[10px] uppercase">
                      <th className="py-2 px-2">Catégorie</th>
                      <th className="py-2 px-2">Désignation</th>
                      <th className="py-2 px-2">Réf OEM</th>
                      <th className="py-2 px-2 text-center">Qté</th>
                      <th className="py-2 px-2 text-right">Fourniture</th>
                      <th className="py-2 px-2 text-center">M.O</th>
                      <th className="py-2 px-2 text-center">Vétusté</th>
                      <th className="py-2 px-2 text-right">Sous-Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lineItems.map((item) => {
                      const qte = item.quantite || 1
                      const brut = (item.prixUnitaire || 0) * qte
                      const vet = brut * ((item.vetusteTaux || 0) / 100)
                      const net = Math.max(0, brut - vet)
                      const mo = (item.tempsMO || 0) * (item.tauxHoraire || 0)
                      return (
                        <tr key={item.id} className="text-slate-700">
                          <td className="py-1.5 px-2 font-bold text-[11px] text-slate-500">{item.type}</td>
                          <td className="py-1.5 px-2 font-bold text-slate-900">{item.designation || 'Poste de réparation'}</td>
                          <td className="py-1.5 px-2 font-mono text-[11px] text-slate-500">{item.refOem || '—'}</td>
                          <td className="py-1.5 px-2 text-center">{qte}</td>
                          <td className="py-1.5 px-2 text-right">{formatFCFA(brut)}</td>
                          <td className="py-1.5 px-2 text-center">{item.tempsMO ? `${item.tempsMO} h` : '—'}</td>
                          <td className="py-1.5 px-2 text-center text-rose-600">
                            {item.vetusteTaux > 0 ? `-${item.vetusteTaux}%` : '0%'}
                          </td>
                          <td className="py-1.5 px-2 text-right font-black text-slate-950">
                            {formatFCFA(net + mo)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 font-black text-xs text-slate-900 bg-slate-50">
                      <td colSpan={4} className="py-2.5 px-2 uppercase">
                        Total Général Réparations CIMA (Pièces Nettes + MO + Peinture) :
                      </td>
                      <td colSpan={4} className="py-2.5 px-2 text-right text-base font-black text-slate-950">
                        {formatFCFA(totals.totalTtc)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Cadre Économique & Arrêté Technique */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-500 block">
                    Valeur Vénale Avant Sinistre (VAVS)
                  </span>
                  <span className="text-sm font-black text-slate-900 block mt-0.5">
                    {formatFCFA(numericValeurVenale)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-500 block">
                    Ratio Économique VEI
                  </span>
                  <span className={`text-sm font-black block mt-0.5 ${veiRatio >= 75 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {veiRatio > 0 ? `${veiRatio}% (Seuil CIMA 75%)` : 'Non applicable'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-500 block">
                    Verdict Réparabilité
                  </span>
                  <span className="text-sm font-black text-slate-900 block mt-0.5">
                    {reparable ? 'Véhicule Réparable' : 'Perte Totale (Épave)'}
                  </span>
                </div>
              </div>

              {/* Conclusions Motivées */}
              {observations && (
                <div className="space-y-1 text-xs">
                  <h4 className="font-black text-slate-900 uppercase text-[11px]">
                    Observations & Instructions de Remise en État :
                  </h4>
                  <p className="text-slate-700 leading-relaxed bg-slate-50/60 p-3.5 rounded-xl border border-slate-200 italic font-medium">
                    « {observations} »
                  </p>
                </div>
              )}

              {/* Bloc Agrément de l'Expert & Signature Électronique */}
              <div className="border-t-2 border-slate-900 pt-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* Formulaire des accréditations */}
                <div className="space-y-3 text-xs">
                  <h4 className="font-black text-slate-900 uppercase text-[11px]">
                    Identité & Agrément de l'Expert Mandaté
                  </h4>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-0.5">
                      Nom et Prénom de l'Expert Assermenté *
                    </label>
                    <Input
                      placeholder="Ex: Ing. Caleb Fomo"
                      value={expertName}
                      onChange={(e) => setExpertName(e.target.value)}
                      className="h-9 font-bold"
                      disabled={isAlreadySubmitted && !isEditingReport}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-0.5">
                      Raison Sociale du Cabinet d'Expertise
                    </label>
                    <Input
                      placeholder="Ex: Bethel Expertises & Contrôles"
                      value={expertCabinet}
                      onChange={(e) => setExpertCabinet(e.target.value)}
                      className="h-9 font-bold"
                      disabled={isAlreadySubmitted && !isEditingReport}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-0.5">
                      Numéro d'Agrément CIMA / Ordre Professionnel
                    </label>
                    <Input
                      placeholder="Ex: EXP-CIMA-2026/048"
                      value={expertAgreation}
                      onChange={(e) => setExpertAgreation(e.target.value)}
                      className="h-9 font-mono font-bold"
                      disabled={isAlreadySubmitted && !isEditingReport}
                    />
                  </div>
                </div>

                {/* Signature Pad */}
                <div className="space-y-3">
                  <h4 className="font-black text-slate-900 uppercase text-[11px] flex items-center justify-between">
                    <span>Signature Numérique de l'Expert</span>
                    <span className="text-[10px] text-slate-500 font-normal">Articles 230-235 Code CIMA</span>
                  </h4>

                  <SignatureCanvas
                    value={signatureDataUrl}
                    onChange={(val) => setSignatureDataUrl(val)}
                    disabled={isAlreadySubmitted && !isEditingReport}
                  />

                  {/* Serment sur l'honneur */}
                  <label className="flex items-start gap-2 text-[11px] text-slate-700 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={swornDeclaration}
                      onChange={(e) => setSwornDeclaration(e.target.checked)}
                      disabled={isAlreadySubmitted && !isEditingReport}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5 cursor-pointer"
                    />
                    <span>
                      Je soussigné expert automobile agréé atteste sur l'honneur avoir procédé contradictoirement aux constatations matérielles et certifie sincère et exact le présent procès-verbal.
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Actions de Clôture & Transmission */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 print:hidden">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(3)}
                className="gap-1.5 font-bold cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" /> Modifier l'Analyse (Étape 3)
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="gap-2 font-bold border-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-slate-600" /> Imprimer / Exporter PDF
                </Button>

                {(!isAlreadySubmitted || isEditingReport) && (
                  <Button
                    onClick={handleFinalSubmit}
                    disabled={submitReportMutation.isPending}
                    className="h-12 px-6 text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg flex items-center gap-2 rounded-xl cursor-pointer"
                  >
                    {submitReportMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Transmission du PV en cours...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Signer et Transmettre le Rapport Officiel CIMA
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
