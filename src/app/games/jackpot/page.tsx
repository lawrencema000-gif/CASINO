'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Users, TrendingUp, Coins, RotateCcw, Crown, Zap } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { useGame } from '@/hooks/useGame'
import { useAuth } from '@/hooks/useAuth'
import { useBalance } from '@/hooks/useBalance'

interface PoolEntry {
  id: string
  username: string
  amount: number
  color: string
}

interface Winner {
  username: string
  amount: number
  time: string
}

const COLORS = [
  '#c9a227', '#6c2bd9', '#00cc6a', '#ff3b5c', '#3b82f6',
  '#ff8c00', '#e91e8e', '#00bcd4', '#8bc34a', '#ff5722',
]

const FAKE_ENTRIES: PoolEntry[] = [
  { id: '1', username: 'HighRoller99', amount: 5000, color: COLORS[0] },
  { id: '2', username: 'LuckyStar', amount: 3200, color: COLORS[1] },
  { id: '3', username: 'AceKing', amount: 2800, color: COLORS[2] },
  { id: '4', username: 'DiamondHands', amount: 1500, color: COLORS[3] },
  { id: '5', username: 'CryptoWhale', amount: 4100, color: COLORS[4] },
]

const RECENT_WINNERS: Winner[] = [
  { username: 'MegaWin88', amount: 45230, time: '2m ago' },
  { username: 'GoldRush', amount: 12800, time: '8m ago' },
  { username: 'NeonKnight', amount: 67500, time: '15m ago' },
  { username: 'StarDust', amount: 23100, time: '22m ago' },
  { username: 'VelvetAce', amount: 89200, time: '31m ago' },
]

