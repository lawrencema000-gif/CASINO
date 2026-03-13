'use client'

import { useState } from 'react'
import {
  Gamepad2,
  Cherry,
  Dices,
  Spade,
  Zap,
  Crown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '../ui/cn'

interface Category {
  name: string
  slug: string
  icon: React.ElementType
  count: number
}

const categories: Category[] = [
  { name: 'All Games', slug: 'all', icon: Gamepad2, count: 10 },
  { name: 'Slots', slug: 'slots', icon: Cherry, count: 2 },
  { name: 'Table Games', slug: 'table', icon: Dices, count: 3 },
  { name: 'Card Games', slug: 'cards', icon: Spade, count: 2 },
  { name: 'Instant Win', slug: 'instant', icon: Zap, count: 2 },
  { name: 'Jackpots', slug: 'jackpots', icon: Crown, count: 1 },
]

interface SidebarProps {
  activeCategory: string
  onCategoryChange: (slug: string) => void
}

export default function Sidebar({ activeCategory, onCategoryChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col shrink-0 bg-[var(--casino-surface)] border-r border-[var(--casino-border)] transition-all duration-300',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Collapse toggle */}
      <div className="flex justify-end p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-[var(--casino-text-muted)] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Categories */}
      <nav className="flex-1 px-2 space-y-1">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.slug
          return (
            <button
              key={cat.slug}
              onClick={() => onCategoryChange(cat.slug)}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl transition-all duration-200 cursor-pointer',
                collapsed ? 'justify-center px-2 py-3' : 'px-3 py-2.5',
                isActive
                  ? 'bg-[var(--casino-accent)]/10 text-[var(--casino-accent)] border border-[var(--casino-accent)]/20'
                  : 'text-[var(--casino-text-muted)] hover:text-white hover:bg-white/5 border border-transparent'
              )}
              title={collapsed ? cat.name : undefined}
            >
              <cat.icon
                className={cn(
                  'w-5 h-5 shrink-0',
                  isActive ? 'text-[var(--casino-accent)]' : ''
                )}
              />
              {!collapsed && (
                <>
                  <span className="text-sm font-medium flex-1 text-left">
                    {cat.name}
                  </span>
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded-full',
                      isActive
                        ? 'bg-[var(--casino-accent)]/20 text-[var(--casino-accent)]'
                        : 'bg-white/5 text-[var(--casino-text-muted)]'
                    )}
                  >
                    {cat.count}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
