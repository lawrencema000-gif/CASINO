'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Ticket, Sparkles, Zap, Trophy, History, RotateCcw } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { useGame } from '@/hooks/useGame'
import { useAuth } from '@/hooks/useAuth'
import { useBalance } from '@/hooks/useBalance'

interface LotteryResult {
  selectedNumbers: number[]
  drawnNumbers: number[]
  matchCount: number
  payout: number
}

const PRIZE_TIERS = [
  { matches: 6, prize: 'JACKPOT', multiplier: 10000, label: '6/6 - JACKPOT' },
  { matches: 5, prize: '$10,000', multiplier: 100, label: '5/6 - $10,000' },
  { matches: 4, prize: '$1,000', multiplier: 10, label: '4/6 - $1,000' },
  { matches: 3, prize: '$100', multiplier: 2, label: '3/6 - $100' },
  { matches: 2, prize: '$10', multiplier: 0.5, label: '2/6 - $10' },
  { matches: 1, prize: '$2', multiplier: 0.1, label: '1/6 - $2' },
  { matches: 0, prize: 'Nothing', multiplier: 0, label: '0/6 - Nothing' },
]

export default function LotteryPage() {
  const { user } = useAuth()
  const { balance, refreshBalance } = useBalance(user?.id)
  const { placeBet, loading: gameLoading, error } = useGame(() => refreshBalance())

  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([])
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([])
  const [revealedCount, setRevealedCount] = useState(0)
  const [isDrawing, setIsDrawing] = useState(false)
  const [matchCount, setMatchCount] = useState(0)
  const [lastPayout, setLastPayout] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [ticketHistory, setTicketHistory] = useState<LotteryResult[]>([])
  const [betAmount, setBetAmount] = useState(100)
  const [jackpotAmount, setJackpotAmount] = useState(1247893.56)
  const tickerRef = useRef<NodeJS.Timeout | null>(null)

  // Jackpot ticker
  useEffect(() => {
    tickerRef.current = setInterval(() => {
      setJackpotAmount((prev) => prev + Math.random() * 5 + 0.5)
    }, 100)
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current)
    }
  }, [])

  const toggleNumber = useCallback((num: number) => {
    if (isDrawing || showResult) return
    setSelectedNumbers((prev) => {
      if (prev.includes(num)) return prev.filter((n) => n !== num)
      if (prev.length >= 6) return prev
      return [...prev, num]
    })
  }, [isDrawing, showResult])

  const quickPick = useCallback(() => {
    if (isDrawing || showResult) return
    const nums: number[] = []
    while (nums.length < 6) {
      const n = Math.floor(Math.random() * 49) + 1
      if (!nums.includes(n)) nums.push(n)
    }
    setSelectedNumbers(nums.sort((a, b) => a - b))
  }, [isDrawing, showResult])

  const drawNumbers = useCallback(async () => {
    if (selectedNumbers.length !== 6 || isDrawing) return
    if (betAmount > balance || betAmount <= 0) return

    await placeBet({
      gameType: 'lottery' as any,
      betAmount,
      gameData: { numbers: selectedNumbers },
    })

    setIsDrawing(true)
    setShowResult(false)
    setRevealedCount(0)

    // Generate drawn numbers
    const drawn: number[] = []
    while (drawn.length < 6) {
      const n = Math.floor(Math.random() * 49) + 1
      if (!drawn.includes(n)) drawn.push(n)
    }
    setDrawnNumbers(drawn)

    // Reveal one by one
    for (let i = 0; i < 6; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800))
      setRevealedCount(i + 1)
    }

    await new Promise((resolve) => setTimeout(resolve, 500))

    const matches = selectedNumbers.filter((n) => drawn.includes(n)).length
    const tier = PRIZE_TIERS.find((t) => t.matches === matches)
    const payout = tier ? betAmount * tier.multiplier : 0

    setMatchCount(matches)
    setLastPayout(payout)
    setIsDrawing(false)
    setShowResult(true)

    setTicketHistory((prev) => [
      { selectedNumbers: [...selectedNumbers], drawnNumbers: drawn, matchCount: matches, payout },
      ...prev,
    ].slice(0, 20))
  }, [selectedNumbers, isDrawing, betAmount, balance, placeBet])

  const resetDraw = useCallback(() => {
    setSelectedNumbers([])
    setDrawnNumbers([])
    setRevealedCount(0)
    setShowResult(false)
    setMatchCount(0)
    setLastPayout(0)
  }, [])

  return (
    <div className="space-y-6">
      {/* Jackpot Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-[var(--casino-accent)]/30"
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b69 50%, #1a1a2e 100%)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--casino-accent)]/5 to-transparent animate-pulse" />
        <div className="relative text-center py-8 px-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-[var(--casino-accent)]" />
            <span className="text-sm font-semibold text-[var(--casino-accent)] uppercase tracking-widest">Current Jackpot</span>
            <Sparkles className="w-5 h-5 text-[var(--casino-accent)]" />
          </div>
          <motion.h2
            className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#c9a227] via-[#e6c84a] to-[#c9a227]"
            key={Math.floor(jackpotAmount)}
          >
            ${jackpotAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </motion.h2>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          {/* Number Grid */}
          <Card hover={false}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Pick 6 Numbers</h3>
              <span className="text-sm text-[var(--casino-text-muted)]">
                {selectedNumbers.length}/6 selected
              </span>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 49 }, (_, i) => i + 1).map((num) => {
                const isSelected = selectedNumbers.includes(num)
                const isDrawn = drawnNumbers.includes(num) && revealedCount >= drawnNumbers.indexOf(num) + 1
                const isMatch = isSelected && isDrawn

                return (
                  <motion.button
                    key={num}
                    onClick={() => toggleNumber(num)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      'aspect-square rounded-xl flex items-center justify-center text-sm sm:text-base font-bold transition-all cursor-pointer border',
                      isMatch
                        ? 'bg-[var(--casino-green)] text-black border-[var(--casino-green)] shadow-[0_0_15px_rgba(0,255,136,0.5)]'
                        : isSelected
                        ? 'bg-gradient-to-br from-[#c9a227] to-[#e6c84a] text-black border-[var(--casino-accent)] shadow-[0_0_10px_rgba(201,162,39,0.4)]'
                        : isDrawn
                        ? 'bg-[var(--casino-purple)]/30 text-[var(--casino-purple-light)] border-[var(--casino-purple)]/50'
                        : 'bg-[var(--casino-surface)] text-[var(--casino-text-muted)] border-[var(--casino-border)] hover:text-white hover:border-[var(--casino-accent)]/30'
                    )}
                  >
                    {num}
                  </motion.button>
                )
              })}
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="secondary" onClick={quickPick} disabled={isDrawing || showResult} icon={<Zap className="w-4 h-4" />}>
                Quick Pick
              </Button>
              <Button variant="ghost" onClick={resetDraw} disabled={isDrawing}>
                Clear
              </Button>
            </div>
          </Card>

          {/* Drawn Numbers */}
          <Card hover={false} glow="purple">
            <h3 className="text-sm font-semibold text-[var(--casino-text-muted)] mb-4">Drawn Numbers</h3>
            <div className="flex gap-3 justify-center">
              {Array.from({ length: 6 }, (_, i) => {
                const revealed = i < revealedCount
                const num = drawnNumbers[i]
                const isMatch = revealed && selectedNumbers.includes(num)

                return (
                  <div key={i} className="relative">
                    <AnimatePresence mode="wait">
                      {revealed ? (
                        <motion.div
                          key={`revealed-${i}`}
                          initial={{ rotateY: 90, scale: 0.5 }}
                          animate={{ rotateY: 0, scale: 1 }}
                          transition={{ type: 'spring', damping: 15 }}
                          className={cn(
                            'w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-lg sm:text-2xl font-black border-2',
                            isMatch
                              ? 'bg-[var(--casino-green)] text-black border-[var(--casino-green)] shadow-[0_0_20px_rgba(0,255,136,0.6)]'
                              : 'bg-gradient-to-br from-[#6c2bd9] to-[#9b59f0] text-white border-[var(--casino-purple)] shadow-[0_0_15px_rgba(108,43,217,0.4)]'
                          )}
                        >
                          {num}
                        </motion.div>
                      ) : (
                        <motion.div
                          key={`hidden-${i}`}
                          animate={isDrawing ? { scale: [1, 1.1, 1] } : {}}
                          transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                          className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[var(--casino-surface)] border-2 border-[var(--casino-border)] flex items-center justify-center"
                        >
                          <span className="text-[var(--casino-text-muted)] text-lg">?</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>

            {/* Match Display */}
            <AnimatePresence>
              {showResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 text-center"
                >
                  <div className={cn(
                    'inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xl',
                    matchCount >= 3
                      ? 'bg-[var(--casino-green)]/20 text-[var(--casino-green)] border border-[var(--casino-green)]/30'
                      : matchCount > 0
                      ? 'bg-[var(--casino-accent)]/20 text-[var(--casino-accent)] border border-[var(--casino-accent)]/30'
                      : 'bg-[var(--casino-red)]/20 text-[var(--casino-red)] border border-[var(--casino-red)]/30'
                  )}>
                    {matchCount >= 3 && <Trophy className="w-6 h-6" />}
                    {matchCount} Match{matchCount !== 1 ? 'es' : ''} —{' '}
                    {lastPayout > 0 ? `+$${lastPayout.toLocaleString()}` : 'No Win'}
                  </div>
                  <div className="mt-4">
                    <Button variant="primary" onClick={resetDraw} icon={<RotateCcw className="w-4 h-4" />}>
                      Play Again
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Bet & Draw */}
          <Card hover={false} glow="gold">
            <div className="space-y-3">
              <label className="text-sm font-medium text-[var(--casino-text-muted)]">Ticket Price</label>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(0, Number(e.target.value)))}
                disabled={isDrawing}
                className="w-full bg-[var(--casino-surface)] border border-[var(--casino-border)] rounded-xl px-4 py-2.5 text-white font-mono text-lg focus:outline-none focus:border-[var(--casino-accent)] disabled:opacity-50 transition-colors"
              />
              <div className="flex gap-1.5 flex-wrap">
                {[10, 50, 100, 500].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => !isDrawing && setBetAmount(amt)}
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
                onClick={drawNumbers}
                loading={gameLoading || isDrawing}
                disabled={selectedNumbers.length !== 6 || betAmount <= 0 || betAmount > balance || showResult}
                icon={<Ticket className="w-5 h-5" />}
              >
                {isDrawing ? 'DRAWING...' : 'DRAW!'}
              </Button>
              {selectedNumbers.length > 0 && selectedNumbers.length < 6 && (
                <p className="text-xs text-[var(--casino-text-muted)] text-center">
                  Pick {6 - selectedNumbers.length} more number{6 - selectedNumbers.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </Card>

          {/* Prize Tiers */}
          <Card hover={false}>
            <h3 className="text-sm font-semibold text-[var(--casino-text-muted)] mb-3">Prize Tiers</h3>
            <div className="space-y-1.5">
              {PRIZE_TIERS.map((tier) => (
                <div
                  key={tier.matches}
                  className={cn(
                    'flex items-center justify-between py-1.5 px-2 rounded-lg text-xs',
                    showResult && matchCount === tier.matches
                      ? 'bg-[var(--casino-accent)]/20 border border-[var(--casino-accent)]/30'
                      : 'bg-[var(--casino-surface)]'
                  )}
                >
                  <span className="text-[var(--casino-text-muted)]">{tier.matches}/6</span>
                  <span className={cn(
                    'font-bold',
                    tier.matches >= 5 ? 'text-[var(--casino-accent)]' : tier.matches >= 3 ? 'text-[var(--casino-green)]' : 'text-[var(--casino-text-muted)]'
                  )}>
                    {tier.prize}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Ticket History */}
          <Card hover={false}>
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-[var(--casino-text-muted)]" />
              <h3 className="text-sm font-semibold text-[var(--casino-text-muted)]">Ticket History</h3>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {ticketHistory.length === 0 ? (
                <p className="text-xs text-[var(--casino-text-muted)] text-center py-4">No tickets yet</p>
              ) : (
                ticketHistory.map((t, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-2 rounded-lg bg-[var(--casino-surface)]"
                  >
                    <div className="flex gap-1 mb-1">
                      {t.selectedNumbers.map((n) => (
                        <span
                          key={n}
                          className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold',
                            t.drawnNumbers.includes(n)
                              ? 'bg-[var(--casino-green)] text-black'
                              : 'bg-[var(--casino-border)] text-[var(--casino-text-muted)]'
                          )}
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[var(--casino-text-muted)]">{t.matchCount} matches</span>
                      <span className={cn('font-bold', t.payout > 0 ? 'text-[var(--casino-green)]' : 'text-[var(--casino-red)]')}>
                        {t.payout > 0 ? `+$${t.payout.toLocaleString()}` : 'No win'}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
