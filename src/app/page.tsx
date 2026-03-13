'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Users,
  TrendingUp,
  Trophy,
  ChevronRight,
  Star,
} from 'lucide-react'
import GameCard, { type GameData } from '@/components/ui/GameCard'
import Button from '@/components/ui/Button'
import Sidebar from '@/components/layout/Sidebar'

/* ─── Game Data ─── */
const allGames: GameData[] = [
  {
    name: 'Mega Slots',
    slug: 'slots',
    category: 'slots',
    icon: 'slots',
    minBet: 0.1,
    badge: 'HOT',
    gradient: 'bg-gradient-to-br from-purple-700 via-purple-900 to-indigo-900',
  },
  {
    name: 'Blackjack Pro',
    slug: 'blackjack',
    category: 'cards',
    icon: 'cards',
    minBet: 1.0,
    badge: 'LIVE',
    gradient: 'bg-gradient-to-br from-emerald-700 via-emerald-900 to-teal-900',
  },
  {
    name: 'Royal Roulette',
    slug: 'roulette',
    category: 'table',
    icon: 'wheel',
    minBet: 0.5,
    gradient: 'bg-gradient-to-br from-red-700 via-red-900 to-rose-900',
  },
  {
    name: 'Texas Poker',
    slug: 'poker',
    category: 'cards',
    icon: 'chips',
    minBet: 2.0,
    badge: 'NEW',
    gradient: 'bg-gradient-to-br from-amber-700 via-amber-900 to-yellow-900',
  },
  {
    name: 'Lucky Dice',
    slug: 'dice',
    category: 'table',
    icon: 'dice',
    minBet: 0.25,
    gradient: 'bg-gradient-to-br from-blue-700 via-blue-900 to-cyan-900',
  },
  {
    name: 'Coin Flip',
    slug: 'coinflip',
    category: 'instant',
    icon: 'coin',
    minBet: 0.1,
    badge: 'HOT',
    gradient: 'bg-gradient-to-br from-yellow-600 via-amber-800 to-orange-900',
  },
  {
    name: 'Crash',
    slug: 'crash',
    category: 'instant',
    icon: 'rocket',
    minBet: 0.5,
    badge: 'LIVE',
    gradient: 'bg-gradient-to-br from-orange-600 via-red-800 to-pink-900',
  },
  {
    name: 'Plinko',
    slug: 'plinko',
    category: 'table',
    icon: 'triangle',
    minBet: 0.1,
    badge: 'NEW',
    gradient: 'bg-gradient-to-br from-cyan-600 via-blue-800 to-indigo-900',
  },
  {
    name: 'Lucky Lottery',
    slug: 'lottery',
    category: 'slots',
    icon: 'ticket',
    minBet: 1.0,
    gradient: 'bg-gradient-to-br from-pink-600 via-fuchsia-800 to-purple-900',
  },
  {
    name: 'Grand Jackpot',
    slug: 'jackpot',
    category: 'slots',
    icon: 'crown',
    minBet: 5.0,
    badge: 'JACKPOT',
    gradient: 'bg-gradient-to-br from-yellow-500 via-amber-700 to-yellow-900',
  },
]

const categoryMap: Record<string, string> = {
  all: 'All Games',
  slots: 'Slots',
  table: 'Table Games',
  cards: 'Card Games',
  instant: 'Instant Win',
  jackpots: 'Jackpots',
}

/* ─── Sparkle Particle ─── */
function SparkleParticle({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <motion.div
      className="absolute w-1 h-1 bg-[var(--casino-accent)] rounded-full"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0, 1.5, 0],
      }}
      transition={{
        duration: 2.5,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  )
}

