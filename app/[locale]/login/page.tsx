'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { authApi } from '@/lib/api/mobi-assur'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Mail, Lock, Phone, ArrowRight, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const loginStore = useAuthStore((state) => state.login)
  const [loading, setLoading] = useState(false)
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email')

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier || !password) {
      toast.error('Veuillez remplir tous les champs')
      return
    }

    setLoading(true)
    try {
      const response = await authApi.login({
        login: identifier,
        password: password,
      })

      if (response.user) {
        loginStore(response.user)
        toast.success(response.message || 'Connexion réussie')
        router.push('/dashboard')
      } else {
        toast.error('Profil utilisateur non reçu')
      }

    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Identifiants invalides')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-white text-gray-900">
      {/* Left side: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12 bg-white relative z-10">
        <div className="max-w-md w-full mx-auto space-y-8">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center space-y-4">
            <img
              src="/bethel-logo.png"
              alt="Bethel Comprehensive Insurance"
              className="h-24 sm:h-28 w-auto object-contain"
            />
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900">
              Portail MOBI-ASSUR
            </h2>
            <p className="text-gray-500 text-sm max-w-sm">
              Connectez-vous à votre espace administration pour gérer les polices et valider les commissions.
            </p>
          </div>

          {/* Tabs for login type */}
          <div className="grid grid-cols-2 gap-1.5 bg-gray-100 p-1.5 rounded-xl border border-gray-200/50">
            <button
              type="button"
              onClick={() => {
                setLoginMethod('email')
                setIdentifier('')
              }}
              className={`py-2.5 text-xs font-semibold rounded-lg transition-all ${
                loginMethod === 'email'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200/40'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Adresse Email
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod('phone')
                setIdentifier('')
              }}
              className={`py-2.5 text-xs font-semibold rounded-lg transition-all ${
                loginMethod === 'phone'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200/40'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              N° Téléphone
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                {loginMethod === 'email' ? 'E-mail Professionnel' : 'N° de Téléphone'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  {loginMethod === 'email' ? (
                    <Mail className="h-4.5 w-4.5" />
                  ) : (
                    <Phone className="h-4.5 w-4.5" />
                  )}
                </div>
                <Input
                  type={loginMethod === 'email' ? 'email' : 'text'}
                  placeholder={
                    loginMethod === 'email' ? 'nom@agence.com' : '6xxxxxxxx / +237...'
                  }
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pl-11 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Mot de passe
                </label>
                <a href="#" className="text-xs font-semibold text-blue-600 hover:underline">
                  Mot de passe oublié ?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 mt-6 text-white border-0 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authentification...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer branding */}
          <p className="text-xs text-gray-400 text-center pt-8 border-t border-gray-100">
            © 2026 MOBI-ASSUR Cameroun. Tous droits réservés.
          </p>
        </div>
      </div>

      {/* Right side: Image Panel */}
      <div className="hidden lg:block lg:w-1/2 relative bg-gray-950">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/login-bg.jpg')" }}
        />
        {/* Soft overlay gradient to enrich aesthetics */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-transparent" />
        
        {/* Quote / Overlay Info */}
        <div className="absolute bottom-12 left-12 right-12 text-white space-y-3 p-6 bg-gray-950/40 backdrop-blur-md rounded-2xl border border-white/10">
          <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase">
            Service Client Unifié
          </span>
          <p className="text-lg font-medium leading-snug">
            "MOBI-ASSUR me permet de valider les polices d'assurance de mes clients en temps réel et de piloter mon équipe d'agents terrain sans aucune contrainte de papier."
          </p>
          <span className="text-xs font-semibold block text-gray-300">
            Marie-Claire N. — Gestionnaire de Comptes
          </span>
        </div>
      </div>
    </div>
  )
}
