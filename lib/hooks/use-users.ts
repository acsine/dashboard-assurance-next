import { useQuery } from '@tanstack/react-query'
import { jsonPlaceholderApi } from '@/lib/api/jsonplaceholder'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: jsonPlaceholderApi.users.getAll,
    staleTime: 10 * 60 * 1000,
  })
}

export function useUser(id: number) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => jsonPlaceholderApi.users.getById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  })
}
