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
  HelpCircle,
  Play,
  TrendingUp,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Globe
} from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'

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

  // Video Modal State
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)

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

  // Call Backend API to compute quote in real time
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

  // Handle Auth / Registration Submission
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthFeedback(null)
    setIsSubmittingAuth(true)

    try {
      if (authMode === 'REGISTER') {
        const resp = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: regFullName,
            phone: regPhone,
            email: regEmail,
            password: regPassword,
            simulation_id: simulationId
          })
        })
        const data = await resp.json()
        if (resp.ok) {
          setAuthFeedback({ type: 'success', message: 'Compte créé avec succès ! Redirection vers la souscription...' })
          setTimeout(() => {
            setIsAuthModalOpen(false)
            router.push('/login')
          }, 1500)
        } else {
          setAuthFeedback({ type: 'error', message: data?.detail || data?.message || 'Erreur lors de la création du compte.' })
        }
      } else {
        const resp = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            login: loginType === 'email' ? regEmail : regPhone,
            password: regPassword
          })
        })
        const data = await resp.json()
        if (resp.ok) {
          setAuthFeedback({ type: 'success', message: 'Connexion réussie ! Redirection...' })
          setTimeout(() => {
            setIsAuthModalOpen(false)
            router.push('/dashboard')
          }, 1000)
        } else {
          setAuthFeedback({ type: 'error', message: data?.detail || data?.message || 'Identifiants incorrects.' })
        }
      }
    } catch (err) {
      setAuthFeedback({ type: 'error', message: 'Erreur réseau. Veuillez réessayer.' })
    } finally {
      setIsSubmittingAuth(false)
    }
  }

  // Handle Lead Contact Submission
  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLeadFeedback(null)
    setIsSubmittingLead(true)

    try {
      const resp = await fetch(`${API_BASE}/public/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: leadName,
          phone: leadPhone,
          email: leadEmail,
          message: leadMessage
        })
      })
      const data = await resp.json()
      if (resp.ok) {
        setLeadFeedback({ type: 'success', message: 'Merci ! Votre message a bien été transmis à un conseiller MobiAssur.' })
        setLeadName('')
        setLeadPhone('')
        setLeadEmail('')
        setLeadMessage('')
      } else {
        setLeadFeedback({ type: 'error', message: data?.detail || data?.message || 'Erreur lors de l’envoi de votre message.' })
      }
    } catch (err) {
      setLeadFeedback({ type: 'error', message: 'Erreur réseau lors de l’envoi.' })
    } finally {
      setIsSubmittingLead(false)
    }
  }

  // Insurance services list
  const services = [
    {
      id: 'auto',
      icon: Car,
      title: 'Assurance Automobile',
      desc: 'Couverture Tiers & Tous Risques sur mesure avec assistance 24/7 et indemnisation rapide.',
      badge: 'Populaire',
      color: 'blue'
    },
    {
      id: 'sante',
      icon: HeartPulse,
      title: 'Santé & Évacuation',
      desc: 'Prise en charge médicale instantanée, tiers-payant national et options d’évacuation sanitaire.',
      badge: 'Essentiel',
      color: 'emerald'
    },
    {
      id: 'voyage',
      icon: Plane,
      title: 'Voyage International',
      desc: 'Attestation conforme visas Schengen, couverture frais médicaux et rapatriement à l’étranger.',
      badge: 'Conforme Schengen',
      color: 'indigo'
    },
    {
      id: 'habitation',
      icon: Building,
      title: 'Habitation & Risques',
      desc: 'Protection de votre logement, mobilier et responsabilité civile contre les dommages et le vol.',
      badge: 'Sécurité',
      color: 'amber'
    },
    {
      id: 'retraite',
      icon: PiggyBank,
      title: 'Épargne & Retraite',
      desc: 'Constituez un capital garanti à votre rythme avec une rémunération attrayante et sécurisée.',
      badge: 'Avenir',
      color: 'purple'
    },
    {
      id: 'pro',
      icon: Handshake,
      title: 'Flottes & Entreprises',
      desc: 'Solutions multirisques pro, responsabilité civile et couverture des salariés pour PME & Grands Comptes.',
      badge: 'B2B',
      color: 'cyan'
    }
  ]

  // Stats list
  const stats = [
    { value: '500+', label: 'Clients & Flottes', icon: Users },
    { value: '1 200+', label: 'Contrats Émis', icon: FileText },
    { value: '15+', label: 'Années d’Expérience', icon: Award },
    { value: '30+', label: 'Guichets & Agences', icon: Globe },
  ]

  // Partner logos list
  const partners = [
    { name: 'AXA Assurances', logo: '/bethel-logo.png' },
    { name: 'Saham Assurance', logo: '/bethel-logo.png' },
    { name: 'Allianz Cameroun', logo: '/bethel-logo.png' },
    { name: 'Chanas Assurances', logo: '/bethel-logo.png' },
    { name: 'Activa Assurances', logo: '/bethel-logo.png' },
    { name: 'Sunu Assurances', logo: '/bethel-logo.png' },
    { name: 'NSIA Assurances', logo: '/bethel-logo.png' }
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden selection:bg-blue-600 selection:text-white">
      
      {/* 1. Header Navigation Glassmorphism */}
      <header className="sticky top-0 z-50 glass-header shadow-xs transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <img
              src="/bethel-logo.png"
              alt="Bethel Comprehensive Insurance"
              className="h-10 w-auto object-contain"
            />
            <div className="hidden sm:block border-l border-slate-200 pl-3">
              <h1 className="text-sm font-extrabold text-slate-900 leading-tight">MobiAssur</h1>
              <p className="text-[10px] font-bold text-blue-700 tracking-widest uppercase">Bethel Insurance</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#hero" className="hover:text-blue-700 transition-colors">Accueil</a>
            <a href="#services" className="hover:text-blue-700 transition-colors">Nos Services</a>
            <a href="#partenaire" className="hover:text-blue-700 transition-colors">Pourquoi Nous</a>
            <a href="#simulateur" className="hover:text-blue-700 transition-colors">Simulateur</a>
            <a href="#contact" className="hover:text-blue-700 transition-colors">Contact</a>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-blue-700 hover:bg-slate-100/80 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="h-4 w-4" />
              <span>Espace Client</span>
            </button>

            <button
              onClick={() => {
                setAuthMode('REGISTER')
                setIsAuthModalOpen(true)
              }}
              className="px-4.5 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-all pro-shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Souscrire</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section id="hero" className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-gradient-to-b from-blue-50/60 via-slate-50 to-slate-50">
        
        {/* Soft Background Accents */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-400/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <motion.div 
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7 space-y-6 text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 border border-blue-200/80 text-blue-800 text-xs font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                <span>L'Assurance Intelligente • Agrée CIMA Cameroun</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
                Innovons Aujourd'hui,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-blue-800 to-amber-600">
                  Inspirons Demain
                </span>
              </h1>

              <p className="text-slate-600 text-base sm:text-lg max-w-2xl font-medium leading-relaxed mx-auto lg:mx-0">
                Nous délivrons des solutions d'assurance intelligentes qui accélèrent la croissance, protègent les entreprises et sécurisent les familles avec une transparence totale.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <a href="#services">
                  <button className="px-6 py-3.5 text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-all pro-shadow-md flex items-center gap-2.5 cursor-pointer active:scale-95">
                    <span>Nos Services</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </a>

                <a href="#simulateur">
                  <button className="px-6 py-3.5 text-sm font-bold text-blue-900 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-all pro-shadow-sm flex items-center gap-2.5 cursor-pointer">
                    <Calculator className="h-4.5 w-4.5 text-blue-700" />
                    <span>Simuler un Devis</span>
                  </button>
                </a>

                <button
                  onClick={() => setIsVideoModalOpen(true)}
                  className="px-5 py-3.5 text-sm font-semibold text-slate-700 hover:text-blue-700 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                    <Play className="h-4 w-4 fill-blue-700 ml-0.5" />
                  </div>
                  <span>Voir la Vidéo</span>
                </button>
              </div>
            </motion.div>

            {/* Right Media / Visual Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="lg:col-span-5 relative"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/80 bg-white p-3">
                <img
                  src="/hero-agent.jpg"
                  alt="Bethel Comprehensive Insurance Modern Headquarters"
                  className="w-full h-[380px] sm:h-[440px] object-cover rounded-2xl"
                />
                
                {/* Floating Experience Badge matching Reference Design */}
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="absolute bottom-7 left-7 right-7 bg-white/95 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/80 pro-shadow-lg flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                    <Award className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-xl font-extrabold text-slate-900 leading-tight">15+ Années</h4>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">D'excellence et de partenariats CIMA durables</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>

          </div>

          {/* FLOATING STATS BAR (4 Columns) matching Reference Design */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-16 bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 pro-shadow-md p-6 sm:p-8"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 divide-x-0 md:divide-x divide-slate-100">
              {stats.map((st, i) => (
                <div key={i} className={`flex items-center gap-4 ${i !== 0 ? 'md:pl-8' : ''}`}>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                    <st.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight block">
                      {st.value}
                    </span>
                    <span className="text-xs font-bold text-slate-500 mt-0.5 block">
                      {st.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </section>

      {/* 3. NOS SOLUTIONS SECTION (Cards with hover animations matching Reference) */}
      <section id="services" className="py-20 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <span className="text-xs font-extrabold text-blue-700 uppercase tracking-widest block mb-2">
                CE QUE NOUS PROPOSONS
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Des Solutions qui Créent un <span className="text-blue-700">Vrai Impact</span>
              </h2>
            </div>
            
            <a href="#simulateur">
              <button className="inline-flex items-center gap-2 text-xs font-extrabold text-blue-700 hover:text-blue-900 transition-colors">
                <span>Explorer Toutes Nos Offres</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </a>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((svc, i) => (
              <motion.div
                key={svc.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                whileHover={{ y: -6 }}
                className="bg-slate-50/80 hover:bg-white rounded-2xl p-7 border border-slate-200/80 hover:border-blue-300 pro-shadow-sm hover:pro-shadow-lg transition-all duration-300 flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-blue-700 group-hover:bg-blue-700 group-hover:text-white transition-colors duration-300">
                      <svc.icon className="h-6 w-6" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100/80 text-blue-800 border border-blue-200/60">
                      {svc.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors mb-2.5">
                    {svc.title}
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">
                    {svc.desc}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-700 group-hover:text-blue-900 inline-flex items-center gap-1">
                    En savoir plus
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1.5 transition-transform" />
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* 4. PARTENAIRE DE CONFIANCE & PROGRESSION BARS (Matching Reference Design) */}
      <section id="partenaire" className="py-20 bg-slate-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column Text & Checks */}
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-extrabold text-blue-700 uppercase tracking-widest block">
                À PROPOS DE MOBIASSUR & BETHEL
              </span>
              
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Votre Partenaire de Confiance pour une <span className="text-blue-700">Croissance Durable</span>
              </h2>

              <p className="text-slate-600 text-sm sm:text-base font-medium leading-relaxed">
                Chez Bethel Comprehensive Insurance, nous combinons innovation digitale, expertise financière et collaboration étroite pour aider les entreprises et les particuliers à sécuriser leur patrimoine et concrétiser leurs projets.
              </p>

              {/* Checkmarks */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-slate-800 text-sm font-bold">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <span>Approche 100% centrée sur le client et l'assuré</span>
                </div>

                <div className="flex items-center gap-3 text-slate-800 text-sm font-bold">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <span>Traitement accéléré des indemnités de sinistre sous 24h</span>
                </div>

                <div className="flex items-center gap-3 text-slate-800 text-sm font-bold">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <span>Agrément CIMA et conformité réglementaire stricte</span>
                </div>
              </div>

              {/* PROGRESSION BARS (Motion progress bars) */}
              <div className="space-y-5 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-extrabold text-slate-800">
                    <span>Taux de Satisfaction Client</span>
                    <span className="text-blue-700">99.4%</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: '99.4%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full bg-blue-700 rounded-full"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-extrabold text-slate-800">
                    <span>Règlement des Sinistres (Délai 24-48h)</span>
                    <span className="text-emerald-700">98.2%</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: '98.2%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.1, ease: 'easeOut' }}
                      className="h-full bg-emerald-600 rounded-full"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-extrabold text-slate-800">
                    <span>Conformité & Protection CIMA</span>
                    <span className="text-amber-700">100%</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: '100%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
                      className="h-full bg-amber-600 rounded-full"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => router.push('/login')}
                  className="px-6 py-3 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-all pro-shadow-sm cursor-pointer active:scale-95"
                >
                  En savoir plus sur MobiAssur
                </button>
              </div>
            </div>

            {/* Right Column Image & Floating Card */}
            <div className="lg:col-span-6 relative">
              <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 shadow-2xl bg-white p-3">
                <img
                  src="/hero-agent.jpg"
                  alt="Partenaire de croissance Bethel Insurance"
                  className="w-full h-[400px] object-cover rounded-2xl"
                />

                {/* Floating experience card matching reference */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-slate-200 shadow-xl max-w-xs"
                >
                  <span className="text-2xl font-extrabold text-blue-700 block">15+ Ans</span>
                  <h4 className="text-xs font-extrabold text-slate-900 mt-0.5">D'Expérience Terrain</h4>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">Accompagnement continu des entreprises et assurés du Cameroun.</p>
                </motion.div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 5. SIMULATEUR DE TARIFICATION EN TEMPS RÉEL */}
      <section id="simulateur" className="py-20 bg-white relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-extrabold text-blue-700 uppercase tracking-widest block mb-2">
              SIMULATEUR DE TARIFICATION EN TEMPS RÉEL
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Calculez Votre Tarif en <span className="text-blue-700">Quelques Clics</span>
            </h2>
            <p className="text-slate-600 text-sm font-medium mt-2">
              Tarification 100% calculée et certifiée par notre moteur d'assurance backend.
            </p>
          </div>

          <div className="bg-slate-50 rounded-3xl border border-slate-200/90 pro-shadow-lg p-6 sm:p-10">
            
            {/* Tabs */}
            <div className="flex overflow-x-auto gap-2 p-1.5 bg-white rounded-2xl border border-slate-200/80 mb-8 scrollbar-hide">
              {[
                { id: 'AUTO', label: 'Auto', icon: Car },
                { id: 'SANTE', label: 'Santé', icon: HeartPulse },
                { id: 'VOYAGE', label: 'Voyage', icon: Plane },
                { id: 'HABITATION', label: 'Habitation', icon: Building },
                { id: 'RETRAITE', label: 'Retraite', icon: PiggyBank },
              ].map((tb) => (
                <button
                  key={tb.id}
                  onClick={() => setActiveTab(tb.id as any)}
                  className={`flex-1 min-w-[110px] py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === tb.id
                      ? 'bg-blue-700 text-white pro-shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <tb.icon className="h-4 w-4" />
                  <span>{tb.label}</span>
                </button>
              ))}
            </div>

            {/* Inputs & Total Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              
              {/* Left Column Controls */}
              <div className="md:col-span-7 space-y-4">
                {activeTab === 'AUTO' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Puissance Fiscale</label>
                      <select
                        value={fiscalPower}
                        onChange={(e) => setFiscalPower(e.target.value)}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-800"
                      >
                        <option value="1-6">1 à 6 CV</option>
                        <option value="7-10">7 à 10 CV</option>
                        <option value="11+">11 CV et plus</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Formule de Couverture</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCoverageType('TIERS')}
                          className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${
                            coverageType === 'TIERS' ? 'bg-blue-50 text-blue-800 border-blue-300' : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          Tiers Simple
                        </button>
                        <button
                          type="button"
                          onClick={() => setCoverageType('TOUS_RISQUES')}
                          className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${
                            coverageType === 'TOUS_RISQUES' ? 'bg-blue-50 text-blue-800 border-blue-300' : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          Tous Risques
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'SANTE' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Niveau de Garantie</label>
                      <select
                        value={santeLevel}
                        onChange={(e) => setSanteLevel(e.target.value as any)}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-800"
                      >
                        <option value="BRONZE">Bronze (70% Couverture)</option>
                        <option value="SILVER">Silver (80% Couverture)</option>
                        <option value="GOLD">Gold (100% Couverture)</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === 'VOYAGE' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Destination</label>
                      <select
                        value={voyageZone}
                        onChange={(e) => setVoyageZone(e.target.value as any)}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-800"
                      >
                        <option value="SCHENGEN">Espace Schengen</option>
                        <option value="AFRIQUE">Afrique / CEMAC</option>
                        <option value="MONDE">Monde Entier</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === 'HABITATION' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Type de Logement</label>
                      <select
                        value={habPropertyType}
                        onChange={(e) => setHabPropertyType(e.target.value as any)}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-800"
                      >
                        <option value="APPARTEMENT">Appartement</option>
                        <option value="VILLA">Villa Individuelle</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === 'RETRAITE' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Cotisation Mensuelle (FCFA)</label>
                      <input
                        type="number"
                        value={retraiteMonthly}
                        onChange={(e) => setRetraiteMonthly(e.target.value)}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-800"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Right Column Total Result Box */}
              <div className="md:col-span-5 bg-gradient-to-br from-blue-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col justify-between min-h-[220px]">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 block">
                    Cotisation Estimée
                  </span>
                  <div className="mt-3">
                    {isComputingQuote ? (
                      <div className="flex items-center gap-2 text-slate-300">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                        <span className="text-xs font-semibold">Calcul backend en cours...</span>
                      </div>
                    ) : isServiceAvailable ? (
                      <>
                        <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                          {computedTotal.toLocaleString('fr-FR')} <span className="text-sm font-bold text-blue-300">FCFA</span>
                        </span>
                        <p className="text-xs text-slate-300 font-medium mt-1">
                          {breakdownLabel || 'Tarif annuel prime TTC calculée'}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-amber-300 font-semibold leading-relaxed">
                        {unavailableMessage}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setAuthMode('REGISTER')
                    setIsAuthModalOpen(true)
                  }}
                  disabled={!isServiceAvailable}
                  className="mt-6 w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-xl transition-all pro-shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Souscrire Cette Option</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 6. CARROUSEL CONTINU DE PARTENAIRES (Marquee Ticker) */}
      <section className="py-12 bg-slate-100 border-y border-slate-200/80 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 text-center">
          <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">
            PARMIGIANI & PARTENAIRES D'ASSURANCE CERTIFIÉS CIMA
          </span>
        </div>

        <div className="relative w-full overflow-hidden flex">
          <div className="animate-marquee flex items-center gap-12 sm:gap-16 opacity-80 hover:opacity-100 transition-opacity">
            {[...partners, ...partners, ...partners].map((p, idx) => (
              <div key={idx} className="flex items-center gap-3 shrink-0 bg-white px-5 py-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <Shield className="h-5 w-5 text-blue-700 shrink-0" />
                <span className="text-xs font-extrabold text-slate-800 whitespace-nowrap">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. APP MOBILE & FOOTER */}
      <footer id="contact" className="bg-slate-900 text-white pt-16 pb-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 pb-12 border-b border-slate-800">
            
            {/* Column 1: Info */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src="/bethel-logo.png"
                  alt="Bethel Insurance"
                  className="h-10 w-auto object-contain bg-white p-1 rounded-lg"
                />
                <div>
                  <h3 className="text-base font-extrabold text-white">Bethel Comprehensive Insurance</h3>
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">MobiAssur Portal</span>
                </div>
              </div>
              
              <p className="text-xs text-slate-400 leading-relaxed font-medium max-w-sm">
                Compagnie d'assurance agréée par la CIMA. Émission de polices d'assurance auto, santé, voyage et entreprise avec suivi en temps réel.
              </p>

              <div className="flex items-center gap-4 text-xs font-semibold text-slate-300 pt-2">
                <div className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-blue-400" />
                  <span>+237 699 00 00 00</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-amber-400" />
                  <span>Douala / Yaoundé, Cameroun</span>
                </div>
              </div>
            </div>

            {/* Column 2: Lead Form */}
            <div className="lg:col-span-7 bg-slate-800/80 p-6 sm:p-8 rounded-3xl border border-slate-700/80">
              <h4 className="text-sm font-extrabold text-white mb-2">Envoyez-nous un Message</h4>
              <p className="text-xs text-slate-400 mb-6 font-medium">Un conseiller MobiAssur vous recontactera sous 2 heures.</p>

              {leadFeedback && (
                <div className={`p-3 rounded-xl text-xs font-bold mb-4 ${
                  leadFeedback.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>
                  {leadFeedback.message}
                </div>
              )}

              <form onSubmit={handleLeadSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Nom complet"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    required
                    className="h-11 px-4 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="N° Téléphone (+237)"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    required
                    className="h-11 px-4 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <textarea
                  placeholder="Comment pouvons-nous vous aider ?"
                  rows={3}
                  value={leadMessage}
                  onChange={(e) => setLeadMessage(e.target.value)}
                  required
                  className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none resize-none"
                />
                <button
                  type="submit"
                  disabled={isSubmittingLead}
                  className="w-full py-3 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmittingLead ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span>Envoyer la Demande</span>
                </button>
              </form>
            </div>

          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>© 2026 Bethel Comprehensive Insurance Ltd. Tous droits réservés.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-slate-300">Mentions Légales</a>
              <a href="#" className="hover:text-slate-300">Politique CIMA</a>
              <a href="#" className="hover:text-slate-300">Sécurité des Données</a>
            </div>
          </div>

        </div>
      </footer>

      {/* Auth Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-200 shadow-2xl relative"
            >
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-6 text-center">
                <h3 className="text-2xl font-extrabold text-slate-900">
                  {authMode === 'REGISTER' ? 'Souscription Rapide' : 'Espace Assuré'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  {authMode === 'REGISTER' ? 'Créez votre compte client pour valider votre devis' : 'Connectez-vous à votre compte'}
                </p>
              </div>

              {authFeedback && (
                <div className={`p-3 rounded-xl text-xs font-bold mb-4 ${
                  authFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {authFeedback.message}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === 'REGISTER' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Nom Complet</label>
                    <input
                      type="text"
                      placeholder="Jean Dupont"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      required
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs font-semibold"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Téléphone (+237)</label>
                  <input
                    type="text"
                    placeholder="+237 699 00 00 00"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    required
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Adresse Email</label>
                  <input
                    type="email"
                    placeholder="jean.dupont@exemple.cm"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Mot de passe</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  className="w-full py-3.5 bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
                >
                  {isSubmittingAuth ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  <span>{authMode === 'REGISTER' ? 'Créer mon Compte & Continuer' : 'Se Connecter'}</span>
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setAuthMode(authMode === 'REGISTER' ? 'LOGIN' : 'REGISTER')}
                  className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                >
                  {authMode === 'REGISTER' ? 'Déjà un compte ? Se connecter' : 'Nouveau ? Créer un compte'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Video Modal */}
      <AnimatePresence>
        {isVideoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 rounded-3xl max-w-3xl w-full p-4 border border-slate-800 shadow-2xl relative overflow-hidden"
            >
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="aspect-video w-full rounded-2xl bg-black flex items-center justify-center relative overflow-hidden">
                <iframe
                  className="w-full h-full rounded-2xl"
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                  title="Présentation Bethel Insurance"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
