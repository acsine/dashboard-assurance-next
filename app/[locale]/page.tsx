'use client'

import { useTranslations } from "next-intl"
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Shield, ArrowRight, Activity, Cpu, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Home() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-radial from-gray-900 via-gray-950 to-black text-white flex flex-col justify-between overflow-hidden relative">
      {/* Glow shapes */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      {/* Header bar */}
      <header className="h-20 border-b border-gray-900/60 backdrop-blur-md sticky top-0 z-50 px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            M
          </div>
          <span className="font-bold text-base tracking-wide">MOBI-ASSUR</span>
        </div>

        <Button
          onClick={() => router.push('/login')}
          className="bg-blue-600 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-600/10 active:scale-95 text-xs font-bold rounded-xl h-10 px-5 text-white"
        >
          Espace Admin
        </Button>
      </header>

      {/* Hero Body */}
      <main className="flex-1 flex items-center justify-center p-8 z-10">
        <div className="max-w-3xl text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/25 rounded-full text-blue-400 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              Plateforme Assurance V1
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-b from-white via-gray-100 to-gray-400 bg-clip-text text-transparent leading-none">
              Pilotez l'infrastructure de MOBI-ASSUR.
            </h1>
            <p className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Le portail de commandement global unifié pour les agences de souscription d'assurances automobile au Cameroun.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button
              onClick={() => router.push('/login')}
              size="lg"
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 group w-full sm:w-auto h-12 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              Accéder au Dashboard
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>

          {/* Quick specs grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 max-w-2xl mx-auto"
          >
            <div className="p-5 bg-gray-900/40 rounded-2xl border border-gray-800/80 text-left space-y-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-200">Sécurisé JWT</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Authentification RBAC chiffrée avec rotation automatique de jetons.
              </p>
            </div>

            <div className="p-5 bg-gray-900/40 rounded-2xl border border-gray-800/80 text-left space-y-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-200">Temps Réel</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Synchronisation offline bidirectionnelle des agents de terrain.
              </p>
            </div>

            <div className="p-5 bg-gray-900/40 rounded-2xl border border-gray-800/80 text-left space-y-2">
              <Cpu className="h-5 w-5 text-blue-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-200">Modulaire</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Extension facile des garanties et des calculateurs de primes.
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer bar */}
      <footer className="h-16 border-t border-gray-900/60 flex items-center justify-center text-xs text-gray-500">
        © 2026 MOBI-ASSUR Cameroun. Tous droits réservés.
      </footer>
    </div>
  )
}
