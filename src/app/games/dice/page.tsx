'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import BetControls from '@/components/ui/BetControls'
import { roll, calculateMultiplier, checkWin } from '@/lib/games/dice'
import { useAuth } from '@/hooks/useAuth'
import { useBalance } from '@/hooks/useBalance'
import { useGame } from '@/hooks/useGame'

interface RollEntry {
  value: number
  won: boolean
}

export default function DicePage() {
  const { user, loading: authLoading } = useAuth()
  const { balance: serverBalance, setBalanceFromApi } = useBalance(user?.id)
  const { placeBet: placeBetApi, loading: gameLoading, error: gameError } = useGame((newBalance) => {
    setBalanceFromApi(newBalance)
  })

  const [demoBalance, setDemoBalance] = useState(10000)
  const balance = user ? serverBalance : demoBalance
  const isDemo = !user && !authLoading

  const [betAmount, setBetAmount] = useState(100)
  const [target, setTarget] = useState(50)
  const [isOver, setIsOver] = useState(true)
  const [rollResult, setRollResult] = useState<number | null>(null)
  const [lastWon, setLastWon] = useState<boolean | null>(null)
  const [rolling, setRolling] = useState(false)
  const [history, setHistory] = useState<RollEntry[]>([])
  const animRef = useRef<number>(0)

  const winChance = isOver ? (100 - target) : target
  const multiplier = calculateMultiplier(target, isOver)
  const potentialPayout = Math.floor(betAmount * multiplier * 100) / 100

  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [])

  const handleRoll = useCallback(async () => {
    if (rolling || betAmount > balance || betAmount <= 0) return

    setRolling(true)
    setLastWon(null)

    if (isDemo) {
      // Demo mode: client-side RNG
      setDemoBalance(prev => prev - betAmount)
      const rng = Math.random()
      const finalValue = roll(rng)
      const won = checkWin(finalValue, target, isOver)
      const start = performance.now()
      const duration = 1000

      const tick = (now: number) => {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)

        if (progress < 1) {
          setRollResult(parseFloat((Math.random() * 100).toFixed(2)))
          animRef.current = requestAnimationFrame(tick)
        } else {
          setRollResult(finalValue)
          setRolling(false)
          setLastWon(won)
          if (won) {
            const payout = Math.floor(betAmount * multiplier * 100) / 100
            setDemoBalance(prev => prev + payout)
          }
          setHistory(prev => [{ value: finalValue, won }, ...prev].slice(0, 10))
        }
      }

      animRef.current = requestAnimationFrame(tick)
    } else {
      // Real mode: server-side API
      // Start animation loop immediately
      const start = performance.now()
      const duration = 1000
      let resolved = false
      let serverResult: { roll: number; won: boolean } | null = null

      const tick = (now: number) => {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)

        if (progress < 1 || !resolved) {
          setRollResult(parseFloat((Math.random() * 100).toFixed(2)))
          animRef.current = requestAnimationFrame(tick)
        } else if (serverResult) {
          setRollResult(serverResult.roll)
          setRolling(false)
          setLastWon(serverResult.won)
          setHistory(prev => [{ value: serverResult!.roll, won: serverResult!.won }, ...prev].slice(0, 10))
        }
      }

      animRef.current = requestAnimationFrame(tick)

      // Fire the API call
      const apiResult = await placeBetApi({
        gameType: 'dice',
        betAmount,
        action: 'roll',
        gameData: { target, isOver },
      })

      if (apiResult) {
        const resultData = apiResult.result as { roll: number; won: boolean }
        serverResult = resultData
        // If animation is already past duration, resolve immediately
        const elapsed = performance.now() - start
        if (elapsed >= duration) {
          resolved = true
          setRollResult(resultData.roll)
          setRolling(false)
          setLastWon(resultData.won)
          setHistory(prev => [{ value: resultData.roll, won: resultData.won }, ...prev].slice(0, 10))
          if (animRef.current) cancelAnimationFrame(animRef.current)
        } else {
          resolved = true
        }
      } else {
        // API error — stop rolling
        setRolling(false)
        if (animRef.current) cancelAnimationFrame(animRef.current)
      }
    }
  }, [rolling, betAmount, balance, target, isOver, multiplier, isDemo, placeBetApi])

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
          <h1 className="text-xl font-bold text-[#FFD700]">Dice</h1>
          <p className="text-[10px] text-white/30">House Edge: 1%</p>
        </div>
        <div className="w-16" />
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-8 space-y-6">
        {/* Roll Result Display */}
        <div className="relative rounded-2xl bg-[#1a1a25] border border-white/5 p-8 flex flex-col items-center overflow-hidden">
          {/* Background glow */}
          {!rolling && lastWon !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              className={`absolute inset-0 ${lastWon ? 'bg-[#00FF88]' : 'bg-[#EF4444]'}`}
            />
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={rolling ? 'rolling' : String(rollResult)}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`text-7xl md:text-9xl font-black tabular-nums relative z-10 ${
                rolling ? 'text-white/40' :
                lastWon === true ? 'text-[#00FF88]' :
                lastWon === false ? 'text-[#EF4444]' :
                'text-white/20'
              }`}
            >
              {rollResult !== null ? rollResult.toFixed(2) : '---'}
            </motion.div>
          </AnimatePresence>

          {!rolling && lastWon !== null && (
            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`mt-2 text-lg font-bold relative z-10 ${lastWon ? 'text-[#00FF88]' : 'text-[#EF4444]'}`}
            >
              {lastWon ? `WIN +$${(potentialPayout - betAmount).toFixed(2)}` : 'LOSS'}
            </motion.p>
          )}

          {/* Result Bar */}
          <div className="w-full mt-6 relative h-6 rounded-full overflow-hidden bg-[#0a0a0f] border border-white/5 z-10">
            {isOver ? (
              <>
                <div className="absolute inset-y-0 left-0 bg-[#EF4444]/20" style={{ width: `${target}%` }} />
                <div className="absolute inset-y-0 right-0 bg-[#00FF88]/20" style={{ width: `${100 - target}%` }} />
              </>
            ) : (
              <>
                <div className="absolute inset-y-0 left-0 bg-[#00FF88]/20" style={{ width: `${target}%` }} />
                <div className="absolute inset-y-0 right-0 bg-[#EF4444]/20" style={{ width: `${100 - target}%` }} />
              </>
            )}

            {/* Target line */}
            <div className="absolute inset-y-0 w-0.5 bg-[#FFD700] z-10" style={{ left: `${target}%` }} />

            {/* Roll marker */}
            {rollResult !== null && !rolling && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full z-20 border-2 ${
                  lastWon ? 'bg-[#00FF88] border-[#00FF88] shadow-[0_0_10px_#00FF88]' : 'bg-[#EF4444] border-[#EF4444] shadow-[0_0_10px_#EF4444]'
                }`}
                style={{ left: `calc(${rollResult}% - 8px)` }}
              />
            )}

            {/* History dots */}
            {history.map((entry, i) => (
              <div
                key={i}
                className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full z-5 opacity-${Math.max(20, 80 - i * 6)} ${
                  entry.won ? 'bg-[#00FF88]' : 'bg-[#EF4444]'
                }`}
                style={{ left: `calc(${entry.value}% - 4px)`, opacity: Math.max(0.2, 0.8 - i * 0.06) }}
              />
            ))}
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setIsOver(false)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all cursor-pointer ${
              !isOver
                ? 'bg-[#00FF88]/15 text-[#00FF88] border border-[#00FF88]/40 shadow-[0_0_20px_rgba(0,255,136,0.15)]'
                : 'bg-[#1a1a25] text-white/40 border border-white/10 hover:border-white/20'
            }`}
          >
            <TrendingDown className="w-5 h-5" /> Roll Under
          </button>
          <button
            onClick={() => setIsOver(true)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all cursor-pointer ${
              isOver
                ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/40 shadow-[0_0_20px_rgba(139,92,246,0.15)]'
                : 'bg-[#1a1a25] text-white/40 border border-white/10 hover:border-white/20'
            }`}
          >
            <TrendingUp className="w-5 h-5" /> Roll Over
          </button>
        </div>

        {/* Slider */}
        <div className="bg-[#1a1a25] rounded-2xl border border-white/5 p-6">
          <input
            type="range"
            min={1}
            max={99}
            value={target}
            onChange={(e) => setTarget(parseInt(e.target.value))}
            className="w-full h-3 rounded-full appearance-none cursor-pointer bg-[#0a0a0f]
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#FFD700]
              [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(255,215,0,0.5)] [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#FFD700]"
          />
          <div className="flex justify-between mt-2 text-sm text-white/30">
            <span>1</span>
            <span className="text-[#FFD700] font-bold text-xl">{target}</span>
            <span>99</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#1a1a25] rounded-xl border border-white/5 p-4 text-center">
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Win Chance</div>
            <div className="text-2xl font-bold text-[#00FF88]">{winChance.toFixed(1)}%</div>
          </div>
          <div className="bg-[#1a1a25] rounded-xl border border-white/5 p-4 text-center">
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Multiplier</div>
            <div className="text-2xl font-bold text-[#FFD700]">{multiplier}x</div>
          </div>
          <div className="bg-[#1a1a25] rounded-xl border border-white/5 p-4 text-center">
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Payout</div>
            <div className="text-2xl font-bold text-[#8B5CF6]">${potentialPayout.toFixed(2)}</div>
          </div>
        </div>

        {/* History dots */}
        {history.length > 0 && (
          <div className="flex items-center gap-2 justify-center">
            <span className="text-xs text-white/30 mr-2">Recent:</span>
            {history.map((entry, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  entry.won
                    ? 'bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/30'
                    : 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30'
                }`}
              >
                {entry.value.toFixed(0)}
              </motion.div>
            ))}
          </div>
        )}

        {/* Bet Controls */}
        <BetControls
          balance={balance}
          betAmount={betAmount}
          onBetChange={setBetAmount}
          onPlay={handleRoll}
          disabled={rolling || gameLoading}
          multiplier={multiplier}
          playLabel={rolling ? 'ROLLING...' : 'ROLL'}
        />
      </div>
    </div>
  )
}
