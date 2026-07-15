'use client'

import type { ReactNode } from 'react'
import { ShieldX } from 'lucide-react'
import { can, type Permission } from '@/lib/auth/roles'
import { useAuthStore } from '@/lib/stores/auth-store'

export function Forbidden() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8">
      <div className="max-w-md rounded-2xl border border-red-100 bg-red-50 p-8 text-center text-red-800">
        <ShieldX className="mx-auto mb-3 h-10 w-10" />
        <h2 className="font-bold">Accès interdit</h2>
        <p className="mt-2 text-sm">Votre rôle ne permet pas d’effectuer cette action.</p>
      </div>
    </div>
  )
}

export function RoleGuard({
  permission,
  children,
  fallback = <Forbidden />,
}: {
  permission: Permission
  children: ReactNode
  fallback?: ReactNode
}) {
  const role = useAuthStore((state) => state.user?.role)
  return can(role, permission) ? children : fallback
}
