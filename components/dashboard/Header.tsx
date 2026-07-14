'use client'

import { useAuthStore } from '@/lib/stores/auth-store'
import { useSidebarStore } from '@/lib/stores/sidebar-store'
import { Bell, HelpCircle, Search, Sparkles, Menu } from 'lucide-react'
import { Input } from '../ui/input'

interface HeaderProps {
  title?: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuthStore()
  const { toggleMobileOpen } = useSidebarStore()

  return (
    <header className="min-h-[5.5rem] py-4 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-40 gap-4 transition-all">
      {/* Mobile Header Top Row */}
      <div className="flex items-center gap-3 w-full md:w-auto md:flex-1 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          onClick={toggleMobileOpen}
          className="md:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Page Title & Subtitle */}
        <div className="flex-1 min-w-0">
          {title && <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 leading-tight truncate pr-4">{title}</h2>}
          {subtitle && <p className="text-xs md:text-sm text-slate-500 mt-1.5 truncate">{subtitle}</p>}
        </div>
      </div>

      {/* Global search or controls */}
      <div className="flex items-center gap-4 lg:gap-6 shrink-0">
        <div className="relative w-full sm:w-64 lg:w-80 hidden sm:block">
          <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 h-4.5 w-4.5 self-center mt-3" />
          <Input
            type="search"
            placeholder="Rechercher des clients, polices..."
            className="pl-10 h-10 text-xs border-gray-200 focus:border-blue-500 rounded-xl"
          />
        </div>

        {/* Live sessions status indicator */}
        <div className="bg-blue-50 border border-blue-100 text-blue-700 text-xs px-3 py-1.5 rounded-full font-semibold hidden lg:flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-ping" />
          MOBI-ASSUR Live Mode
        </div>

        {/* Utility icons */}
        <div className="flex items-center gap-2">
          <button className="h-10 w-10 rounded-xl hover:bg-gray-50 flex items-center justify-center text-gray-500 transition-all border border-transparent hover:border-gray-100 relative">
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>
          <button className="h-10 w-10 rounded-xl hover:bg-gray-50 flex items-center justify-center text-gray-500 transition-all border border-transparent hover:border-gray-100">
            <HelpCircle className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Separator */}
        <div className="w-px h-8 bg-gray-100 hidden sm:block" />

        {/* Current user presentation */}
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
