import { Loader2 } from 'lucide-react'
import Header from '@/components/dashboard/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-slate-50/60">
      <Header title="Attribution d’une niche" subtitle="Sélection et objectifs de l’agent" />
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        <Card className="rounded-2xl border-slate-200" aria-busy="true" aria-live="polite">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-700" aria-hidden="true" />
              <div>
                <h1 className="text-sm font-bold text-slate-900">Chargement de la niche</h1>
                <p className="text-xs text-slate-600">Préparation de l’écran d’attribution.</p>
              </div>
            </div>
            <Skeleton className="h-24 rounded-xl bg-slate-100" />
            <Skeleton className="h-64 rounded-xl bg-slate-100" />
            <Skeleton className="h-40 rounded-xl bg-slate-100" />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
