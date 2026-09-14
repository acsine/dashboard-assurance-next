import * as XLSX from 'xlsx'
import {
  prospectsApi,
  clientsApi,
  contractsApi,
  sinistresApi,
  walletApi,
} from '@/lib/api/mobi-assur'

export type EntityType = 'prospects' | 'clients' | 'contracts' | 'sinistres' | 'objectives'

export interface EntityFieldSpec {
  key: string
  label: string
  required: boolean
  aliases: string[]
  example: string | number
}

export interface EntitySchema {
  entityType: EntityType
  label: string
  fields: EntityFieldSpec[]
}

export const ENTITY_SCHEMAS: Record<EntityType, EntitySchema> = {
  prospects: {
    entityType: 'prospects',
    label: 'Prospects',
    fields: [
      { key: 'full_name', label: 'Nom complet', required: true, aliases: ['nom', 'nom complet', 'name', 'full_name', 'prospect'], example: 'Jean Dupont' },
      { key: 'phone', label: 'Numéro de Téléphone', required: true, aliases: ['telephone', 'téléphone', 'phone', 'mobile', 'tel'], example: '699112233' },
      { key: 'cni_number', label: 'Numéro CNI', required: false, aliases: ['cni', 'n° cni', 'cni_number'], example: '123456789' },
      { key: 'power_cv', label: 'Puissance (CV)', required: false, aliases: ['puissance', 'power_cv', 'cv'], example: 7 },
      { key: 'fuel', label: 'Carburant (ESSENCE/DIESEL)', required: false, aliases: ['carburant', 'fuel', 'energie'], example: 'ESSENCE' },
    ],
  },
  clients: {
    entityType: 'clients',
    label: 'Clients',
    fields: [
      { key: 'full_name', label: 'Nom complet', required: true, aliases: ['nom', 'nom complet', 'name', 'full_name', 'client'], example: 'Marie Nguema' },
      { key: 'phone', label: 'Numéro de Téléphone', required: true, aliases: ['telephone', 'téléphone', 'phone', 'mobile', 'tel'], example: '677889900' },
      { key: 'email', label: 'Adresse Email', required: false, aliases: ['email', 'e-mail', 'courriel'], example: 'marie@example.com' },
      { key: 'address', label: 'Adresse / Quarier', required: false, aliases: ['adresse', 'address', 'ville', 'quartier'], example: 'Akwa, Douala' },
      { key: 'cni_number', label: 'Numéro CNI', required: false, aliases: ['cni', 'n° cni', 'cni_number'], example: '987654321' },
      { key: 'profession', label: 'Profession', required: false, aliases: ['profession', 'metier', 'job'], example: 'Comptable' },
    ],
  },
  contracts: {
    entityType: 'contracts',
    label: 'Contrats',
    fields: [
      { key: 'client_identifier', label: 'Client (Téléphone ou CNI ou ID)', required: true, aliases: ['client', 'client_id', 'téléphone client', 'cni client', 'phone client'], example: '677889900' },
      { key: 'product_line', label: 'Branche (AUTO/SANTE/VOYAGE)', required: true, aliases: ['branche', 'product_line', 'produit', 'type'], example: 'AUTO' },
      { key: 'product_type', label: 'Code Produit (CAT1/CAT11...)', required: false, aliases: ['code produit', 'product_type', 'categorie'], example: 'CAT1' },
      { key: 'date_effet', label: 'Date d\'Effet (AAAA-MM-JJ)', required: false, aliases: ['date d\'effet', 'date_effet', 'date debut'], example: '2026-01-01' },
      { key: 'duree_jours', label: 'Durée (jours)', required: false, aliases: ['durée', 'duree', 'duree_jours', 'jours'], example: 365 },
    ],
  },
  sinistres: {
    entityType: 'sinistres',
    label: 'Sinistres',
    fields: [
      { key: 'vehicle_identifier', label: 'Véhicule (Immatriculation ou Châssis)', required: true, aliases: ['immatriculation', 'chassis', 'chassis_num', 'vehicule', 'police'], example: 'LT123AA' },
      { key: 'date_sinistre', label: 'Date du Sinistre (AAAA-MM-JJ)', required: true, aliases: ['date', 'date_sinistre', 'date incident'], example: '2026-02-15' },
      { key: 'description', label: 'Description des dégâts', required: true, aliases: ['description', 'dégats', 'degats', 'motif', 'nature'], example: 'Collision arrière pare-chocs endommagé' },
      { key: 'lieu', label: 'Lieu de l\'accident', required: false, aliases: ['lieu', 'location', 'ville'], example: 'Bonanjo, Douala' },
      { key: 'montant_estime', label: 'Montant Estimé (FCFA)', required: false, aliases: ['montant', 'montant_estime', 'estimation'], example: 250000 },
    ],
  },
  objectives: {
    entityType: 'objectives',
    label: 'Objectifs Commercial',
    fields: [
      { key: 'agent_identifier', label: 'Agent (Code Agent ou Email ou ID)', required: true, aliases: ['agent', 'agent_id', 'code agent', 'email agent', 'agent_email'], example: 'AGENT007' },
      { key: 'objective_prospects', label: 'Objectif Prospects (Nombre)', required: true, aliases: ['prospects', 'objective_prospects', 'cible prospects', 'nb prospects'], example: 20 },
      { key: 'objective_clients', label: 'Objectif Clients / Contrats (Nombre)', required: true, aliases: ['clients', 'objective_clients', 'cible clients', 'nb clients', 'contrats'], example: 10 },
    ],
  },
}

