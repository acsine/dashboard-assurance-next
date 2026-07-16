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
} from 'lucide-react'
import Link from 'next/link'
import { authApi } from '@/lib/api/mobi-assur'
import { ROLES } from '@/lib/auth/roles'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { logout, user } = useAuthStore()
  const { isMobileOpen, setIsMobileOpen } = useSidebarStore()
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Collapse sidebar and clear loading state when pathname changes
  useEffect(() => {
    setIsCollapsed(true)
    setIsMobileOpen(false)
    setNavigatingTo(null)
  }, [pathname])

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await authApi.logout().catch(() => undefined)
      logout()
      router.replace('/login')
    } catch {
      setIsLoggingOut(false)
    }
  }

  const handleNavigation = (path: string, e: React.MouseEvent) => {
    // If it's already the active path, just collapse
    if (pathname === path || (path !== '/dashboard' && pathname.startsWith(path))) {
      setIsCollapsed(true)
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

      {/* Blur Overlay when expanded or mobile open */}
      {(!isCollapsed || isMobileOpen) && !isLoggingOut && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity md:block"
          onClick={() => { setIsCollapsed(true); setIsMobileOpen(false) }}
        />
      )}

      <aside
        className={`${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 ${
          isCollapsed && !isMobileOpen ? 'md:w-20' : 'md:w-68 w-68'
        } fixed md:sticky top-0 left-0 bg-white transition-all duration-300 border-r border-slate-200 flex flex-col justify-between text-slate-600 h-screen shrink-0 z-50 shadow-lg md:shadow-sm`}
      >
        <div className="flex flex-col">
          {/* Logo area */}
          <div className={`p-4 border-b border-slate-100 flex items-center ${isCollapsed && !isMobileOpen ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-9 w-9 shrink-0 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
                M
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="whitespace-nowrap">
                  <h1 className="text-slate-900 font-extrabold text-base leading-none">MOBI-ASSUR</h1>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mt-1">
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
              className={`p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors ${isCollapsed && !isMobileOpen ? 'hidden md:block absolute -right-3 top-6 bg-white border border-slate-200 shadow-md rounded-full' : ''}`}
            >
              {isMobileOpen ? <ChevronLeft className="h-5 w-5" /> : (isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-5 w-5" />)}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-2.5 overflow-y-auto max-h-[calc(100vh-160px)] custom-scrollbar">
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
                  className={`flex min-h-12 items-center ${isCollapsed && !isMobileOpen ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl text-[15px] font-bold tracking-[-0.01em] transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-sm shadow-blue-100 ring-1 ring-blue-100'
                      : 'text-slate-700 opacity-75 hover:bg-slate-100 hover:text-slate-950 hover:opacity-100'
                  }`}
                >
                  <div className={`flex items-center ${isCollapsed && !isMobileOpen ? 'justify-center' : 'gap-3'}`}>
                    {isNavigatingThis ? (
                      <Loader2 className={`h-[21px] w-[21px] shrink-0 animate-spin ${isActive ? 'text-blue-600' : 'text-blue-500'}`} strokeWidth={2.25} />
                    ) : (
                      <item.icon className={`h-[21px] w-[21px] shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} strokeWidth={2.25} />
                    )}
                    {(!isCollapsed || isMobileOpen) && <span>{item.name}</span>}
                  </div>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* User profile / Logout */}
        <div className="p-4 border-t border-slate-100">
          {(!isCollapsed || isMobileOpen) && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-3 border border-slate-100">
              <div className="h-9 w-9 shrink-0 rounded-lg bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm">
                {user?.full_name?.charAt(0) || 'A'}
              </div>
              <div className="overflow-hidden">
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  {user?.full_name || 'Admin User'}
                </h4>
                <span className="text-[10px] font-extrabold text-blue-600 block uppercase tracking-wider mt-0.5">
                  {userRole}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            title={isCollapsed && !isMobileOpen ? 'Déconnexion' : undefined}
            className={`w-full min-h-12 flex items-center ${isCollapsed && !isMobileOpen ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl text-[15px] font-bold tracking-[-0.01em] opacity-75 hover:bg-red-50 hover:text-red-700 hover:opacity-100 transition-all text-slate-700 cursor-pointer disabled:cursor-wait disabled:opacity-50`}
          >
            {isLoggingOut ? (
              <Loader2 className="h-[21px] w-[21px] shrink-0 animate-spin" strokeWidth={2.25} />
            ) : (
              <LogOut className="h-[21px] w-[21px] shrink-0" strokeWidth={2.25} />
            )}
            {(!isCollapsed || isMobileOpen) && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
