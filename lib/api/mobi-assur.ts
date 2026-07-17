import type { Role } from '@/lib/auth/roles'
import { validateUploadFile } from '@/lib/files/validation'

/**
 * MOBI-ASSUR API Client
 * Client centralisé vers le BFF Next.js. Les JWT restent exclusivement en cookie HttpOnly.
 */

const BFF_BASE = '/api/backend'

export function proxiedAssetUrl(value: string): string {
  if (value.startsWith('http://') || value.startsWith('https://')) {
    // URLs signées externes (Supabase / CDN) : lecture directe
    try {
      const host = new URL(value).hostname
      if (
        host.includes('supabase') ||
        host.includes('imagekit') ||
        host.includes('ik.imagekit')
      ) {
        return value
      }
    } catch {
      return value
    }
    const url = new URL(value)
    return `${BFF_BASE}${url.pathname}${url.search}`
  }
  return `${BFF_BASE}${value.startsWith('/') ? value : `/${value}`}`
}

export class MobiAssurApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string
  ) {
    super(message)
    this.name = 'MobiAssurApiError'
  }
}

async function mobiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const res = await fetch(`${BFF_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
    cache: 'no-store',
  })

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      window.location.href = '/fr/login'
    }
    throw new MobiAssurApiError('Session expirée', 401)
  }

  if (!res.ok) {
    let detail = ''
    try {
      const err = await res.json()
      detail = err.detail || JSON.stringify(err)
    } catch {}
    throw new MobiAssurApiError(detail || res.statusText, res.status, detail)
  }

  const text = await res.text()
  if (!text) return {} as T
  const json = JSON.parse(text)
  
  if (json && typeof json === 'object' && 'status' in json && 'data' in json) {
    if (json.data && typeof json.data === 'object' && 'items' in json.data && Array.isArray(json.data.items)) {
      return json.data.items as T
    }
    return json.data as T
  }
  
  return json as T
}

export async function downloadFileWithAuth(path: string, filename: string): Promise<void> {
  const res = await fetch(`${BFF_BASE}${path}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Erreur lors du téléchargement du document')
  
  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

export async function previewFileWithAuth(path: string): Promise<string> {
  const res = await fetch(`${BFF_BASE}${path}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Erreur lors de l\'aperçu du document')
  const blob = await res.blob()
  return window.URL.createObjectURL(blob)
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  login: string
  password: string
}

export interface AuthResponse {
  status?: number
  code?: string
  error?: boolean
  message?: string
  access_token?: string
  refresh_token?: string
  token_type?: string
  user?: UserProfile
  data?: {
    access_token: string
    refresh_token: string
    token_type: string
    role: string
    user_id: string
    agency_id: string
    full_name: string
  }
}


export interface UserProfile {
  id: string
  email?: string
  phone?: string
  full_name?: string
  role: Role
  agency_id?: string
  is_active: boolean
}

export const authApi = {
  login: async (data: LoginRequest) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new MobiAssurApiError(payload.detail || 'Connexion refusée', response.status)
    return payload as AuthResponse
  },
  logout: () => fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }),
  session: async () => {
    const response = await fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' })
    if (!response.ok) throw new MobiAssurApiError('Session absente', response.status)
    return response.json() as Promise<{ user: UserProfile }>
  },
}

// ─── Users ───────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email?: string
  phone?: string
  country_code?: string
  full_name?: string
  role: string
  is_active: boolean
  agency_id?: string
  created_at?: string
}

export interface CreateUserRequest {
  full_name: string
  email: string
  phone: string
  country_code: string
  role: Role
  agent_code?: string
  password?: string
}

export interface UpdateUserRequest {
  full_name?: string
  email?: string
  phone?: string
  country_code?: string
  role?: string
  is_active?: boolean
}

export const usersApi = {
  list: (params?: { role?: string; search?: string }) => {
    const qs = new URLSearchParams()
    if (params?.role) qs.set('role', params.role)
    if (params?.search) qs.set('search', params.search)
    return mobiRequest<User[]>(`/users?${qs}`)
  },
  get: (id: string) => mobiRequest<User>(`/users/${id}`),
  create: (data: CreateUserRequest) =>
    mobiRequest<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateUserRequest) =>
    mobiRequest<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    mobiRequest<unknown>(`/users/${id}`, { method: 'DELETE' }),
  regeneratePassword: (id: string) =>
    mobiRequest<{ temporary_password: string }>(`/users/${id}/regenerate-password`, { method: 'POST' }),
}

export interface SupportTicket {
  id: string
  agent_id?: string
  agent_email?: string
  subject: string
  description?: string
  channel: string
  status: string
  created_at: string
}

export interface SupportContact {
  id: string
  agency_id?: string
  label: string
  description?: string | null
  phone: string
  is_active: boolean
  sort_order?: number
  created_at?: string
  updated_at?: string
}

export interface ChatMessage {
  id: string
  ticket_id?: string
  sender_id: string
  sender_name: string
  content?: string
  voice_url?: string
  voice_playback_url?: string
  is_notification: boolean
  created_at: string
  read_at?: string | null
}

export const supportApi = {
  listTickets: () => mobiRequest<SupportTicket[]>('/support/tickets'),
  getMessages: (ticketId: string) => mobiRequest<ChatMessage[]>(`/support/tickets/${ticketId}/messages`),
  sendMessage: (ticketId: string, content: string) =>
    mobiRequest<ChatMessage>(`/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  markMessagesRead: (ticketId: string) =>
    mobiRequest<{ message_ids: string[]; read_at: string }>(
      `/support/tickets/${ticketId}/messages/read`,
      { method: 'POST' },
    ),
  createTicket: (data: {
    subject: string
    description?: string
    channel?: 'LIVE_CHAT' | 'APPEL' | 'VOCAL'
  }) =>
    mobiRequest<SupportTicket>('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  submitVoiceReport: (data: any) =>
    mobiRequest<unknown>('/support/voice-reports', { method: 'POST', body: JSON.stringify(data) }),

  listActiveContacts: () => mobiRequest<SupportContact[]>('/support/contacts'),
  listAdminContacts: () => mobiRequest<SupportContact[]>('/admin/support-contacts'),
  createContact: (data: {
    label: string
    phone: string
    description?: string
    is_active?: boolean
    sort_order?: number
  }) =>
    mobiRequest<SupportContact>('/admin/support-contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateContact: (
    id: string,
    data: Partial<{
      label: string
      phone: string
      description: string | null
      is_active: boolean
      sort_order: number
    }>,
  ) =>
    mobiRequest<SupportContact>(`/admin/support-contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteContact: (id: string) =>
    mobiRequest<unknown>(`/admin/support-contacts/${id}`, { method: 'DELETE' }),
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export interface Client {
  id: string
  full_name: string
  phone: string
  country_code?: string
  email?: string
  address?: string
  city?: string
  profession?: string
  att_number?: string
  att_num?: string
  cni_number?: string
  date_naissance?: string
  sexe?: string
  cni_photo_url?: string
  permis_photo_url?: string
  created_at?: string
}

export interface Vehicle {
  id: string
  marque: string
  modele?: string
  immatriculation?: string
  chassis_num: string
  puissance_fiscale?: number
  puissance_cv?: number
  energie?: string
  nb_places?: number
  date_mise_circulation?: string
  usage?: string
  genre?: string
  zone_circulation?: string
}

export interface CreateClientRequest {
  full_name: string
  country_code: string
  phone: string
  email?: string
  address?: string
  city?: string
  profession?: string
  cni_number?: string
  date_naissance?: string
  sexe?: 'MASCULIN' | 'FEMININ'
  cni_photo_url?: string
  permis_photo_url?: string
  vehicle?: {
    marque: string
    modele?: string
    chassis_num: string
    immatriculation?: string
    energie?: string
    puissance_cv?: number
    nb_places?: number
    date_mise_circulation?: string
    usage?: string
    genre?: string
    zone_circulation?: string
  }
}

export const clientsApi = {
  list: (search?: string) => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : ''
    return mobiRequest<Client[]>(`/clients${qs}`)
  },
  get: (id: string) => mobiRequest<Client>(`/clients/${id}`),
  create: (data: CreateClientRequest) =>
    mobiRequest<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CreateClientRequest>) =>
    mobiRequest<Client>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  listVehicles: (clientId: string) =>
    mobiRequest<Vehicle[]>(`/clients/${clientId}/vehicles`),
  addVehicle: (clientId: string, data: Omit<Vehicle, 'id'> & { puissance_cv?: number }) =>
    mobiRequest<Vehicle>(`/clients/${clientId}/vehicles`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  uploadDoc: async (file: File): Promise<{ url: string }> => {
    validateUploadFile(file)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${BFF_BASE}/clients/upload-doc`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })
    if (!res.ok) {
      let detail = ''
      try {
        const err = await res.json()
        detail = err.detail || err.message || JSON.stringify(err)
      } catch {}
      throw new MobiAssurApiError(detail || res.statusText, res.status, detail)
    }
    const json = await res.json()
    return (json?.data || json) as { url: string }
  },
}

// ─── Contracts ───────────────────────────────────────────────────────────────

export interface Contract {
  id: string
  client_id: string
  agent_id?: string
  product_type: string
  status: string
  subscription_type: string
  zone_circulation: string
  date_effet: string
  duree_jours: number
  prime_nette?: number
  prime_ttc?: number
  pttc?: number
  created_at?: string
  client?: Client
}

export interface Payment {
  id: string
  contract_id: string
  amount: number
  method: PaymentMethod
  reference_externe?: string
  /** Preuves de paiement (URLs) — requis avant validation admin */
  proof_urls?: string[]
  /** Alias legacy / entrée unique normalisée côté API */
  proof_url?: string
  status: string
  created_at?: string
  validated_at?: string
}

export interface AddPaymentRequest {
  amount: number
  method: PaymentMethod
  reference_externe?: string
  proof_url?: string
  proof_urls?: string[]
}

export type PaymentMethod = 'ESPECES' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'CHEQUE' | 'VIREMENT'

export function suggestCarteRoseSerial(contractId: string): string {
  const year = new Date().getUTCFullYear()
  const contractReference = contractId.replace(/-/g, '').slice(0, 10).toUpperCase()
  return `CR-${year}-${contractReference}`
}

export interface CreateContractRequest {
  client_id: string
  agent_id?: string
  product_type: 'CAT1'
  subscription_type?: string
  zone_circulation?: string
  date_effet: string
  duree_jours?: number
  conducteur_nom?: string
  conducteur_date_naissance?: string
  conducteur_permis_cat?: string
  conducteur_permis_num?: string
  conducteur_permis_date?: string
  vehicles: Array<{
    vehicle_id?: string
    vehicle?: Partial<Vehicle>
    prime_vehicule?: number
    guarantees?: Record<string, unknown>
  }>
  prime_nette?: number
}

export const contractsApi = {
  list: (status?: string) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : ''
    return mobiRequest<Contract[]>(`/contracts${qs}`)
  },
  get: (id: string) => mobiRequest<Contract>(`/contracts/${id}`),
  create: (data: CreateContractRequest) =>
    mobiRequest<Contract>('/contracts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CreateContractRequest>) =>
    mobiRequest<Contract>(`/contracts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  addPayment: (contractId: string, data: AddPaymentRequest) =>
    mobiRequest<Payment>(`/contracts/${contractId}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  listPayments: (contractId: string) =>
    mobiRequest<Payment[]>(`/contracts/${contractId}/payments`),
  validatePayment: (contractId: string, paymentId: string) =>
    mobiRequest<Payment>(`/contracts/${contractId}/payments/${paymentId}/validate`, {
      method: 'POST',
    }),
  listDocs: (contractId: string) =>
    mobiRequest<unknown[]>(`/contracts/${contractId}/documents`),
  generatePack: (contractId: string) =>
    mobiRequest<unknown>(`/contracts/${contractId}/documents/generate-pack`, { method: 'POST' }),
  addPhysicalDocs: (
    contractId: string,
    data: {
      doc_type: 'CARTE_ROSE' | 'VIGNETTE_ASAC' | 'ATTESTATION'
      serial_number: string
    },
  ) =>
    mobiRequest<unknown>(`/contracts/${contractId}/physical-docs`, { method: 'POST', body: JSON.stringify(data) }),
  generateDoc: (contractId: string) =>
    mobiRequest<unknown>(`/contracts/${contractId}/documents/generate`, { method: 'POST' }),
  downloadDoc: (contractId: string, docId: string) =>
    downloadFileWithAuth(`/contracts/${contractId}/documents/${docId}/download`, `document_${docId}.pdf`),
  previewDoc: (contractId: string, docId: string) =>
    previewFileWithAuth(`/contracts/${contractId}/documents/${docId}/download`),
  estimateContract: (data: any) =>
    mobiRequest<unknown>('/contracts/estimate', { method: 'POST', body: JSON.stringify(data) }),
}

// ─── Prospects ───────────────────────────────────────────────────────────────

export type PaymentMode = 'UNPAID' | 'MANUAL_PAYMENT'

export interface QuoteBreakdown {
  months?: number
  rc_annual?: number
  rc_prorata?: number
  remise_pct?: number
  remise_amount?: number
  rc_net?: number
  dr?: number
  ipt?: number
  acc?: number
  fc?: number
  cr?: number
  vignette?: number
  vignette_tva?: number
  tax_assurance?: number
  tva_accessoires?: number
  total?: number
}

export interface Prospect {
  id: string
  full_name?: string
  phone?: string
  email?: string
  profession?: string
  status: string
  agent_id?: string
  client_id?: string
  vehicle_id?: string
  cni_photo_url?: string
  permis_photo_url?: string
  cni_number?: string
  category_id?: string
  zone_id?: string
  duration_id?: string
  fuel?: string
  power_cv?: number
  trailer?: boolean
  include_dr?: boolean
  include_ipt?: boolean
  remise_pct?: number
  quote_id?: string
  quote_total?: number
  quote_breakdown?: QuoteBreakdown
  created_at?: string
  updated_at?: string
}

export interface MarkInterestedRequest {
  cni_number: string
  category_id: string
  zone_id?: string
  duration_id: string
  fuel?: string
  power_cv: number
  trailer?: boolean
  include_dr?: boolean
  include_ipt?: boolean
  remise_pct?: number
}

export interface ConversionPayload {
  full_name?: string
  country_code?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  profession?: string
  cni_number?: string
  cni_photo_url?: string
  permis_photo_url?: string
  payment_mode?: PaymentMode
  payment_reference?: string
  payment_amount?: number
  payment_date?: string
  validation_code?: string
  vehicle?: {
    marque?: string
    modele?: string
    chassis_num?: string
    immatriculation?: string
    puissance_cv?: number
    energie?: string
    nb_places?: number
  }
}

export interface ConversionRequest {
  id: string
  prospect_id: string
  agent_id?: string
  status: string
  created_at?: string
  requested_at?: string
  payment_mode?: PaymentMode
  payment_reference?: string
  payment_amount?: number
  payment_date?: string
  payload?: ConversionPayload & Record<string, unknown>
  prospect?: Prospect
}

export interface ApproveConversionBody {
  validation_code: string
  received_payment_reference?: string
}

export const prospectsApi = {
  list: () => mobiRequest<Prospect[]>('/prospects'),
  get: (id: string) => mobiRequest<Prospect>(`/prospects/${id}`),
  listPendingConversions: () =>
    mobiRequest<ConversionRequest[]>('/prospects/conversions/pending'),
  getConversion: (id: string) =>
    mobiRequest<ConversionRequest>(`/prospects/conversions/${id}`),
  approveConversion: (id: string, body: ApproveConversionBody) =>
    mobiRequest<unknown>(`/prospects/conversions/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  rejectConversion: (id: string, rejectionReason: string) =>
    mobiRequest<unknown>(`/prospects/conversions/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason: rejectionReason }),
    }),
  /** Conversion directe admin (sans demande agent) — commission → prospect.agent_id */
  convertDirect: (prospectId: string, body: ConversionPayload & { validation_code: string }) =>
    mobiRequest<unknown>(`/prospects/${prospectId}/convert`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  markInterested: (id: string, body: MarkInterestedRequest) =>
    mobiRequest<Prospect>(`/prospects/${id}/mark-interested`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  create: (data: any) =>
    mobiRequest<Prospect>('/prospects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    mobiRequest<Prospect>(`/prospects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  requestConversion: (id: string) =>
    mobiRequest<unknown>(`/prospects/${id}/request-conversion`, { method: 'POST' }),
}

// ─── Wallet ──────────────────────────────────────────────────────────────────

export interface WithdrawalRequest {
  id: string
  agent_id: string
  amount: number
  status: string
  motif?: string
  created_at?: string
}

export interface PendingBreakdown {
  /** Potentiel commissions sur prospects non encore convertis / payés */
  pipeline: number
  /** Commissions en attente de validation de paiement contrat */
  awaiting_payment: number
}

export interface AgentWallet {
  agent_id: string
  agent_name: string
  agent_email?: string
  agent_phone?: string
  available_balance: number
  /** pending_breakdown.pipeline + pending_breakdown.awaiting_payment */
  pending_balance: number
  pending_breakdown?: PendingBreakdown
  monthly_objective: number
  monthly_progress_pct: number
  current_month_commissions: number
}

export const walletApi = {
  listPendingWithdrawals: () =>
    mobiRequest<WithdrawalRequest[]>('/wallet/withdrawals/pending'),
  getWithdrawal: (id: string) =>
    mobiRequest<WithdrawalRequest>(`/wallet/withdrawals/${id}`),
  rejectWithdrawal: (id: string, rejectionReason: string) =>
    mobiRequest<unknown>(`/wallet/withdrawals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason: rejectionReason }),
    }),
  listWithdrawals: () => mobiRequest<WithdrawalRequest[]>('/wallet/withdrawals'),
  createWithdrawal: (data: { amount: number; motif?: string }) =>
    mobiRequest<WithdrawalRequest>('/wallet/withdrawals', { method: 'POST', body: JSON.stringify(data) }),
  deleteWithdrawal: (id: string) =>
    mobiRequest<unknown>(`/wallet/withdrawals/${id}`, { method: 'DELETE' }),
  approveWithdrawal: (id: string) =>
    mobiRequest<unknown>(`/wallet/withdrawals/${id}/approve`, { method: 'POST' }),
  approveWithdrawalWithProofs: (id: string, data: FormData) =>
    mobiRequest<unknown>(`/wallet/withdrawals/${id}/approve`, {
      method: 'POST',
      body: data,
    }),
  getMe: () => mobiRequest<unknown>('/wallet/me'),
  getCommissions: () => mobiRequest<unknown>('/wallet/commissions'),
  listAgentWallets: () => mobiRequest<AgentWallet[]>('/wallet/agents'),
  setAgentObjective: (agentId: string, objective: number) =>
    mobiRequest<unknown>(`/wallet/agents/${agentId}/objective`, {
      method: 'PUT',
      body: JSON.stringify({ objective }),
    }),
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface BaremeField {
  mode: 'fixed' | 'percent'
  value: number
}

export interface BaremeConfig {
  base_rate: BaremeField
  cv_multiplier: BaremeField
  brand_factors: Record<string, BaremeField>
}

export interface PricingSettings {
  agency_id?: string | null
  accessoires?: number
  asac?: number
  dta?: number
  carte_rose_fee?: number
  tva_rate?: number
  commission_rate?: number
  bareme_config?: BaremeConfig
  guide_content?: string
  is_default?: boolean
}

export const settingsApi = {
  getPricing: () => mobiRequest<PricingSettings>('/settings/pricing'),
  createPricing: (data: Partial<PricingSettings>) =>
    mobiRequest<PricingSettings>('/settings/pricing', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePricing: (data: Partial<PricingSettings>) =>
    mobiRequest<PricingSettings>('/settings/pricing', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deletePricing: () =>
    mobiRequest<unknown>('/settings/pricing', { method: 'DELETE' }),
  addBrand: (data: { marque: string; mode: 'fixed' | 'percent'; value: number }) =>
    mobiRequest<PricingSettings>('/settings/pricing/bareme/brands', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteBrand: (marque: string) =>
    mobiRequest<PricingSettings>(
      `/settings/pricing/bareme/brands/${encodeURIComponent(marque)}`,
      { method: 'DELETE' },
    ),
}

// ─── Tarification CIMA ───────────────────────────────────────────────────────

export interface VehicleCategory {
  id: string
  agency_id?: string
  code: string
  name: string
  description?: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface CirculationZone {
  id: string
  agency_id?: string
  name: string
  cities: string[]
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface ContractDuration {
  id: string
  agency_id?: string
  label: string
  months: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface RcRate {
  id: string
  agency_id?: string
  category_id: string
  zone_id?: string | null
  fuel: string
  power_min: number
  power_max: number
  trailer: boolean
  rc_amount: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface FeeSchedule {
  agency_id?: string
  dr_amount: number
  ipt_amount: number
  acc_amount: number
  fc_amount: number
  cr_amount: number
  vignette_amount: number
  tax_rate_assurance: number
  tva_rate: number
  remise_max_pct: number
  updated_at?: string | null
  updated_by?: string | null
}

export interface TariffBootstrap {
  categories: VehicleCategory[]
  zones: CirculationZone[]
  durations: ContractDuration[]
  rc_rates: RcRate[]
  fees: FeeSchedule
}

export interface GeoRegion {
  name: string
  code?: string
}

export interface QuoteComputeRequest {
  category_id: string
  zone_id?: string
  duration_id: string
  fuel?: string
  power_cv: number
  trailer?: boolean
  include_dr?: boolean
  include_ipt?: boolean
  remise_pct?: number
  prospect_id?: string
  cni_number?: string
}

export interface QuoteComputeResult {
  quote_id: string
  total: number
  breakdown: QuoteBreakdown
  inputs?: Record<string, unknown>
}

export const tariffApi = {
  bootstrap: () => mobiRequest<TariffBootstrap>('/settings/tariff/bootstrap'),

  listCategories: () => mobiRequest<VehicleCategory[]>('/settings/vehicle-categories'),
  createCategory: (data: Omit<VehicleCategory, 'id' | 'agency_id' | 'created_at' | 'updated_at'>) =>
    mobiRequest<VehicleCategory>('/settings/vehicle-categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCategory: (id: string, data: Partial<VehicleCategory>) =>
    mobiRequest<VehicleCategory>(`/settings/vehicle-categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteCategory: (id: string) =>
    mobiRequest<unknown>(`/settings/vehicle-categories/${id}`, { method: 'DELETE' }),

  listZones: () => mobiRequest<CirculationZone[]>('/settings/zones'),
  geoRegions: () => mobiRequest<GeoRegion[]>('/settings/zones/geo/regions'),
  createZone: (data: Omit<CirculationZone, 'id' | 'agency_id' | 'created_at' | 'updated_at'>) =>
    mobiRequest<CirculationZone>('/settings/zones', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateZone: (id: string, data: Partial<CirculationZone>) =>
    mobiRequest<CirculationZone>(`/settings/zones/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteZone: (id: string) =>
    mobiRequest<unknown>(`/settings/zones/${id}`, { method: 'DELETE' }),

  listDurations: () => mobiRequest<ContractDuration[]>('/settings/contract-durations'),
  createDuration: (data: Omit<ContractDuration, 'id' | 'agency_id' | 'created_at' | 'updated_at'>) =>
    mobiRequest<ContractDuration>('/settings/contract-durations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDuration: (id: string, data: Partial<ContractDuration>) =>
    mobiRequest<ContractDuration>(`/settings/contract-durations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteDuration: (id: string) =>
    mobiRequest<unknown>(`/settings/contract-durations/${id}`, { method: 'DELETE' }),

  listTariffLines: () => mobiRequest<RcRate[]>('/settings/tariff-lines'),
  createTariffLine: (data: Omit<RcRate, 'id' | 'agency_id' | 'created_at' | 'updated_at'>) =>
    mobiRequest<RcRate>('/settings/tariff-lines', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTariffLine: (id: string, data: Partial<RcRate>) =>
    mobiRequest<RcRate>(`/settings/tariff-lines/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteTariffLine: (id: string) =>
    mobiRequest<unknown>(`/settings/tariff-lines/${id}`, { method: 'DELETE' }),

  getFeeSchedule: () => mobiRequest<FeeSchedule>('/settings/fee-schedule'),
  setFeeSchedule: (data: Partial<FeeSchedule>) =>
    mobiRequest<FeeSchedule>('/settings/fee-schedule', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  computeQuote: (data: QuoteComputeRequest) =>
    mobiRequest<QuoteComputeResult>('/quotes/compute', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  setValidationCode: (userId: string, code: string) =>
    mobiRequest<unknown>(`/users/${userId}/validation-code`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  generateValidationCode: (userId: string) =>
    mobiRequest<{ code: string }>(`/users/${userId}/validation-code/generate`, {
      method: 'POST',
    }),
  verifyValidationCode: (code: string) =>
    mobiRequest<unknown>('/auth/verify-validation-code', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
}

// ─── Sync ────────────────────────────────────────────────────────────────────
export const syncApi = {
  batch: (data: any) => mobiRequest<unknown>('/sync/batch', { method: 'POST', body: JSON.stringify(data) }),
  status: () => mobiRequest<unknown>('/sync/status'),
  conflicts: () => mobiRequest<unknown>('/sync/conflicts'),
  resolveConflict: (conflictId: string, data: any) =>
    mobiRequest<unknown>(`/sync/conflicts/${conflictId}/resolve`, { method: 'POST', body: JSON.stringify(data) }),
}

// ─── Portfolio ───────────────────────────────────────────────────────────────
export const portfolioApi = {
  getSummary: () => mobiRequest<unknown>('/portfolio/summary'),
  getContracts: () => mobiRequest<unknown>('/portfolio/contracts'),
}



// ─── Welcome ─────────────────────────────────────────────────────────────────
export const welcomeApi = {
  getWelcome: () => mobiRequest<unknown>('/welcome/'),
  describeMe: (data: any) => mobiRequest<unknown>('/welcome/describe-me', { method: 'POST', body: JSON.stringify(data) }),
}

// ─── Country ─────────────────────────────────────────────────────────────────
export const countryApi = {
  listAll: () => mobiRequest<unknown[]>('/country/all'),
  addCountry: (data: any) => mobiRequest<unknown>('/country/add', { method: 'POST', body: JSON.stringify(data) }),
}