export interface HeaderMatchResult {
  isValid: boolean
  headersFound: string[]
  mappedFields: Record<string, string> // header -> fieldKey
  missingRequiredFields: EntityFieldSpec[]
  missingFieldLabels: string[]
}

export function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
}

export function validateHeaders(headers: string[], entityType: EntityType): HeaderMatchResult {
  const schema = ENTITY_SCHEMAS[entityType]
  const normalizedHeaders = headers.map((h) => ({ original: h, norm: normalizeHeader(h) }))

  const mappedFields: Record<string, string> = {}
  const foundKeys = new Set<string>()

  for (const field of schema.fields) {
    const aliasNorms = field.aliases.map(normalizeHeader)
    const match = normalizedHeaders.find((h) => aliasNorms.includes(h.norm))
    if (match) {
      mappedFields[match.original] = field.key
      foundKeys.add(field.key)
    }
  }

  const missingRequiredFields = schema.fields.filter(
    (f) => f.required && !foundKeys.has(f.key),
  )

  return {
    isValid: missingRequiredFields.length === 0,
    headersFound: headers,
    mappedFields,
    missingRequiredFields,
    missingFieldLabels: missingRequiredFields.map((f) => f.label),
  }
}

export interface ExcelParseOutput {
  filename: string
  headers: string[]
  rows: Record<string, any>[]
  validation: HeaderMatchResult
  mappedRows: Record<string, any>[]
}

export async function parseExcelFile(file: File, entityType: EntityType): Promise<ExcelParseOutput> {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('Le fichier Excel ne contient aucune feuille de calcul.')

  const worksheet = workbook.Sheets[sheetName]
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' })

  if (!jsonData || jsonData.length === 0) {
    throw new Error('Le fichier Excel est vide ou ne contient aucune donnée.')
  }

  const headers = Object.keys(jsonData[0])
  const validation = validateHeaders(headers, entityType)

  const mappedRows = jsonData.map((row) => {
    const mapped: Record<string, any> = {}
    for (const [origHeader, fieldKey] of Object.entries(validation.mappedFields)) {
      const val = row[origHeader]
      mapped[fieldKey] = typeof val === 'string' ? val.trim() : val
    }
    return mapped
  })

  return {
    filename: file.name,
    headers,
    rows: jsonData,
    validation,
    mappedRows,
  }
}

