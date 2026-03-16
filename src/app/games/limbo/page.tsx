'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Target } from 'lucide-react'
import Link from 'next/link'
import BetControls from '@/components/ui/BetControls'
import { useAuth } from '@/hooks/useAuth'
import { useBalance } from '@/hooks/useBalance'
import { useGame } from '@/hooks/useGame'

function generateCrashPoint(): number {
  // Provably fair crash point with 1% house edge
  const raw = Math.random()
  if (raw === 0) return 1
  const crash = 0.99 / raw
  return Math.max(1, Math.floor(crash * 100) / 100)
}

function CrashNumber({
  value,
  animating,
  won,
}: {
  value: number
  animating: boolean
  won: boolean | null
}) {
  const [display, setDisplay] = useState('1.00')
  const rafRef = useRef<number | null>(null)
  const startRef = useRef(0)

  useEffect(() => {
    if (!animating) {
      setDisplay(value.toFixed(2))
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    startRef.current = performance.now()
    const duration = 1500 // ms for count-up animation
    const targetVal = value

    function tick(now: number) {
      const elapsed = now - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)

      if (progress < 1) {
        // Show random-ish numbers during animation, trending toward target
        const jitter = (Math.random() - 0.5) * 2 * (1 - progress)
        const current = 1 + (targetVal - 1) * eased + jitter
        setDisplay(Math.max(1, current).toFixed(2))
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setDisplay(targetVal.toFixed(2))
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, animating])

  let textColor = 'text-white'
  if (won === true) textColor = 'text-[#00FF88]'
  if (won === false) textColor = 'text-[#EF4444]'

  return (
    <div className={`text-7xl md:text-8xl font-black tabular-nums transition-colors duration-300 ${textColor}`}>
      {display}x
    </div>
  )
}

export default function LimboPage() {
  const { user, loading: authLoading } = useAuth()
  const { balance: serverBalance, setBalanceFromApi } = useBalance(user?.id)
  const { placeBet: placeBetApi, loading: gameLoading, error: gameError } = useGame((newBalance) => {
    setBalanceFromApi(newBalance)
  })

  const [demoBalance, setDemoBalance] = useState(10000)
  const balance = user ? serverBalance : demoBalance
  const isDemo = !user && !authLoading

  const [betAmount, setBetAmount] = useState(100)
  const [targetMultiplier, setTargetMultiplier] = useState(2)
  const [crashPoint, setCrashPoint] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [lastWon, setLastWon] = useState<boolean | null>(null)
  const [streak, setStreak] = useState(0)
  const [streakType, setStreakType] = useState<'win' | 'loss'>('win')

  const winProbability = Math.min(99, (99 / targetMultiplier))

  const handlePlay = useCallback(async () => {
    if (playing || betAmount > balance || betAmount <= 0 || targetMultiplier < 1.01) return

    setPlaying(true)
    setAnimating(true)
    setLastWon(null)

    if (isDemo) {
      setDemoBalance(prev => prev - betAmount)

      const crash = generateCrashPoint()
      const won = crash >= targetMultiplier

      // Show count-up animation
      setCrashPoint(crash)

      setTimeout(() => {
        setAnimating(false)
        setLastWon(won)
        setPlaying(false)

        if (won) {
          const payout = Math.floor(betAmount * targetMultiplier * 100) / 100
          setDemoBalance(prev => prev + payout)
          setStreak(prev => streakType === 'win' ? prev + 1 : 1)
          setStreakType('win')
        } else {
          setStreak(prev => streakType === 'loss' ? prev + 1 : 1)
          setStreakType('loss')
        }
      }, 1600)
    } else {
      const apiPromise = placeBetApi({
        gameType: 'limbo' as never,
        betAmount,
        action: 'bet',
        gameData: { targetMultiplier },
      })

      const [apiResult] = await Promise.all([
        apiPromise,
        new Promise(resolve => setTimeout(resolve, 200)),
      ])

      if (apiResult) {
        const resultData = apiResult.result as {
          crashPoint: number
          targetMultiplier: number
          won: boolean
        }

        setCrashPoint(resultData.crashPoint)

        // Let animation run
        setTimeout(() => {
          setAnimating(false)
          setLastWon(resultData.won)
          setPlaying(false)

          if (resultData.won) {
            setStreak(prev => streakType === 'win' ? prev + 1 : 1)
            setStreakType('win')
          } else {
            setStreak(prev => streakType === 'loss' ? prev + 1 : 1)
            setStreakType('loss')
          }
        }, 1600)
      } else {
        setAnimating(false)
        setPlaying(false)
      }
    }
  }, [playing, betAmount, balance, targetMultiplier, streakType, isDemo, placeBetApi])

  const handleTargetInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '')
    const parsed = parseFloat(raw)
    if (!isNaN(parsed)) {
      setTargetMultiplier(Math.max(1.01, Math.min(1000, Math.round(parsed * 100) / 100)))
    }
  }

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Logarithmic slider: 1.01 to 1000
    const t = parseFloat(e.target.value) // 0 to 1
    const minLog = Math.log(1.01)
    const maxLog = Math.log(1000)
    const value = Math.exp(minLog + t * (maxLog - minLog))
    setTargetMultiplier(Math.round(value * 100) / 100)
  }

  const sliderValue = () => {
    const minLog = Math.log(1.01)
    const maxLog = Math.log(1000)
    return (Math.log(targetMultiplier) - minLog) / (maxLog - minLog)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="bg-yellow-500/90 text-black text-center py-2 text-sm font-bold">
          DEMO MODE — Sign up to play for real
        </div>
      )}

      {/* Error Banner */}
      {gameError && (
        <div className="bg-red-500/90 text-white text-center py-2 text-sm font-bold">
          {gameError}
        </div>
      )}

      {/* Top Bar */}
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-2 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Lobby</span>
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-bold text-[#FFD700]">Limbo</h1>
          <p className="text-[10px] text-white/30">House Edge: 1%</p>
        </div>
        <div className="w-16" />
      </div>

      <div className="max-w-md mx-auto px-4 pb-8 space-y-6">
        {/* Streak Counter */}
        {streak > 1 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-center py-2 rounded-xl border ${
              streakType === 'win'
                ? 'bg-[#00FF88]/10 border-[#00FF88]/20 text-[#00FF88]'
                : 'bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]'
            }`}
          >
            <span className="font-bold">{streak}x {streakType === 'win' ? 'Win' : 'Loss'} Streak!</span>
          </motion.div>
        )}

        {/* Crash Point Display */}
        <div className="relative rounded-2xl bg-[#1a1a25] border border-white/5 py-16 flex flex-col items-center overflow-hidden">
          {/* Win/Loss glow */}
          {!playing && lastWon !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.12 }}
              className={`absolute inset-0 ${lastWon ? 'bg-[#00FF88]' : 'bg-[#EF4444]'}`}
            />
          )}

          <div className="relative z-10 flex flex-col items-center">
            <CrashNumber value={crashPoint} animating={animating} won={lastWon} />

            {/* Result label */}
            <AnimatePresence>
              {!playing && lastWon !== null && (
                <motion.div
                  initial={{ y: 10, opacity: 0, scale: 0.8 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-4"
                >
                  {lastWon ? (
                    <div className="text-center">
                      <div className="text-2xl font-black text-[#00FF88]">
                        YOU WIN! {targetMultiplier}x
                      </div>
                      <div className="text-lg mt-1 text-[#FFD700]">
                        +${(Math.floor(betAmount * targetMultiplier * 100) / 100).toFixed(2)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-2xl font-black text-[#EF4444]">
                      CRASHED!
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Target Multiplier Controls */}
        <div className="rounded-2xl bg-[#1a1a25] border border-white/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              Target Multiplier
            </label>
            <span className="text-xs text-white/30">
              Win chance: <span className="text-[#FFD700] font-semibold">{winProbability.toFixed(2)}%</span>
            </span>
          </div>

          {/* Target input */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center rounded-xl border border-white/10 bg-[#0a0a0f] px-4 py-3">
              <input
                type="text"
                value={targetMultiplier}
                onChange={handleTargetInput}
                disabled={playing}
                className="w-full bg-transparent text-center text-2xl font-black text-[#FFD700] outline-none tabular-nums disabled:opacity-50"
              />
              <span className="text-white/30 font-bold ml-1">x</span>
            </div>
          </div>

          {/* Slider */}
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={sliderValue()}
            onChange={handleSlider}
            disabled={playing}
            className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(to right, #00FF88 0%, #FFD700 50%, #EF4444 100%)`,
            }}
          />

          {/* Quick target buttons */}
          <div className="grid grid-cols-5 gap-2">
            {[1.5, 2, 3, 5, 10].map((t) => (
              <button
                key={t}
                onClick={() => !playing && setTargetMultiplier(t)}
                disabled={playing}
                className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  targetMultiplier === t
                    ? 'bg-[#FFD700]/10 border-[#FFD700]/40 text-[#FFD700]'
                    : 'bg-[#0a0a0f] border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
                }`}
              >
                {t}x
              </button>
            ))}
          </div>

          {/* More quick targets */}
          <div className="grid grid-cols-5 gap-2">
            {[20, 50, 100, 500, 1000].map((t) => (
              <button
                key={t}
                onClick={() => !playing && setTargetMultiplier(t)}
                disabled={playing}
                className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  targetMultiplier === t
                    ? 'bg-[#FFD700]/10 border-[#FFD700]/40 text-[#FFD700]'
                    : 'bg-[#0a0a0f] border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
                }`}
              >
                {t}x
              </button>
            ))}
          </div>

          {/* Payout info bar */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/5 border border-white/5">
            <div className="text-center">
              <div className="text-[10px] text-white/30 uppercase">Target</div>
              <div className="text-sm font-bold text-[#FFD700]">{targetMultiplier}x</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-white/30 uppercase">Win Chance</div>
              <div className="text-sm font-bold text-white">{winProbability.toFixed(2)}%</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-white/30 uppercase">Payout</div>
              <div className="text-sm font-bold text-[#00FF88]">
                ${(Math.floor(betAmount * targetMultiplier * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Bet Controls */}
        <BetControls
          balance={balance}
          betAmount={betAmount}
          onBetChange={setBetAmount}
          onPlay={handlePlay}
          disabled={playing || gameLoading}
          multiplier={targetMultiplier}
          playLabel={playing ? 'ROLLING...' : 'PLAY LIMBO'}
        />
      </div>
    </div>
  )
}
