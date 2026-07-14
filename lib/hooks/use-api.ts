import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { toast } from 'sonner'

export function useApiQuery<T>(
  key: string[],
  url: string,
  options?: {
    enabled?: boolean
    staleTime?: number
    onError?: (error: Error) => void
  }
) {
  return useQuery({
    queryKey: key,
    queryFn: () => api.get<T>(url),
    enabled: options?.enabled,
    staleTime: options?.staleTime,
    meta: {
      onError: options?.onError,
    },
  })
}

export function useApiMutation<TData, TVariables = void>(
  url: string | ((variables: TVariables) => string),
  method: 'POST' | 'PUT' | 'DELETE' = 'POST',
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void
    onError?: (error: Error, variables: TVariables) => void
    invalidateQueries?: string[][]
    showSuccessToast?: boolean
    showErrorToast?: boolean
    successMessage?: string
  }
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const endpoint = typeof url === 'function' ? url(variables) : url
      
      switch (method) {
        case 'POST':
          return api.post<TData>(endpoint, variables)
        case 'PUT':
          return api.put<TData>(endpoint, variables)
        case 'DELETE':
          return api.delete<TData>(endpoint)
        default:
          throw new Error(`Méthode ${method} non supportée`)
      }
    },
    onSuccess: (data, variables) => {
      if (options?.showSuccessToast !== false) {
        toast.success(options?.successMessage || 'Opération réussie')
      }
      
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey })
        })
      }
      
      options?.onSuccess?.(data, variables)
    },
    onError: (error: Error, variables) => {
      if (options?.showErrorToast !== false) {
        toast.error(error.message)
      }
      
      options?.onError?.(error, variables)
    },
  })
}
