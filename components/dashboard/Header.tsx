'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useSidebarStore } from '@/lib/stores/sidebar-store'
import { useSupportNotificationsStore } from '@/lib/stores/support-notifications-store'
import { Bell, HelpCircle, Search, Menu, MessageSquare, CheckCheck, LogOut, Loader2, ShieldCheck, User } from 'lucide-react'
import { Input } from '../ui/input'
import { usePathname, useRouter } from 'next/navigation'
import { authApi } from '@/lib/api/mobi-assur'
import { useTranslations } from 'next-intl'
import LanguageSwitcher from '@/components/LanguageSwitcher'

interface HeaderProps {
  title?: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  const t = useTranslations('header')
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
    <header className="min-h-16 py-3 bg-white/80 backdrop-blur-2xl border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-40 gap-3 transition-all duration-200 shadow-2xs">
      <div className="flex items-center gap-3 w-full md:min-w-0 md:flex-1">
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

      <div className="flex items-center gap-2 shrink-0 flex-nowrap">
        {/* Global Search Bar */}
        <div className="relative hidden md:block w-40 xl:w-44 2xl:w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder={t('searchPlaceholder')}
            className="h-10 pl-9 pr-11 text-xs border-slate-200/90 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 rounded-xl bg-slate-50/70 focus:bg-white transition-all font-medium"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden sm:inline-flex -translate-y-1/2 items-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-slate-400 bg-slate-100 border border-slate-200 rounded-md">
            ⌘K
          </kbd>
        </div>

        {/* System Live Pill */}
        <div className="hidden 2xl:inline-flex h-10 items-center gap-2 whitespace-nowrap bg-blue-50/90 border border-blue-200/80 text-blue-900 text-[11px] px-3 rounded-xl font-bold shadow-2xs">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span>{t('systemLive')}</span>
        </div>

        {/* Notifications Button */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="h-10 w-10 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 inline-flex items-center justify-center text-slate-600 transition-all border border-slate-200/60 relative cursor-pointer"
            aria-label="Notifications support"
          >
            <Bell className="h-4 w-4" />
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
                    {t('notifications')}
                  </span>
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="h-3 w-3" />
                    {t('markAllRead')}
                  </button>
                </div>
                <div className="overflow-y-auto max-h-80">
                  {items.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      {t('noNotifications')}
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

        <div className="hidden sm:block w-px h-5 self-center bg-slate-200" />

        {/* User Profile Badge */}
        <div className="hidden sm:flex items-center gap-2 h-10">
          <div className="hidden 2xl:block text-right leading-tight min-w-0">
            <span className="text-xs font-extrabold text-slate-900 block truncate max-w-[140px]">
              {user?.full_name || t('defaultUser')}
            </span>
            <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider block truncate max-w-[140px]">
              {user?.role || 'GESTIONNAIRE'}
            </span>
          </div>
          <div
            title={user?.full_name || t('defaultUser')}
            className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#1b365d] to-blue-700 text-white inline-flex items-center justify-center font-black text-xs shadow-xs border border-blue-300 shrink-0"
          >
            {user?.full_name?.substring(0, 2).toUpperCase() || 'BE'}
          </div>
        </div>

        <LanguageSwitcher variant="toolbar" />

        {/* Logout Button */}
        <button
          onClick={handleHeaderLogout}
          disabled={isLoggingOut}
          title={t('logout')}
          className="inline-flex h-10 items-center gap-1.5 px-3 whitespace-nowrap rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs transition-all border border-rose-200/80 shadow-2xs cursor-pointer active:scale-95 shrink-0 disabled:opacity-60"
        >
          {isLoggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
          ) : (
            <LogOut className="h-4 w-4 text-rose-600" />
          )}
          <span className="hidden 2xl:inline">{t('logout')}</span>
        </button>

      </div>
    </header>
  )
}
