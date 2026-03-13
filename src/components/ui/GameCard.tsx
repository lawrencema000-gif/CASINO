'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Dices,
  Spade,
  CircleDot,
  Rocket,
  Triangle,
  Ticket,
  Crown,
  Coins,
  type LucideIcon,
  Layers,
  Cherry,
} from 'lucide-react'
import Badge from './Badge'
import { cn } from './cn'

export interface GameData {
  name: string
  slug: string
  category: string
  icon: string
  minBet: number
  badge?: 'HOT' | 'NEW' | 'LIVE' | 'JACKPOT'
  gradient: string
}

const iconMap: Record<string, LucideIcon> = {
  slots: Cherry,
  cards: Spade,
  wheel: CircleDot,
  chips: Layers,
  dice: Dices,
  coin: Coins,
  rocket: Rocket,
  triangle: Triangle,
  ticket: Ticket,
  crown: Crown,
}

export default function GameCard({ game }: { game: GameData }) {
  const Icon = iconMap[game.icon] || Dices

  return (
    <Link href={`/games/${game.slug}`}>
      <motion.div
        className="group relative rounded-2xl overflow-hidden border border-[var(--casino-border)] bg-[var(--casino-card)] cursor-pointer card-shine"
        whileHover={{ scale: 1.03, y: -4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {/* Thumbnail area */}
        <div
          className={cn(
            'relative h-40 flex items-center justify-center',
            game.gradient
          )}
        >
          <Icon className="w-16 h-16 text-white/80 drop-shadow-lg transition-transform duration-300 group-hover:scale-110" />

          {/* Badge */}
          {game.badge && (
            <div className="absolute top-3 right-3">
              <Badge type={game.badge} />
            </div>
          )}

          {/* Play Now overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <motion.span
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#a07d1a] via-[#c9a227] to-[#e6c84a] text-black font-bold text-sm shadow-lg"
              initial={{ scale: 0.8, opacity: 0 }}
              whileHover={{ scale: 1 }}
              animate={{}}
            >
              PLAY NOW
            </motion.span>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-white text-sm mb-1 group-hover:text-[var(--casino-accent)] transition-colors">
            {game.name}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--casino-text-muted)] capitalize">
              {game.category}
            </span>
            <span className="text-xs text-[var(--casino-accent)] font-medium">
              Min ${game.minBet.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Hover glow border */}
        <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-[var(--casino-accent)]/40 group-hover:shadow-[0_0_30px_rgba(201,162,39,0.1)] transition-all duration-300 pointer-events-none" />
      </motion.div>
    </Link>
  )
}
