'use client'

import { useIdleTimeout } from '@/hooks/useIdleTimeout'
import { authApi } from '@/lib/api/mobi-assur'
import { useAuthStore } from '@/lib/auth/store'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

export function IdleSessionGuard() {
  const router = useRouter()
  const [showWarning, setShowWarning] = useState(false)
  const logout = useAuthStore((state) => state.logout)

  useIdleTimeout({
    onWarning: () => {
      setShowWarning(true)
    },
    onTimeout: async () => {
      setShowWarning(false)
      try {
        await authApi.logout()
      } catch {}
      logout()
      toast.info('Votre session a expiré par inactivité')
      router.push('/fr/login')
    },
  })

  if (!showWarning) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Session expiring
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Your session will expire in 1 minute due to inactivity. Click anywhere to continue.
        </p>
        <button
          onClick={() => setShowWarning(false)}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
