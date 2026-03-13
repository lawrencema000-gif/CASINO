'use client'

import { cn } from './cn'

type BadgeType = 'HOT' | 'NEW' | 'LIVE' | 'JACKPOT'

interface BadgeProps {
  type: BadgeType
  className?: string
}

const badgeStyles: Record<BadgeType, string> = {
  HOT: 'bg-gradient-to-r from-[#ff3b5c] to-[#ff6b81] text-white shadow-[0_0_10px_rgba(255,59,92,0.3)]',
  NEW: 'bg-gradient-to-r from-[#00cc6a] to-[#00ff88] text-black shadow-[0_0_10px_rgba(0,255,136,0.3)]',
  LIVE: 'bg-gradient-to-r from-[#ff3b5c] to-[#ff6b81] text-white shadow-[0_0_10px_rgba(255,59,92,0.3)]',
  JACKPOT: 'bg-gradient-to-r from-[#a07d1a] via-[#c9a227] to-[#e6c84a] text-black shadow-[0_0_10px_rgba(201,162,39,0.3)]',
}

export default function Badge({ type, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full',
        badgeStyles[type],
        type === 'LIVE' && 'live-pulse',
        className
      )}
    >
      {type === 'LIVE' && (
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      )}
      {type}
    </span>
  )
}
