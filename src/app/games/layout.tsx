'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, Gamepad2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useBalance } from '@/hooks/useBalance'
import BalanceDisplay from '@/components/ui/BalanceDisplay'

const gameNames: Record<string, string> = {
  blackjack: 'Blackjack',
  coinflip: 'Coin Flip',
  crash: 'Crash',
  dice: 'Dice',
  jackpot: 'Jackpot',
  lottery: 'Lottery',
  plinko: 'Plinko',
  poker: 'Texas Hold\'em',
  roulette: 'Roulette',
  slots: 'Slots',
}

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const { balance } = useBalance(user?.id)

  const segments = pathname.split('/')
  const gameSlug = segments[2] || ''
  const gameName = gameNames[gameSlug] || 'Game'

  return (
    <div className="min-h-screen bg-[var(--casino-bg)]">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-40 backdrop-blur-xl bg-[var(--casino-bg)]/80 border-b border-[var(--casino-border)]"
      >
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-[var(--casino-text-muted)] hover:text-white transition-colors cursor-pointer group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm hidden sm:inline">Lobby</span>
            </button>
            <div className="w-px h-6 bg-[var(--casino-border)]" />
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-[var(--casino-accent)]" />
              <h1 className="text-lg font-bold text-white">{gameName}</h1>
            </div>
          </div>
          <BalanceDisplay balance={balance} size="sm" />
        </div>
      </motion.header>

      {/* Game Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
