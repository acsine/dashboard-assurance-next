'use client'

import { useState } from 'react'
import { usePosts, useCreatePost, useDeletePost } from '@/lib/hooks/use-posts'
import { useUsers } from '@/lib/hooks/use-users'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Trash2, Plus, User, Edit3, MessageSquare } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from "next-intl";

export function PostsDemo() {
  const t = useTranslations();
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPost, setNewPost] = useState({ title: '', body: '', userId: 1 })

  const { data: posts, isLoading: postsLoading, error: postsError } = usePosts()
  const { data: users, isLoading: usersLoading } = useUsers()
  const createPost = useCreatePost()
  const deletePost = useDeletePost()

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPost.title.trim() || !newPost.body.trim()) return

    try {
      await createPost.mutateAsync(newPost)
      setNewPost({ title: '', body: '', userId: 1 })
      setShowCreateForm(false)
    } catch (error) {
      console.error('Erreur création:', error)
    }
  }

  const getUserName = (userId: number) => {
    return users?.find(user => user.id === userId)?.name || `Utilisateur ${userId}`
  }

  if (postsError) {
    return (
      <Card className="border-red-100 bg-red-50">
        <CardContent className="p-8 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <CardTitle className="text-red-600 mb-2">{t('postsDemo.error.title')}</CardTitle>
          <CardDescription className="text-red-500">
            {t('postsDemo.error.description')}
          </CardDescription>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {t('postsDemo.title')}
          </h2>
          <p className="text-gray-600">
            {t('postsDemo.description')}
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          variant="primary"
          size="lg"
          disabled={createPost.isPending}
          className="gap-2"
        >
          <Plus size={18} />
          {t('postsDemo.newPostButton')}
        </Button>
      </div>

      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-blue-100 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit3 size={20} className="text-blue-600" />
                  {t('postsDemo.newPostTitle')}
                </CardTitle>
                <CardDescription>
                  {t('postsDemo.newPostDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreatePost} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      {t('postsDemo.postTitle')}
                    </label>
                    <Input
                      value={newPost.title}
                      onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                      placeholder={t('postsDemo.postTitlePlaceholder')}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      {t('postsDemo.postContent')}
                    </label>
                    <Textarea
                      value={newPost.body}
                      onChange={(e) => setNewPost(prev => ({ ...prev, body: e.target.value }))}
                      placeholder={t('postsDemo.postContentPlaceholder')}
                      rows={4}
                      required
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="submit"
                      variant="success"
                      disabled={createPost.isPending}
                      className="flex-1"
                    >
                      {createPost.isPending ? t('postsDemo.postSubmitLoading') : t('postsDemo.postSubmitButton')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateForm(false)}
                    >
                      {t('postsDemo.postCancelButton')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {postsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-3 bg-gray-200 rounded w-4/6"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          posts?.slice(0, 12).map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-gray-100">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {post.title}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deletePost.mutate(post.id)}
                      disabled={deletePost.isPending}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <CardDescription className="text-sm leading-relaxed line-clamp-3 mb-4">
                    {post.body}
                  </CardDescription>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-full">
                      <User size={12} />
                      {usersLoading ? (
                        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                      ) : (
                        <span className="font-medium">{getUserName(post.userId)}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {posts && posts.length > 12 && (
        <Card className="border-gray-100 bg-gray-50/50">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-gray-600">
            {t.rich('postsDemo.postPaginationMessage', {
              displayCount: 12,
              totalCount: posts.length,
              bold: (chunks) => <span className="font-semibold">{chunks}</span>
            })}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t('postsDemo.postDisplayMessage')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
