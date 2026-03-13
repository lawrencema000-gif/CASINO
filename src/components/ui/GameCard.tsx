'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

interface GameCardProps {
  title: string
  description: string
  icon: string
  href: string
  houseEdge: string
  badgeText?: string
  isHot?: boolean
  isNew?: boolean
}

export default function GameCard({
  title,
  description,
  icon,
  href,
  houseEdge,
  badgeText,
  isHot,
  isNew,
}: GameCardProps) {
  return (
    <Link href={href} className="block h-full">
      <motion.div
        className="group relative h-full rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-card)] cursor-pointer card-shine"
        whileHover={{ scale: 1.03, y: -4 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {/* Icon / Visual area */}
        <div className="relative h-36 flex items-center justify-center bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-secondary)]">
          {/* Ambient glow behind icon */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-24 h-24 bg-[var(--gold)]/5 rounded-full blur-2xl group-hover:bg-[var(--gold)]/10 transition-all duration-500" />
          </div>

          {/* Large emoji icon */}
          <span className="text-6xl relative z-10 transition-transform duration-300 group-hover:scale-110 drop-shadow-lg select-none">
            {icon}
          </span>

          {/* Badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5">
            {isHot && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-gradient-to-r from-[#EF4444] to-[#F87171] text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                HOT
              </span>
            )}
            {isNew && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-gradient-to-r from-[#00cc6a] to-[#00FF88] text-black shadow-[0_0_10px_rgba(0,255,136,0.3)]">
                NEW
              </span>
            )}
            {badgeText && !isHot && !isNew && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-gradient-to-r from-[#EF4444] to-[#F87171] text-white shadow-[0_0_10px_rgba(239,68,68,0.3)] live-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {badgeText}
              </span>
            )}
          </div>

          {/* House edge badge */}
          <div className="absolute bottom-3 left-3">
            <span className="px-2 py-1 text-[10px] font-medium rounded-lg bg-black/50 text-[var(--text-secondary)] border border-white/10">
              Edge: {houseEdge}
            </span>
          </div>

          {/* Play Now overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <motion.span
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] text-black font-bold text-sm shadow-lg"
              initial={false}
            >
              PLAY NOW
            </motion.span>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-white text-base mb-1.5 group-hover:text-[var(--gold)] transition-colors">
            {title}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
            {description}
          </p>
        </div>

        {/* Hover glow border */}
        <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-[var(--gold)]/40 group-hover:shadow-[0_0_30px_rgba(255,215,0,0.1)] transition-all duration-300 pointer-events-none" />
      </motion.div>
    </Link>
  )
}
