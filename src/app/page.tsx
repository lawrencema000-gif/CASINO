'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Users,
  TrendingUp,
  Trophy,
  Star,
  Shield,
  Zap,
  UserPlus,
  Search,
  Gift,
  Gamepad2,
  Heart,
} from 'lucide-react'
import GameCard from '@/components/ui/GameCard'
import BonusWheel from '@/components/ui/BonusWheel'
import { GAME_CATALOG, searchGames, getGameCount } from '@/lib/games/catalog'
import type { GameInfo } from '@/lib/games/catalog'
import { useGameState } from '@/hooks/useGameState'
import { useFavorites } from '@/hooks/useFavorites'

/* ─── Category definitions ─── */
const categories = [
  { slug: 'all', label: 'All Games', icon: '🎮' },
  { slug: 'favorites', label: 'Favorites', icon: '❤️' },
  { slug: 'slots', label: 'Slots', icon: '🎰' },
  { slug: 'table', label: 'Table Games', icon: '🃏' },
  { slug: 'instant', label: 'Instant', icon: '⚡' },
  { slug: 'card', label: 'Card Games', icon: '♠️' },
]

/* ─── Sparkle Particle ─── */
function SparkleParticle({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <motion.div
      className="absolute w-1 h-1 bg-[var(--gold)] rounded-full"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
      transition={{ duration: 2.5, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

/* ─── How It Works Card ─── */
function HowItWorksCard({
  icon,
  title,
  description,
  step,
  delay,
}: {
  icon: React.ReactNode
  title: string
  description: string
  step: number
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="relative group"
    >
      <div className="relative p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--gold)]/30 transition-all duration-300 card-shine text-center">
        <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dark)] flex items-center justify-center text-black text-xs font-bold">
          {step}
        </div>
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--gold)]/10 border border-[var(--gold)]/20 flex items-center justify-center text-[var(--gold)] group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>
      </div>
    </motion.div>
  )
}

