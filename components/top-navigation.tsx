'use client'

import { Button } from '@/components/ui/button'
import { Plus, LogOut, Menu } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface TopNavigationProps {
  user: any
  onNewChat: () => void
  onLogout: () => void
  onMenuOpen?: () => void
}

export function TopNavigation({
  user,
  onNewChat,
  onLogout,
  onMenuOpen,
}: TopNavigationProps) {
  return (
    <div className="border-b border-border bg-background/90 backdrop-blur-sm sticky top-0 z-30">
      <div className="px-4 py-3 flex items-center justify-between gap-3">

        {/* Left — hamburger (mobile only) + title */}
        <div className="flex items-center gap-3">
          {/* Hamburger button — only visible on mobile */}
          <button
            onClick={onMenuOpen}
            className="lg:hidden flex-shrink-0 w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 active:scale-95 transition-all"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold text-foreground">Chat</h2>
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-2">
          {/* New chat — icon-only on mobile, full label on desktop */}
          <Button
            onClick={onNewChat}
            className="rounded-full gap-2"
            variant="outline"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>

          {/* User avatar menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-9 h-9 bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0"
                aria-label="User menu"
              >
                {user?.username?.charAt(0).toUpperCase() || 'A'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem disabled className="text-xs text-muted-foreground cursor-default">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-foreground">{user?.username}</span>
                  <span>{user?.department || user?.role}</span>
                  <span>{user?.email}</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLogout} className="text-red-500 gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
