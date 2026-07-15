import type { Role } from '@/lib/auth/roles'
import { validateUploadFile } from '@/lib/files/validation'

/**
 * MOBI-ASSUR API Client
 * Client centralisé vers le BFF Next.js. Les JWT restent exclusivement en cookie HttpOnly.
 */

const BFF_BASE = '/api/backend'

export function proxiedAssetUrl(value: string): string {
  if (!value.startsWith('http')) return `${BFF_BASE}${value.startsWith('/') ? value : `/${value}`}`
  const url = new URL(value)
  return `${BFF_BASE}${url.pathname}${url.search}`
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
  agent_id: string
  subject: string
  description?: string
  channel: string
  status: string
  created_at: string
}

export interface ChatMessage {
  id: string
  ticket_id?: string
  sender_id: string
  sender_name: string
  content?: string
  voice_url?: string
  is_notification: boolean
  created_at: string
}

export const supportApi = {
  listTickets: () => mobiRequest<SupportTicket[]>('/support/tickets'),
  getMessages: (ticketId: string) => mobiRequest<ChatMessage[]>(`/support/tickets/${ticketId}/messages`),
  sendMessage: (ticketId: string, content: string) =>
    mobiRequest<ChatMessage>(`/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  createTicket: (data: any) => mobiRequest<unknown>('/support/tickets', { method: 'POST', body: JSON.stringify(data) }),
  submitVoiceReport: (data: any) => mobiRequest<unknown>('/support/voice-reports', { method: 'POST', body: JSON.stringify(data) }),
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
  status: string
  created_at?: string
  validated_at?: string
}

export type PaymentMethod = 'ESPECES' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'CHEQUE' | 'VIREMENT'

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
  addPayment: (
    contractId: string,
    data: { amount: number; method: PaymentMethod; reference_externe?: string },
  ) =>
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
  addPhysicalDocs: (contractId: string, data: any) =>
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

export interface Prospect {
  id: string
  full_name?: string
  phone?: string
  email?: string
  status: string
  agent_id?: string
  created_at?: string
}

export interface ConversionRequest {
  id: string
  prospect_id: string
  status: string
  created_at?: string
  prospect?: Prospect
}

export const prospectsApi = {
  list: () => mobiRequest<Prospect[]>('/prospects'),
  get: (id: string) => mobiRequest<Prospect>(`/prospects/${id}`),
  listPendingConversions: () =>
    mobiRequest<ConversionRequest[]>('/prospects/conversions/pending'),
  getConversion: (id: string) =>
    mobiRequest<ConversionRequest>(`/prospects/conversions/${id}`),
  approveConversion: (id: string) =>
    mobiRequest<unknown>(`/prospects/conversions/${id}/approve`, { method: 'POST' }),
  rejectConversion: (id: string, rejectionReason: string) =>
    mobiRequest<unknown>(`/prospects/conversions/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason: rejectionReason }),
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

export interface AgentWallet {
  agent_id: string
  agent_name: string
  agent_email?: string
  agent_phone?: string
  available_balance: number
  pending_balance: number
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

export interface PricingSettings {
  accessoires?: number
  asac?: number
  dta?: number
  carte_rose_fee?: number
  tva_rate?: number
  commission_rate?: number
  bareme?: unknown
}

export const settingsApi = {
  getPricing: () => mobiRequest<PricingSettings>('/settings/pricing'),
  createPricing: (data: PricingSettings) =>
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
  addBrand: (data: { marque: string }) =>
    mobiRequest<unknown>('/settings/pricing/bareme/brands', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteBrand: (marque: string) =>
    mobiRequest<unknown>(`/settings/pricing/bareme/brands/${encodeURIComponent(marque)}`, { method: 'DELETE' }),
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
