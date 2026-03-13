'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import type { GameInfo } from '@/lib/games/catalog'

interface GameCardProps extends GameInfo {
  isFavorite?: boolean
  onToggleFavorite?: (slug: string) => void
}

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  slots: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/40' },
  table: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/40' },
  instant: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/40' },
  card: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/40' },
}

const categoryGlow: Record<string, string> = {
  slots: 'group-hover:border-purple-500/40 group-hover:shadow-[0_0_25px_rgba(139,92,246,0.15)]',
  table: 'group-hover:border-emerald-500/40 group-hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]',
  instant: 'group-hover:border-yellow-500/40 group-hover:shadow-[0_0_25px_rgba(234,179,8,0.15)]',
  card: 'group-hover:border-blue-500/40 group-hover:shadow-[0_0_25px_rgba(59,130,246,0.15)]',
}

function VolatilityDots({ volatility }: { volatility?: 'low' | 'medium' | 'high' }) {
  if (!volatility) return null
  const count = volatility === 'low' ? 1 : volatility === 'medium' ? 2 : 3
  const color =
    volatility === 'low'
      ? 'bg-emerald-400'
      : volatility === 'medium'
        ? 'bg-yellow-400'
        : 'bg-red-400'
  return (
    <div className="flex items-center gap-0.5" title={`${volatility} volatility`}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${i <= count ? color : 'bg-zinc-700'}`}
        />
      ))}
    </div>
  )
}

export default function GameCard({
  slug,
  name,
  description,
  icon,
  href,
  houseEdge,
  category,
  isHot,
  isNew,
  rtp,
  volatility,
  isFavorite,
  onToggleFavorite,
}: GameCardProps) {
  const colors = categoryColors[category] ?? categoryColors.slots
  const glow = categoryGlow[category] ?? categoryGlow.slots

  return (
    <Link href={href} className="block h-full">
      <motion.div
        className={`group relative h-full rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-card)] cursor-pointer card-shine ${glow} transition-all duration-300`}
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
          <span className="text-5xl relative z-10 transition-transform duration-300 group-hover:scale-110 drop-shadow-lg select-none">
            {icon}
          </span>

          {/* Top-right badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5">
            {isHot && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-gradient-to-r from-[#EF4444] to-[#F87171] text-white shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse">
                HOT
              </span>
            )}
            {isNew && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-gradient-to-r from-[#00cc6a] to-[#00FF88] text-black shadow-[0_0_10px_rgba(0,255,136,0.3)]">
                NEW
              </span>
            )}
          </div>

          {/* Favorite heart - top left */}
          {onToggleFavorite && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggleFavorite(slug)
              }}
              className="absolute top-3 left-3 z-20 p-1.5 rounded-full bg-black/40 hover:bg-black/60 transition-colors cursor-pointer"
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  isFavorite
                    ? 'fill-[#FFD700] text-[#FFD700]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              />
            </button>
          )}

          {/* Bottom-left: House edge + RTP */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
            <span className="px-2 py-1 text-[10px] font-medium rounded-lg bg-black/50 text-[var(--text-secondary)] border border-white/10">
              Edge: {houseEdge}
            </span>
            {rtp && (
              <span className="px-2 py-1 text-[10px] font-medium rounded-lg bg-black/50 text-[var(--neon-green)] border border-white/10">
                {rtp}% RTP
              </span>
            )}
          </div>

          {/* Play Now overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <motion.span
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] text-black font-bold text-sm shadow-lg"
              initial={false}
            >
              PLAY
            </motion.span>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="font-semibold text-white text-sm group-hover:text-[var(--gold)] transition-colors truncate flex-1 mr-2">
              {name}
            </h3>
            <VolatilityDots volatility={volatility} />
          </div>

          {/* Category badge */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}
            >
              {category}
            </span>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
            {description}
          </p>
        </div>

        {/* Hover glow border */}
        <div className="absolute inset-0 rounded-2xl border border-transparent transition-all duration-300 pointer-events-none" />
      </motion.div>
    </Link>
  )
}
