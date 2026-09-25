'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Mic, LayoutDashboard, Settings, LogOut, ChevronRight, Menu, X } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { ToastProvider } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/record', icon: Mic, label: 'New Recording' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { physician, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && !physician) {
      router.push('/login?next=' + encodeURIComponent(pathname || '/dashboard'))
    }
  }, [physician, loading, pathname, router])

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  if (loading) {
    return (
      <div className="min-h-screen bg-ark-bg flex items-center justify-center">
        <div className="flex items-center gap-3 text-ark-text-secondary">
          <svg className="animate-spin h-5 w-5 text-ark-primary" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading ArkScribe...</span>
        </div>
      </div>
    )
  }

  if (!physician) return null

  return (
    <ToastProvider>
      <div className="min-h-screen bg-ark-bg flex">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            'fixed md:static inset-y-0 left-0 z-30 w-64 flex-shrink-0',
            'bg-ark-surface border-r border-ark-border flex flex-col',
            'transition-transform duration-200 ease-in-out',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          )}
          aria-label="Main sidebar"
        >
          {/* Logo */}
          <div className="flex items-center gap-2 px-5 py-5 border-b border-ark-border">
            <div className="w-8 h-8 rounded-badge bg-ark-primary flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <Mic className="w-4 h-4 text-ark-bg" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-ark-text-primary">ArkScribe</div>
              <div className="text-xs text-ark-text-muted">AI Medical Scribe</div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-input text-ark-text-muted hover:text-ark-text-primary hover:bg-ark-surface-elevated transition-all"
              aria-label="Close navigation menu"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Application navigation">
            {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
              const active = pathname === href || (pathname?.startsWith(href + '/') ?? false)
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-input text-sm font-medium transition-all',
                    active
                      ? 'bg-ark-primary-muted text-ark-primary border border-ark-border'
                      : 'text-ark-text-secondary hover:text-ark-text-primary hover:bg-ark-surface-elevated'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  {label}
                  {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" aria-hidden="true" />}
                </Link>
              )
            })}
          </nav>

          {/* User */}
          <div className="border-t border-ark-border p-4">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-full bg-ark-primary-muted border border-ark-border flex items-center justify-center flex-shrink-0"
                aria-hidden="true"
              >
                <span className="text-xs font-bold text-ark-primary">
                  {physician.full_name?.charAt(0) || '?'}
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-ark-text-primary truncate">{physician.full_name}</div>
                <div className="text-xs text-ark-text-muted truncate">{physician.specialty || physician.email}</div>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-input text-sm text-ark-text-secondary hover:text-ark-error hover:bg-red-900/20 transition-all"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </aside>

        {/* Main content wrapper */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile top bar */}
          <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-ark-surface border-b border-ark-border flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-input text-ark-text-secondary hover:text-ark-text-primary hover:bg-ark-surface-elevated transition-all"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-badge bg-ark-primary flex items-center justify-center" aria-hidden="true">
                <Mic className="w-3.5 h-3.5 text-ark-bg" />
              </div>
              <span className="font-bold text-sm text-ark-text-primary">ArkScribe</span>
            </div>
          </header>

          <main className="flex-1 min-w-0 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