export default function LobbyPage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [jackpotAmount, setJackpotAmount] = useState(127_843.67)

  // Slowly tick up the jackpot
  useEffect(() => {
    const interval = setInterval(() => {
      setJackpotAmount((prev) => prev + Math.random() * 0.5 + 0.1)
    }, 100)
    return () => clearInterval(interval)
  }, [])

  const filteredGames = useMemo(() => {
    if (activeCategory === 'all') return allGames
    if (activeCategory === 'jackpots')
      return allGames.filter((g) => g.badge === 'JACKPOT')
    return allGames.filter((g) => g.category === activeCategory)
  }, [activeCategory])

  const featuredGames = allGames.filter((g) => g.badge)

  // Pre-generate sparkle positions
  const sparkles = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        delay: Math.random() * 3,
        x: Math.random() * 100,
        y: Math.random() * 100,
      })),
    []
  )

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <Sidebar
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {/* ─── Hero Banner ─── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#12121e] via-[#0e0e1a] to-[var(--casino-bg)] py-16 sm:py-24 px-4">
          {/* Sparkle particles */}
          <div className="absolute inset-0 pointer-events-none">
            {sparkles.map((s, i) => (
              <SparkleParticle key={i} {...s} />
            ))}
          </div>

          {/* Ambient glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[var(--casino-accent)]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-4xl mx-auto text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center justify-center gap-2 text-[var(--casino-accent)]"
            >
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-semibold uppercase tracking-widest">
                Premium Gaming Experience
              </span>
              <Sparkles className="w-5 h-5" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold"
            >
              Welcome to{' '}
              <span className="text-gold-gradient">Royal Casino</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-[var(--casino-text-muted)] max-w-2xl mx-auto"
            >
              Provably fair games, instant payouts, and a luxurious gaming
              experience. Your fortune awaits.
            </motion.p>

            {/* Jackpot Counter */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="inline-flex flex-col items-center gap-2 px-8 py-4 rounded-2xl bg-[var(--casino-card)]/60 border border-[var(--casino-accent)]/20"
            >
              <div className="flex items-center gap-2 text-sm text-[var(--casino-text-muted)]">
                <Trophy className="w-4 h-4 text-[var(--casino-accent)]" />
                Grand Jackpot
              </div>
              <span className="text-3xl sm:text-4xl font-extrabold text-[var(--casino-accent)] jackpot-glow tabular-nums">
                $
                {jackpotAmount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Button size="lg" className="text-base">
                <Star className="w-5 h-5" />
                Play Now
              </Button>
            </motion.div>
          </div>
        </section>

        {/* ─── Featured Games Carousel ─── */}
        <section className="px-4 sm:px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[var(--casino-accent)]" />
                Featured Games
              </h2>
              <button className="flex items-center gap-1 text-sm text-[var(--casino-accent)] hover:underline cursor-pointer">
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
              {featuredGames.map((game, i) => (
                <motion.div
                  key={game.slug}
                  className="shrink-0 w-56"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <GameCard game={game} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Live Stats Bar ─── */}
        <section className="px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 py-4 px-6 rounded-xl bg-[var(--casino-surface)] border border-[var(--casino-border)]">
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-[var(--casino-green)]" />
                <span className="text-[var(--casino-text-muted)]">Players Online:</span>
                <span className="font-bold text-white">1,234</span>
              </div>
              <div className="w-px h-5 bg-[var(--casino-border)] hidden sm:block" />
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-[var(--casino-accent)]" />
                <span className="text-[var(--casino-text-muted)]">Total Won Today:</span>
                <span className="font-bold text-[var(--casino-accent)]">$45,678</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Mobile Category Filters ─── */}
        <section className="lg:hidden px-4 sm:px-6 pt-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {Object.entries(categoryMap).map(([slug, name]) => (
                <button
                  key={slug}
                  onClick={() => setActiveCategory(slug)}
                  className={`shrink-0 px-4 py-2 text-sm rounded-full transition-all cursor-pointer ${
                    activeCategory === slug
                      ? 'bg-[var(--casino-accent)] text-black font-semibold'
                      : 'bg-[var(--casino-card)] text-[var(--casino-text-muted)] border border-[var(--casino-border)] hover:border-[var(--casino-accent)]/30'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Games Grid ─── */}
        <section className="px-4 sm:px-6 py-8 pb-16">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--casino-accent)]" />
              {categoryMap[activeCategory] || 'All Games'}
            </h2>

            {filteredGames.length === 0 ? (
              <div className="text-center py-20 text-[var(--casino-text-muted)]">
                No games found in this category.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredGames.map((game, i) => (
                  <motion.div
                    key={game.slug}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.05 }}
                  >
                    <GameCard game={game} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
