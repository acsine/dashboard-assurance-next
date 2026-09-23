'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { authApi } from '@/lib/api/mobi-assur'
import { consumeAuthToast } from '@/lib/auth/session-expired'
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
  Phone,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Award,
  CheckCircle2,
  LockKeyhole,
} from 'lucide-react'

export default function LoginPage() {
  const t = useTranslations('auth.login')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const loginStore = useAuthStore((state) => state.login)
  const [loading, setLoading] = useState(false)
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email')

  const [identifier, setIdentifier] = useState('')
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>(DEFAULT_PHONE_COUNTRY)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const msg = consumeAuthToast()
    if (msg) toast.info(msg)
  }, [])

  useEffect(() => {
    const { body, documentElement } = document
    const prevBody = body.style.overflow
    const prevHtml = documentElement.style.overflow
    body.style.overflow = 'hidden'
    documentElement.style.overflow = 'hidden'
    return () => {
      body.style.overflow = prevBody
      documentElement.style.overflow = prevHtml
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier || !password) {
      toast.error(tCommon('fillRequired'))
      return
    }

    let login = identifier.trim()
    if (loginMethod === 'phone') {
      const parsed = parseValidPhone(login, phoneCountry)
      if (!parsed) {
        toast.error(tCommon('phoneInvalid'))
        return
      }
      login = parsed.e164
    }

    setLoading(true)
    try {
      const response = await authApi.login({
        login,
        password: password,
      })

      if (response.user) {
        loginStore(response.user)
        toast.success(response.message || t('success'))
        router.push('/dashboard')
      } else {
        toast.error(t('noProfile'))
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || t('invalid'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex h-dvh max-h-dvh w-full overflow-hidden bg-gradient-to-br from-slate-900 via-[#1b365d] to-slate-950 text-slate-900">
      {/* Soft Background Glowing Orbs */}
      <div className="absolute top-0 left-1/4 w-[min(600px,80vw)] h-[min(600px,50vh)] bg-blue-600/15 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[min(500px,70vw)] h-[min(500px,45vh)] bg-amber-500/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 flex h-full min-h-0 w-full">
        {/* Left Side: Premium Login Card Container */}
        <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden border-r border-white/20 bg-white/95 px-4 pb-4 pt-2 shadow-2xl backdrop-blur-2xl sm:px-6 sm:pb-5 sm:pt-2.5 lg:w-1/2 lg:px-10 lg:pb-6 lg:pt-3 xl:px-12">
          {/* Top Header Navigation */}
          <div className="-mt-0.5 flex shrink-0 items-center justify-between gap-2">
            <Breadcrumb
              className="min-w-0 truncate max-sm:[&_ol]:text-[10px]"
              items={[
                { label: tCommon('breadcrumb.home'), href: '/' },
                { label: tCommon('breadcrumb.login') },
              ]}
            />

            <LanguageSwitcher variant="toolbar" />
          </div>

          {/* Center Form Section */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto flex w-full max-w-md min-h-0 flex-1 flex-col justify-start space-y-3 pt-3 sm:space-y-4 sm:pt-4 lg:pt-5 [@media(max-height:700px)]:space-y-2 [@media(max-height:700px)]:pt-2"
          >
            {/* Logo & Headline */}
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-1 sm:mb-2">
                <img
                  src="/bethel-logo.png"
                  alt="Bethel Comprehensive Insurance"
                  className="h-[clamp(3.5rem,14vh,9rem)] w-auto max-h-[22vh] object-contain drop-shadow-md"
                />
              </div>
              <h1 className="text-[clamp(1.35rem,4.5vw,2.25rem)] font-black leading-tight tracking-tight text-[#1b365d]">
                {t('title')}
              </h1>
              <p className="mt-1 max-w-sm text-[11px] font-medium text-slate-500 sm:text-xs [@media(max-height:700px)]:hidden">
                {t('subtitle')}
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
                <span>{t('emailTab')}</span>
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
                <span>{t('phoneTab')}</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3 pt-0 sm:space-y-4 sm:pt-1 [@media(max-height:700px)]:space-y-2">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                  {loginMethod === 'email' ? t('emailLabel') : t('phoneLabel')}
                </label>
                {loginMethod === 'email' ? (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4 text-blue-600" />
                    </div>
                    <Input
                      type="email"
                      placeholder={t('emailPlaceholder')}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="h-11 pl-11 rounded-xl border-slate-200 bg-slate-50/60 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-[#1b365d] focus:bg-white focus:ring-2 focus:ring-[#1b365d]/20 sm:h-12"
                      required
                    />
                  </div>
                ) : (
                  <PhoneField
                    value={identifier}
                    onChange={setIdentifier}
                    country={phoneCountry}
                    onCountryChange={setPhoneCountry}
                    required
                    placeholder={t('phonePlaceholder')}
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                    {t('password')}
                  </label>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      toast.info(t('forgotHint'))
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    {t('forgot')}
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
                    className="h-11 rounded-xl border-slate-200 bg-slate-50/60 pl-11 pr-11 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-[#1b365d] focus:bg-white focus:ring-2 focus:ring-[#1b365d]/20 sm:h-12"
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
                className="mt-2 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-gradient-to-r from-amber-600 via-amber-600 to-amber-700 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all hover:from-amber-700 hover:to-amber-800 hover:shadow-lg active:scale-[0.98] sm:mt-4 sm:h-12"
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

            {/* Registration Redirect */}
            <div className="space-y-2 border-t border-slate-100 pt-3 text-center sm:pt-4">
              <p className="text-[11px] font-medium text-slate-500 sm:text-xs">
                {t('noAccount')}{' '}
                <button
                  type="button"
                  onClick={() => router.push('/register')}
                  className="font-extrabold text-[#1b365d] hover:text-blue-700 hover:underline cursor-pointer"
                >
                  {t('createAccount')}
                </button>
              </p>
            </div>
          </motion.div>

          {/* Footer Branding & Badges */}
          <div className="flex shrink-0 flex-col items-center justify-between gap-1 border-t border-slate-100 pt-2 text-[10px] text-slate-400 sm:flex-row sm:gap-2 sm:pt-3 sm:text-[11px] [@media(max-height:640px)]:hidden">
            <span className="text-center sm:text-left">© 2026 Bethel Comprehensive Insurance Ltd.</span>
            <span className="flex items-center gap-1 font-semibold text-slate-500">
              <Lock className="h-3 w-3 text-emerald-600" /> {t('ssl')}
            </span>
          </div>
        </div>

        {/* Right Side: Hero Visual Panel */}
        <div className="relative hidden h-full min-h-0 overflow-hidden bg-[#1b365d] lg:block lg:w-1/2">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
            style={{ backgroundImage: "url('/hero-agent.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-[#1b365d]/60 to-[#1b365d]/20" />

          {/* Floating Glassmorphism Cards */}
          <div className="absolute inset-0 z-10 flex flex-col justify-between p-8 xl:p-12">
            {/* Top Badge */}
            <div className="flex justify-end">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-full text-white text-xs font-bold flex items-center gap-2 shadow-lg">
                <Award className="h-4 w-4 text-amber-400" />
                <span>{t('cimaLicense')}</span>
              </div>
            </div>

            {/* Bottom Hero Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="max-w-lg space-y-3 rounded-3xl border border-white/25 bg-white/15 p-6 text-white shadow-2xl backdrop-blur-2xl xl:space-y-4 xl:p-8"
            >
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-black leading-snug">
                "{t('quote')}"
              </h3>
              <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs text-slate-200">
                <span className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  {t('insuredCount')}
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
