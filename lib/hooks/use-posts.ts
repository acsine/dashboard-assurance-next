import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jsonPlaceholderApi, type Post } from '@/lib/api/jsonplaceholder'
import { toast } from 'sonner'

export function usePosts() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: jsonPlaceholderApi.posts.getAll,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePost(id: number) {
  return useQuery({
    queryKey: ['posts', id],
    queryFn: () => jsonPlaceholderApi.posts.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePostsByUser(userId: number) {
  return useQuery({
    queryKey: ['posts', 'user', userId],
    queryFn: () => jsonPlaceholderApi.posts.getByUserId(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (post: Omit<Post, 'id'>) => 
      jsonPlaceholderApi.posts.create(post),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Article créé avec succès')
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la création: ${error.message}`)
    },
  })
}

export function useUpdatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...post }: { id: number } & Partial<Post>) =>
      jsonPlaceholderApi.posts.update(id, post),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['posts', variables.id] })
      toast.success('Article mis à jour avec succès')
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la mise à jour: ${error.message}`)
    },
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => jsonPlaceholderApi.posts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Article supprimé avec succès')
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la suppression: ${error.message}`)
    },
  })
}
