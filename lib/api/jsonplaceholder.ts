import { z } from 'zod'
import { api } from './client'

const BASE_URL = 'https://jsonplaceholder.typicode.com'

export const PostSchema = z.object({
  id: z.number(),
  title: z.string(),
  body: z.string(),
  userId: z.number(),
})

export const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  username: z.string(),
  email: z.string().email(),
  phone: z.string(),
  website: z.string(),
  company: z.object({
    name: z.string(),
    catchPhrase: z.string(),
    bs: z.string(),
  }),
})

export const CommentSchema = z.object({
  id: z.number(),
  postId: z.number(),
  name: z.string(),
  email: z.string().email(),
  body: z.string(),
})

export type Post = z.infer<typeof PostSchema>
export type User = z.infer<typeof UserSchema>
export type Comment = z.infer<typeof CommentSchema>

export const jsonPlaceholderApi = {
  posts: {
    getAll: () => 
      api.get<Post[]>(`${BASE_URL}/posts`),
    
    getById: (id: number) => 
      api.get<Post>(`${BASE_URL}/posts/${id}`),
    
    getByUserId: (userId: number) => 
      api.get<Post[]>(`${BASE_URL}/posts?userId=${userId}`),
    
    create: (post: Omit<Post, 'id'>) => 
      api.post<Post>(`${BASE_URL}/posts`, post),
    
    update: (id: number, post: Partial<Post>) => 
      api.put<Post>(`${BASE_URL}/posts/${id}`, post),
    
    delete: (id: number) => 
      api.delete(`${BASE_URL}/posts/${id}`),
  },
  
  users: {
    getAll: () => 
      api.get<User[]>(`${BASE_URL}/users`),
    
    getById: (id: number) => 
      api.get<User>(`${BASE_URL}/users/${id}`),
  },
  
  comments: {
    getByPostId: (postId: number) => 
      api.get<Comment[]>(`${BASE_URL}/comments?postId=${postId}`),
  },
}
