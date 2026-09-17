'use client'

import React, { useState, useRef } from 'react'
import {
  FileSpreadsheet,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Download,
  X,
  Loader2,
  FileCheck,
  HelpCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  EntityType,
  ENTITY_SCHEMAS,
  parseExcelFile,
  generateExcelTemplate,
  executeBatchImport,
  ExcelParseOutput,
} from '@/lib/excel/import-engine'
import { excelImportApi } from '@/lib/api/mobi-assur'

export interface ExcelImportModalProps {
  entityType: EntityType
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function ExcelImportModal({
  entityType,
  isOpen,
  onClose,
  onSuccess,
}: ExcelImportModalProps) {
  const schema = ENTITY_SCHEMAS[entityType]
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<ExcelParseOutput | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  if (!isOpen) return null

  const handleReset = () => {
    setSelectedFile(null)
    setParseResult(null)
    setIsAnalyzing(false)
    setIsImporting(false)
    setIsDownloadingTemplate(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const processFile = async (file: File) => {
    const isExcel =
      file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')
    if (!isExcel) {
      toast.error('Veuillez fournir un fichier au format Excel (.xlsx, .xls) ou CSV (.csv).')
      return
    }

    setSelectedFile(file)
    setIsAnalyzing(true)
    try {
      const res = await parseExcelFile(file, entityType)
      setParseResult(res)
      if (!res.validation.isValid) {
        toast.warning(`Champs obligatoires manquants dans ${file.name}`)
      } else {
        toast.success(`Fichier ${file.name} analysé avec succès (${res.mappedRows.length} lignes)`)
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'analyse du fichier Excel.")
      setParseResult(null)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const handleStartImport = async () => {
    if (!parseResult || !parseResult.validation.isValid || !selectedFile) return
    setIsImporting(true)
    try {
      // 1. Try sending directly to backend Python Excel import endpoint first
      try {
        await excelImportApi.uploadFile(entityType, selectedFile)
        toast.success(`Importation réussie de ${parseResult.mappedRows.length} ${schema.label.toLowerCase()}`)
        onSuccess()
        onClose()
        handleReset()
        return
      } catch (backendErr: any) {
        // Handle backend structured 422 error
        if (backendErr.status === 422 && backendErr.detail) {
          try {
            const detailObj = typeof backendErr.detail === 'string' ? JSON.parse(backendErr.detail) : backendErr.detail
            if (detailObj.missing_fields) {
              toast.error(`Backend: Champs manquants - ${detailObj.missing_fields.join(', ')}`)
              return
            }
          } catch {}
        }
        // Fallback to client batch processing if backend endpoint not yet deployed
        console.warn('Backend endpoint unavailable, executing client batch fallback:', backendErr)
      }

      // 2. Client-side fallback batch processing
      const res = await executeBatchImport(entityType, parseResult.mappedRows)
      if (res.successCount > 0) {
        toast.success(`Importation terminée : ${res.successCount} élément(s) ajouté(s) avec succès !`)
        if (res.failCount > 0) {
          toast.warning(`${res.failCount} ligne(s) non importée(s) en raison d'erreurs.`)
        }
        onSuccess()
        onClose()
        handleReset()
      } else {
        toast.error(`Aucun élément importé. ${res.errors[0] || ''}`)
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'exécution de l'importation.")
    } finally {
      setIsImporting(false)
    }
  }

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true)
    try {
      await excelImportApi.downloadTemplate(entityType)
      toast.success(`Modèle officiel ${schema.label}.xlsx téléchargé depuis le backend`)
    } catch (err: any) {
      console.warn('Backend template endpoint unavailable, fallback to client generator:', err)
      toast.info('Génération locale du modèle Excel exemple (mode secours)')
      generateExcelTemplate(entityType)
    } finally {
      setIsDownloadingTemplate(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 px-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Importation Excel — {schema.label}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Téléversez un fichier Excel (.xlsx, .xls) ou CSV pour ajouter des {schema.label.toLowerCase()}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose()
              handleReset()
            }}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto scrollbar-hide flex-1">
          {/* Top Download Model Template Helper */}
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <FileCheck className="h-4 w-4" />
              </div>
              <div>
                <span className="font-extrabold text-emerald-950 block">Besoin d'un modèle conforme ?</span>
                <span className="text-emerald-800 text-[11px]">
                  Téléchargez le modèle officiel récupéré directement du backend.
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDownloadingTemplate}
              onClick={handleDownloadTemplate}
              className="bg-white border-emerald-300 hover:bg-emerald-100 text-emerald-900 font-bold text-xs shrink-0 cursor-pointer"
            >
              {isDownloadingTemplate ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin text-emerald-700" />
              ) : (
                <Download className="h-3.5 w-3.5 mr-1.5 text-emerald-700" />
              )}
              Modèle {schema.label}.xlsx
            </Button>
          </div>

          {/* File Drop Area */}
          {!selectedFile ? (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                isDragOver
                  ? 'border-emerald-500 bg-emerald-50/40 shadow-inner'
                  : 'border-slate-200 hover:border-emerald-400 hover:bg-slate-50/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-800">
                  Glissez-déposez votre fichier Excel ici
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  ou cliquez pour parcourir vos fichiers (.xlsx, .xls, .csv)
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected File Card */}
              <div className="flex items-center justify-between p-3.5 px-4 rounded-2xl border border-slate-200 bg-slate-50/80">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-xs text-slate-900 block truncate max-w-[280px]">
                      {selectedFile.name}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Choisir un autre
                </Button>
              </div>

              {/* Analyzing Spinner */}
              {isAnalyzing && (
                <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  <span>Analyse et vérification des en-têtes du fichier Excel...</span>
                </div>
              )}

              {/* ERROR STATE: Missing Mandatory Fields */}
              {parseResult && !parseResult.validation.isValid && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-extrabold text-rose-950 uppercase tracking-wider">
                        Champs obligatoires manquants dans le fichier Excel
                      </h4>
                      <p className="text-xs text-rose-900 font-medium leading-relaxed">
                        Le fichier <strong>{selectedFile.name}</strong> ne contient pas toutes les informations nécessaires requises pour l'importation de {schema.label.toLowerCase()}.
                      </p>
                    </div>
                  </div>

                  {/* List of missing fields */}
                  <div className="p-3 bg-white/90 rounded-xl border border-rose-200 text-xs space-y-1.5">
                    <span className="font-bold text-rose-900 uppercase text-[10px] tracking-wide block">
                      Colonnes requises introuvables :
                    </span>
                    <ul className="list-disc list-inside space-y-1 font-semibold text-rose-950">
                      {parseResult.validation.missingRequiredFields.map((f) => (
                        <li key={f.key}>
                          <span className="font-bold">{f.label}</span> ({f.key})
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Complete expected columns instructions */}
                  <div className="p-3 bg-rose-100/50 rounded-xl border border-rose-200 text-[11.5px] text-rose-950 font-medium space-y-2">
                    <p>
                      💡 <strong>Veuillez fournir un autre fichier Excel</strong> contenant au minimum la liste des colonnes obligatoires suivantes :
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {schema.fields.map((f) => (
                        <span
                          key={f.key}
                          className={`px-2 py-0.5 rounded-md font-bold text-[10.5px] ${
                            f.required
                              ? 'bg-rose-600 text-white shadow-2xs'
                              : 'bg-rose-200/80 text-rose-900'
                          }`}
                        >
                          {f.label} {f.required && '*'}
                        </span>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-rose-200/80 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-rose-900">
                        Téléchargez notre modèle officiel pré-rempli :
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => generateExcelTemplate(entityType)}
                        className="bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs"
                      >
                        <Download className="h-3.5 w-3.5 mr-1" /> Télécharger Modèle .xlsx
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* SUCCESS STATE: Preview Parsed Rows */}
              {parseResult && parseResult.validation.isValid && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 px-4 rounded-xl text-xs text-emerald-900 font-semibold">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Toutes les colonnes obligatoires ont été détectées avec succès !</span>
                    </div>
                    <span className="font-extrabold bg-emerald-200/70 px-2.5 py-0.5 rounded-full text-emerald-950 text-[11px]">
                      {parseResult.mappedRows.length} lignes valides
                    </span>
                  </div>

                  {/* Table Preview */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] sticky top-0">
                        <tr>
                          <th className="p-2.5 px-3">#</th>
                          {schema.fields.map((f) => (
                            <th key={f.key} className="p-2.5 px-3">
                              {f.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {parseResult.mappedRows.slice(0, 5).map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2.5 px-3 text-slate-400 font-bold">{i + 1}</td>
                            {schema.fields.map((f) => (
                              <td key={f.key} className="p-2.5 px-3 text-slate-800 font-medium">
                                {r[f.key] != null ? String(r[f.key]) : '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parseResult.mappedRows.length > 5 && (
                      <div className="p-2 text-center text-[11px] text-slate-400 font-semibold bg-slate-50 border-t border-slate-100">
                        + {parseResult.mappedRows.length - 5} autres lignes
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onClose()
              handleReset()
            }}
            className="text-xs text-slate-600 font-bold"
          >
            Annuler
          </Button>

          <Button
            type="button"
            onClick={handleStartImport}
            disabled={!parseResult || !parseResult.validation.isValid || isImporting}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl cursor-pointer shadow-xs flex items-center gap-2"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Importation en cours...</span>
              </>
            ) : (
              <>
                <span>Lancer l'Importation ({parseResult?.mappedRows.length || 0})</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
