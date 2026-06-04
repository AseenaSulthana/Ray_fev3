'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  MessageCircle,
  FileText,
  BarChart3,
  Settings,
  Trash2,
  Ticket,
  Shield,
  X,
  LogOut,
  Plus,
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  href: string
}

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  user?: any
  onLogout?: () => void
  // Mobile drawer props
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({
  activeTab,
  onTabChange,
  user,
  onLogout,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const [chatHistory, setChatHistory] = useState([
    { id: '1', title: 'Workflow Questions' },
    { id: '2', title: 'Data Analysis' },
    { id: '3', title: 'RAY Features' },
  ])

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  // Close drawer on tab change (mobile)
  const handleTabChange = (tab: string) => {
    onTabChange(tab)
    onMobileClose?.()
  }

  // ── Nav items per role ────────────────────────────────────────────────────

  const baseNavItems: NavItem[] = [
    { id: 'chat', label: 'Chat', icon: <MessageCircle className="h-5 w-5" />, href: '/' },
    { id: 'ray-desk', label: 'RAY Desk', icon: <Ticket className="h-5 w-5" />, href: '/ray-desk' },
    { id: 'knowledge', label: 'Knowledge Base', icon: <FileText className="h-5 w-5" />, href: '/knowledge' },
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="h-5 w-5" />, href: '/dashboard' },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" />, href: '/settings' },
  ]

  const adminNavItems: NavItem[] = [
    { id: 'chat', label: 'Chat', icon: <MessageCircle className="h-5 w-5" />, href: '/' },
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="h-5 w-5" />, href: '/dashboard' },
    { id: 'ray-desk', label: 'RAY Desk', icon: <Ticket className="h-5 w-5" />, href: '/ray-desk' },
    { id: 'knowledge', label: 'Knowledge Base', icon: <FileText className="h-5 w-5" />, href: '/knowledge' },
    { id: 'user-mgmt', label: 'User Management', icon: <Shield className="h-5 w-5" />, href: '/admin' },
    { id: 'settings', label: 'System Settings', icon: <Settings className="h-5 w-5" />, href: '/settings' },
  ]

  const executiveNavItems: NavItem[] = [
    { id: 'chat', label: 'Chat', icon: <MessageCircle className="h-5 w-5" />, href: '/' },
    { id: 'dashboard', label: 'Executive Overview', icon: <BarChart3 className="h-5 w-5" />, href: '/dashboard' },
    { id: 'ops', label: 'Operational Intelligence', icon: <Ticket className="h-5 w-5" />, href: '/ray-desk' },
    { id: 'knowledge', label: 'Knowledge Governance', icon: <FileText className="h-5 w-5" />, href: '/knowledge' },
    { id: 'alerts', label: 'Alerts & Risks', icon: <Shield className="h-5 w-5" />, href: '/alerts' },
    { id: 'audit', label: 'Audit Logs', icon: <FileText className="h-5 w-5" />, href: '/audit' },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" />, href: '/settings' },
  ]

  const navItems =
    user?.role === 'admin'
      ? adminNavItems
      : user?.role === 'executive'
      ? executiveNavItems
      : baseNavItems

  // ── Theme per role ────────────────────────────────────────────────────────

  const theme =
    user?.role === 'executive'
      ? {
          container: 'bg-cyan-950 text-cyan-100',
          border: 'border-cyan-800',
          button: 'text-cyan-100',
          muted: 'text-cyan-300',
          active: 'bg-cyan-700 text-white',
          hover: 'text-cyan-100 hover:bg-cyan-800 hover:text-white',
          footerBg: 'bg-cyan-900/80',
          footerText: 'text-cyan-100',
          closeBtn: 'bg-cyan-800 text-cyan-100 hover:bg-cyan-700',
        }
      : user?.role === 'admin'
      ? {
          container: 'bg-slate-950 text-slate-100',
          border: 'border-slate-800',
          button: 'text-slate-100',
          muted: 'text-slate-400',
          active: 'bg-slate-700 text-white',
          hover: 'text-slate-200 hover:bg-slate-800 hover:text-white',
          footerBg: 'bg-slate-900/90',
          footerText: 'text-slate-100',
          closeBtn: 'bg-slate-800 text-slate-200 hover:bg-slate-700',
        }
      : {
          container: 'bg-sidebar text-sidebar-foreground',
          border: 'border-sidebar-border',
          button: 'text-sidebar-foreground',
          muted: 'text-muted-foreground',
          active: 'bg-sidebar-accent text-sidebar-accent-foreground',
          hover: 'text-sidebar-foreground hover:bg-sidebar-accent hover:bg-opacity-20',
          footerBg: 'bg-sidebar-accent/30',
          footerText: 'text-sidebar-foreground',
          closeBtn: 'bg-sidebar-accent/40 text-sidebar-foreground hover:bg-sidebar-accent/60',
        }

  const sidebarImageByRole: Record<string, string> = {
    admin: '/ray-admin1.png',
    executive: '/ray-executive1.png',
    employee: '/ray-sidebar.png',
  }
  const sidebarImageSrc = sidebarImageByRole[user?.role ?? ''] ?? '/ray-sidebar.png'
  const title = user?.role === 'executive' ? 'Executive RAY' : user?.role === 'admin' ? 'Admin RAY' : 'RAY'
  const subtitle = user?.role === 'executive' ? 'Executive AI Assistant' : user?.role === 'admin' ? 'Admin AI Assistant' : 'AI Assistant'

  // ── Sidebar panel (shared between desktop persistent + mobile drawer) ─────

  const panel = (
    <div className={`w-72 ${theme.container} border-r ${theme.border} flex flex-col h-full`}>

      {/* Header */}
      <div className={`p-4 border-b ${theme.border} flex items-center gap-3`}>
        <div className="flex-shrink-0">
          <Image
            src={sidebarImageSrc}
            alt={`${title} icon`}
            width={80}
            height={80}
            priority
            className="w-14 h-14"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className={`font-bold ${theme.button} text-lg leading-tight`}>{title}</h1>
          <p className={`text-xs ${theme.muted}`}>{subtitle}</p>
        </div>
        {/* Close button — only visible on mobile */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className={`lg:hidden flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${theme.closeBtn}`}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1 mb-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                activeTab === item.id
                  ? `${theme.active} font-semibold`
                  : `${theme.button} ${theme.hover}`
              }`}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
              {activeTab === item.id && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-current opacity-60" />
              )}
            </button>
          ))}
        </div>

        {/* Recent Chats */}
        <div className="mb-4">
          <h3 className={`text-xs font-semibold uppercase tracking-wider px-3 mb-2 ${theme.muted}`}>
            Recent Chats
          </h3>
          <div className="space-y-1">
            {chatHistory.map((chat) => (
              <div
                key={chat.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-xl ${theme.hover} cursor-pointer transition-all`}
              >
                <MessageCircle className="h-4 w-4 flex-shrink-0 opacity-70" />
                <span className={`text-sm truncate flex-1 ${theme.button}`}>{chat.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setChatHistory(chatHistory.filter((c) => c.id !== chat.id))
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                >
                  <Trash2 className="h-3 w-3 opacity-60 hover:opacity-100" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className={`border-t ${theme.border} p-3 space-y-3`}>
        {user && (
          <div className={`${theme.footerBg} rounded-xl p-3`}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
                {user.username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate ${theme.footerText}`}>{user.username}</p>
                <p className={`text-xs ${theme.muted} truncate`}>{user.department || user.role}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${theme.hover}`}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        )}
        <div className={`text-xs text-center ${theme.muted} pb-safe`}>
          <p>RAY v1.0 · Vexar Tech</p>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* ── DESKTOP: always-visible sidebar ── */}
      <div className="hidden lg:flex h-full flex-shrink-0">
        {panel}
      </div>

      {/* ── MOBILE: slide-in drawer with backdrop ── */}
      {/* Backdrop */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 flex h-full transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {panel}
      </div>
    </>
  )
}
