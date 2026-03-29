'use client'

import { useState } from 'react'
import { Bell, Search, Plus } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/appointments': 'Appointments',
  '/customers':    'Customers',
  '/billing':      'Billing & POS',
  '/inventory':    'Inventory',
  '/staff':        'Staff',
  '/analytics':    'Analytics',
  '/settings':     'Settings',
}

interface HeaderProps {
  onNewAppointment?: () => void
  notificationCount?: number
}

export default function Header({ onNewAppointment, notificationCount = 0 }: HeaderProps) {
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)

  const title = Object.entries(PAGE_TITLES).find(([key]) =>
    pathname === key || pathname.startsWith(key + '/')
  )?.[1] ?? 'Suite O'

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-6 gap-4 sticky top-0 z-30">
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold truncate">{title}</h1>
      </div>

      {/* Search */}
      <div className={cn(
        "flex items-center gap-2 transition-all duration-200",
        searchOpen ? "w-72" : "w-auto"
      )}>
        {searchOpen ? (
          <input
            autoFocus
            type="search"
            placeholder="Search customers, appointments…"
            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            onBlur={() => setSearchOpen(false)}
          />
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Notifications */}
      <button className="relative w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
        <Bell className="w-4 h-4" />
        {notificationCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
            {notificationCount > 9 ? '9+' : notificationCount}
          </span>
        )}
      </button>

      {/* Quick action */}
      {pathname.includes('appointments') && (
        <button
          onClick={onNewAppointment}
          className="hidden sm:flex h-9 items-center gap-2 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Booking
        </button>
      )}
    </header>
  )
}
