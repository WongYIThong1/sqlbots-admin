'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { getAdminData, clearAdminData, getAdminToken } from '@/lib/api-client'

interface Admin {
  id: string
  email: string
  role: string
  level: number
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const token = getAdminToken()
    const adminData = getAdminData()

    if (!token || !adminData) {
      clearAdminData()
      router.push('/login')
      return
    }

    try {
      setAdmin(adminData)
    } catch (error) {
      clearAdminData()
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }, [router])

  const handleLogout = () => {
    clearAdminData()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-50">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-white mx-auto"></div>
          <p className="text-zinc-400 mt-2 animate-pulse">Loading...</p>
        </div>
      </div>
    )
  }

  if (!admin) {
    return null
  }

  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'User',
      href: '/dashboard/user',
      icon: (
        <svg className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      name: 'License',
      href: '/dashboard/license',
      icon: (
        <svg className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-50">
      {/* Sidebar */}
      <aside className={`flex flex-col w-64 border-r border-zinc-800 bg-zinc-900/50 transition-all duration-300 ${mounted ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}>
        {/* Header */}
        <div className="flex h-16 items-center border-b border-zinc-800 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer-slide"></div>
          <h1 className="text-lg font-semibold text-white relative z-10 animate-fade-in">
            SQLBots Admin
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative overflow-hidden ${
                  isActive
                    ? 'bg-zinc-800 text-white shadow-lg shadow-zinc-900/50 scale-[1.02]'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 hover:scale-[1.01]'
                }`}
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: mounted ? 'fadeInUp 0.4s ease-out forwards' : 'none',
                  opacity: mounted ? 1 : 0,
                }}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full animate-slide-in-left"></div>
                )}
                
                {/* Hover shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                
                <span className={`relative z-10 transition-colors duration-200 ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                  {item.icon}
                </span>
                <span className="relative z-10">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Info & Logout */}
        <div className={`border-t border-zinc-800 bg-zinc-900/50 p-4 transition-all duration-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="mb-3 space-y-1">
            <div className="text-sm font-medium text-white truncate animate-fade-in">
              {admin.email}
            </div>
            <div className="text-xs text-zinc-400 animate-fade-in" style={{ animationDelay: '100ms' }}>
              Level {admin.level}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="group flex w-full items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm font-medium text-zinc-300 transition-all duration-200 hover:bg-zinc-800 hover:text-white hover:scale-[1.02] hover:shadow-md hover:shadow-zinc-900/50 relative overflow-hidden"
          >
            {/* Button shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            
            <svg className="w-4 h-4 relative z-10 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="relative z-10">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
