'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Mail, Lock, Phone, User, ArrowRight, Loader2, CheckCircle2, Shield } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://gestion-d-assurance-v1-ten.vercel.app'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const simulationId = searchParams.get('simulation_id')

  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isNavigatingLogin, setIsNavigatingLogin] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !phone || !email || !password) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    setLoading(true)
    try {
      const resp = await fetch(`${API_BASE}/public/register-client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone: phone,
          email: email,
          password: password,
          quote_simulation_id: simulationId || null
        })
      })

      const data = await resp.json()

      if (resp.ok && data?.data?.access_token) {
        localStorage.setItem('client_access_token', data.data.access_token)
        toast.success(data.message || 'Création de compte réussie ! Redirection...')
        setTimeout(() => {
          router.push('/dashboard')
        }, 1200)
      } else {
        toast.error(data?.message || 'Erreur lors de la création de votre compte')
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Impossible de contacter le serveur d\'inscription.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-white text-gray-900">
      {/* Left side: Registration Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12 bg-white relative z-10">
        <div className="max-w-md w-full mx-auto space-y-5">
          
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center gap-0">
            <img
              src="/bethel-logo.png"
              alt="Bethel Comprehensive Insurance"
              className="h-44 sm:h-56 md:h-64 w-auto max-w-[min(100%,28rem)] object-contain -mb-8 sm:-mb-12 md:-mb-14"
            />
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 leading-tight">
              Créer mon compte Client
            </h2>
            <p className="text-gray-500 text-xs sm:text-sm max-w-sm mt-1">
              Finalisez votre inscription pour consulter votre devis et gérer vos souscriptions.
            </p>
          </div>

          {/* Simulation Link Badge */}
          {simulationId && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-blue-50 border border-blue-200/60 rounded-xl flex items-center gap-2.5 text-xs text-[#1b365d] font-bold"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Votre devis simulé sera automatiquement lié à votre espace !</span>
            </motion.div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Nom complet */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Nom complet
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="h-4.5 w-4.5" />
                </div>
                <Input
                  type="text"
                  placeholder="Jean Dupont"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-11 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20"
                  required
                />
              </div>
            </div>

            {/* Téléphone */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                N° de Téléphone (+237)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Phone className="h-4.5 w-4.5" />
                </div>
                <Input
                  type="tel"
                  placeholder="+237 699 11 22 33"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-11 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Adresse E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="h-4.5 w-4.5" />
                </div>
                <Input
                  type="email"
                  placeholder="jean.dupont@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20"
                  required
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Mot de passe
              </label>
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

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#f59e0b] hover:bg-[#e08e00] active:scale-[0.98] rounded-xl text-sm font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 mt-6 text-white border-0 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Création du compte...
                </>
              ) : (
                <>
                  Créer mon compte et souscrire
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Link to Login */}
          <div className="text-center pt-4">
            <p className="text-xs text-gray-500 font-medium flex items-center justify-center gap-1.5">
              <span>Vous possédez déjà un compte ?</span>
              <button
                type="button"
                onClick={() => {
                  setIsNavigatingLogin(true)
                  router.push('/login')
                }}
                className="font-bold text-[#1b365d] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                {isNavigatingLogin && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>Se connecter</span>
              </button>
            </p>
          </div>

          {/* Footer branding */}
          <p className="text-xs text-gray-400 text-center pt-6 border-t border-gray-100">
            © 2026 Bethel Comprehensive Insurance. Tous droits réservés.
          </p>
        </div>
      </div>

      {/* Right side: Image Panel */}
      <div className="hidden lg:block lg:w-1/2 relative bg-gray-950">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/login-bg.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-gray-950/20 to-transparent" />
        
        {/* Quote / Overlay Info */}
        <div className="absolute bottom-12 left-12 right-12 text-white space-y-3 p-6 bg-gray-950/40 backdrop-blur-md rounded-2xl border border-white/10">
          <span className="text-[10px] font-bold tracking-widest text-[#f59e0b] uppercase flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Espace Assurance Client 100% Sécurisé
          </span>
          <p className="text-lg font-medium leading-snug">
            "La souscription en ligne avec Bethel est d'une simplicité remarquable. Mon attestation d'assurance m'a été délivrée en moins de 10 minutes après paiement."
          </p>
          <span className="text-xs font-semibold block text-gray-300">
            Emmanuel K. — Assuré Auto & Santé
          </span>
        </div>
      </div>
    </div>
  )
}
