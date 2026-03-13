'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Circle, ChevronDown, History, Volume2, VolumeX } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { useGame } from '@/hooks/useGame'
import { useAuth } from '@/hooks/useAuth'
import { useBalance } from '@/hooks/useBalance'

type Risk = 'LOW' | 'MEDIUM' | 'HIGH'
type Rows = 8 | 12 | 16

interface BallPath {
  id: number
  path: { x: number; y: number }[]
  bucketIndex: number
  multiplier: number
  done: boolean
}

const MULTIPLIERS: Record<Risk, Record<Rows, number[]>> = {
  LOW: {
    8: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    12: [10, 3.0, 1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3.0, 10],
    16: [16, 9.0, 2.0, 1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2.0, 9.0, 16],
  },
  MEDIUM: {
    8: [13, 3.0, 1.3, 0.7, 0.4, 0.7, 1.3, 3.0, 13],
    12: [33, 11, 4.0, 2.0, 1.1, 0.6, 0.3, 0.6, 1.1, 2.0, 4.0, 11, 33],
    16: [110, 41, 10, 5.0, 3.0, 1.5, 1.0, 0.5, 0.3, 0.5, 1.0, 1.5, 3.0, 5.0, 10, 41, 110],
  },
  HIGH: {
    8: [29, 4.0, 1.5, 0.3, 0.2, 0.3, 1.5, 4.0, 29],
    12: [170, 24, 8.1, 2.0, 0.7, 0.2, 0.2, 0.2, 0.7, 2.0, 8.1, 24, 170],
    16: [1000, 130, 26, 9.0, 4.0, 2.0, 0.2, 0.2, 0.2, 0.2, 0.2, 2.0, 4.0, 9.0, 26, 130, 1000],
  },
}

function getBucketColor(multiplier: number): string {
  if (multiplier >= 100) return 'from-[#ff3b5c] to-[#ff6b81]'
  if (multiplier >= 10) return 'from-[#ff8c00] to-[#ffa040]'
  if (multiplier >= 3) return 'from-[#c9a227] to-[#e6c84a]'
  if (multiplier >= 1) return 'from-[#00cc6a] to-[#00ff88]'
  return 'from-[#6c2bd9] to-[#9b59f0]'
}

function getBucketGlow(multiplier: number): string {
  if (multiplier >= 100) return 'shadow-[0_0_20px_rgba(255,59,92,0.6)]'
  if (multiplier >= 10) return 'shadow-[0_0_15px_rgba(255,140,0,0.5)]'
  if (multiplier >= 3) return 'shadow-[0_0_15px_rgba(201,162,39,0.4)]'
  if (multiplier >= 1) return 'shadow-[0_0_10px_rgba(0,204,106,0.4)]'
  return 'shadow-[0_0_10px_rgba(108,43,217,0.4)]'
}

