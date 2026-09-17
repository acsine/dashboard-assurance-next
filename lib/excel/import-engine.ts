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
      { key: 'full_name', label: 'Nom complet', required: true, aliases: ['nom', 'nom complet', 'name', 'full_name', 'prospect', 'prenom'], example: 'Jean Dupont' },
      { key: 'phone', label: 'Numéro de Téléphone', required: true, aliases: ['telephone', 'téléphone', 'phone', 'mobile', 'tel', 'contact'], example: '699112233' },
      { key: 'email', label: 'Adresse Email', required: false, aliases: ['email', 'e-mail', 'courriel', 'mail'], example: 'jean.dupont@example.com' },
      { key: 'address', label: 'Adresse / Quartier', required: false, aliases: ['adresse', 'address', 'quartier', 'ville'], example: 'Bonapriso, Douala' },
      { key: 'cni_number', label: 'Numéro CNI', required: false, aliases: ['cni', 'n° cni', 'cni_number', 'piece'], example: '123456789' },
      { key: 'profession', label: 'Profession', required: false, aliases: ['profession', 'metier', 'job'], example: 'Architecte' },
      { key: 'power_cv', label: 'Puissance (CV)', required: false, aliases: ['puissance', 'power_cv', 'cv', 'puissance_fiscale'], example: 7 },
      { key: 'fuel', label: 'Carburant (ESSENCE/DIESEL)', required: false, aliases: ['carburant', 'fuel', 'energie', 'énergie'], example: 'ESSENCE' },
    ],
  },
  clients: {
    entityType: 'clients',
    label: 'Clients',
    fields: [
      { key: 'full_name', label: 'Nom complet', required: true, aliases: ['nom', 'nom complet', 'name', 'full_name', 'client', 'prenom'], example: 'Marie Nguema' },
      { key: 'phone', label: 'Numéro de Téléphone', required: true, aliases: ['telephone', 'téléphone', 'phone', 'mobile', 'tel', 'contact'], example: '677889900' },
      { key: 'country_code', label: 'Code Pays (ex: 237)', required: false, aliases: ['code pays', 'country_code', 'pays'], example: '237' },
      { key: 'email', label: 'Adresse Email', required: false, aliases: ['email', 'e-mail', 'courriel', 'mail'], example: 'marie.nguema@example.com' },
      { key: 'address', label: 'Adresse / Quartier', required: false, aliases: ['adresse', 'address', 'quartier', 'residence'], example: 'Akwa' },
      { key: 'city', label: 'Ville', required: false, aliases: ['ville', 'city', 'commune', 'region'], example: 'Douala' },
      { key: 'cni_number', label: 'Numéro CNI', required: false, aliases: ['cni', 'n° cni', 'cni_number', 'piece_identite', 'nui'], example: '102938475' },
      { key: 'profession', label: 'Profession', required: false, aliases: ['profession', 'metier', 'job', 'activite'], example: 'Enseignante' },
      { key: 'date_naissance', label: 'Date de Naissance (AAAA-MM-JJ)', required: false, aliases: ['date de naissance', 'date_naissance', 'naissance', 'dob'], example: '1990-05-14' },
      { key: 'sexe', label: 'Sexe (MASCULIN/FEMININ)', required: false, aliases: ['sexe', 'genre', 'sex'], example: 'FEMININ' },
      { key: 'vehicle_marque', label: 'Marque Véhicule', required: false, aliases: ['marque', 'marque_vehicule', 'vehicle_marque'], example: 'TOYOTA' },
      { key: 'vehicle_modele', label: 'Modèle Véhicule', required: false, aliases: ['modele', 'modèle', 'modele_vehicule', 'vehicle_modele'], example: 'COROLLA' },
      { key: 'vehicle_immatriculation', label: 'Immatriculation Véhicule', required: false, aliases: ['immatriculation', 'immat', 'plaque', 'vehicle_immatriculation'], example: 'LT458AB' },
      { key: 'vehicle_chassis_num', label: 'Numéro de Châssis (VIN)', required: false, aliases: ['chassis', 'châssis', 'n° chassis', 'vin', 'chassis_num'], example: 'VF312345678901234' },
      { key: 'vehicle_energie', label: 'Carburant (ESSENCE/DIESEL)', required: false, aliases: ['carburant', 'energie', 'énergie', 'fuel'], example: 'ESSENCE' },
      { key: 'vehicle_puissance_cv', label: 'Puissance (CV)', required: false, aliases: ['puissance', 'power_cv', 'cv', 'puissance_fiscale'], example: 7 },
      { key: 'vehicle_nb_places', label: 'Nombre de Places', required: false, aliases: ['places', 'nb_places', 'nombre de places'], example: 5 },
      { key: 'vehicle_usage', label: 'Usage Véhicule', required: false, aliases: ['usage', 'usage_vehicule'], example: 'PERSO' },
      { key: 'vehicle_zone_circulation', label: 'Zone Circulation', required: false, aliases: ['zone', 'zone_circulation'], example: 'ZONE1' },
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
      { key: 'prime_nette', label: 'Prime Nette (FCFA)', required: false, aliases: ['prime nette', 'prime_nette', 'pnette'], example: 120000 },
      { key: 'prime_ttc', label: 'Prime TTC (FCFA)', required: false, aliases: ['prime ttc', 'prime_ttc', 'pttc', 'total'], example: 155000 },
    ],
  },
  sinistres: {
    entityType: 'sinistres',
    label: 'Sinistres',
    fields: [
      { key: 'vehicle_identifier', label: 'Véhicule (Immatriculation ou Châssis)', required: true, aliases: ['immatriculation', 'chassis', 'chassis_num', 'vehicule', 'police'], example: 'LT458AB' },
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

  let exampleRows: Record<string, any>[] = []

  if (entityType === 'clients') {
    exampleRows = [
      {
        'Nom complet': 'Marie Nguema',
        'Numéro de Téléphone': '677889900',
        'Code Pays (ex: 237)': '237',
        'Adresse Email': 'marie.nguema@example.com',
        'Adresse / Quartier': 'Akwa',
        'Ville': 'Douala',
        'Numéro CNI': '102938475',
        'Profession': 'Enseignante',
        'Date de Naissance (AAAA-MM-JJ)': '1990-05-14',
        'Sexe (MASCULIN/FEMININ)': 'FEMININ',
        'Marque Véhicule': 'TOYOTA',
        'Modèle Véhicule': 'COROLLA',
        'Immatriculation Véhicule': 'LT458AB',
        'Numéro de Châssis (VIN)': 'VF312345678901234',
        'Carburant (ESSENCE/DIESEL)': 'ESSENCE',
        'Puissance (CV)': 7,
        'Nombre de Places': 5,
        'Usage Véhicule': 'PERSO',
        'Zone Circulation': 'ZONE1',
      },
      {
        'Nom complet': 'Paul Alain Mbida',
        'Numéro de Téléphone': '699001122',
        'Code Pays (ex: 237)': '237',
        'Adresse Email': 'paul.mbida@corp.cm',
        'Adresse / Quartier': 'Bastos',
        'Ville': 'Yaoundé',
        'Numéro CNI': '203948576',
        'Profession': 'Ingénieur BTP',
        'Date de Naissance (AAAA-MM-JJ)': '1985-11-20',
        'Sexe (MASCULIN/FEMININ)': 'MASCULIN',
        'Marque Véhicule': 'HYUNDAI',
        'Modèle Véhicule': 'TUCSON',
        'Immatriculation Véhicule': 'CE892XY',
        'Numéro de Châssis (VIN)': 'KM8J33A4123456789',
        'Carburant (ESSENCE/DIESEL)': 'DIESEL',
        'Puissance (CV)': 9,
        'Nombre de Places': 5,
        'Usage Véhicule': 'PRO',
        'Zone Circulation': 'ZONE1',
      },
    ]
  } else if (entityType === 'prospects') {
    exampleRows = [
      {
        'Nom complet': 'Jean Dupont',
        'Numéro de Téléphone': '699112233',
        'Adresse Email': 'jean.dupont@example.com',
        'Adresse / Quartier': 'Bonapriso, Douala',
        'Numéro CNI': '123456789',
        'Profession': 'Architecte',
        'Puissance (CV)': 7,
        'Carburant (ESSENCE/DIESEL)': 'ESSENCE',
      },
      {
        'Nom complet': 'Sandrine Bella',
        'Numéro de Téléphone': '670445566',
        'Adresse Email': 'sandrine.bella@domain.cm',
        'Adresse / Quartier': 'Olembe, Yaoundé',
        'Numéro CNI': '987654321',
        'Profession': 'Médecin',
        'Puissance (CV)': 10,
        'Carburant (ESSENCE/DIESEL)': 'DIESEL',
      },
    ]
  } else {
    const singleRow: Record<string, any> = {}
    for (const field of schema.fields) {
      singleRow[field.label] = field.example
    }
    exampleRows = [singleRow]
  }

  const ws = XLSX.utils.json_to_sheet(exampleRows, { header: schema.fields.map((f) => f.label) })

  const colWidths = schema.fields.map((f) => {
    let maxLen = f.label.length
    for (const row of exampleRows) {
      const valStr = String(row[f.label] ?? '')
      if (valStr.length > maxLen) maxLen = valStr.length
    }
    return { wch: Math.max(maxLen + 4, 15) }
  })
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
          email: row.email ? String(row.email) : undefined,
          address: row.address ? String(row.address) : undefined,
          cni_number: row.cni_number ? String(row.cni_number) : undefined,
          profession: row.profession ? String(row.profession) : undefined,
          power_cv: row.power_cv ? Number(row.power_cv) : undefined,
          fuel: row.fuel ? String(row.fuel).toUpperCase() : undefined,
        })
      } else if (entityType === 'clients') {
        if (!row.full_name || !row.phone) {
          throw new Error(`Ligne ${index + 1}: Nom complet et Téléphone sont obligatoires`)
        }
        const hasVehicle =
          row.vehicle_marque ||
          row.vehicle_modele ||
          row.vehicle_immatriculation ||
          row.vehicle_chassis_num ||
          row.vehicle_energie ||
          row.vehicle_puissance_cv

        await clientsApi.create({
          full_name: String(row.full_name),
          phone: String(row.phone),
          country_code: row.country_code ? String(row.country_code) : '237',
          email: row.email ? String(row.email) : undefined,
          address: row.address ? String(row.address) : undefined,
          city: row.city ? String(row.city) : undefined,
          cni_number: row.cni_number ? String(row.cni_number) : undefined,
          profession: row.profession ? String(row.profession) : undefined,
          date_naissance: row.date_naissance ? String(row.date_naissance) : undefined,
          sexe: row.sexe
            ? (String(row.sexe).toUpperCase().trim() as 'MASCULIN' | 'FEMININ')
            : undefined,
          vehicle: hasVehicle
            ? {
                marque: row.vehicle_marque ? String(row.vehicle_marque) : 'INCONNUE',
                modele: row.vehicle_modele ? String(row.vehicle_modele) : undefined,
                chassis_num: row.vehicle_chassis_num
                  ? String(row.vehicle_chassis_num)
                  : `CHAS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                immatriculation: row.vehicle_immatriculation
                  ? String(row.vehicle_immatriculation)
                  : undefined,
                energie: row.vehicle_energie
                  ? String(row.vehicle_energie).toUpperCase()
                  : undefined,
                puissance_cv: row.vehicle_puissance_cv
                  ? Number(row.vehicle_puissance_cv)
                  : undefined,
                nb_places: row.vehicle_nb_places ? Number(row.vehicle_nb_places) : undefined,
                usage: row.vehicle_usage ? String(row.vehicle_usage).toUpperCase() : undefined,
                zone_circulation: row.vehicle_zone_circulation
                  ? String(row.vehicle_zone_circulation).toUpperCase()
                  : undefined,
              }
            : undefined,
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
