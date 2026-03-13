'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Users,
  TrendingUp,
  Trophy,
  ChevronRight,
  Star,
  Shield,
  Zap,
  UserPlus,
} from 'lucide-react'
import GameCard from '@/components/ui/GameCard'
import Sidebar from '@/components/layout/Sidebar'

/* ─── Game Data ─── */
const allGames = [
  {
    name: 'Mega Slots',
    slug: 'slots',
    category: 'slots',
    icon: '🎰',
    description: 'Spin the reels and hit massive jackpots with wild multipliers.',
    houseEdge: '2.5%',
    badge: 'HOT' as const,
    gradient: 'bg-gradient-to-br from-purple-700 via-purple-900 to-indigo-900',
  },
  {
    name: 'Blackjack Pro',
    slug: 'blackjack',
    category: 'cards',
    icon: '🃏',
    description: 'Beat the dealer with strategy. Classic 21 with side bets.',
    houseEdge: '0.5%',
    badge: 'LIVE' as const,
    gradient: 'bg-gradient-to-br from-emerald-700 via-emerald-900 to-teal-900',
  },
  {
    name: 'Royal Roulette',
    slug: 'roulette',
    category: 'table',
    icon: '🎡',
    description: 'Place your bets on the wheel. European rules, single zero.',
    houseEdge: '2.7%',
    gradient: 'bg-gradient-to-br from-red-700 via-red-900 to-rose-900',
  },
  {
    name: 'Texas Poker',
    slug: 'poker',
    category: 'cards',
    icon: '♠️',
    description: 'No-limit Texas Hold\'em. Bluff, raise, and take the pot.',
    houseEdge: '2.0%',
    badge: 'NEW' as const,
    gradient: 'bg-gradient-to-br from-amber-700 via-amber-900 to-yellow-900',
  },
  {
    name: 'Lucky Dice',
    slug: 'dice',
    category: 'table',
    icon: '🎲',
    description: 'Roll over or under. Set your own risk and multiplier.',
    houseEdge: '1.0%',
    gradient: 'bg-gradient-to-br from-blue-700 via-blue-900 to-cyan-900',
  },
  {
    name: 'Coin Flip',
    slug: 'coinflip',
    category: 'instant',
    icon: '🪙',
    description: 'Heads or tails. Double your money in an instant.',
    houseEdge: '2.0%',
    badge: 'HOT' as const,
    gradient: 'bg-gradient-to-br from-yellow-600 via-amber-800 to-orange-900',
  },
  {
    name: 'Crash',
    slug: 'crash',
    category: 'instant',
    icon: '🚀',
    description: 'Watch the multiplier climb. Cash out before it crashes.',
    houseEdge: '3.0%',
    badge: 'LIVE' as const,
    gradient: 'bg-gradient-to-br from-orange-600 via-red-800 to-pink-900',
  },
  {
    name: 'Plinko',
    slug: 'plinko',
    category: 'table',
    icon: '🔺',
    description: 'Drop the ball and watch it bounce to huge multipliers.',
    houseEdge: '1.0%',
    badge: 'NEW' as const,
    gradient: 'bg-gradient-to-br from-cyan-600 via-blue-800 to-indigo-900',
  },
]

const categoryMap: Record<string, string> = {
  all: 'All Games',
  slots: 'Slots',
  table: 'Table Games',
  cards: 'Card Games',
  instant: 'Instant Win',
}

/* ─── Sparkle Particle ─── */
function SparkleParticle({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <motion.div
      className="absolute w-1 h-1 bg-[var(--gold)] rounded-full"
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
        {/* Step number */}
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
    return allGames.filter((g) => g.category === activeCategory)
  }, [activeCategory])

  const featuredGames = allGames.filter((g) => g.badge)

  // Pre-generate sparkle positions
  const sparkles = useMemo(
    () =>
      Array.from({ length: 25 }, (_, i) => ({
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
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-[var(--neon-green)] live-pulse" />
                <span className="text-[var(--text-secondary)]">Players Online:</span>
                <span className="font-bold text-white">2,847</span>
              </div>
              <div className="w-px h-5 bg-[var(--border-color)] hidden sm:block" />
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-[var(--neon-green)]" />
                <span className="text-[var(--text-secondary)]">Won Today:</span>
                <span className="font-bold text-[var(--neon-green)]">$145,678</span>
              </div>
              <div className="w-px h-5 bg-[var(--border-color)] hidden sm:block" />
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-[var(--casino-purple)]" />
                <span className="text-[var(--text-secondary)]">Total Games:</span>
                <span className="font-bold text-white">12,543</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── Featured Games Carousel ─── */}
        <section className="px-4 sm:px-6 py-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[var(--gold)]" />
                Featured Games
              </h2>
              <button className="flex items-center gap-1 text-sm text-[var(--gold)] hover:underline cursor-pointer">
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
              {featuredGames.map((game, i) => (
                <motion.div
                  key={game.slug}
                  className="shrink-0 w-72"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <GameCard
                    title={game.name}
                    description={game.description}
                    icon={game.icon}
                    href={`/games/${game.slug}`}
                    houseEdge={game.houseEdge}
                    isHot={game.badge === 'HOT'}
                    isNew={game.badge === 'NEW'}
                    badgeText={game.badge === 'LIVE' ? 'LIVE' : undefined}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Mobile Category Filters ─── */}
        <section className="lg:hidden px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {Object.entries(categoryMap).map(([slug, name]) => (
                <button
                  key={slug}
                  onClick={() => setActiveCategory(slug)}
                  className={`shrink-0 px-4 py-2 text-sm rounded-full transition-all cursor-pointer ${
                    activeCategory === slug
                      ? 'bg-[var(--gold)] text-black font-semibold'
                      : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-[var(--gold)]/30'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Games Grid ─── */}
        <section className="px-4 sm:px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--gold)]" />
              {categoryMap[activeCategory] || 'All Games'}
            </h2>

            {filteredGames.length === 0 ? (
              <div className="text-center py-20 text-[var(--text-secondary)]">
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
                    <GameCard
                      title={game.name}
                      description={game.description}
                      icon={game.icon}
                      href={`/games/${game.slug}`}
                      houseEdge={game.houseEdge}
                      isHot={game.badge === 'HOT'}
                      isNew={game.badge === 'NEW'}
                      badgeText={game.badge === 'LIVE' ? 'LIVE' : undefined}
                    />
                  </motion.div>
                ))}
              </div>
            )}
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
                description="Choose from Slots, Blackjack, Roulette, Poker, Crash, Plinko and more. All provably fair."
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
      </div>
    </div>
  )
}