export function generateExcelTemplate(entityType: EntityType) {
  const schema = ENTITY_SCHEMAS[entityType]

  const headerRow: Record<string, any> = {}
  const exampleRow: Record<string, any> = {}

  for (const field of schema.fields) {
    headerRow[field.label] = field.label
    exampleRow[field.label] = field.example
  }

  const ws = XLSX.utils.json_to_sheet([exampleRow], { header: schema.fields.map((f) => f.label) })

  const colWidths = schema.fields.map((f) => ({ wch: Math.max(f.label.length + 4, 15) }))
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, schema.label)

  XLSX.writeFile(wb, `modele_import_${entityType}.xlsx`)
}

export async function executeBatchImport(
  entityType: EntityType,
  rows: Record<string, any>[],
): Promise<{ successCount: number; failCount: number; errors: string[] }> {
  let successCount = 0
  let failCount = 0
  const errors: string[] = []

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]
    try {
      if (entityType === 'prospects') {
        if (!row.full_name || !row.phone) {
          throw new Error(`Ligne ${index + 1}: Nom complet et Téléphone sont obligatoires`)
        }
        await prospectsApi.create({
          full_name: String(row.full_name),
          phone: String(row.phone),
          cni_number: row.cni_number ? String(row.cni_number) : undefined,
          power_cv: row.power_cv ? Number(row.power_cv) : undefined,
          fuel: row.fuel ? String(row.fuel) : undefined,
        })
      } else if (entityType === 'clients') {
        if (!row.full_name || !row.phone) {
          throw new Error(`Ligne ${index + 1}: Nom complet et Téléphone sont obligatoires`)
        }
        await clientsApi.create({
          full_name: String(row.full_name),
          phone: String(row.phone),
          country_code: '237',
          email: row.email ? String(row.email) : undefined,
          address: row.address ? String(row.address) : undefined,
          cni_number: row.cni_number ? String(row.cni_number) : undefined,
          profession: row.profession ? String(row.profession) : undefined,
        })
      } else if (entityType === 'contracts') {
        if (!row.client_identifier || !row.product_line) {
          throw new Error(`Ligne ${index + 1}: Client et Branche sont obligatoires`)
        }
        await contractsApi.create({
          client_id: String(row.client_identifier),
          product_line: String(row.product_line).toUpperCase() as any,
          product_type: (row.product_type ? String(row.product_type) : 'CAT1') as any,
          date_effet: row.date_effet ? new Date(row.date_effet).toISOString() : new Date().toISOString(),
          duree_jours: row.duree_jours ? Number(row.duree_jours) : 365,
        })
      } else if (entityType === 'sinistres') {
        if (!row.vehicle_identifier || !row.date_sinistre || !row.description) {
          throw new Error(`Ligne ${index + 1}: Véhicule, Date et Description sont obligatoires`)
        }
        await sinistresApi.create({
          vehicle_identifier: String(row.vehicle_identifier),
          date_sinistre: String(row.date_sinistre),
          description: String(row.description),
          lieu: row.lieu ? String(row.lieu) : undefined,
          montant_estime: row.montant_estime ? Number(row.montant_estime) : undefined,
        })
      } else if (entityType === 'objectives') {
        if (!row.agent_identifier || (row.objective_prospects == null && row.objective_clients == null)) {
          throw new Error(`Ligne ${index + 1}: Agent et Objectifs sont obligatoires`)
        }
        await walletApi.setAgentObjective(String(row.agent_identifier), {
          objective_prospects: Number(row.objective_prospects || 0),
          objective_clients: Number(row.objective_clients || 0),
        })
      }
      successCount++
    } catch (err: any) {
      failCount++
      errors.push(err.message || `Erreur sur la ligne ${index + 1}`)
    }
  }

  return { successCount, failCount, errors }
}
