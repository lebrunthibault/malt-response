'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles, FileText, Clock, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { UserMenu } from './user-menu'

const navItems = [
  {
    name: 'Generer',
    href: '/generate',
    icon: Sparkles,
    primary: true,
  },
  {
    name: 'Documents',
    href: '/documents',
    icon: FileText,
  },
  {
    name: 'Historique',
    href: '/history',
    icon: Clock,
  },
]

const adminItem = {
  name: 'Administration',
  href: '/admin',
  icon: Shield,
}

interface SidebarProps {
  user: {
    email: string
    displayName?: string | null
  }
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-60 flex-col bg-sidebar-background border-r border-sidebar-border">
      <div className="flex h-16 items-center px-6">
        <Link href="/generate" className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-sidebar-primary" />
          <span className="text-lg font-semibold text-sidebar-foreground">MaltResponse</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
                item.primary && !isActive && 'text-sidebar-primary/80'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}

        <div className="py-2">
          <Separator className="bg-sidebar-border" />
        </div>

        <Link
          href={adminItem.href}
          className={cn(
            'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
            pathname === adminItem.href
              ? 'bg-sidebar-accent text-sidebar-primary'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
          )}
        >
          <Shield className="h-5 w-5" />
          <span>{adminItem.name}</span>
        </Link>
      </nav>

      <div className="p-4">
        <UserMenu user={user} />
      </div>
    </aside>
  )
}