export default function PlinkoPage() {
  const { user } = useAuth()
  const { balance, refreshBalance } = useBalance(user?.id)
  const { placeBet, loading: gameLoading, error } = useGame((b) => refreshBalance())

  const [betAmount, setBetAmount] = useState(100)
  const [risk, setRisk] = useState<Risk>('MEDIUM')
  const [rows, setRows] = useState<Rows>(12)
  const [balls, setBalls] = useState<BallPath[]>([])
  const [history, setHistory] = useState<{ multiplier: number; payout: number }[]>([])
  const [muted, setMuted] = useState(false)
  const ballIdRef = useRef(0)
  const boardRef = useRef<HTMLDivElement>(null)

  const multipliers = MULTIPLIERS[risk][rows]
  const numBuckets = rows + 1

  const generatePath = useCallback((numRows: number): { path: { x: number; y: number }[]; bucketIndex: number } => {
    const path: { x: number; y: number }[] = []
    let position = 0

    for (let row = 0; row < numRows; row++) {
      const goRight = Math.random() > 0.5
      position += goRight ? 1 : 0
      const xPercent = ((position - row / 2) / (numRows / 2)) * 40 + 50
      const yPercent = ((row + 1) / (numRows + 1)) * 100
      path.push({
        x: xPercent + (Math.random() - 0.5) * 2,
        y: yPercent,
      })
    }

    return { path, bucketIndex: position }
  }, [])

  const dropBall = useCallback(async () => {
    if (betAmount > balance || betAmount <= 0) return

    const result = await placeBet({
      gameType: 'plinko' as any,
      betAmount,
      gameData: { risk, rows },
    })

    const { path, bucketIndex } = generatePath(rows)
    const clampedIndex = Math.min(bucketIndex, numBuckets - 1)
    const multiplier = multipliers[clampedIndex]
    const payout = result?.payout ?? betAmount * multiplier

    const id = ++ballIdRef.current
    const newBall: BallPath = { id, path, bucketIndex: clampedIndex, multiplier, done: false }

    setBalls((prev) => [...prev, newBall])

    setTimeout(() => {
      setBalls((prev) => prev.map((b) => (b.id === id ? { ...b, done: true } : b)))
      setHistory((prev) => [{ multiplier, payout }, ...prev].slice(0, 20))
    }, rows * 120 + 500)

    setTimeout(() => {
      setBalls((prev) => prev.filter((b) => b.id !== id))
    }, rows * 120 + 3000)
  }, [betAmount, balance, risk, rows, multipliers, numBuckets, placeBet, generatePath])

  const presetBets = [10, 50, 100, 500, 1000]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
      {/* Main Board */}
      <Card className="relative overflow-hidden" hover={false}>
        <div className="relative w-full" style={{ paddingBottom: '75%' }} ref={boardRef}>
          <div className="absolute inset-0">
            {/* Pegs */}
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
              {/* Background glow */}
              <defs>
                <radialGradient id="pegGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--casino-accent)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Peg rows */}
              {Array.from({ length: rows }, (_, rowIndex) => {
                const pegsInRow = rowIndex + 2
                const yPos = ((rowIndex + 1) / (rows + 1)) * 85 + 5
                return Array.from({ length: pegsInRow }, (_, pegIndex) => {
                  const xPos = 50 + (pegIndex - (pegsInRow - 1) / 2) * (70 / rows)
                  return (
                    <circle
                      key={`${rowIndex}-${pegIndex}`}
                      cx={xPos}
                      cy={yPos}
                      r={0.6}
                      className="fill-[var(--casino-accent)] opacity-60"
                    />
                  )
                })
              })}
            </svg>

            {/* Animated Balls */}
            <AnimatePresence>
              {balls.map((ball) => (
                <motion.div
                  key={ball.id}
                  className="absolute w-3 h-3 md:w-4 md:h-4 rounded-full z-10"
                  style={{
                    background: 'radial-gradient(circle at 30% 30%, #ffe066, #c9a227)',
                    boxShadow: '0 0 12px rgba(201,162,39,0.8), 0 0 4px rgba(255,255,255,0.4)',
                  }}
                  initial={{
                    left: '50%',
                    top: '2%',
                    x: '-50%',
                    y: '-50%',
                  }}
                  animate={{
                    left: ball.path.map((p) => `${p.x}%`),
                    top: ball.path.map((p) => `${p.y * 0.85 + 5}%`),
                  }}
                  transition={{
                    duration: rows * 0.12,
                    ease: 'linear',
                    times: ball.path.map((_, i) => i / (ball.path.length - 1)),
                  }}
                />
              ))}
            </AnimatePresence>

            {/* Buckets at bottom */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-[1px] px-[5%]">
              {multipliers.map((mult, i) => {
                const isHit = balls.some((b) => b.done && b.bucketIndex === i)
                return (
                  <motion.div
                    key={i}
                    className={cn(
                      'flex-1 py-1 md:py-2 text-center rounded-t-lg font-bold text-[8px] sm:text-[10px] md:text-xs bg-gradient-to-b transition-all duration-300',
                      getBucketColor(mult),
                      isHit && getBucketGlow(mult)
                    )}
                    animate={isHit ? { scale: [1, 1.15, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <span className="text-black/80 drop-shadow-sm">{mult}x</span>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Controls Panel */}
      <div className="space-y-4">
        {/* Bet Controls */}
        <Card hover={false} glow="gold">
          <div className="space-y-4">
            <label className="text-sm font-medium text-[var(--casino-text-muted)]">Bet Amount</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(0, Number(e.target.value)))}
                className="flex-1 bg-[var(--casino-surface)] border border-[var(--casino-border)] rounded-xl px-4 py-2.5 text-white font-mono text-lg focus:outline-none focus:border-[var(--casino-accent)] transition-colors"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {presetBets.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setBetAmount(amt)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                    betAmount === amt
                      ? 'bg-[var(--casino-accent)] text-black'
                      : 'bg-[var(--casino-surface)] text-[var(--casino-text-muted)] hover:text-white border border-[var(--casino-border)]'
                  )}
                >
                  ${amt}
                </button>
              ))}
              <button
                onClick={() => setBetAmount(Math.floor(balance / 2))}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--casino-surface)] text-[var(--casino-text-muted)] hover:text-white border border-[var(--casino-border)] cursor-pointer transition-all"
              >
                1/2
              </button>
              <button
                onClick={() => setBetAmount(Math.floor(balance))}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--casino-surface)] text-[var(--casino-text-muted)] hover:text-white border border-[var(--casino-border)] cursor-pointer transition-all"
              >
                MAX
              </button>
            </div>

            {/* Risk */}
            <div>
              <label className="text-sm font-medium text-[var(--casino-text-muted)] mb-2 block">Risk</label>
              <div className="grid grid-cols-3 gap-2">
                {(['LOW', 'MEDIUM', 'HIGH'] as Risk[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRisk(r)}
                    className={cn(
                      'py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                      risk === r
                        ? r === 'LOW'
                          ? 'bg-[var(--casino-green)]/20 text-[var(--casino-green)] border border-[var(--casino-green)]/40'
                          : r === 'MEDIUM'
                          ? 'bg-[var(--casino-accent)]/20 text-[var(--casino-accent)] border border-[var(--casino-accent)]/40'
                          : 'bg-[var(--casino-red)]/20 text-[var(--casino-red)] border border-[var(--casino-red)]/40'
                        : 'bg-[var(--casino-surface)] text-[var(--casino-text-muted)] border border-[var(--casino-border)] hover:text-white'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Rows */}
            <div>
              <label className="text-sm font-medium text-[var(--casino-text-muted)] mb-2 block">Rows</label>
              <div className="grid grid-cols-3 gap-2">
                {([8, 12, 16] as Rows[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRows(r)}
                    className={cn(
                      'py-2 rounded-xl text-sm font-bold transition-all cursor-pointer',
                      rows === r
                        ? 'bg-[var(--casino-purple)]/20 text-[var(--casino-purple-light)] border border-[var(--casino-purple)]/40'
                        : 'bg-[var(--casino-surface)] text-[var(--casino-text-muted)] border border-[var(--casino-border)] hover:text-white'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-xs text-[var(--casino-red)]">{error}</p>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full text-lg"
              onClick={dropBall}
              loading={gameLoading}
              disabled={betAmount <= 0 || betAmount > balance}
              icon={<ChevronDown className="w-5 h-5" />}
            >
              DROP BALL
            </Button>
          </div>
        </Card>

        {/* History */}
        <Card hover={false}>
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-[var(--casino-text-muted)]" />
            <h3 className="text-sm font-semibold text-[var(--casino-text-muted)]">Recent Drops</h3>
          </div>
          <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar">
            {history.length === 0 ? (
              <p className="text-xs text-[var(--casino-text-muted)] text-center py-4">No drops yet</p>
            ) : (
              history.map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-[var(--casino-surface)]"
                >
                  <span
                    className={cn(
                      'text-xs font-bold px-2 py-0.5 rounded-md bg-gradient-to-r',
                      getBucketColor(h.multiplier)
                    )}
                  >
                    <span className="text-black/80">{h.multiplier}x</span>
                  </span>
                  <span
                    className={cn(
                      'text-sm font-mono font-bold',
                      h.payout > 0 ? 'text-[var(--casino-green)]' : 'text-[var(--casino-red)]'
                    )}
                  >
                    {h.payout > 0 ? '+' : ''}${h.payout.toFixed(2)}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
