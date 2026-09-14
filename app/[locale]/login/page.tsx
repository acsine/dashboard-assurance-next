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
import {
  Mail,
  Lock,
  Phone,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Award,
  CheckCircle2,
  LockKeyhole,
  Sparkles,
  ArrowLeft,
} from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const loginStore = useAuthStore((state) => state.login)
  const [loading, setLoading] = useState(false)
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email')

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const msg = consumeAuthToast()
    if (msg) toast.info(msg)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier || !password) {
      toast.error('Veuillez remplir tous les champs obligatoires')
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
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-[#1b365d] to-slate-950 text-slate-900 relative overflow-hidden">
      {/* Soft Background Glowing Orbs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/15 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-amber-500/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Main Container */}
      <div className="w-full flex min-h-screen relative z-10">
        
        {/* Left Side: Premium Login Card Container */}
        <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 lg:p-16 bg-white/95 backdrop-blur-2xl border-r border-white/20 shadow-2xl relative">
          
          {/* Top Header Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-600 hover:text-blue-900 bg-slate-100 hover:bg-blue-50 border border-slate-200/80 transition-all cursor-pointer group"
            >
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform text-blue-600" />
              <span>Retour à l'accueil</span>
            </button>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Portail Sécurisé CIMA
            </span>
          </div>

          {/* Center Form Section */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-md w-full mx-auto space-y-6 my-auto py-6"
          >
            {/* Logo & Headline */}
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-2">
                <img
                  src="/bethel-logo.png"
                  alt="Bethel Comprehensive Insurance"
                  className="h-28 sm:h-36 w-auto object-contain drop-shadow-md transition-transform hover:scale-105"
                />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1b365d]">
                Espace Connexion
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1.5 max-w-sm">
                Connectez-vous à votre espace gestionnaire ou client pour piloter vos polices et déclarations.
              </p>
            </div>

            {/* Method Tabs: Email vs Phone */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('email')
                  setIdentifier('')
                }}
                className={`py-2.5 px-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  loginMethod === 'email'
                    ? 'bg-white text-[#1b365d] shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Mail className="h-3.5 w-3.5 text-blue-600" />
                <span>Adresse Email</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginMethod('phone')
                  setIdentifier('')
                }}
                className={`py-2.5 px-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  loginMethod === 'phone'
                    ? 'bg-white text-[#1b365d] shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                <span>Téléphone (+237)</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                  {loginMethod === 'email' ? 'Adresse Email' : 'N° de Téléphone Client / Agent'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    {loginMethod === 'email' ? (
                      <Mail className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Phone className="h-4 w-4 text-emerald-600" />
                    )}
                  </div>
                  <Input
                    type={loginMethod === 'email' ? 'email' : 'text'}
                    placeholder={
                      loginMethod === 'email' ? 'ex: nom@domaine.cm' : '+237 699 11 22 33'
                    }
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-11 h-12 bg-slate-50/60 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/20 rounded-xl text-xs font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                    Mot de passe
                  </label>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      toast.info("Veuillez contacter le support de l'agence pour réinitialiser votre accès.")
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    Mot de passe oublié ?
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <LockKeyhole className="h-4 w-4 text-amber-600" />
                  </div>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 pr-11 h-12 bg-slate-50/60 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/20 rounded-xl text-xs font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-amber-600 via-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer border-0 mt-4"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Vérification des identifiants...</span>
                  </>
                ) : (
                  <>
                    <span>Se connecter à mon compte</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Registration Redirect */}
            <div className="text-center pt-4 border-t border-slate-100 space-y-2">
              <p className="text-xs text-slate-500 font-medium">
                Vous n'avez pas encore d'espace client ?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/register')}
                  className="font-extrabold text-[#1b365d] hover:text-blue-700 hover:underline cursor-pointer"
                >
                  Créer un compte assuré
                </button>
              </p>
            </div>
          </motion.div>

          {/* Footer Branding & Badges */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>© 2026 Bethel Comprehensive Insurance Ltd.</span>
            <span className="flex items-center gap-1 font-semibold text-slate-500">
              <Lock className="h-3 w-3 text-emerald-600" /> Cryptage SSL 256-bit
            </span>
          </div>
        </div>

        {/* Right Side: Hero Visual Panel */}
        <div className="hidden lg:block lg:w-1/2 relative bg-[#1b365d] overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
            style={{ backgroundImage: "url('/hero-agent.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-[#1b365d]/60 to-[#1b365d]/20" />

          {/* Floating Glassmorphism Cards */}
          <div className="absolute inset-0 p-12 flex flex-col justify-between relative z-10">
            {/* Top Badge */}
            <div className="flex justify-end">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-full text-white text-xs font-bold flex items-center gap-2 shadow-lg">
                <Award className="h-4 w-4 text-amber-400" />
                <span>Agrément Réglementaire CIMA</span>
              </div>
            </div>

            {/* Bottom Hero Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/15 backdrop-blur-2xl p-8 rounded-3xl border border-white/25 shadow-2xl text-white space-y-4 max-w-lg"
            >
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-black leading-snug">
                "Une plateforme moderne pour gérer la souscription et le suivi des sinistres en toute sécurité."
              </h3>
              <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs text-slate-200">
                <span className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  +16 500 Assurés au Cameroun
                </span>
                <span className="text-amber-400 font-extrabold">Bethel Live</span>
              </div>
            </motion.div>
          </div>
        </div>

      </div>
    </div>
  )
}
