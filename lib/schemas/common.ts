import { z } from 'zod'

export const emailSchema = z
  .string()
  .email('Adresse email invalide')
  .min(1, 'Email requis')

export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')

export const phoneSchema = z
  .string()
  .regex(/^(\+33|0)[1-9](\d{8})$/, 'Numéro de téléphone invalide')
  .optional()

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
})

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const searchSchema = z.object({
  search: z.string().optional(),
})

export type PaginationParams = z.infer<typeof paginationSchema>
export type SortParams = z.infer<typeof sortSchema>
export type SearchParams = z.infer<typeof searchSchema>
