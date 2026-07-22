'use client'

import { useAuth } from '@/lib/hooks/use-auth'
import Sidebar from '@/components/dashboard/Sidebar'
import { SupportSseListener } from '@/components/dashboard/SupportSseListener'
import { IdleSessionGuard } from '@/components/dashboard/IdleSessionGuard'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth(true)

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
          <p className="text-sm text-gray-400">Authentification en cours...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <SupportSseListener />
        <IdleSessionGuard />
        <main className="flex-1 flex flex-col overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
