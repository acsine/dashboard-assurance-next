'use client'

import React, { useState } from 'react'
import {
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Building2,
  CheckCircle2,
  AlertCircle,
  Tag,
  ShieldAlert,
} from 'lucide-react'
import type { QuoteBreakdown } from '@/lib/api/mobi-assur'

export interface InsurerComparisonItem {
  insurer_id: string
  insurer_code?: string
  insurer_name?: string
  total: number
  breakdown?: QuoteBreakdown
}

export interface QuoteDetailsAndGuaranteesProps {
  breakdown?: QuoteBreakdown | Record<string, unknown> | null
  total?: number | null
  comparison?: InsurerComparisonItem[] | null
  selectedInsurerId?: string
  onSelectInsurer?: (insurerId: string) => void
  showCompanyComparison?: boolean
  className?: string
}

export function formatFcfa(value?: number | null): string {
  if (value == null || isNaN(Number(value))) return '0 FCFA'
  return `${Math.round(Number(value)).toLocaleString('fr-FR')} FCFA`
}

export default function QuoteDetailsAndGuarantees({
  breakdown,
  total,
  comparison,
  selectedInsurerId,
  onSelectInsurer,
  showCompanyComparison = true,
  className = '',
}: QuoteDetailsAndGuaranteesProps) {
  const [isRcTutorialOpen, setIsRcTutorialOpen] = useState(false)
  const [isComparisonOpen, setIsComparisonOpen] = useState(false)

  if (!breakdown && total == null) return null

  const b = (breakdown || {}) as Record<string, unknown>
  const num = (key: string) => {
    const v = b[key]
    return typeof v === 'number' ? v : null
  }

  const rc = num('rc_net') ?? num('rc') ?? num('rc_duree')
  const dr = num('dr')
  const ipt = num('ipt')
  const acc = num('acc')
  const fc = num('fc')
  const tva = num('tva')
  const cr = num('cr')
  const vignette = num('vignette')
  const bdTotal = num('total')
  const displayTotal = total ?? bdTotal ?? 0

  const hasComparison = Array.isArray(comparison) && comparison.length > 0

  return (
    <div className={`space-y-4 ${className}`}>
      {/* CARD BREAKDOWN ESTIMATION */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/70 via-white to-slate-50 p-4 sm:p-5 shadow-sm text-slate-800 space-y-4">
        {/* Header Title */}
        <div className="flex items-center justify-between border-b border-blue-100/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                Décomposition du Devis Estimé
              </h4>
              <p className="text-[11px] font-medium text-slate-500">
                Inclus taxes & vignette légale d'assurance
              </p>
            </div>
          </div>
          {typeof b.insurer_name === 'string' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
              <Building2 className="h-3 w-3 text-blue-600" />
              {b.insurer_name}
            </span>
          )}
        </div>

        {/* Guarantees List Summary Pill Badges */}
        <div className="bg-white/80 rounded-xl p-3 border border-slate-200/60 text-[11px] space-y-2">
          <span className="font-bold text-slate-700 block uppercase tracking-wide text-[10px]">
            Cette estimation comprend :
          </span>
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/70">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
              la Responsabilité Civile (RC) — <span className="text-[10px] text-emerald-700 uppercase">Obligatoire</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 font-bold border border-blue-200/70">
              <CheckCircle2 className="h-3 w-3 text-blue-600 shrink-0" />
              la Défense-Recours (DR) — <span className="text-[10px] text-blue-700">Recommandée</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 font-bold border border-indigo-200/70">
              <CheckCircle2 className="h-3 w-3 text-indigo-600 shrink-0" />
              l'Individuelle Personnes Transportées (IPT) — <span className="text-[10px] text-indigo-700">Recommandée</span>
            </span>
            {vignette != null && vignette > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 font-bold border border-amber-200/70">
                <Tag className="h-3 w-3 text-amber-600 shrink-0" />
                Vignette automobile — <span className="text-[10px] text-amber-800 uppercase">Taxe légale</span>
              </span>
            )}
          </div>
        </div>

        {/* Detailed Financial Lines */}
        <div className="space-y-1.5 text-xs">
          {rc != null && (
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Prime RC nette (Responsabilité Civile)</span>
              <span className="font-bold text-slate-900">{formatFcfa(rc)}</span>
            </div>
          )}
          {dr != null && dr > 0 && (
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Défense & Recours (DR)</span>
              <span className="font-bold text-slate-900">{formatFcfa(dr)}</span>
            </div>
          )}
          {ipt != null && ipt > 0 && (
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Individuelle Personnes Transportées (IPT)</span>
              <span className="font-bold text-slate-900">{formatFcfa(ipt)}</span>
            </div>
          )}
          {acc != null && acc > 0 && (
            <div className="flex justify-between items-center py-1 border-b border-slate-100 text-slate-600">
              <span>Accessoires & Frais de Dossier</span>
              <span className="font-semibold">{formatFcfa(acc)}</span>
            </div>
          )}
          {fc != null && fc > 0 && (
            <div className="flex justify-between items-center py-1 border-b border-slate-100 text-slate-600">
              <span>Fonds de Garantie (FGA / FC / ASAC)</span>
              <span className="font-semibold">{formatFcfa(fc)}</span>
            </div>
          )}
          {cr != null && cr > 0 && (
            <div className="flex justify-between items-center py-1 border-b border-slate-100 text-slate-600">
              <span>Carte Rose CIMA</span>
              <span className="font-semibold">{formatFcfa(cr)}</span>
            </div>
          )}
          
          {/* VIGNETTE AUTOMOBILE HIGHLIGHT LINE */}
          {vignette != null && vignette > 0 ? (
            <div className="flex justify-between items-center py-1.5 px-2.5 rounded-xl bg-amber-500/10 border border-amber-200 font-bold text-amber-950">
              <div className="flex items-center gap-1.5 text-xs">
                <Tag className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>Vignette Automobile (Taxe fiscale)</span>
              </div>
              <span className="text-sm font-extrabold text-amber-900">{formatFcfa(vignette)}</span>
            </div>
          ) : (
            <div className="flex justify-between items-center py-1 text-slate-400 text-[11px] italic">
              <span>Vignette automobile</span>
              <span>Incluse dans la tarification globale</span>
            </div>
          )}

          {tva != null && tva > 0 && (
            <div className="flex justify-between items-center py-1 border-b border-slate-100 text-slate-500 text-[11px]">
              <span>TVA (19.25%)</span>
              <span className="font-semibold">{formatFcfa(tva)}</span>
            </div>
          )}
        </div>

        {/* Total Display */}
        <div className="pt-2 border-t border-blue-200/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-widest block">
              Montant Total TTC
            </span>
            <span className="text-xs text-slate-500 font-medium">Prix certifié conforme Code CIMA</span>
          </div>
          <div className="text-right">
            <span className="text-xl sm:text-2xl font-black text-blue-900 tracking-tight block">
              {formatFcfa(displayTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION TUTORIEL & GUIDE EXPLICATIF DE LA GARANTIE RC */}
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => setIsRcTutorialOpen(!isRcTutorialOpen)}
          className="w-full p-3.5 px-4 flex items-center justify-between text-left hover:bg-amber-100/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h5 className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                🛡 Bien comprendre votre garantie RC
              </h5>
              <p className="text-[11px] font-medium text-amber-800/90">
                Qu'est-ce que l'assurance au tiers ? Ce qui est couvert & non couvert
              </p>
            </div>
          </div>
          <div className="text-amber-800 p-1 rounded-lg bg-amber-200/50">
            {isRcTutorialOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {isRcTutorialOpen && (
          <div className="p-4 pt-2 border-t border-amber-200/60 bg-white/90 text-slate-700 text-xs space-y-3.5 leading-relaxed">
            {/* Definition Box */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-amber-950 font-medium text-[11.5px]">
              « <strong>RC</strong> » veut dire <strong>Responsabilité Civile</strong> — on dit aussi « <em>assurance au tiers</em> ». C'est la garantie qui répond à la question : <strong>si je cause un accident, qui paie les victimes ?</strong>
            </div>

            {/* Grid Paie vs Ne Paie pas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Ce que la RC paie */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-1.5">
                <h6 className="text-[11px] font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Ce que la RC paie — quand vous êtes responsable :
                </h6>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-emerald-950 font-medium pl-1">
                  <li><strong>Les blessures des victimes :</strong> soins, hospitalisation, incapacité, décès ;</li>
                  <li><strong>Les dégâts matériels :</strong> leur véhicule, leur moto, leur mur, leur marchandise ;</li>
                  <li>Dans les limites et selon les barèmes du <strong>Code CIMA</strong>.</li>
                </ul>
              </div>

              {/* Ce que la RC ne paie pas */}
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 space-y-1.5">
                <h6 className="text-[11px] font-extrabold text-rose-900 uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                  Ce que la RC ne paie pas :
                </h6>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-950 font-medium pl-1">
                  <li>La réparation de votre propre véhicule ;</li>
                  <li>Vos propres blessures lorsque vous êtes le conducteur responsable ;</li>
                  <li>Le vol ou l'incendie de votre véhicule.</li>
                </ul>
                <p className="text-[10.5px] italic text-rose-800 pt-1">
                  Ces risques se couvrent avec des garanties supplémentaires — nous vous les chiffrons sur demande.
                </p>
              </div>
            </div>

            {/* Qu'est ce qu'un tiers ? */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-[11px] text-blue-950 font-medium">
              <strong className="text-blue-900 font-bold block mb-0.5">Un « tiers », c'est qui ?</strong>
              Toute personne autre que vous : le piéton, le motard, l'autre conducteur et ses passagers — et aussi les passagers de votre propre véhicule.
            </div>
          </div>
        )}
      </div>

      {/* SECTION VOIR LES AUTRES COMPAGNIES COMPARÉES */}
      {showCompanyComparison && hasComparison && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setIsComparisonOpen(!isComparisonOpen)}
            className="w-full p-3.5 px-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <h5 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  Voir les autres compagnies comparées
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                    {comparison.length} offres disponibles
                  </span>
                </h5>
                <p className="text-[11px] font-medium text-slate-500">
                  Comparez les primes et tarifs de nos partenaires agréés Code CIMA
                </p>
              </div>
            </div>
            <div className="text-slate-500 p-1 rounded-lg bg-slate-100">
              {isComparisonOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </button>

          {isComparisonOpen && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {comparison.map((item) => {
                  const isSelected = selectedInsurerId === item.insurer_id || item.insurer_id === b.insurer_id
                  const itemVignette = item.breakdown?.vignette
                  return (
                    <div
                      key={item.insurer_id}
                      onClick={() => onSelectInsurer?.(item.insurer_id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/70 shadow-2xs ring-1 ring-blue-400'
                          : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-extrabold text-xs text-slate-900 block">
                            {item.insurer_name || item.insurer_code || item.insurer_id}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Partenaire Agréé CIMA
                          </span>
                        </div>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-600 text-white uppercase tracking-wider">
                            Sélectionné
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-[11px]">
                        {item.breakdown?.rc_net != null && (
                          <div className="flex justify-between text-slate-600">
                            <span>RC Nette :</span>
                            <span className="font-semibold">{formatFcfa(item.breakdown.rc_net)}</span>
                          </div>
                        )}
                        {itemVignette != null && itemVignette > 0 && (
                          <div className="flex justify-between text-amber-900 font-medium">
                            <span>Vignette :</span>
                            <span className="font-bold">{formatFcfa(itemVignette)}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Tarif Total TTC</span>
                        <span className="text-sm font-extrabold text-slate-900">
                          {formatFcfa(item.total)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
