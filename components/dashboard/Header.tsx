'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useSidebarStore } from '@/lib/stores/sidebar-store'
import { useSupportNotificationsStore } from '@/lib/stores/support-notifications-store'
import { Bell, HelpCircle, Search, Menu, MessageSquare, CheckCheck, LogOut, Loader2, ShieldCheck, Sparkles, User } from 'lucide-react'
import { Input } from '../ui/input'
import { usePathname, useRouter } from 'next/navigation'
import { authApi } from '@/lib/api/mobi-assur'

interface HeaderProps {
  title?: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { user, logout: logoutStore } = useAuthStore()
  const { toggleMobileOpen } = useSidebarStore()
  const { items, unreadCount, markAllRead, markTicketRead } = useSupportNotificationsStore()
  const [open, setOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname?.split('/')[1] || 'fr'

  const handleHeaderLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await authApi.logout().catch(() => undefined)
      logoutStore()
      window.location.href = `/${locale}`
    } catch {
      setIsLoggingOut(false)
    }
  }

  const openTicket = (ticketId: string) => {
    markTicketRead(ticketId)
    setOpen(false)
    router.push(`/${locale}/dashboard/support?ticket=${ticketId}`)
  }

  return (
    <header className="min-h-[5rem] py-3.5 bg-white/80 backdrop-blur-2xl border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-40 gap-4 transition-all duration-200 shadow-2xs">
      <div className="flex items-center gap-3 w-full md:w-auto md:flex-1 min-w-0">
        <button
          onClick={toggleMobileOpen}
          className="md:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex-1 min-w-0">
          {title && (
            <h1 className="text-xl md:text-2xl font-black text-slate-900 leading-tight truncate pr-4 tracking-tight">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-xs md:text-sm text-slate-500 mt-0.5 truncate font-medium">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 lg:gap-4 shrink-0">
        {/* Global Search Bar */}
        <div className="relative w-full sm:w-64 lg:w-72 hidden sm:block">
          <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 h-4 w-4 mt-3" />
          <Input
            type="search"
            placeholder="Rechercher clients, polices..."
            className="pl-9 pr-12 h-10 text-xs border-slate-200/90 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 rounded-xl bg-slate-50/70 focus:bg-white transition-all font-medium"
          />
          <kbd className="absolute right-2.5 top-2.5 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded-md">
            ⌘K
          </kbd>
        </div>

        {/* System Live Pill */}
        <div className="bg-blue-50/90 border border-blue-200/80 text-blue-900 text-[11px] px-3 py-1.5 rounded-full font-bold hidden lg:flex items-center gap-2 shadow-2xs">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
          <span>Bethel System Live</span>
        </div>

        {/* Notifications Button */}
        <div className="flex items-center gap-2 relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="h-10 w-10 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 flex items-center justify-center text-slate-600 transition-all border border-slate-200/60 relative cursor-pointer"
            aria-label="Notifications support"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                aria-label="Fermer notifications"
                onClick={() => setOpen(false)}
              />
              <div className="absolute right-0 top-12 z-50 w-80 max-h-96 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Notifications & Support
                  </span>
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Tout lu
                  </button>
                </div>
                <div className="overflow-y-auto max-h-80">
                  {items.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Aucune notification pour le moment
                    </div>
                  ) : (
                    items.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => openTicket(n.ticketId)}
                        className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${
                          n.read ? 'opacity-70' : 'bg-blue-50/40'
                        }`}
                      >
                        <div className="flex gap-2 items-start">
                          <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate">{n.title}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.body}</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {new Date(n.createdAt).toLocaleString()}
                            </p>
                          </div>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="w-px h-7 bg-slate-200 hidden sm:block" />

        {/* User Profile Badge */}
        <div className="items-center gap-2.5 hidden sm:flex">
          <div className="text-right leading-tight">
            <span className="text-xs font-extrabold text-slate-900 block truncate max-w-[140px]">
              {user?.full_name || 'Utilisateur Bethel'}
            </span>
            <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider block">
              {user?.role || 'GESTIONNAIRE'}
            </span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#1b365d] to-blue-700 text-white flex items-center justify-center font-black text-xs shadow-xs border border-blue-300">
            {user?.full_name?.substring(0, 2).toUpperCase() || 'BE'}
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleHeaderLogout}
          disabled={isLoggingOut}
          title="Se déconnecter"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs transition-all border border-rose-200/80 shadow-2xs cursor-pointer active:scale-95 shrink-0"
        >
          {isLoggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
          ) : (
            <LogOut className="h-4 w-4 text-rose-600" />
          )}
          <span className="hidden md:inline">Déconnexion</span>
        </button>

      </div>
    </header>
  )
}
