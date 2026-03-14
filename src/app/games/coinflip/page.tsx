'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import BetControls from '@/components/ui/BetControls'
import { flip, COINFLIP_MULTIPLIER } from '@/lib/games/coinflip'
import type { CoinSide } from '@/lib/games/coinflip'
import { useAuth } from '@/hooks/useAuth'
import { useBalance } from '@/hooks/useBalance'
import { useGame } from '@/hooks/useGame'

export default function CoinFlipPage() {
  const { user, loading: authLoading } = useAuth()
  const { balance: serverBalance, setBalanceFromApi } = useBalance(user?.id)
  const { placeBet: placeBetApi, loading: gameLoading, error: gameError } = useGame((newBalance) => {
    setBalanceFromApi(newBalance)
  })

  const [demoBalance, setDemoBalance] = useState(10000)
  const balance = user ? serverBalance : demoBalance
  const isDemo = !user && !authLoading

  const [betAmount, setBetAmount] = useState(100)
  const [choice, setChoice] = useState<CoinSide>('heads')
  const [flipping, setFlipping] = useState(false)
  const [result, setResult] = useState<CoinSide | null>(null)
  const [lastWon, setLastWon] = useState<boolean | null>(null)
  const [flipKey, setFlipKey] = useState(0)
  const [streak, setStreak] = useState(0)
  const [streakType, setStreakType] = useState<'win' | 'loss'>('win')

  const handleFlip = useCallback(async () => {
    if (flipping || betAmount > balance || betAmount <= 0) return

    setFlipping(true)
    setLastWon(null)
    setResult(null)
    setFlipKey(k => k + 1)

    if (isDemo) {
      // Demo mode: client-side RNG
      setDemoBalance(prev => prev - betAmount)

      const rng = Math.random()
      const coinResult = flip(rng)
      const won = coinResult === choice

      // Wait for animation
      setTimeout(() => {
        setResult(coinResult)
        setLastWon(won)
        setFlipping(false)

        if (won) {
          const payout = Math.floor(betAmount * COINFLIP_MULTIPLIER * 100) / 100
          setDemoBalance(prev => prev + payout)
          setStreak(prev => streakType === 'win' ? prev + 1 : 1)
          setStreakType('win')
        } else {
          setStreak(prev => streakType === 'loss' ? prev + 1 : 1)
          setStreakType('loss')
        }
      }, 1800)
    } else {
      // Real mode: fire API call, wait for animation + result
      const apiPromise = placeBetApi({
        gameType: 'coinflip',
        betAmount,
        action: 'bet',
        gameData: { choice },
      })

      // Wait for both the animation (1800ms) and the API result
      const [apiResult] = await Promise.all([
        apiPromise,
        new Promise(resolve => setTimeout(resolve, 1800)),
      ])

      if (apiResult) {
        const resultData = apiResult.result as { coinResult: CoinSide; won: boolean }
        setResult(resultData.coinResult)
        setLastWon(resultData.won)
        setFlipping(false)

        if (resultData.won) {
          setStreak(prev => streakType === 'win' ? prev + 1 : 1)
          setStreakType('win')
        } else {
          setStreak(prev => streakType === 'loss' ? prev + 1 : 1)
          setStreakType('loss')
        }
      } else {
        // API error — stop flipping
        setFlipping(false)
      }
    }
  }, [flipping, betAmount, balance, choice, streakType, isDemo, placeBetApi])

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
          <h1 className="text-xl font-bold text-[#FFD700]">Coin Flip</h1>
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

        {/* Coin Display */}
        <div className="relative rounded-2xl bg-[#1a1a25] border border-white/5 py-16 flex flex-col items-center overflow-hidden">
          {/* Win/Loss glow */}
          {!flipping && lastWon !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.1 }}
              className={`absolute inset-0 ${lastWon ? 'bg-[#00FF88]' : 'bg-[#EF4444]'}`}
            />
          )}

          {/* The Coin */}
          <div style={{ perspective: '800px' }} className="relative z-10">
            <motion.div
              key={flipKey}
              animate={
                flipping
                  ? { rotateY: [0, 1800], scale: [1, 1.3, 1] }
                  : { rotateY: result === 'tails' ? 180 : 0 }
              }
              transition={
                flipping
                  ? { duration: 1.8, ease: [0.25, 0.1, 0.25, 1] }
                  : { duration: 0.3 }
              }
              style={{ transformStyle: 'preserve-3d' }}
              className="relative"
            >
              {/* Heads */}
              <div
                className="w-40 h-40 md:w-48 md:h-48 rounded-full flex items-center justify-center bg-gradient-to-br from-[#FFE066] via-[#FFD700] to-[#B8860B] border-4 border-[#FFE066]/60 shadow-[0_0_40px_rgba(255,215,0,0.3)] select-none"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="flex flex-col items-center">
                  <span className="text-6xl font-black text-[#5a4410] drop-shadow-lg">$</span>
                  <span className="text-xs text-[#5a4410]/80 font-bold mt-1">HEADS</span>
                </div>
              </div>

              {/* Tails */}
              <div
                className="w-40 h-40 md:w-48 md:h-48 rounded-full flex items-center justify-center bg-gradient-to-br from-[#C0C0C0] via-[#A8A8A8] to-[#808080] border-4 border-[#C0C0C0]/60 shadow-[0_0_40px_rgba(192,192,192,0.3)] select-none absolute inset-0"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <div className="flex flex-col items-center">
                  <span className="text-6xl font-black text-[#333] drop-shadow-lg">$</span>
                  <span className="text-xs text-[#333]/80 font-bold mt-1">TAILS</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Result Text */}
          <AnimatePresence>
            {!flipping && lastWon !== null && (
              <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={`mt-8 text-center relative z-10 ${lastWon ? 'text-[#00FF88]' : 'text-[#EF4444]'}`}
              >
                <div className="text-2xl font-black">
                  {lastWon ? `YOU WIN! ${COINFLIP_MULTIPLIER}x` : 'Better luck next time'}
                </div>
                {lastWon && (
                  <div className="text-lg mt-1 text-[#FFD700]">
                    +${(Math.floor(betAmount * COINFLIP_MULTIPLIER * 100) / 100).toFixed(2)}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Choice Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => !flipping && setChoice('heads')}
            className={`py-5 rounded-xl font-black text-lg transition-all cursor-pointer border-2 ${
              choice === 'heads'
                ? 'bg-[#FFD700]/10 border-[#FFD700] text-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.2)]'
                : 'bg-[#1a1a25] border-white/10 text-white/40 hover:border-white/20'
            }`}
          >
            <div className="text-4xl mb-1">$</div>
            HEADS
          </button>
          <button
            onClick={() => !flipping && setChoice('tails')}
            className={`py-5 rounded-xl font-black text-lg transition-all cursor-pointer border-2 ${
              choice === 'tails'
                ? 'bg-[#8B5CF6]/10 border-[#8B5CF6] text-[#8B5CF6] shadow-[0_0_20px_rgba(139,92,246,0.2)]'
                : 'bg-[#1a1a25] border-white/10 text-white/40 hover:border-white/20'
            }`}
          >
            <div className="text-4xl mb-1">$</div>
            TAILS
          </button>
        </div>

        {/* Bet Controls */}
        <BetControls
          balance={balance}
          betAmount={betAmount}
          onBetChange={setBetAmount}
          onPlay={handleFlip}
          disabled={flipping || gameLoading}
          multiplier={COINFLIP_MULTIPLIER}
          playLabel={flipping ? 'FLIPPING...' : 'FLIP COIN'}
        />
      </div>
    </div>
  )
}
