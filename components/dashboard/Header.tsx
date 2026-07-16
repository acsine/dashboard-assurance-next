'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useSidebarStore } from '@/lib/stores/sidebar-store'
import { useSupportNotificationsStore } from '@/lib/stores/support-notifications-store'
import { Bell, HelpCircle, Search, Menu, MessageSquare, CheckCheck } from 'lucide-react'
import { Input } from '../ui/input'
import { usePathname, useRouter } from 'next/navigation'

interface HeaderProps {
  title?: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuthStore()
  const { toggleMobileOpen } = useSidebarStore()
  const { items, unreadCount, markAllRead, markTicketRead } = useSupportNotificationsStore()
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname?.split('/')[1] || 'fr'

  const openTicket = (ticketId: string) => {
    markTicketRead(ticketId)
    setOpen(false)
    router.push(`/${locale}/dashboard/support?ticket=${ticketId}`)
  }

  return (
    <header className="min-h-[5.5rem] py-4 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-40 gap-4 transition-all">
      <div className="flex items-center gap-3 w-full md:w-auto md:flex-1 min-w-0">
        <button
          onClick={toggleMobileOpen}
          className="md:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex-1 min-w-0">
          {title && (
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 leading-tight truncate pr-4">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-xs md:text-sm text-slate-500 mt-1.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 lg:gap-6 shrink-0">
        <div className="relative w-full sm:w-64 lg:w-80 hidden sm:block">
          <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 h-4.5 w-4.5 self-center mt-3" />
          <Input
            type="search"
            placeholder="Rechercher des clients, polices..."
            className="pl-10 h-10 text-xs border-gray-200 focus:border-blue-500 rounded-xl"
          />
        </div>

        <div className="bg-blue-50 border border-blue-100 text-blue-700 text-xs px-3 py-1.5 rounded-full font-semibold hidden lg:flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-ping" />
          MOBI-ASSUR Live Mode
        </div>

        <div className="flex items-center gap-2 relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="h-10 w-10 rounded-xl hover:bg-gray-50 flex items-center justify-center text-gray-500 transition-all border border-transparent hover:border-gray-100 relative"
            aria-label="Notifications support"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center">
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
              <div className="absolute right-0 top-12 z-50 w-80 max-h-96 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Notifications
                  </span>
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
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
                        className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
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

          <button className="h-10 w-10 rounded-xl hover:bg-gray-50 flex items-center justify-center text-gray-500 transition-all border border-transparent hover:border-gray-100">
            <HelpCircle className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="w-px h-8 bg-gray-100 hidden sm:block" />

        <div className="items-center gap-3 hidden sm:flex">
          <div className="text-right">
            <span className="text-xs font-bold text-gray-900 block">
              {user?.full_name || 'Admin User'}
            </span>
            <span className="text-[10px] text-gray-500 block">
              {user?.email || 'admin@mobi-assur.com'}
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/10">
            {user?.full_name?.substring(0, 2).toUpperCase() || 'AD'}
          </div>
        </div>
      </div>
    </header>
  )
}
