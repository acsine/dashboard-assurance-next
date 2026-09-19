'use client'

import { useIdleTimeout } from '@/hooks/useIdleTimeout'
import { forceSessionExpiredLogout } from '@/lib/auth/session-expired'
import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'

export function IdleSessionGuard() {
  const t = useTranslations('session')
  const [showWarning, setShowWarning] = useState(false)

  const onWarning = useCallback(() => {
    setShowWarning(true)
  }, [])

  const onTimeout = useCallback(async () => {
    setShowWarning(false)
    await forceSessionExpiredLogout(t('expiredIdle'))
  }, [t])

  const { resetTimer } = useIdleTimeout({
    onWarning,
    onTimeout,
  })

  if (!showWarning) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {t('warningTitle')}
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          {t('warningBody')}
        </p>
        <button
          type="button"
          onClick={() => {
            setShowWarning(false)
            resetTimer()
          }}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('continue')}
        </button>
      </div>
    </div>
  )
}
