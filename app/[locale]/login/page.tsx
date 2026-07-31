'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { authApi } from '@/lib/api/mobi-assur'
import { consumeAuthToast } from '@/lib/auth/session-expired'
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

  useEffect(() => {
    const msg = consumeAuthToast()
    if (msg) toast.info(msg)
  }, [])

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
    <div className="min-h-screen flex bg-[#f8fafc] text-[#1a1b21]">
      {/* Left side: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between px-8 sm:px-16 lg:px-24 py-10 bg-white relative z-10 shadow-xl">

        {/* Top Header Navigation Link */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#1b365d] transition-colors cursor-pointer"
          >
            ← Retour à l'accueil
          </button>


        </div>

        <div className="max-w-md w-full mx-auto space-y-6 my-auto py-8">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center gap-1">
            <img
              src="/logo-bethel.png"
              alt="Bethel Comprehensive Insurance Ltd"
              className="h-52 sm:h-28 w-auto object-contain mb-2"
            />
            <h2 className="text-5xl sm:text-4xl font-extrabold tracking-tight text-[#1b365d] leading-tight">
              Connexion
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm max-w-sm mt-1">
              Accédez à votre espace sécurisé pour gérer vos polices, simuler des devis et déclarer vos sinistres.
            </p>
          </div>

          {/* Tabs for login type */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => {
                setLoginMethod('email')
                setIdentifier('')
              }}
              className={`py-2.5 text-xs font-bold rounded-lg transition-all ${loginMethod === 'email'
                ? 'bg-white text-[#1b365d] shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-900'
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
              className={`py-2.5 text-xs font-bold rounded-lg transition-all ${loginMethod === 'phone'
                ? 'bg-white text-[#1b365d] shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              N° Téléphone (+237)
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1b365d] tracking-wider block">
                {loginMethod === 'email' ? 'Adresse Email' : 'Numéro de Téléphone (+237)'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  {loginMethod === 'email' ? (
                    <Mail className="h-4 w-4" />
                  ) : (
                    <Phone className="h-4 w-4" />
                  )}
                </div>
                <Input
                  type={loginMethod === 'email' ? 'email' : 'text'}
                  placeholder={
                    loginMethod === 'email' ? 'votre.email@exemple.cm' : '+237 699 11 22 33'
                  }
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pl-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#1b365d] focus:ring-[#1b365d]/20 rounded-xl text-xs py-3"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1b365d] tracking-wider block">
                  Mot de passe
                </label>
                <a href="#" className="text-xs font-bold text-[#3b82f6] hover:underline">
                  Mot de passe oublié ?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#1b365d] focus:ring-[#1b365d]/20 rounded-xl text-xs py-3"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#f59e0b] hover:bg-[#e08e00] active:scale-[0.98] rounded-xl text-sm font-extrabold transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 mt-6 text-white border-0 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Connexion en cours...</span>
                </>
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Registration Redirect Link */}
          <div className="text-center pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Pas encore de compte ?{' '}
              <button
                onClick={() => router.push('/register')}
                className="font-bold text-[#1b365d] hover:underline cursor-pointer"
              >
                Créer un compte client
              </button>
            </p>
          </div>
        </div>

        {/* Footer branding */}
        <p className="text-xs text-slate-400 text-center">
          © 2026 Bethel Comprehensive Insurance Ltd. Agréé CIMA.
        </p>
      </div>

      {/* Right side: Hero Image Panel matching landing page */}
      <div className="hidden lg:block lg:w-1/2 relative bg-[#1b365d]">
        <div
          className="absolute inset-0 bg-cover bg-top bg-no-repeat"
          style={{ backgroundImage: "url('/hero-agent.jpg')" }}
        />
        {/* Navy gradient overlay matching landing page aesthetics */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1b365d] via-[#1b365d]/40 to-transparent" />

        {/* Quote / Overlay Info */}
        <div className="absolute bottom-12 left-12 right-12 text-white space-y-3 p-8 bg-[#1b365d]/80 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl">
          <span className="text-[10px] font-extrabold tracking-widest text-[#f59e0b] uppercase">
            Services d'Assurance 100% Digitaux
          </span>
          <p className="text-lg font-bold leading-snug">
            "Bethel Comprehensive Insurance me permet de souscrire, gérer mes polices d'assurance et suivre mes déclarations de sinistres en toute sérénité."
          </p>
          <span className="text-xs font-semibold block text-slate-300">
            Rejoint par plus de 16 500+ assurés au Cameroun
          </span>
        </div>
      </div>
    </div>
  )
}
