'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { PhoneField } from '@/components/ui/phone-field'
import { parseValidPhone, DEFAULT_PHONE_COUNTRY } from '@/lib/phone'
import type { CountryCode } from 'libphonenumber-js'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { motion } from 'framer-motion'
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Eye,
  EyeOff,
  LockKeyhole,
} from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL

export default function RegisterPage() {
  const t = useTranslations('auth.register')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const searchParams = useSearchParams()
  const simulationId = searchParams.get('simulation_id')

  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>(DEFAULT_PHONE_COUNTRY)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isNavigatingLogin, setIsNavigatingLogin] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !phone || !email || !password) {
      toast.error(tCommon('fillRequired'))
      return
    }

    const parsedPhone = parseValidPhone(phone, phoneCountry)
    if (!parsedPhone) {
      toast.error(tCommon('phoneInvalid'))
      return
    }

    setLoading(true)
    try {
      const resp = await fetch(`${API_BASE}/public/register-client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone: parsedPhone.e164,
          country_code: parsedPhone.country,
          email: email,
          password: password,
          quote_simulation_id: simulationId || null,
        }),
      })

      const data = await resp.json()

      if (resp.ok && data?.data?.access_token) {
        localStorage.setItem('client_access_token', data.data.access_token)
        toast.success(data.message || t('success'))
        setTimeout(() => {
          router.push('/dashboard')
        }, 1200)
      } else {
        toast.error(data?.message || t('error'))
      }
    } catch (err: any) {
      console.error(err)
      toast.error(t('server'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-[#1b365d] to-slate-950 text-slate-900 relative overflow-hidden">
      {/* Background Glowing Soft Effects */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-emerald-600/10 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full flex min-h-screen relative z-10">
        
        {/* Left Side: Form Container */}
        <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 lg:p-16 bg-white/95 backdrop-blur-2xl border-r border-white/20 shadow-2xl relative overflow-y-auto">
          
          {/* Top Navigation */}
          <div className="flex items-center justify-between">
            <Breadcrumb
              items={[
                { label: tCommon('breadcrumb.home'), href: '/' },
                { label: tCommon('breadcrumb.register') },
              ]}
            />

            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200/80">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                {t('badge')}
              </span>
            </div>
          </div>

          {/* Form Content */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-md w-full mx-auto space-y-5 my-auto py-6"
          >
            {/* Logo Header */}
            <div className="flex flex-col items-center text-center">
              <img
                src="/bethel-logo.png"
                alt="Bethel Comprehensive Insurance"
                className="h-28 sm:h-36 w-auto object-contain drop-shadow-md transition-transform hover:scale-105"
              />
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1b365d] mt-1">
                {t('title')}
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1 max-w-sm">
                {t('subtitle')}
              </p>
            </div>

            {/* Simulation Link Notification Badge */}
            {simulationId && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-950 font-bold shadow-2xs"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Votre simulation de devis sera directement rattachée à votre espace !</span>
              </motion.div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
              
              {/* Nom complet */}
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block">
                  {t('fullName')} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Jean Dupont"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-11 h-11 bg-slate-50/60 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/20 rounded-xl text-xs font-medium"
                    required
                  />
                </div>
              </div>

              {/* Téléphone */}
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block">
                  {t('phone')} *
                </label>
                <PhoneField
                  value={phone}
                  onChange={setPhone}
                  country={phoneCountry}
                  onCountryChange={setPhoneCountry}
                  required
                  placeholder="677000000"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block">
                  {t('email')} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4 text-indigo-600" />
                  </div>
                  <Input
                    type="email"
                    placeholder="jean.dupont@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-11 bg-slate-50/60 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/20 rounded-xl text-xs font-medium"
                    required
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block">
                  {t('password')} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <LockKeyhole className="h-4 w-4 text-amber-600" />
                  </div>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 pr-11 h-11 bg-slate-50/60 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/20 rounded-xl text-xs font-medium"
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
                    <span>{tCommon('loading')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('submit')}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Login Link */}
            <div className="text-center pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500 font-medium">
                {t('hasAccount')}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsNavigatingLogin(true)
                    router.push('/login')
                  }}
                  className="font-extrabold text-[#1b365d] hover:text-blue-700 hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  {isNavigatingLogin && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>{t('signIn')}</span>
                </button>
              </p>
            </div>
          </motion.div>

          {/* Footer Branding */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>© 2026 Bethel Comprehensive Insurance Ltd.</span>
            <span>Agréé Code CIMA</span>
          </div>
        </div>

        {/* Right Side: Hero Visual Panel */}
        <div className="hidden lg:block lg:w-1/2 relative bg-[#1b365d] overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
            style={{ backgroundImage: "url('/login-bg.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-[#1b365d]/60 to-[#1b365d]/20" />

          {/* Hero Content Overlay */}
          <div className="absolute inset-0 p-12 flex flex-col justify-between relative z-10">
            <div className="flex justify-end">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-full text-white text-xs font-bold flex items-center gap-2 shadow-lg">
                <ShieldCheck className="h-4 w-4 text-amber-400" />
                <span>Souscription 100% Digitale</span>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/15 backdrop-blur-2xl p-8 rounded-3xl border border-white/25 shadow-2xl text-white space-y-4 max-w-lg"
            >
              <h3 className="text-xl font-black leading-snug">
                "La souscription en ligne avec Bethel est d'une simplicité remarquable. Mon attestation m'a été délivrée en moins de 10 minutes."
              </h3>
              <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs text-slate-200">
                <span className="font-bold">Emmanuel K. — Assuré Auto & Santé</span>
                <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Vérifié
                </span>
              </div>
            </motion.div>
          </div>
        </div>

      </div>
    </div>
  )
}
