'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  ArrowRight,
  Car,
  HeartPulse,
  Plane,
  PiggyBank,
  CheckCircle2,
  Clock,
  Award,
  Smartphone,
  Headphones,
  Users,
  Handshake,
  Star,
  Download,
  LogIn,
  Send,
  Calculator,
  Check,
  Phone,
  MapPin,
  X,
  Lock,
  UserCheck,
  FileText,
  Loader2,
  AlertTriangle,
  Building,
  HelpCircle
} from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://gestion-d-assurance-v1-ten.vercel.app'

export default function Home() {
  const router = useRouter()

  // Track button click loading state
  const [loadingBtn, setLoadingBtn] = useState<string | null>(null)

  // Simulator State (Supports all 6 insurance product tabs)
  const [activeTab, setActiveTab] = useState<'AUTO' | 'SANTE' | 'VOYAGE' | 'HABITATION' | 'RETRAITE' | 'AUTRE'>('AUTO')
  
  // Auto inputs
  const [fiscalPower, setFiscalPower] = useState('1-6')
  const [usage, setUsage] = useState('PROMENADE')
  const [vehicleValue, setVehicleValue] = useState('5000000')
  const [coverageType, setCoverageType] = useState<'TIERS' | 'TOUS_RISQUES'>('TIERS')

  // Santé inputs
  const [santeLevel, setSanteLevel] = useState<'BRONZE' | 'SILVER' | 'GOLD'>('SILVER')
  const [santeBeneficiaries, setSanteBeneficiaries] = useState<'INDIVIDUEL' | 'COUPLE' | 'FAMILLE'>('INDIVIDUEL')
  const [santeAgeGroup, setSanteAgeGroup] = useState<'<30' | '30-50' | '>50'>('30-50')

  // Voyage inputs
  const [voyageZone, setVoyageZone] = useState<'SCHENGEN' | 'AFRIQUE' | 'MONDE'>('SCHENGEN')
  const [voyageDays, setVoyageDays] = useState('7')
  const [voyageTravelers, setVoyageTravelers] = useState('1')

  // Habitation inputs
  const [habPropertyType, setHabPropertyType] = useState<'APPARTEMENT' | 'VILLA'>('APPARTEMENT')
  const [habRooms, setHabRooms] = useState('3')
  const [habFurniture, setHabFurniture] = useState('3000000')

  // Retraite inputs
  const [retraiteMonthly, setRetraiteMonthly] = useState('25000')

  // Real-time backend quote response state
  const [computedTotal, setComputedTotal] = useState<number>(142500)
  const [breakdownLabel, setBreakdownLabel] = useState<string>('')
  const [simulationId, setSimulationId] = useState<string | null>(null)
  const [isComputingQuote, setIsComputingQuote] = useState(false)

  // Availability state from backend
  const [isServiceAvailable, setIsServiceAvailable] = useState<boolean>(true)
  const [unavailableMessage, setUnavailableMessage] = useState<string>('')

  // Auth / Registration Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'REGISTER' | 'LOGIN'>('REGISTER')
  const [loginType, setLoginType] = useState<'email' | 'phone'>('email')
  const [regFullName, setRegFullName] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [authFeedback, setAuthFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false)

  // Footer Lead Contact Form State
  const [leadName, setLeadName] = useState('')
  const [leadPhone, setLeadPhone] = useState('')
  const [leadEmail, setLeadEmail] = useState('')
  const [leadMessage, setLeadMessage] = useState('')
  const [leadFeedback, setLeadFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isSubmittingLead, setIsSubmittingLead] = useState(false)

  // Download links state from backend
  const [downloadLinks, setDownloadLinks] = useState<{ platform: string; url: string; label: string }[]>([])

  // Fetch download links from backend API on mount
  useEffect(() => {
    fetch(`${API_BASE}/public/download-links`)
      .then(res => res.json())
      .then(data => {
        if (data?.data?.items) {
          setDownloadLinks(data.data.items)
        }
      })
      .catch(() => {})
  }, [])

  // Call Backend API to compute quote in real time (100% Backend calculation)
  const computeQuoteFromBackend = async () => {
    setIsComputingQuote(true)

    if (activeTab === 'AUTRE') {
      setIsServiceAvailable(false)
      setUnavailableMessage("La tarification automatique pour cette assurance spécifique n'est pas encore disponible en ligne.")
      setSimulationId(null)
      setIsComputingQuote(false)
      return
    }

    try {
      let inputsPayload: Record<string, any> = {}

      if (activeTab === 'AUTO') {
        inputsPayload = {
          fiscal_power: fiscalPower,
          usage: usage,
          vehicle_value: parseFloat(vehicleValue) || 5000000,
          coverage_type: coverageType
        }
      } else if (activeTab === 'SANTE') {
        inputsPayload = {
          coverage_level: santeLevel,
          beneficiaries: santeBeneficiaries,
          age_group: santeAgeGroup
        }
      } else if (activeTab === 'VOYAGE') {
        inputsPayload = {
          zone: voyageZone,
          duration_days: parseInt(voyageDays) || 7,
          travelers_count: parseInt(voyageTravelers) || 1
        }
      } else if (activeTab === 'HABITATION') {
        inputsPayload = {
          property_type: habPropertyType,
          rooms: parseInt(habRooms) || 3,
          furniture_value: parseFloat(habFurniture) || 3000000
        }
      } else if (activeTab === 'RETRAITE') {
        inputsPayload = {
          monthly_contribution: parseFloat(retraiteMonthly) || 25000
        }
      }

      const resp = await fetch(`${API_BASE}/public/quotes/compute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_line: activeTab,
          inputs: inputsPayload
        })
      })

      const data = await resp.json()

      if (resp.ok && data?.data && data?.data?.is_available !== false) {
        setIsServiceAvailable(true)
        setComputedTotal(data.data.total || 0)
        setBreakdownLabel(data.data.breakdown?.label || '')
        setSimulationId(data.data.simulation_id || null)
      } else {
        setIsServiceAvailable(false)
        setUnavailableMessage(data?.data?.message || data?.message || "Service d'assurance indisponible pour le moment.")
        setSimulationId(null)
      }
    } catch (e) {
      setIsServiceAvailable(false)
      setUnavailableMessage("Service indisponible pour le moment (Erreur de connexion au serveur backend).")
      setSimulationId(null)
    } finally {
      setIsComputingQuote(false)
    }
  }

  useEffect(() => {
    computeQuoteFromBackend()
  }, [
    activeTab, 
    fiscalPower, usage, vehicleValue, coverageType,
    santeLevel, santeBeneficiaries, santeAgeGroup,
    voyageZone, voyageDays, voyageTravelers,
    habPropertyType, habRooms, habFurniture,
    retraiteMonthly
  ])

  // Submit Client Registration or Login to Backend
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingAuth(true)
    setAuthFeedback(null)

    try {
      if (authMode === 'REGISTER') {
        const resp = await fetch(`${API_BASE}/public/register-client`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: regFullName,
            phone: regPhone,
            email: regEmail,
            password: regPassword,
            quote_simulation_id: simulationId
          })
        })
        const data = await resp.json()

        if (resp.ok && data?.data?.access_token) {
          localStorage.setItem('client_access_token', data.data.access_token)
          setAuthFeedback({ type: 'success', message: 'Inscription réussie ! Redirection...' })
          setTimeout(() => {
            setIsAuthModalOpen(false)
            router.push('/dashboard')
          }, 1200)
        } else {
          setAuthFeedback({ type: 'error', message: data?.message || 'Erreur lors de l\'inscription.' })
        }
      } else {
        const loginValue = loginType === 'email' ? regEmail : regPhone
        if (!loginValue || !regPassword) {
          setAuthFeedback({ type: 'error', message: 'Veuillez remplir votre identifiant et votre mot de passe.' })
          return
        }

        const resp = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            login: loginValue,
            password: regPassword
          })
        })
        const data = await resp.json()

        if (resp.ok && (data?.data?.access_token || data?.data?.token)) {
          localStorage.setItem('client_access_token', data.data.access_token || data.data.token)
          setAuthFeedback({ type: 'success', message: 'Connexion réussie ! Redirection...' })
          setTimeout(() => {
            setIsAuthModalOpen(false)
            router.push('/dashboard')
          }, 800)
        } else {
          setAuthFeedback({ type: 'error', message: data?.message || 'Identifiants invalides.' })
        }
      }
    } catch (e) {
      setAuthFeedback({ type: 'error', message: 'Impossible de contacter le serveur.' })
    } finally {
      setIsSubmittingAuth(false)
    }
  }

  // Submit Lead Form to Backend
  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingLead(true)
    setLeadFeedback(null)

    try {
      const resp = await fetch(`${API_BASE}/public/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: leadName,
          phone: leadPhone,
          email: leadEmail || null,
          message: leadMessage,
          product_line: activeTab,
          quote_simulation_id: simulationId
        })
      })
      const data = await resp.json()
      if (resp.ok) {
        setLeadFeedback({ type: 'success', message: 'Votre message a bien été envoyé ! Un conseiller vous recontactera.' })
        setLeadName('')
        setLeadPhone('')
        setLeadEmail('')
        setLeadMessage('')
      } else {
        setLeadFeedback({ type: 'error', message: data?.message || 'Erreur lors de l\'envoi du message.' })
      }
    } catch (e) {
      setLeadFeedback({ type: 'error', message: 'Erreur réseau lors de la soumission.' })
    } finally {
      setIsSubmittingLead(false)
    }
  }

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1a1b21] font-sans overflow-x-hidden">

      {/* ------------------------------------------------------------- */}
      {/* 1. TOP NAV BAR (GRAPHICALLY EXACT AS SCREENSHOT 1)           */}
      {/* ------------------------------------------------------------- */}
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm border-b border-slate-200/60 h-20 flex items-center">
        <div className="flex justify-between items-center w-full px-4 md:px-8 max-w-7xl mx-auto h-full">
              {/* Logo Brand */}
          <div 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
            className="flex items-center cursor-pointer py-1"
          >
            <img 
              src="/logo-bethel.png" 
              alt="Bethel Comprehensive Insurance Ltd" 
              className="h-12 sm:h-14 w-auto object-contain"
            />
          </div>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold">
            <a href="#" className="text-[#1b365d] border-b-2 border-[#1b365d] pb-1 font-bold">Accueil</a>
            <button onClick={() => scrollToSection('products')} className="text-slate-600 hover:text-[#1b365d] transition-colors">Nos Assurances</button>
            <button onClick={() => scrollToSection('about')} className="text-slate-600 hover:text-[#1b365d] transition-colors">Comment ça marche</button>
            <button onClick={() => scrollToSection('simulator')} className="text-slate-600 hover:text-[#1b365d] transition-colors">Simuler un devis</button>
            <button onClick={() => scrollToSection('contact')} className="text-slate-600 hover:text-[#1b365d] transition-colors">Contact</button>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setLoadingBtn('header-login')
                router.push('/login')
              }}
              className="px-5 py-2.5 rounded-full border border-[#1b365d] text-[#1b365d] font-bold text-xs hover:bg-[#1b365d] hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
            >
              {loadingBtn === 'header-login' && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1b365d]" />}
              <span>Se connecter</span>
            </button>
            
            <button
              onClick={() => {
                setLoadingBtn('header-devis')
                scrollToSection('simulator')
                setTimeout(() => setLoadingBtn(null), 400)
              }}
              className="px-6 py-2.5 rounded-full bg-[#f59e0b] hover:bg-[#e08e00] text-white font-extrabold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              {loadingBtn === 'header-devis' && <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />}
              <span>Obtenir un devis</span>
            </button>
          </div>

        </div>
      </header>

      <main>
        {/* ------------------------------------------------------------- */}
        {/* 2. HERO SECTION (GRAPHICALLY EXACT AS SCREENSHOT 1)           */}
        {/* ------------------------------------------------------------- */}
        <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 bg-white overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Content */}
            <div className="space-y-6 z-10">
              <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-[#1b365d] font-extrabold text-xs tracking-wider uppercase">
                Courtier Agréé CIMA
              </span>
              
              <div className="space-y-1">
                <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-[#1b365d] leading-[1.05]">
                  Bethel Comprehensive
                </h1>
                <h1 className="text-6xl sm:text-8xl font-black tracking-tight text-[#3b82f6] leading-[1.05]">
                  Insurance
                </h1>
              </div>

              <p className="text-slate-600 text-base sm:text-lg max-w-lg leading-relaxed pt-2">
                Nous protégeons ce qui compte le plus pour vous avec des solutions d'assurance innovantes, transparentes et accessibles au Cameroun.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-4">
                <button
                  onClick={() => {
                    setLoadingBtn('hero-devis')
                    scrollToSection('simulator')
                    setTimeout(() => setLoadingBtn(null), 400)
                  }}
                  className="px-8 py-4 rounded-xl bg-[#f59e0b] hover:bg-[#e08e00] text-white font-extrabold text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {loadingBtn === 'hero-devis' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <>
                      <span>Obtenir un devis</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                
                <button 
                  onClick={() => scrollToSection('products')}
                  className="px-8 py-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#1b365d] font-bold text-sm transition-all cursor-pointer"
                >
                  Nos Services
                </button>
              </div>

              <div className="pt-6 border-t border-slate-100 flex items-center gap-6 text-xs font-semibold text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Rejoint par plus de 16k+ clients satisfaits</span>
                </div>
              </div>
            </div>

            {/* Right Hero Image (ENLARGED & FLOATING BADGES REMOVED AS DIRECTED) */}
            <div className="relative flex justify-center items-center">
              <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border-4 border-white max-w-xl w-full h-[550px] sm:h-[600px] bg-slate-100">
                <img
                  src="/hero-agent.jpg"
                  alt="Agent Bethel Comprehensive Insurance"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>

          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* 3. REASSURANCE PILLARS SECTION                                */}
        {/* ------------------------------------------------------------- */}
        <section className="py-12 bg-slate-50 border-y border-slate-200/60">
          <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white shadow-sm border border-slate-200/50">
              <div className="p-3 rounded-xl bg-blue-50 text-[#1b365d]">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-[#1b365d]">Devis en 2 min</h4>
                <p className="text-xs text-slate-500">Simulation rapide</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white shadow-sm border border-slate-200/50">
              <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-[#1b365d]">Agréé CIMA</h4>
                <p className="text-xs text-slate-500">Conformité totale</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white shadow-sm border border-slate-200/50">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-[#1b365d]">Mobile Money</h4>
                <p className="text-xs text-slate-500">Orange & MTN</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white shadow-sm border border-slate-200/50">
              <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
                <Headphones className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-[#1b365d]">Support 24/7</h4>
                <p className="text-xs text-slate-500">Assistance dédiée</p>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* 4. ABOUT SECTION                                              */}
        {/* ------------------------------------------------------------- */}
        <section className="py-20 bg-white" id="about">
          <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left About Image */}
            <div className="relative">
              <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white max-w-lg mx-auto h-[480px]">
                <img
                  src="/about-agent.jpg"
                  alt="Équipe Bethel Insurance"
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="absolute -bottom-6 -right-2 sm:right-6 bg-[#1b365d] text-white p-6 rounded-2xl shadow-xl max-w-xs">
                <p className="text-3xl font-black text-[#f59e0b]">24+</p>
                <p className="text-xs font-bold text-slate-200 mt-1">ANNÉES D'EXPERTISE DANS LE COURTAGE ET LE CONSEIL</p>
              </div>
            </div>

            {/* Right About Content */}
            <div className="space-y-6">
              <p className="text-[#3b82f6] font-bold text-xs uppercase tracking-widest">POURQUOI BETHEL ?</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1b365d] leading-tight">
                Plongez dans notre expertise et sécurisez votre avenir !
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                Nous simplifions le monde complexe de l'assurance pour vous offrir des solutions claires et adaptées à la réalité camerounaise. Bethel agit comme votre partenaire de confiance, négociant pour vous les meilleures garanties auprès des plus grands assureurs.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#f59e0b]" />
                  <span className="font-bold text-sm text-[#1b365d]">Optimisation fiscale pour les entreprises</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#f59e0b]" />
                  <span className="font-bold text-sm text-[#1b365d]">Gestion digitale des sinistres via notre App</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#f59e0b]" />
                  <span className="font-bold text-sm text-[#1b365d]">Couvertures internationales avec partenaires premium</span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => scrollToSection('contact')}
                  className="px-8 py-3.5 rounded-xl bg-[#1b365d] hover:bg-[#1b365d]/90 text-white font-bold text-sm transition-all shadow-md cursor-pointer"
                >
                  <span>En savoir plus</span>
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* 5. PRODUCTS SECTION                                           */}
        {/* ------------------------------------------------------------- */}
        <section className="py-20 bg-[#f5f6fa]" id="products">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="text-center space-y-4 mb-16">
              <p className="text-[#3b82f6] font-bold text-xs uppercase tracking-widest">NOS PRODUITS POPULAIRES</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1b365d]">Des Solutions pour chaque aspect de votre vie</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              
              {/* Product 1: Auto (CIRCULAR ICON REMOVED AS DIRECTED) */}
              <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-200/60 group flex flex-col justify-between">
                <div>
                  <span className="inline-block px-3.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold mb-5">Dès 25 000 FCFA/an</span>
                  <h3 className="text-xl font-bold text-[#1b365d] mb-2">Assurance Auto</h3>
                  <p className="text-slate-600 text-xs sm:text-sm mb-6 leading-relaxed">Protection tous risques ou au tiers avec dépannage 24h/24 inclus.</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">PARTENAIRE :</span>
                  <span className="font-bold text-xs text-[#1b365d]">Allianz Assurance</span>
                </div>
              </div>

              {/* Product 2: Santé (CIRCULAR ICON REMOVED AS DIRECTED) */}
              <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-200/60 group flex flex-col justify-between">
                <div>
                  <span className="inline-block px-3.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold mb-5">Dès 150 000 FCFA/an</span>
                  <h3 className="text-xl font-bold text-[#1b365d] mb-2">Santé Individuelle</h3>
                  <p className="text-slate-600 text-xs sm:text-sm mb-6 leading-relaxed">Prise en charge à 80% ou 100% dans tout le réseau médical national.</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">PARTENAIRE :</span>
                  <span className="font-bold text-xs text-[#1b365d]">AXA Assurance</span>
                </div>
              </div>

              {/* Product 3: Voyage (CIRCULAR ICON REMOVED AS DIRECTED) */}
              <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-200/60 group flex flex-col justify-between">
                <div>
                  <span className="inline-block px-3.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold mb-5">Dès 15 000 FCFA/voyage</span>
                  <h3 className="text-xl font-bold text-[#1b365d] mb-2">Assurance Voyage</h3>
                  <p className="text-slate-600 text-xs sm:text-sm mb-6 leading-relaxed">Couverture Schengen et monde entier avec rapatriement garanti.</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">PARTENAIRE :</span>
                  <span className="font-bold text-xs text-[#1b365d]">NSIA Assurance</span>
                </div>
              </div>

              {/* Product 4: Retraite (CIRCULAR ICON REMOVED AS DIRECTED) */}
              <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-200/60 group flex flex-col justify-between">
                <div>
                  <span className="inline-block px-3.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold mb-5">Dès 5 000 FCFA/mois</span>
                  <h3 className="text-xl font-bold text-[#1b365d] mb-2">Prévoyance & Retraite</h3>
                  <p className="text-slate-600 text-xs sm:text-sm mb-6 leading-relaxed">Constituez un capital pour vos vieux jours ou protégez votre famille.</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">PARTENAIRE :</span>
                  <span className="font-bold text-xs text-[#1b365d]">Saham Assurance</span>
                </div>
              </div>

            </div>

            <div className="mt-12 text-center">
              <button
                onClick={() => {
                  setLoadingBtn('products-all')
                  scrollToSection('simulator')
                  setTimeout(() => setLoadingBtn(null), 400)
                }}
                className="px-8 py-3.5 bg-[#1b365d] hover:bg-[#1b365d]/90 text-white rounded-xl font-bold text-sm transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
              >
                {loadingBtn === 'products-all' && <Loader2 className="h-4 w-4 animate-spin text-white" />}
                <span>Voir toutes nos solutions</span>
              </button>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* 6. QUOTE SIMULATOR MOBI-ASSUR V1 (GRAPHICALLY EXACT SCREENSHOT 2) */}
        {/* ------------------------------------------------------------- */}
        <section className="py-20 bg-[#1b365d] text-white" id="simulator">
          <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left Content */}
            <div className="space-y-6">
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">MOBI-ASSUR V1</h2>
              <p className="text-slate-200 text-base opacity-90 max-w-md leading-relaxed">
                Notre simulateur intelligent calcule votre prime en temps réel. Transparent, rapide et sans engagement.
              </p>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="p-5 bg-white/10 rounded-2xl border border-white/20">
                  <Calculator className="h-6 w-6 text-white mb-2" />
                  <p className="font-bold text-sm">Calcul Précis</p>
                </div>
                <div className="p-5 bg-white/10 rounded-2xl border border-white/20">
                  <Clock className="h-6 w-6 text-white mb-2" />
                  <p className="font-bold text-sm">Réponse Instantanée</p>
                </div>
              </div>
            </div>

            {/* Right Simulator Card Container */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 text-[#1a1b21] shadow-2xl">
              
              {/* Product Line Tabs (6 Product Lines Supported) */}
              <div className="flex flex-wrap gap-2 border-b border-slate-100 mb-6 pb-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('AUTO')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                    activeTab === 'AUTO' ? 'bg-[#1b365d] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Car className="h-3.5 w-3.5" /> Auto
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('SANTE')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                    activeTab === 'SANTE' ? 'bg-[#1b365d] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <HeartPulse className="h-3.5 w-3.5" /> Santé
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('VOYAGE')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                    activeTab === 'VOYAGE' ? 'bg-[#1b365d] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Plane className="h-3.5 w-3.5" /> Voyage
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('HABITATION')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                    activeTab === 'HABITATION' ? 'bg-[#1b365d] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Building className="h-3.5 w-3.5" /> Habitation
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('RETRAITE')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                    activeTab === 'RETRAITE' ? 'bg-[#1b365d] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <PiggyBank className="h-3.5 w-3.5" /> Retraite
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('AUTRE')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                    activeTab === 'AUTRE' ? 'bg-[#1b365d] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <HelpCircle className="h-3.5 w-3.5" /> Autre
                </button>
              </div>

              {/* Input Controls per Product Line */}
              <div className="space-y-5">
                
                {/* 1. AUTO FORM */}
                {activeTab === 'AUTO' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#1b365d] mb-1.5">Puissance Fiscale (CV)</label>
                        <select
                          value={fiscalPower}
                          onChange={(e) => setFiscalPower(e.target.value)}
                          className="w-full rounded-xl border-slate-200 focus:ring-[#1b365d] focus:border-[#1b365d] text-xs p-3 border bg-white font-semibold"
                        >
                          <option value="1-6">1 - 6 CV</option>
                          <option value="7-10">7 - 10 CV</option>
                          <option value="11+">11 CV +</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1b365d] mb-1.5">Usage du Véhicule</label>
                        <select
                          value={usage}
                          onChange={(e) => setUsage(e.target.value)}
                          className="w-full rounded-xl border-slate-200 focus:ring-[#1b365d] focus:border-[#1b365d] text-xs p-3 border bg-white font-semibold"
                        >
                          <option value="PROMENADE">Privé / Promenade</option>
                          <option value="TAXI">Taxi / Transport</option>
                          <option value="COMMERCIAL">Commercial / Agence</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1b365d] mb-1.5">Valeur Neuf du Véhicule (FCFA)</label>
                      <input
                        type="number"
                        value={vehicleValue}
                        onChange={(e) => setVehicleValue(e.target.value)}
                        placeholder="Ex: 5,000,000"
                        className="w-full rounded-xl border-slate-200 focus:ring-[#1b365d] focus:border-[#1b365d] text-xs p-3 border bg-white font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1b365d] mb-1.5">Type de Garantie</label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className={`border p-3 rounded-xl flex items-center gap-2 cursor-pointer transition-all ${coverageType === 'TIERS' ? 'border-[#1b365d] bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                          <input
                            type="radio"
                            name="cover"
                            checked={coverageType === 'TIERS'}
                            onChange={() => setCoverageType('TIERS')}
                            className="text-[#1b365d]"
                          />
                          <span className="text-xs font-bold text-slate-800">Tiers Simple</span>
                        </label>
                        <label className={`border p-3 rounded-xl flex items-center gap-2 cursor-pointer transition-all ${coverageType === 'TOUS_RISQUES' ? 'border-[#1b365d] bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                          <input
                            type="radio"
                            name="cover"
                            checked={coverageType === 'TOUS_RISQUES'}
                            onChange={() => setCoverageType('TOUS_RISQUES')}
                            className="text-[#1b365d]"
                          />
                          <span className="text-xs font-bold text-slate-800">Tous Risques</span>
                        </label>
                      </div>
                    </div>
                  </>
                )}

                {/* 2. SANTE FORM */}
                {activeTab === 'SANTE' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#1b365d] mb-1.5">Niveau de Couverture</label>
                        <select
                          value={santeLevel}
                          onChange={(e) => setSanteLevel(e.target.value as any)}
                          className="w-full rounded-xl border-slate-200 focus:ring-[#1b365d] focus:border-[#1b365d] text-xs p-3 border bg-white font-semibold"
                        >
                          <option value="BRONZE">Bronze (80% réseau national)</option>
                          <option value="SILVER">Silver (90% réseau national)</option>
                          <option value="GOLD">Gold (100% réseau + clinique premium)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1b365d] mb-1.5">Personnes à Couvrir</label>
                        <select
                          value={santeBeneficiaries}
                          onChange={(e) => setSanteBeneficiaries(e.target.value as any)}
                          className="w-full rounded-xl border-slate-200 focus:ring-[#1b365d] focus:border-[#1b365d] text-xs p-3 border bg-white font-semibold"
                        >
                          <option value="INDIVIDUEL">Individuel (1 personne)</option>
                          <option value="COUPLE">Couple (2 personnes)</option>
                          <option value="FAMILLE">Famille (Parents + Enfants)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1b365d] mb-1.5">Tranche d'Âge du Souscripteur</label>
                      <select
                        value={santeAgeGroup}
                        onChange={(e) => setSanteAgeGroup(e.target.value as any)}
                        className="w-full rounded-xl border-slate-200 focus:ring-[#1b365d] focus:border-[#1b365d] text-xs p-3 border bg-white font-semibold"
                      >
                        <option value="<30">Moins de 30 ans</option>
                        <option value="30-50">Entre 30 et 50 ans</option>
                        <option value=">50">Plus de 50 ans</option>
                      </select>
                    </div>
                  </>
                )}

                {/* 3. VOYAGE FORM */}
                {activeTab === 'VOYAGE' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#1b365d] mb-1.5">Zone Géographique</label>
                        <select
                          value={voyageZone}
                          onChange={(e) => setVoyageZone(e.target.value as any)}
                          className="w-full rounded-xl border-slate-200 focus:ring-[#1b365d] focus:border-[#1b365d] text-xs p-3 border bg-white font-semibold"
                        >
                          <option value="SCHENGEN">Zone Schengen (Europe)</option>
                          <option value="AFRIQUE">Zone Afrique</option>
                          <option value="MONDE">Monde Entier & USA</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1b365d] mb-1.5">Durée du Séjour</label>
                        <select
                          value={voyageDays}
                          onChange={(e) => setVoyageDays(e.target.value)}
                          className="w-full rounded-xl border-slate-200 focus:ring-[#1b365d] focus:border-[#1b365d] text-xs p-3 border bg-white font-semibold"
                        >
                          <option value="7">1 à 7 jours</option>
                          <option value="15">8 à 15 jours</option>
                          <option value="30">16 à 30 jours</option>
                          <option value="90">Jusqu'à 90 jours</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1b365d] mb-1.5">Nombre de Voyageurs</label>
                      <select
                        value={voyageTravelers}
                        onChange={(e) => setVoyageTravelers(e.target.value)}
                        className="w-full rounded-xl border-slate-200 focus:ring-[#1b365d] focus:border-[#1b365d] text-xs p-3 border bg-white font-semibold"
                      >
                        <option value="1">1 Voyageur principal</option>
                        <option value="2">2 Voyageurs</option>
                        <option value="3">3 Voyageurs ou Groupe</option>
                      </select>
                    </div>
                  </>
                )}

                {/* 4. HABITATION FORM */}
                {activeTab === 'HABITATION' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#1b365d] mb-1.5">Type de Logement</label>
                        <select
                          value={habPropertyType}
                          onChange={(e) => setHabPropertyType(e.target.value as any)}
                          className="w-full rounded-xl border-slate-200 focus:ring-[#1b365d] focus:border-[#1b365d] text-xs p-3 border bg-white font-semibold"
                        >
                          <option value="APPARTEMENT">Appartement</option>
                          <option value="VILLA">Villa / Maison Individuelle</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1b365d] mb-1.5">Nombre de Pièces Principales</label>
                        <select
                          value={habRooms}
                          onChange={(e) => setHabRooms(e.target.value)}
                          className="w-full rounded-xl border-slate-200 focus:ring-[#1b365d] focus:border-[#1b365d] text-xs p-3 border bg-white font-semibold"
                        >
                          <option value="2">1 à 2 pièces</option>
                          <option value="4">3 à 4 pièces</option>
                          <option value="6">5 pièces et plus</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1b365d] mb-1.5">Valeur Estimée du Mobilier (FCFA)</label>
                      <input
                        type="number"
                        value={habFurniture}
                        onChange={(e) => setHabFurniture(e.target.value)}
                        placeholder="Ex: 3,000,000"
                        className="w-full rounded-xl border-slate-200 focus:ring-[#1b365d] focus:border-[#1b365d] text-xs p-3 border bg-white font-semibold"
                      />
                    </div>
                  </>
                )}

                {/* 5. RETRAITE FORM */}
                {activeTab === 'RETRAITE' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-[#1b365d] mb-1.5">Cotisation Mensuelle Souhaitée (FCFA)</label>
                      <input
                        type="number"
                        value={retraiteMonthly}
                        onChange={(e) => setRetraiteMonthly(e.target.value)}
                        placeholder="Ex: 25,000 FCFA/mois"
                        className="w-full rounded-xl border-slate-200 focus:ring-[#1b365d] focus:border-[#1b365d] text-xs p-3 border bg-white font-semibold"
                      />
                    </div>
                    <div className="p-3 bg-blue-50/60 rounded-xl text-xs text-[#1b365d] font-semibold">
                      Projetez la constitution de votre capital retraite avec déductibilité fiscale au Cameroun.
                    </div>
                  </>
                )}

                {/* 6. AUTRE FORM (UNAVAILABLE DEMO) */}
                {activeTab === 'AUTRE' && (
                  <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800 font-semibold">
                    Assurances spécifiques (Transport Maritime, Responsabilité Civile Décennale, Risques Industriels).
                  </div>
                )}

                {/* ------------------------------------------------------------------------- */}
                {/* ESTIMATION OR SERVICE UNAVAILABLE NOTICE BOX (CONNECTED TO BACKEND)       */}
                {/* ------------------------------------------------------------------------- */}
                {isComputingQuote ? (
                  <div className="p-6 bg-slate-50 rounded-2xl text-center space-y-2">
                    <Loader2 className="h-6 w-6 animate-spin text-[#1b365d] mx-auto" />
                    <p className="text-xs font-bold text-[#1b365d]">Calcul de la tarification backend en cours...</p>
                  </div>
                ) : isServiceAvailable ? (
                  <>
                    <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-[#1b365d]/20 text-center space-y-1">
                      <p className="text-xs font-bold text-slate-500">{breakdownLabel || 'Estimation de votre prime'}</p>
                      <div className="text-3xl font-extrabold text-[#1b365d]">
                        ~ {new Intl.NumberFormat('fr-FR').format(computedTotal)} FCFA / {activeTab === 'VOYAGE' ? 'voyage' : activeTab === 'RETRAITE' ? 'an' : 'an'}
                      </div>
                      <p className="text-[10px] text-slate-400">Tarif calculé en temps réel par notre API sous réserve d'expertise.</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setLoadingBtn('simulator-register')
                        if (simulationId) {
                          router.push(`/register?simulation_id=${simulationId}`)
                        } else {
                          router.push('/register')
                        }
                      }}
                      className="w-full py-4 bg-[#f59e0b] hover:bg-[#e08e00] text-white font-extrabold text-base rounded-xl shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loadingBtn === 'simulator-register' ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin text-white" />
                          <span>Redirection...</span>
                        </>
                      ) : (
                        <>
                          <span>Continuer vers l'inscription</span>
                          <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="bg-amber-50 border-2 border-amber-200/80 p-6 rounded-2xl text-center space-y-3">
                    <div className="w-12 h-12 bg-amber-500/15 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-amber-950">Service indisponible pour le moment</h4>
                      <p className="text-xs text-amber-800 mt-1 max-w-sm mx-auto leading-relaxed">
                        {unavailableMessage || "La tarification en ligne pour ce type d'assurance n'est pas encore activée dans le système."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => scrollToSection('contact')}
                      className="px-6 py-3 bg-[#1b365d] hover:bg-[#1b365d]/90 text-white rounded-xl font-bold text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Demander une étude sur mesure</span>
                    </button>
                  </div>
                )}

              </div>

            </div>

          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* 7. TESTIMONIALS SECTION                                       */}
        {/* ------------------------------------------------------------- */}
        <section className="py-20 bg-[#f8fafc]">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="text-center space-y-4 mb-16">
              <p className="text-[#3b82f6] font-bold text-xs uppercase tracking-widest">TÉMOIGNAGES</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1b365d]">Ce que nos clients disent de nous</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-lg transition-shadow">
                <div className="flex gap-1 text-[#f59e0b] mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-slate-600 italic mb-8 leading-relaxed">
                  "L'assurance voyage a été souscrite en 5 minutes chrono pour mon visa. Service client très réactif via WhatsApp."
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200">
                    <img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150" alt="M. Jean-Paul T." />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-[#1b365d]">M. Jean-Paul T.</h5>
                    <p className="text-xs text-slate-400">Entrepreneur - Douala</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-lg transition-shadow">
                <div className="flex gap-1 text-[#f59e0b] mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-slate-600 italic mb-8 leading-relaxed">
                  "Suite à un accrochage, Bethel a géré tout le dossier avec l'expert. Je n'ai eu qu'à récupérer ma voiture réparée."
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200">
                    <img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150" alt="Mme Clarisse M." />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-[#1b365d]">Mme Clarisse M.</h5>
                    <p className="text-xs text-slate-400">Cadre bancaire - Yaoundé</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-lg transition-shadow">
                <div className="flex gap-1 text-[#f59e0b] mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-slate-600 italic mb-8 leading-relaxed">
                  "Les tarifs sont vraiment compétitifs. J'ai pu regrouper auto et habitation avec une belle réduction."
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200">
                    <img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150" alt="Dr. Ibrahim B." />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-[#1b365d]">Dr. Ibrahim B.</h5>
                    <p className="text-xs text-slate-400">Médecin - Garoua</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* 8. MOBILE APP SECTION                                         */}
        {/* ------------------------------------------------------------- */}
        <section className="py-20 bg-[#0f172a] text-white overflow-hidden" id="app-download">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="bg-[#1b365d]/40 rounded-[2.5rem] p-8 md:p-16 border border-white/10 relative overflow-hidden">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
                <div className="space-y-6">
                  <h2 className="text-3xl sm:text-5xl font-extrabold leading-tight">
                    Votre assurance dans <br /> la poche
                  </h2>
                  <p className="text-slate-300 text-sm sm:text-base opacity-90 max-w-md leading-relaxed">
                    Déclarez un sinistre, gérez vos polices et payez vos primes directement depuis votre smartphone.
                  </p>
                  
                  <div className="flex flex-wrap gap-4 pt-2">
                    <a 
                      href={downloadLinks.find(l => l.platform === 'APP_STORE')?.url || '#'}
                      className="flex items-center gap-3 bg-black border border-white/20 px-6 py-3.5 rounded-xl hover:bg-slate-900 transition-all"
                    >
                      <Download className="h-5 w-5 text-white" />
                      <div className="text-left">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Disponible sur</p>
                        <p className="text-sm font-bold">App Store</p>
                      </div>
                    </a>

                    <a 
                      href={downloadLinks.find(l => l.platform === 'PLAY_STORE')?.url || '#'}
                      className="flex items-center gap-3 bg-black border border-white/20 px-6 py-3.5 rounded-xl hover:bg-slate-900 transition-all"
                    >
                      <Download className="h-5 w-5 text-white" />
                      <div className="text-left">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Télécharger sur</p>
                        <p className="text-sm font-bold">Google Play</p>
                      </div>
                    </a>

                    <a 
                      href={downloadLinks.find(l => l.platform === 'ANDROID_APK')?.url || '#'}
                      className="flex items-center gap-3 bg-white/10 border border-white/20 px-6 py-3.5 rounded-xl hover:bg-white/20 transition-all"
                    >
                      <Smartphone className="h-5 w-5 text-[#f59e0b]" />
                      <div className="text-left">
                        <p className="text-[10px] uppercase font-bold text-slate-300">Direct Download</p>
                        <p className="text-sm font-bold">Fichier APK</p>
                      </div>
                    </a>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="relative w-[260px] h-[520px] bg-slate-800 rounded-[2.5rem] border-[6px] border-slate-700 shadow-2xl overflow-hidden">
                    <img 
                      className="w-full h-full object-cover" 
                      src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=500" 
                      alt="Application Mobile Bethel" 
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

      </main>

      {/* ------------------------------------------------------------- */}
      {/* 9. FOOTER SECTION                                             */}
      {/* ------------------------------------------------------------- */}
      <footer className="bg-[#1a1b21] text-white py-16" id="contact">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            
            <div className="space-y-4">
              <div className="flex items-center py-1">
                <img 
                  src="/logo-bethel.png" 
                  alt="Bethel Comprehensive Insurance Ltd" 
                  className="h-12 w-auto object-contain bg-white/90 p-1.5 rounded-lg"
                />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Leader du courtage en assurance au Cameroun. Une vision moderne et 100% digitale de la protection.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-xs text-[#f59e0b] uppercase tracking-wider">Liens Rapides</h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Mentions Légales</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Politique de Confidentialité</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Conditions Générales CIMA</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Recrutement</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ & Aide</a></li>
              </ul>
            </div>

            <div className="md:col-span-2 space-y-4">
              <h4 className="font-bold text-xs text-[#f59e0b] uppercase tracking-wider">Contactez nos conseillers</h4>
              
              {leadFeedback ? (
                <div className={`p-4 rounded-xl text-xs font-bold border ${leadFeedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                  {leadFeedback.message}
                </div>
              ) : (
                <form onSubmit={handleLeadSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder="Votre Nom complet"
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#f59e0b]"
                    />
                    <input
                      type="tel"
                      required
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      placeholder="Votre Téléphone (+237...)"
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#f59e0b]"
                    />
                  </div>

                  <input
                    type="email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    placeholder="Votre Email (optionnel)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#f59e0b]"
                  />

                  <textarea
                    rows={3}
                    value={leadMessage}
                    onChange={(e) => setLeadMessage(e.target.value)}
                    placeholder="Votre message ou besoin d'assurance..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#f59e0b]"
                  />

                  <button
                    type="submit"
                    disabled={isSubmittingLead}
                    className="w-full py-3 bg-[#f59e0b] hover:bg-[#e08e00] text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    <span>{isSubmittingLead ? 'Envoi en cours...' : 'Envoyer le message'}</span>
                  </button>
                </form>
              )}
            </div>

          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <p>© 2026 Bethel Comprehensive Insurance Ltd. Agréé CIMA.</p>
            <div className="flex gap-6">
              <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-[#f59e0b]" /> +237 699 00 00 00</span>
              <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-[#f59e0b]" /> Douala, Cameroun</span>
            </div>
          </div>

        </div>
      </footer>

      {/* ------------------------------------------------------------- */}
      {/* 10. INTERACTIVE AUTH / REGISTRATION MODAL CONNECTED TO BACKEND */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative space-y-6"
            >
              <button 
                onClick={() => setIsAuthModalOpen(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-6 w-6" />
              </button>

              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-blue-50 text-[#1b365d] rounded-2xl flex items-center justify-center mx-auto">
                  <UserCheck className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-[#1b365d]">
                  {authMode === 'REGISTER' ? 'Création de Compte Client' : 'Connexion Espace Client'}
                </h3>
                <p className="text-xs text-slate-500">
                  {authMode === 'REGISTER' 
                    ? 'Inscrivez-vous pour finaliser la souscription de votre devis.' 
                    : 'Accédez à votre espace pour gérer vos polices et déclarer vos sinistres.'}
                </p>
              </div>

              {authMode === 'LOGIN' && (
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/60 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginType('email')
                      setAuthFeedback(null)
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      loginType === 'email'
                        ? 'bg-white text-[#1b365d] shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Adresse Email
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginType('phone')
                      setAuthFeedback(null)
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      loginType === 'phone'
                        ? 'bg-white text-[#1b365d] shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Téléphone (+237)
                  </button>
                </div>
              )}

              {authFeedback && (
                <div className={`p-3 rounded-xl text-xs font-bold text-center ${
                  authFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                  {authFeedback.message}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === 'REGISTER' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nom complet</label>
                    <input
                      type="text"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="Ex: Jean Dupont"
                      className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:ring-[#1b365d] focus:border-[#1b365d]"
                    />
                  </div>
                )}

                {/* Show Phone if REGISTER or if LOGIN with phone type */}
                {(authMode === 'REGISTER' || (authMode === 'LOGIN' && loginType === 'phone')) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone (+237)</label>
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+237 699 11 22 33"
                      className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:ring-[#1b365d] focus:border-[#1b365d]"
                    />
                  </div>
                )}

                {/* Show Email if REGISTER or if LOGIN with email type */}
                {(authMode === 'REGISTER' || (authMode === 'LOGIN' && loginType === 'email')) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Adresse Email</label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="jean.dupont@gmail.com"
                      className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:ring-[#1b365d] focus:border-[#1b365d]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mot de passe</label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:ring-[#1b365d] focus:border-[#1b365d]"
                  />
                </div>

                {simulationId && authMode === 'REGISTER' && (
                  <div className="p-3 bg-blue-50 text-[#1b365d] rounded-xl text-xs font-bold flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span>Devis simulé automatiquement lié à votre profil</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  className="w-full py-4 bg-[#f59e0b] hover:bg-[#e08e00] text-white font-extrabold text-sm rounded-xl shadow-lg transition-all active:scale-95"
                >
                  {isSubmittingAuth 
                    ? 'Traitement...' 
                    : authMode === 'REGISTER' ? 'Créer mon compte et souscrire' : 'Se connecter'}
                </button>
              </form>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'REGISTER' ? 'LOGIN' : 'REGISTER')
                    setAuthFeedback(null)
                  }}
                  className="text-xs font-bold text-[#1b365d] hover:underline"
                >
                  {authMode === 'REGISTER' 
                    ? 'Déjà un compte ? Connectez-vous' 
                    : 'Pas encore de compte ? Inscrivez-vous'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
