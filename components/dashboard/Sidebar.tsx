import { useState, useEffect } from 'react'
import { usePathname, useRouter } from '@/i18n/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useSidebarStore } from '@/lib/stores/sidebar-store'
import {
  LayoutDashboard,
  Users,
  FileText,
  UserCheck,
  TrendingUp,
  Wallet,
  Settings,
  LogOut,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Menu,
  Loader2,
  MessageSquare,
  Target,
  Building2,
  Gift,
  AlertTriangle,
  CreditCard,
  Inbox,
} from 'lucide-react'
import Link from 'next/link'
import { authApi } from '@/lib/api/mobi-assur'
import { ROLES } from '@/lib/auth/roles'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { logout, user } = useAuthStore()
  const { isMobileOpen, setIsMobileOpen } = useSidebarStore()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Clear loading state and close mobile drawer on navigation
  useEffect(() => {
    setIsMobileOpen(false)
    setNavigatingTo(null)
  }, [pathname])

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await authApi.logout().catch(() => undefined)
      logout()
      window.location.href = '/'
    } catch {
      setIsLoggingOut(false)
    }
  }

  const handleNavigation = (path: string, e: React.MouseEvent) => {
    if (pathname === path || (path !== '/dashboard' && pathname.startsWith(path))) {
      setIsMobileOpen(false)
      return
    }
    setNavigatingTo(path)
  }

  const menuItems = [
    {
      name: 'Vue d\'ensemble',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: [ROLES.ADMIN, ROLES.RESPONSABLE],
    },
    {
      name: 'Clients',
      path: '/dashboard/clients',
      icon: Users,
      roles: [ROLES.ADMIN, ROLES.RESPONSABLE],
    },
    {
      name: 'Sinistres',
      path: '/dashboard/sinistres',
      icon: AlertTriangle,
      roles: [ROLES.ADMIN, ROLES.RESPONSABLE],
    },
    {
      name: 'Paiements déclarés',
      path: '/dashboard/paiements-declares',
      icon: CreditCard,
      roles: [ROLES.ADMIN, ROLES.RESPONSABLE],
    },
    {
      name: 'Demandes clients',
      path: '/dashboard/demandes-clients',
      icon: Inbox,
      roles: [ROLES.ADMIN, ROLES.RESPONSABLE],
    },
    {
      name: 'Contrats',
      path: '/dashboard/contracts',
      icon: FileText,
      roles: [ROLES.ADMIN, ROLES.RESPONSABLE],
    },
    {
      name: 'Prospects',
      path: '/dashboard/prospects',
      icon: UserCheck,
      roles: [ROLES.ADMIN, ROLES.RESPONSABLE],
    },
    {
      name: 'Portefeuille / Wallet',
      path: '/dashboard/wallet',
      icon: Wallet,
      roles: [ROLES.ADMIN, ROLES.RESPONSABLE],
    },
    {
      name: 'Objectifs agents',
      path: '/dashboard/objectives',
      icon: Target,
      roles: [ROLES.ADMIN, ROLES.RESPONSABLE],
    },
    {
      name: 'Niches',
      path: '/dashboard/niches',
      icon: Building2,
      roles: [ROLES.ADMIN, ROLES.RESPONSABLE],
    },
    {
      name: 'Récompenses',
      path: '/dashboard/rewards',
      icon: Gift,
      roles: [ROLES.ADMIN, ROLES.RESPONSABLE],
    },
    {
      name: 'Support & Chat',
      path: '/dashboard/support',
      icon: MessageSquare,
      roles: [ROLES.ADMIN, ROLES.RESPONSABLE],
    },
    {
      name: 'Utilisateurs',
      path: '/dashboard/users',
      icon: ShieldAlert,
      roles: [ROLES.ADMIN, ROLES.RESPONSABLE],
    },
    {
      name: 'Paramètres',
      path: '/dashboard/settings',
      icon: Settings,
      roles: [ROLES.ADMIN],
    },
  ]

  const userRole = user?.role

  const filteredMenuItems = menuItems.filter(
    (item) => userRole !== undefined && item.roles.some((role) => role === userRole)
  )

  return (
    <>
      {isLoggingOut && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-6 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm font-semibold text-slate-700">Déconnexion en cours...</p>
          </div>
        </div>
      )}

      {/* Mobile Drawer Overlay only (no blur, no desktop overlay) */}
      {isMobileOpen && !isLoggingOut && (
        <div 
          className="fixed inset-0 bg-slate-950/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 ${
          isCollapsed && !isMobileOpen ? 'md:w-20' : 'md:w-68 w-68'
        } fixed md:sticky top-0 left-0 bg-[#0f172a] text-slate-300 transition-all duration-300 border-r border-slate-800 flex flex-col justify-between h-screen shrink-0 z-50 shadow-2xl md:shadow-md`}
      >
        <div className="flex flex-col">
          {/* Logo area */}
          <div className={`p-4 border-b border-slate-800/80 flex items-center ${isCollapsed && !isMobileOpen ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-xs shadow-md shrink-0 border border-blue-400/30">
                BE
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="whitespace-nowrap">
                  <h1 className="text-white font-black text-sm tracking-tight leading-none">Bethel Insurance</h1>
                  <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest block mt-1">
                    Management Portal
                  </span>
                </div>
              )}
            </div>
            
            <button
              onClick={() => {
                if (isMobileOpen) {
                  setIsMobileOpen(false)
                } else {
                  setIsCollapsed(!isCollapsed)
                }
              }}
              className={`p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer ${isCollapsed && !isMobileOpen ? 'hidden md:block absolute -right-3 top-6 bg-[#0f172a] border border-slate-700 shadow-lg rounded-full text-slate-300' : ''}`}
            >
              {isMobileOpen ? <ChevronLeft className="h-5 w-5" /> : (isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-5 w-5" />)}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3.5 space-y-1.5 overflow-y-auto max-h-[calc(100vh-160px)] custom-scrollbar">
            {filteredMenuItems.map((item) => {
              const isActive =
                pathname === item.path ||
                (item.path !== '/dashboard' && pathname.startsWith(item.path))
              
              const isNavigatingThis = navigatingTo === item.path

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={(e) => handleNavigation(item.path, e)}
                  title={isCollapsed && !isMobileOpen ? item.name : undefined}
                  className={`group relative flex min-h-11 items-center ${isCollapsed && !isMobileOpen ? 'justify-center' : 'justify-between'} px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-black'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-white font-semibold'
                  }`}
                >
                  <div className={`flex items-center ${isCollapsed && !isMobileOpen ? 'justify-center' : 'gap-3'}`}>
                    {isNavigatingThis ? (
                      <Loader2 className={`h-4.5 w-4.5 shrink-0 animate-spin ${isActive ? 'text-white' : 'text-blue-400'}`} strokeWidth={2.2} />
                    ) : (
                      <item.icon className={`h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`} strokeWidth={2.2} />
                    )}
                    {(!isCollapsed || isMobileOpen) && (
                      <span className="truncate tracking-wide">{item.name}</span>
                    )}
                  </div>
                  {isActive && (!isCollapsed || isMobileOpen) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 shadow-xs" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* User profile / Logout */}
        <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/40">
          {(!isCollapsed || isMobileOpen) && (
            <div className="flex items-center gap-3 p-2.5 bg-slate-900/80 rounded-xl mb-2.5 border border-slate-800">
              <div className="h-8 w-8 shrink-0 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-black text-xs border border-blue-500/30">
                {user?.full_name?.charAt(0) || 'A'}
              </div>
              <div className="overflow-hidden">
                <h4 className="text-xs font-bold text-white truncate">
                  {user?.full_name || 'Admin User'}
                </h4>
                <span className="text-[10px] font-extrabold text-blue-400 block uppercase tracking-wider mt-0.5">
                  {userRole}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            title={isCollapsed && !isMobileOpen ? 'Déconnexion' : undefined}
            className={`w-full min-h-10 flex items-center ${isCollapsed && !isMobileOpen ? 'justify-center' : 'gap-2.5'} px-3 py-2 rounded-xl text-xs font-bold transition-all text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-900/40 border border-transparent cursor-pointer disabled:cursor-wait disabled:opacity-50`}
          >
            {isLoggingOut ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-rose-400" strokeWidth={2.2} />
            ) : (
              <LogOut className="h-4 w-4 shrink-0" strokeWidth={2.2} />
            )}
            {(!isCollapsed || isMobileOpen) && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