/* ─── Animated Counter ─── */
function AnimatedStat({ label, value, prefix, icon }: { label: string; value: number; prefix?: string; icon: React.ReactNode }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const duration = 2000
    const steps = 60
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        current = value
        clearInterval(timer)
      }
      setDisplayValue(Math.floor(current))
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])

  return (
    <div className="flex items-center gap-2 text-sm">
      {icon}
      <span className="text-[var(--text-secondary)]">{label}:</span>
      <span className="font-bold text-white tabular-nums">
        {prefix}{displayValue.toLocaleString()}
      </span>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   LOBBY PAGE
   ═══════════════════════════════════════════════════ */
export default function LobbyPage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [jackpotAmount, setJackpotAmount] = useState(127_843.67)
  const [bonusOpen, setBonusOpen] = useState(false)

  const { profile, fetchProfile } = useGameState()
  const { favorites, toggleFavorite, isFavorite } = useFavorites()

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Slowly tick up the jackpot
  useEffect(() => {
    const interval = setInterval(() => {
      setJackpotAmount((prev) => prev + Math.random() * 0.5 + 0.1)
    }, 100)
    return () => clearInterval(interval)
  }, [])

  // Live stats (random stable values)
  const [stats] = useState({
    playersOnline: Math.floor(Math.random() * 2300) + 1200,
    wonToday: Math.floor(Math.random() * 4000000) + 1000000,
    gamesPlayed: Math.floor(Math.random() * 150000) + 50000,
  })

  // Filter games
  const filteredGames = useMemo(() => {
    let games: GameInfo[] = GAME_CATALOG

    // Category filter
    if (activeCategory === 'favorites') {
      games = games.filter((g) => favorites.includes(g.slug))
    } else if (activeCategory !== 'all') {
      games = games.filter((g) => g.category === activeCategory)
    }

    // Search filter
    if (searchQuery.trim()) {
      const searchResults = searchGames(searchQuery)
      const searchSlugs = new Set(searchResults.map((g) => g.slug))
      games = games.filter((g) => searchSlugs.has(g.slug))
    }

    return games
  }, [activeCategory, searchQuery, favorites])

  // Category counts
  const getCategoryCount = useCallback(
    (slug: string) => {
      if (slug === 'favorites') return favorites.length
      return getGameCount(slug)
    },
    [favorites]
  )

  // Pre-generate sparkle positions
  const sparkles = useMemo(
    () =>
      Array.from({ length: 25 }, () => ({
        delay: Math.random() * 3,
        x: Math.random() * 100,
        y: Math.random() * 100,
      })),
    []
  )

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* ─── Hero Banner ─── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[var(--bg-secondary)] via-[#0e0e1a] to-[var(--bg-primary)] py-20 sm:py-28 px-4">
        {/* Sparkle particles */}
        <div className="absolute inset-0 pointer-events-none">
          {sparkles.map((s, i) => (
            <SparkleParticle key={i} {...s} />
          ))}
        </div>

        {/* Ambient glow orbs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[var(--gold)]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-[var(--casino-purple)]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center gap-2 text-[var(--gold)]"
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-semibold uppercase tracking-[0.2em]">
              Premium Gaming Experience
            </span>
            <Sparkles className="w-5 h-5" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight"
          >
            <span className="text-gold-gradient">FORTUNA</span>{' '}
            <span className="text-white">CASINO</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto font-light italic"
          >
            Where Fortune Favors the Bold
          </motion.p>

          {/* Jackpot Counter */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="inline-flex flex-col items-center gap-2 px-10 py-5 rounded-2xl bg-[var(--bg-card)]/60 border border-[var(--gold)]/20 card-shine-auto"
          >
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Trophy className="w-4 h-4 text-[var(--gold)]" />
              Grand Jackpot
            </div>
            <span className="text-4xl sm:text-5xl font-extrabold text-[var(--gold)] jackpot-glow tabular-nums">
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
            <Link href="/games/slots">
              <button className="inline-flex items-center gap-2.5 px-10 py-4 text-lg font-bold rounded-xl bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] text-black hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] active:scale-[0.97] transition-all cursor-pointer">
                <Star className="w-5 h-5" />
                PLAY NOW
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ─── Live Stats Bar ─── */}
      <section className="px-4 sm:px-6 -mt-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 py-4 px-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-lg"
          >
            <AnimatedStat
              label="Players Online"
              value={stats.playersOnline}
              icon={<div className="w-2 h-2 rounded-full bg-[var(--neon-green)] live-pulse" />}
            />
            <div className="w-px h-5 bg-[var(--border-color)] hidden sm:block" />
            <AnimatedStat
              label="Won Today"
              value={stats.wonToday}
              prefix="$"
              icon={<TrendingUp className="w-4 h-4 text-[var(--neon-green)]" />}
            />
            <div className="w-px h-5 bg-[var(--border-color)] hidden sm:block" />
            <AnimatedStat
              label="Games Played"
              value={stats.gamesPlayed}
              icon={<Gamepad2 className="w-4 h-4 text-[var(--casino-purple)]" />}
            />
          </motion.div>
        </div>
      </section>

      {/* ─── Search Bar ─── */}
      <section className="px-4 sm:px-6 pt-10 pb-4">
        <div className="max-w-7xl mx-auto">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[var(--gold)]/50 focus:shadow-[0_0_15px_rgba(255,215,0,0.1)] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ─── Category Filter Bar (sticky) ─── */}
      <section className="sticky top-0 z-30 bg-[var(--bg-primary)]/90 backdrop-blur-md border-b border-[var(--border-color)]/50 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.slug
              const count = getCategoryCount(cat.slug)
              return (
                <button
                  key={cat.slug}
                  onClick={() => setActiveCategory(cat.slug)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-full transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[var(--gold)] text-black font-semibold shadow-[0_0_15px_rgba(255,215,0,0.3)]'
                      : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-[var(--gold)]/30 hover:text-white'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-black/20 text-black'
                        : 'bg-white/5 text-zinc-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── Games Grid ─── */}
      <section className="px-4 sm:px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--gold)]" />
              {activeCategory === 'favorites'
                ? 'Your Favorites'
                : activeCategory === 'all'
                  ? 'All Games'
                  : categories.find((c) => c.slug === activeCategory)?.label ?? 'Games'}
              {searchQuery && (
                <span className="text-sm font-normal text-zinc-500 ml-2">
                  &mdash; &ldquo;{searchQuery}&rdquo;
                </span>
              )}
            </h2>
            <span className="text-sm text-zinc-500">{filteredGames.length} games</span>
          </div>

          <AnimatePresence mode="wait">
            {filteredGames.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-20"
              >
                <div className="text-5xl mb-4">
                  {activeCategory === 'favorites' ? '❤️' : '🔍'}
                </div>
                <p className="text-[var(--text-secondary)] text-lg">
                  {activeCategory === 'favorites'
                    ? 'No favorites yet. Click the heart on any game to add it!'
                    : 'No games found. Try a different search or category.'}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={activeCategory + searchQuery}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
              >
                {filteredGames.map((game, i) => (
                  <motion.div
                    key={game.slug}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.5) }}
                  >
                    <GameCard
                      {...game}
                      isFavorite={isFavorite(game.slug)}
                      onToggleFavorite={toggleFavorite}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="px-4 sm:px-6 py-16 bg-gradient-to-b from-transparent via-[var(--bg-secondary)]/50 to-transparent">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-extrabold text-white mb-3">
              How It <span className="text-gold-gradient">Works</span>
            </h2>
            <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
              Get started in seconds. No downloads, no hassle.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <HowItWorksCard
              step={1}
              icon={<UserPlus className="w-7 h-7" />}
              title="Sign Up"
              description="Create your account in seconds. Start with free demo credits to try every game risk-free."
              delay={0}
            />
            <HowItWorksCard
              step={2}
              icon={<Zap className="w-7 h-7" />}
              title="Play Games"
              description="Choose from 40+ games: Slots, Blackjack, Roulette, Poker, Crash, Plinko and more. All provably fair."
              delay={0.1}
            />
            <HowItWorksCard
              step={3}
              icon={<Trophy className="w-7 h-7" />}
              title="Win Big"
              description="Hit jackpots, climb the VIP ranks, and withdraw your winnings instantly."
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* ─── Trust Bar ─── */}
      <section className="px-4 sm:px-6 pb-16">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-wrap items-center justify-center gap-8 py-6 px-8 rounded-2xl bg-[var(--bg-card)]/50 border border-[var(--border-color)]"
          >
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Shield className="w-5 h-5 text-[var(--neon-green)]" />
              <span>Provably Fair</span>
            </div>
            <div className="w-px h-5 bg-[var(--border-color)]" />
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Zap className="w-5 h-5 text-[var(--gold)]" />
              <span>Instant Payouts</span>
            </div>
            <div className="w-px h-5 bg-[var(--border-color)]" />
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Users className="w-5 h-5 text-[var(--casino-purple)]" />
              <span>50K+ Players</span>
            </div>
            <div className="w-px h-5 bg-[var(--border-color)]" />
            <div className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
              <div className="w-6 h-6 rounded-full border border-[var(--casino-red)] flex items-center justify-center">
                <span className="text-[8px] font-bold text-[var(--casino-red)]">18+</span>
              </div>
              <span>Play Responsibly</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Floating Daily Bonus Button ─── */}
      {profile && (
        <motion.button
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, type: 'spring' }}
          onClick={() => setBonusOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] text-black font-bold text-sm shadow-[0_0_30px_rgba(255,215,0,0.4)] hover:shadow-[0_0_50px_rgba(255,215,0,0.6)] active:scale-95 transition-all cursor-pointer"
        >
          <Gift className="w-5 h-5" />
          Claim Daily Bonus
        </motion.button>
      )}

      {/* Bonus Wheel Modal */}
      <BonusWheel isOpen={bonusOpen} onClose={() => setBonusOpen(false)} />
    </div>
  )
}
