'use client'

import { type ReactNode } from 'react'
import { cn } from './cn'

interface CardProps {
  children: ReactNode
  header?: ReactNode
  footer?: ReactNode
  className?: string
  hover?: boolean
  glow?: 'gold' | 'purple' | 'green' | 'none'
}

export default function Card({ children, header, footer, className, hover = true, glow = 'none' }: CardProps) {
  const glowStyles = {
    gold: 'hover:shadow-[0_0_20px_rgba(201,162,39,0.15)]',
    purple: 'hover:shadow-[0_0_20px_rgba(108,43,217,0.15)]',
    green: 'hover:shadow-[0_0_20px_rgba(0,255,136,0.15)]',
    none: '',
  }

  return (
    <div
      className={cn(
        'bg-[var(--casino-card)] border border-[var(--casino-border)] rounded-2xl overflow-hidden card-shine',
        'transition-all duration-300',
        hover && 'hover:border-[var(--casino-accent)]/30 hover:bg-[var(--casino-card-hover)]',
        glowStyles[glow],
        className
      )}
    >
      {header && (
        <div className="px-5 py-4 border-b border-[var(--casino-border)]">
          {header}
        </div>
      )}
      <div className="p-5">{children}</div>
      {footer && (
        <div className="px-5 py-4 border-t border-[var(--casino-border)] bg-[var(--casino-surface)]">
          {footer}
        </div>
      )}
    </div>
  )
}
