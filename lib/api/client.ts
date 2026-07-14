import { formatError } from '@/lib/utils'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiClient<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new ApiError(
        `Erreur API: ${response.statusText}`,
        response.status,
        response.statusText
      )
    }

    return await response.json()
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new Error(formatError(error))
  }
}

export const api = {
  get: <T>(url: string, options?: RequestInit) =>
    apiClient<T>(url, { method: 'GET', ...options }),
  
  post: <T>(url: string, data?: any, options?: RequestInit) =>
    apiClient<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    }),
  
  put: <T>(url: string, data?: any, options?: RequestInit) =>
    apiClient<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    }),
  
  delete: <T>(url: string, options?: RequestInit) =>
    apiClient<T>(url, { method: 'DELETE', ...options }),
}
