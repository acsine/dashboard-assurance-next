'use client'

import { useEffect } from 'react'
import Script from 'next/script'
import { useAuthStore } from '@/lib/stores/auth-store'

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void | Promise<void>>
    OneSignal?: any
  }
}

export function OneSignalInit() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || ''
    if (!appId || appId === 'ONESIGNAL_APP_ID_PLACEHOLDER') {
      return
    }

    window.OneSignalDeferred = window.OneSignalDeferred || []
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.init({
          appId,
          allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
          notifyButton: {
            enable: false,
          },
        })

        if (isAuthenticated && user?.id) {
          await OneSignal.login(user.id)
          console.log('[OneSignal Web] Lié à l\'External User ID:', user.id)
        } else if (!isAuthenticated) {
          await OneSignal.logout()
        }
      } catch (err) {
        console.error('[OneSignal Web] Erreur initialisation:', err)
      }
    })
  }, [user?.id, isAuthenticated])

  return (
    <Script
      src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      strategy="lazyOnload"
    />
  )
}