export default function JackpotPage() {
  const { user, profile } = useAuth()
  const { balance, refreshBalance } = useBalance(user?.id)
  const { placeBet, loading: gameLoading, error } = useGame(() => refreshBalance())

  const [betAmount, setBetAmount] = useState(500)
  const [entries, setEntries] = useState<PoolEntry[]>(FAKE_ENTRIES)
  const [myEntries, setMyEntries] = useState(0)
  const [myTotalBet, setMyTotalBet] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [spinWinner, setSpinWinner] = useState<PoolEntry | null>(null)
  const [spinAngle, setSpinAngle] = useState(0)
  const [countdown, setCountdown] = useState(45)
  const [jackpotTotal, setJackpotTotal] = useState(16600)
  const [recentWinners] = useState<Winner[]>(RECENT_WINNERS)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  // Jackpot ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setJackpotTotal((prev) => prev + Math.random() * 50 + 10)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  // Countdown
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          triggerSpin()
          return 60
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [entries])

  const totalPool = entries.reduce((sum, e) => sum + e.amount, 0)
  const rake = totalPool * 0.05
  const prizePool = totalPool - rake

  const enterPool = useCallback(async () => {
    if (betAmount > balance || betAmount <= 0) return

    await placeBet({
      gameType: 'jackpot' as any,
      betAmount,
      gameData: { action: 'enter' },
    })

    const username = profile?.username || 'You'
    const existingEntry = entries.find((e) => e.username === username)

    if (existingEntry) {
      setEntries((prev) =>
        prev.map((e) => e.username === username ? { ...e, amount: e.amount + betAmount } : e)
      )
    } else {
      setEntries((prev) => [
        ...prev,
        { id: Date.now().toString(), username, amount: betAmount, color: COLORS[prev.length % COLORS.length] },
      ])
    }

    setMyEntries((prev) => prev + 1)
    setMyTotalBet((prev) => prev + betAmount)
    setJackpotTotal((prev) => prev + betAmount)
  }, [betAmount, balance, entries, profile, placeBet])

  const triggerSpin = useCallback(() => {
    if (entries.length < 2 || isSpinning) return
    setIsSpinning(true)
    setSpinWinner(null)

    // Weighted random winner
    const total = entries.reduce((sum, e) => sum + e.amount, 0)
    let random = Math.random() * total
    let winner = entries[0]
    for (const entry of entries) {
      random -= entry.amount
      if (random <= 0) {
        winner = entry
        break
      }
    }

    // Spin animation
    const targetAngle = 360 * 5 + Math.random() * 360
    setSpinAngle(targetAngle)

    setTimeout(() => {
      setSpinWinner(winner)
      setIsSpinning(false)

      // Reset after showing winner
      setTimeout(() => {
        setSpinWinner(null)
        setEntries(FAKE_ENTRIES)
        setSpinAngle(0)
        setMyEntries(0)
        setMyTotalBet(0)
      }, 5000)
    }, 4000)
  }, [entries, isSpinning])

  const myChance = totalPool > 0 ? ((myTotalBet / totalPool) * 100).toFixed(1) : '0.0'

  const presetBets = [100, 500, 1000, 5000]

  return (
    <div className="space-y-6">
      {/* Jackpot Counter */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-2xl border border-[var(--casino-accent)]/40"
        style={{
          background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 30%, #2d0a1a 60%, #1a0a0a 100%)',
        }}
      >
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-[var(--casino-accent)]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-[var(--casino-purple)]/10 rounded-full blur-3xl" />
        </div>
        <div className="relative text-center py-10 px-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Crown className="w-6 h-6 text-[var(--casino-accent)]" />
            <span className="text-sm font-bold text-[var(--casino-accent)] uppercase tracking-[0.3em]">
              Progressive Jackpot
            </span>
            <Crown className="w-6 h-6 text-[var(--casino-accent)]" />
          </div>
          <motion.h1
            className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#a07d1a] via-[#e6c84a] to-[#a07d1a]"
            animate={{ textShadow: ['0 0 20px rgba(201,162,39,0.3)', '0 0 40px rgba(201,162,39,0.6)', '0 0 20px rgba(201,162,39,0.3)'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ${jackpotTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </motion.h1>
          <div className="mt-4 flex items-center justify-center gap-6 text-sm text-[var(--casino-text-muted)]">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" /> {entries.length} Players
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" /> 5% Rake
            </span>
          </div>

          {/* Countdown */}
          <div className="mt-4">
            <div className="inline-flex items-center gap-2 bg-black/40 rounded-full px-6 py-2 border border-[var(--casino-border)]">
              <Zap className="w-4 h-4 text-[var(--casino-accent)]" />
              <span className="text-sm text-white font-mono">
                Next draw in <span className="text-[var(--casino-accent)] font-bold">{countdown}s</span>
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Wheel / Pool Visualization */}
        <Card hover={false}>
          <h3 className="text-sm font-semibold text-[var(--casino-text-muted)] mb-4">Entry Pool</h3>

          {/* Pie Chart */}
          <div className="relative w-full max-w-[400px] mx-auto aspect-square">
            <motion.svg
              viewBox="0 0 200 200"
              className="w-full h-full"
              animate={{ rotate: isSpinning ? spinAngle : 0 }}
              transition={isSpinning ? { duration: 4, ease: [0.32, 0.72, 0.35, 1.0] } : { duration: 0 }}
            >
              {entries.map((entry, i) => {
                const percentage = entry.amount / totalPool
                const startAngle = entries.slice(0, i).reduce((sum, e) => sum + (e.amount / totalPool) * 360, 0)
                const endAngle = startAngle + percentage * 360

                const startRad = ((startAngle - 90) * Math.PI) / 180
                const endRad = ((endAngle - 90) * Math.PI) / 180

                const x1 = 100 + 90 * Math.cos(startRad)
                const y1 = 100 + 90 * Math.sin(startRad)
                const x2 = 100 + 90 * Math.cos(endRad)
                const y2 = 100 + 90 * Math.sin(endRad)

                const largeArc = percentage > 0.5 ? 1 : 0

                return (
                  <path
                    key={entry.id}
                    d={`M 100 100 L ${x1} ${y1} A 90 90 0 ${largeArc} 1 ${x2} ${y2} Z`}
                    fill={entry.color}
                    stroke="rgba(0,0,0,0.3)"
                    strokeWidth="1"
                    className="transition-all duration-300"
                    opacity={spinWinner && spinWinner.id !== entry.id ? 0.3 : 1}
                  />
                )
              })}

              {/* Center circle */}
              <circle cx="100" cy="100" r="35" fill="var(--casino-bg)" stroke="var(--casino-border)" strokeWidth="2" />
              <text x="100" y="95" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                POOL
              </text>
              <text x="100" y="112" textAnchor="middle" fill="var(--casino-accent)" fontSize="8">
                ${prizePool.toLocaleString()}
              </text>
            </motion.svg>

            {/* Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1">
              <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[20px] border-l-transparent border-r-transparent border-t-[var(--casino-accent)]" />
            </div>
          </div>

          {/* Winner Overlay */}
          <AnimatePresence>
            {spinWinner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="mt-6 text-center"
              >
                <div className="inline-block bg-black/60 backdrop-blur-md rounded-2xl px-8 py-6 border border-[var(--casino-accent)]/40">
                  <Trophy className="w-12 h-12 text-[var(--casino-accent)] mx-auto mb-2" />
                  <h3 className="text-2xl font-black text-white mb-1">{spinWinner.username}</h3>
                  <p className="text-xl font-bold text-[var(--casino-green)]">
                    Won ${prizePool.toLocaleString()}!
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Entry List */}
          <div className="mt-6 space-y-2">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[var(--casino-surface)]">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-sm text-white flex-1">{entry.username}</span>
                <span className="text-sm text-[var(--casino-text-muted)] font-mono">${entry.amount.toLocaleString()}</span>
                <span className="text-xs text-[var(--casino-text-muted)]">
                  {((entry.amount / totalPool) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Controls */}
        <div className="space-y-4">
          {/* Enter Pool */}
          <Card hover={false} glow="gold">
            <div className="space-y-3">
              <label className="text-sm font-medium text-[var(--casino-text-muted)]">Bet Amount</label>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(0, Number(e.target.value)))}
                disabled={isSpinning}
                className="w-full bg-[var(--casino-surface)] border border-[var(--casino-border)] rounded-xl px-4 py-2.5 text-white font-mono text-lg focus:outline-none focus:border-[var(--casino-accent)] disabled:opacity-50 transition-colors"
              />
              <div className="flex gap-1.5 flex-wrap">
                {presetBets.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => !isSpinning && setBetAmount(amt)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                      betAmount === amt
                        ? 'bg-[var(--casino-accent)] text-black'
                        : 'bg-[var(--casino-surface)] text-[var(--casino-text-muted)] border border-[var(--casino-border)]'
                    )}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
              {error && <p className="text-xs text-[var(--casino-red)]">{error}</p>}
              <Button
                variant="primary"
                size="lg"
                className="w-full text-lg"
                onClick={enterPool}
                loading={gameLoading}
                disabled={betAmount <= 0 || betAmount > balance || isSpinning}
                icon={<Coins className="w-5 h-5" />}
              >
                ENTER POOL
              </Button>
            </div>
          </Card>

          {/* Your Stats */}
          <Card hover={false} glow="purple">
            <h3 className="text-sm font-semibold text-[var(--casino-text-muted)] mb-3">Your Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--casino-surface)] rounded-xl p-3 text-center">
                <p className="text-[var(--casino-text-muted)] text-xs">Entries</p>
                <p className="text-xl font-bold text-white">{myEntries}</p>
              </div>
              <div className="bg-[var(--casino-surface)] rounded-xl p-3 text-center">
                <p className="text-[var(--casino-text-muted)] text-xs">Total Bet</p>
                <p className="text-xl font-bold text-[var(--casino-accent)]">${myTotalBet.toLocaleString()}</p>
              </div>
              <div className="bg-[var(--casino-surface)] rounded-xl p-3 text-center col-span-2">
                <p className="text-[var(--casino-text-muted)] text-xs">Win Chance</p>
                <p className="text-2xl font-bold text-[var(--casino-green)]">{myChance}%</p>
              </div>
            </div>
          </Card>

          {/* Recent Winners */}
          <Card hover={false}>
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-[var(--casino-accent)]" />
              <h3 className="text-sm font-semibold text-[var(--casino-text-muted)]">Recent Winners</h3>
            </div>
            <div className="space-y-2">
              {recentWinners.map((w, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-2 rounded-lg bg-[var(--casino-surface)]">
                  <div>
                    <p className="text-sm text-white font-medium">{w.username}</p>
                    <p className="text-[10px] text-[var(--casino-text-muted)]">{w.time}</p>
                  </div>
                  <span className="text-sm font-bold text-[var(--casino-green)]">
                    +${w.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
