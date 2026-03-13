'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import BetControls from '@/components/ui/BetControls'
import { PLINKO_MULTIPLIERS, PLINKO_ROWS, drop } from '@/lib/games/plinko'

interface ActiveBall {
  id: number
  path: number[]
  bucket: number
  multiplier: number
  payout: number
  currentRow: number
  done: boolean
}

function getBucketColor(mult: number): string {
  if (mult >= 40) return 'bg-[#EF4444]'
  if (mult >= 10) return 'bg-[#FF8C00]'
  if (mult >= 3) return 'bg-[#FFD700]'
  if (mult >= 1) return 'bg-[#00FF88]'
  return 'bg-[#8B5CF6]'
}

function getBucketTextColor(mult: number): string {
  if (mult >= 40) return 'text-[#EF4444]'
  if (mult >= 10) return 'text-[#FF8C00]'
  if (mult >= 3) return 'text-[#FFD700]'
  if (mult >= 1) return 'text-[#00FF88]'
  return 'text-[#8B5CF6]'
}

export default function PlinkoPage() {
  const [balance, setBalance] = useState(10000)
  const [betAmount, setBetAmount] = useState(100)
  const [balls, setBalls] = useState<ActiveBall[]>([])
  const [lastWin, setLastWin] = useState<{ multiplier: number; payout: number } | null>(null)
  const [litBucket, setLitBucket] = useState<number | null>(null)
  const ballIdRef = useRef(0)

  const dropBall = useCallback(() => {
    if (betAmount > balance || betAmount <= 0) return

    setBalance(prev => prev - betAmount)

    const rng = Math.random()
    const result = drop(rng, betAmount)
    const id = ++ballIdRef.current

    const newBall: ActiveBall = {
      id,
      path: result.path,
      bucket: result.bucket,
      multiplier: result.multiplier,
      payout: result.payout,
      currentRow: -1,
      done: false,
    }

    setBalls(prev => [...prev, newBall])

    // Animate through rows
    let row = 0
    const interval = setInterval(() => {
      if (row >= PLINKO_ROWS) {
        clearInterval(interval)
        setBalls(prev => prev.map(b => b.id === id ? { ...b, done: true, currentRow: PLINKO_ROWS } : b))
        setLastWin({ multiplier: result.multiplier, payout: result.payout })
        setLitBucket(result.bucket)
        setBalance(prev => prev + result.payout)

        // Clear lit bucket and remove ball after delay
        setTimeout(() => {
          setLitBucket(prev => prev === result.bucket ? null : prev)
          setBalls(prev => prev.filter(b => b.id !== id))
        }, 2000)
        return
      }
      setBalls(prev => prev.map(b => b.id === id ? { ...b, currentRow: row } : b))
      row++
    }, 80)
  }, [betAmount, balance])

  // Calculate ball position from path
  const getBallPosition = (ball: ActiveBall) => {
    if (ball.currentRow < 0) return { x: 50, y: 2 }
    if (ball.currentRow >= PLINKO_ROWS) {
      // In bucket
      const bucketWidth = 100 / (PLINKO_ROWS + 1)
      return { x: ball.bucket * bucketWidth + bucketWidth / 2, y: 94 }
    }

    // Calculate x position based on path so far
    let xPos = 0
    for (let i = 0; i <= ball.currentRow; i++) {
      xPos += ball.path[i]
    }
    // Map to percentage: bucket ranges from 0 to PLINKO_ROWS
    const totalBuckets = PLINKO_ROWS + 1
    const bucketWidth = 80 / totalBuckets
    const xPercent = 10 + xPos * bucketWidth + bucketWidth / 2

    const yPercent = 5 + ((ball.currentRow + 1) / (PLINKO_ROWS + 1)) * 85

    return { x: xPercent, y: yPercent }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Top Bar */}
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-2 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Lobby</span>
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-bold text-[#FFD700]">Plinko</h1>
          <p className="text-[10px] text-white/30">House Edge: ~3.5%</p>
        </div>
        <div className="w-16" />
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-8 space-y-6">
        {/* Last Win */}
        <AnimatePresence>
          {lastWin && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <span className={`text-2xl font-black ${getBucketTextColor(lastWin.multiplier)}`}>
                {lastWin.multiplier}x
              </span>
              <span className="text-white/40 mx-2">|</span>
              <span className="text-lg font-bold text-[#FFD700]">
                +${lastWin.payout.toFixed(2)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Plinko Board */}
        <div className="relative rounded-2xl bg-[#1a1a25] border border-white/5 overflow-hidden"
             style={{ paddingBottom: '75%' }}>
          <div className="absolute inset-0">
            {/* Pegs */}
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
              {Array.from({ length: PLINKO_ROWS }, (_, rowIndex) => {
                const pegsInRow = rowIndex + 2
                const yPos = 5 + ((rowIndex + 1) / (PLINKO_ROWS + 1)) * 85
                return Array.from({ length: pegsInRow }, (_, pegIndex) => {
                  const totalWidth = 80
                  const spacing = totalWidth / (pegsInRow - 1 || 1)
                  const xPos = 10 + pegIndex * spacing
                  return (
                    <circle
                      key={`${rowIndex}-${pegIndex}`}
                      cx={pegsInRow === 1 ? 50 : xPos}
                      cy={yPos}
                      r={0.5}
                      className="fill-white/30"
                    />
                  )
                })
              })}
            </svg>

            {/* Animated Balls */}
            {balls.map(ball => {
              const pos = getBallPosition(ball)
              return (
                <motion.div
                  key={ball.id}
                  className="absolute w-3 h-3 md:w-4 md:h-4 rounded-full z-10"
                  style={{
                    background: 'radial-gradient(circle at 30% 30%, #ffe066, #FFD700)',
                    boxShadow: '0 0 12px rgba(255,215,0,0.8), 0 0 4px rgba(255,255,255,0.4)',
                  }}
                  animate={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                  }}
                  transition={{ duration: 0.07, ease: 'easeOut' }}
                />
              )
            })}

            {/* Buckets at bottom */}
            <div className="absolute bottom-0 left-[5%] right-[5%] flex gap-[1px]">
              {PLINKO_MULTIPLIERS.map((mult, i) => (
                <motion.div
                  key={i}
                  className={`flex-1 py-1 md:py-2 text-center rounded-t-lg font-bold text-[7px] sm:text-[9px] md:text-xs ${getBucketColor(mult)} transition-all duration-300`}
                  animate={litBucket === i ? {
                    scale: [1, 1.15, 1],
                    boxShadow: [
                      '0 0 0px rgba(255,215,0,0)',
                      '0 0 20px rgba(255,215,0,0.6)',
                      '0 0 0px rgba(255,215,0,0)',
                    ],
                  } : {}}
                  transition={{ duration: 0.5 }}
                >
                  <span className="text-black/80 drop-shadow-sm">{mult}x</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Bet Controls */}
        <BetControls
          balance={balance}
          betAmount={betAmount}
          onBetChange={setBetAmount}
          onPlay={dropBall}
          disabled={false}
          playLabel="DROP BALL"
        />
      </div>
    </div>
  )
}
