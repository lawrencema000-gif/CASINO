'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Zap, Trophy, History, RotateCcw, X, Sparkles, Grid3X3 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useBalance } from '@/hooks/useBalance'
import { useGame } from '@/hooks/useGame'

interface KenoResult {
  picks: number[]
  drawnNumbers: number[]
  hits: number
  payout: number
  multiplier: number
  betAmount: number
}

// Full payout table: payoutTable[picks][hits] = multiplier
const PAYOUT_TABLE: Record<number, Record<number, number>> = {
  1:  { 1: 3.5 },
  2:  { 2: 6 },
  3:  { 2: 2, 3: 26 },
  4:  { 2: 1.5, 3: 8, 4: 80 },
  5:  { 3: 3, 4: 12, 5: 200 },
  6:  { 3: 2, 4: 6, 5: 50, 6: 500 },
  7:  { 3: 1.5, 4: 4, 5: 20, 6: 100, 7: 1000 },
  8:  { 4: 3, 5: 10, 6: 50, 7: 250, 8: 2000 },
  9:  { 4: 2, 5: 6, 6: 25, 7: 100, 8: 500, 9: 5000 },
  10: { 4: 1.5, 5: 4, 6: 15, 7: 50, 8: 250, 9: 1000, 10: 10000 },
}

function getMultiplier(picks: number, hits: number): number {
  return PAYOUT_TABLE[picks]?.[hits] ?? 0
}

export default function KenoPage() {
  const { user, loading: authLoading } = useAuth()
  const { balance, setBalanceFromApi } = useBalance(user?.id)
  const { placeBet, loading: gameLoading, error: gameError } = useGame((newBalance) => {
    setBalanceFromApi(newBalance)
  })

  // Demo mode fallback
  const isDemo = !user && !authLoading
  const [demoBalance, setDemoBalance] = useState(10000)
  const effectiveBalance = isDemo ? demoBalance : balance

  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([])
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([])
  const [revealedCount, setRevealedCount] = useState(0)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hits, setHits] = useState(0)
  const [lastPayout, setLastPayout] = useState(0)
  const [lastMultiplier, setLastMultiplier] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [betAmount, setBetAmount] = useState(100)
  const [gameHistory, setGameHistory] = useState<KenoResult[]>([])
  const [showPayoutTable, setShowPayoutTable] = useState(false)

  const toggleNumber = useCallback((num: number) => {
    if (isDrawing || showResult) return
    setSelectedNumbers(prev => {
      if (prev.includes(num)) return prev.filter(n => n !== num)
      if (prev.length >= 10) return prev
      return [...prev, num].sort((a, b) => a - b)
    })
  }, [isDrawing, showResult])

  const quickPick = useCallback(() => {
    if (isDrawing || showResult) return
    const count = selectedNumbers.length || 5
    const nums: number[] = []
    while (nums.length < Math.min(count, 10)) {
      const n = Math.floor(Math.random() * 40) + 1
      if (!nums.includes(n)) nums.push(n)
    }
    setSelectedNumbers(nums.sort((a, b) => a - b))
  }, [isDrawing, showResult, selectedNumbers.length])

  const clearSelection = useCallback(() => {
    if (isDrawing) return
    setSelectedNumbers([])
    setDrawnNumbers([])
    setRevealedCount(0)
    setShowResult(false)
    setHits(0)
    setLastPayout(0)
    setLastMultiplier(0)
    setShowCelebration(false)
  }, [isDrawing])

  const playKeno = useCallback(async () => {
    if (selectedNumbers.length < 1 || selectedNumbers.length > 10 || isDrawing || betAmount > effectiveBalance || betAmount <= 0) return

    setIsDrawing(true)
    setShowResult(false)
    setShowCelebration(false)
    setRevealedCount(0)
    setDrawnNumbers([])

    if (isDemo) {
      setDemoBalance(prev => prev - betAmount)

      // Draw 10 unique numbers from 1-40
      const drawn: number[] = []
      while (drawn.length < 10) {
        const n = Math.floor(Math.random() * 40) + 1
        if (!drawn.includes(n)) drawn.push(n)
      }
      setDrawnNumbers(drawn)

      // Animate reveal one by one
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 300 + i * 30))
        setRevealedCount(i + 1)
      }

      await new Promise(resolve => setTimeout(resolve, 400))

      const matchCount = selectedNumbers.filter(n => drawn.includes(n)).length
      const mult = getMultiplier(selectedNumbers.length, matchCount)
      const payout = Math.floor(betAmount * mult)

      if (payout > 0) {
        setDemoBalance(prev => prev + payout)
        if (mult >= 10) setShowCelebration(true)
      }

      setHits(matchCount)
      setLastPayout(payout)
      setLastMultiplier(mult)
      setIsDrawing(false)
      setShowResult(true)

      setGameHistory(prev => [
        { picks: [...selectedNumbers], drawnNumbers: drawn, hits: matchCount, payout, multiplier: mult, betAmount },
        ...prev,
      ].slice(0, 30))
    } else {
      const result = await placeBet({
        gameType: 'keno' as any,
        betAmount,
        action: 'bet',
        gameData: { picks: selectedNumbers },
      })

      if (!result) {
        setIsDrawing(false)
        return
      }

      const serverResult = result.result as { picks: number[]; drawnNumbers: number[]; hits: number; won: boolean }
      const drawn = serverResult.drawnNumbers
      setDrawnNumbers(drawn)

      // Animate reveal one by one
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 300 + i * 30))
        setRevealedCount(i + 1)
      }

      await new Promise(resolve => setTimeout(resolve, 400))

      const matchCount = serverResult.hits
      const payout = result.payout
      const mult = result.multiplier

      if (payout > 0 && mult >= 10) {
        setShowCelebration(true)
      }

      setHits(matchCount)
      setLastPayout(payout)
      setLastMultiplier(mult)
      setIsDrawing(false)
      setShowResult(true)

      setGameHistory(prev => [
        { picks: [...selectedNumbers], drawnNumbers: drawn, hits: matchCount, payout, multiplier: mult, betAmount },
        ...prev,
      ].slice(0, 30))
    }
  }, [selectedNumbers, isDrawing, betAmount, effectiveBalance, isDemo, placeBet])

  const presetBets = [50, 100, 250, 500, 1000]

  // Build display rows for payout sidebar based on current pick count
  const currentPickCount = selectedNumbers.length || 0
  const activePayout = PAYOUT_TABLE[currentPickCount] || {}

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="bg-yellow-500/90 text-black text-center text-xs font-bold py-1.5 px-4">
          DEMO MODE — Sign up to play for real
        </div>
      )}

      {/* Celebration overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            {Array.from({ length: 60 }, (_, i) => (
              <motion.div
                key={i}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{
                  x: (Math.random() - 0.5) * (typeof window !== 'undefined' ? window.innerWidth : 800),
                  y: (Math.random() - 0.5) * (typeof window !== 'undefined' ? window.innerHeight : 600),
                  scale: Math.random() * 2 + 0.5,
                  opacity: 0,
                }}
                transition={{ duration: 2 + Math.random(), ease: 'easeOut' }}
                className="absolute w-3 h-3 rounded-full"
                style={{ backgroundColor: ['#FFD700', '#00FF88', '#8B5CF6', '#EF4444', '#3B82F6'][i % 5] }}
              />
            ))}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 10 }}
              className="bg-black/80 backdrop-blur-xl rounded-3xl px-12 py-10 border-2 border-[#FFD700]/60 shadow-[0_0_80px_rgba(255,215,0,0.4)] text-center pointer-events-auto"
            >
              <Trophy className="w-20 h-20 text-[#FFD700] mx-auto mb-4" />
              <h2 className="text-4xl font-black text-[#FFD700] mb-2">
                {lastMultiplier >= 1000 ? 'MEGA WIN!' : lastMultiplier >= 100 ? 'HUGE WIN!' : 'BIG WIN!'}
              </h2>
              <p className="text-lg text-white/60 mb-1">{lastMultiplier}x Multiplier</p>
              <p className="text-3xl font-bold text-[#00FF88]">+${lastPayout.toLocaleString()}</p>
              <button
                onClick={() => setShowCelebration(false)}
                className="mt-6 px-8 py-3 rounded-xl bg-[#FFD700] text-black font-bold hover:bg-[#e6c84a] transition-colors cursor-pointer"
              >
                COLLECT
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-2 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Lobby</span>
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-bold text-[#FFD700] flex items-center gap-2 justify-center">
            <Grid3X3 className="w-5 h-5" /> Fortuna Keno
          </h1>
          <p className="text-[10px] text-white/30">Pick 1-10 Numbers &bull; 10 Drawn &bull; Match to Win</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-white/30 uppercase tracking-wider">Balance</div>
          <div className="text-sm font-bold text-[#FFD700]">${effectiveBalance.toLocaleString()}</div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-8 space-y-5">
        {/* Game Error Display */}
        {gameError && (
          <div className="text-center text-sm text-red-400 bg-red-400/10 rounded-lg py-2 px-4">
            {gameError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
          <div className="space-y-5">
            {/* Selected Numbers Display */}
            <div className="bg-[#1a1a25] rounded-2xl border border-white/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Your Picks</span>
                <span className="text-xs text-white/30">{selectedNumbers.length}/10 selected</span>
              </div>
              <div className="flex gap-2 flex-wrap justify-center min-h-[48px] items-center">
                {selectedNumbers.length === 0 ? (
                  <span className="text-xs text-white/20">Click numbers below to select (1-10 picks)</span>
                ) : (
                  selectedNumbers.map(num => (
                    <motion.div
                      key={num}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', damping: 12 }}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c9a227] to-[#e6c84a] flex items-center justify-center text-sm font-black text-black shadow-[0_0_12px_rgba(255,215,0,0.4)] border-2 border-[#FFD700]/60"
                    >
                      {num}
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Number Grid - 8 columns x 5 rows */}
            <div className="bg-[#1a1a25] rounded-2xl border border-white/5 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">Pick 1-10 Numbers</h3>
                <div className="flex gap-2">
                  <button
                    onClick={quickPick}
                    disabled={isDrawing || showResult}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8B5CF6]/15 text-[#8B5CF6] text-xs font-semibold border border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/25 transition-all disabled:opacity-30 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" /> Quick Pick
                  </button>
                  <button
                    onClick={clearSelection}
                    disabled={isDrawing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs font-semibold border border-white/10 hover:bg-white/10 transition-all disabled:opacity-30 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Clear
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-8 gap-2">
                {Array.from({ length: 40 }, (_, i) => i + 1).map(num => {
                  const isSelected = selectedNumbers.includes(num)
                  const isRevealed = drawnNumbers.slice(0, revealedCount).includes(num)
                  const isHit = isSelected && isRevealed
                  const isMiss = !isSelected && isRevealed
                  const isSelectedMiss = isSelected && revealedCount === 10 && !drawnNumbers.includes(num)

                  return (
                    <motion.button
                      key={num}
                      onClick={() => toggleNumber(num)}
                      whileHover={!isDrawing && !showResult ? { scale: 1.12 } : {}}
                      whileTap={!isDrawing && !showResult ? { scale: 0.9 } : {}}
                      disabled={isDrawing || showResult}
                      className={`aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all cursor-pointer border-2 ${
                        isHit
                          ? 'bg-[#00FF88] text-black border-[#00FF88] shadow-[0_0_20px_rgba(0,255,136,0.6),0_0_40px_rgba(0,255,136,0.3)]'
                          : isSelectedMiss
                          ? 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/50'
                          : isSelected
                          ? 'bg-gradient-to-br from-[#c9a227] to-[#e6c84a] text-black border-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.4)]'
                          : isMiss
                          ? 'bg-[#EF4444]/10 text-[#EF4444]/60 border-[#EF4444]/20'
                          : 'bg-[#0a0a0f] text-white/40 border-white/10 hover:text-white hover:border-[#FFD700]/40 disabled:hover:text-white/40 disabled:hover:border-white/10'
                      }`}
                    >
                      {num}
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Drawn Numbers Display */}
            <div className="bg-[#1a1a25] rounded-2xl border border-[#8B5CF6]/20 p-5">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4 text-center">
                Drawn Numbers ({revealedCount}/10)
              </h3>
              <div className="flex gap-2 justify-center flex-wrap mb-4">
                {Array.from({ length: 10 }, (_, i) => {
                  const revealed = i < revealedCount
                  const num = drawnNumbers[i]
                  const isHit = revealed && selectedNumbers.includes(num)

                  return (
                    <div key={i} className="relative">
                      <AnimatePresence mode="wait">
                        {revealed ? (
                          <motion.div
                            key={`revealed-${i}-${num}`}
                            initial={{ y: -60, scale: 0, rotate: -360, opacity: 0 }}
                            animate={{ y: 0, scale: 1, rotate: 0, opacity: 1 }}
                            transition={{
                              type: 'spring',
                              damping: 10,
                              stiffness: 200,
                            }}
                            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-base sm:text-lg font-black border-2 relative overflow-hidden ${
                              isHit
                                ? 'text-black border-[#00FF88] shadow-[0_0_20px_rgba(0,255,136,0.7)]'
                                : 'text-white border-white/20'
                            }`}
                            style={{
                              background: isHit
                                ? 'linear-gradient(135deg, #00FF88, #00cc6a)'
                                : 'linear-gradient(135deg, #8B5CF6dd, #8B5CF688)',
                              boxShadow: isHit
                                ? '0 0 20px rgba(0,255,136,0.7), inset 0 -3px 6px rgba(0,0,0,0.2)'
                                : '0 0 10px rgba(139,92,246,0.3), inset 0 -3px 6px rgba(0,0,0,0.3)',
                            }}
                          >
                            <div className="absolute top-0.5 left-1.5 w-3 h-2 bg-white/30 rounded-full blur-sm" />
                            <span className="relative z-10">{num}</span>
                          </motion.div>
                        ) : (
                          <motion.div
                            key={`hidden-${i}`}
                            animate={isDrawing ? {
                              scale: [1, 1.1, 1],
                              borderColor: ['rgba(255,255,255,0.1)', 'rgba(139,92,246,0.4)', 'rgba(255,255,255,0.1)'],
                            } : {}}
                            transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.06 }}
                            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0a0a0f] border-2 border-white/10 flex items-center justify-center"
                          >
                            <span className="text-white/15 text-lg font-bold">?</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>

              {/* Result Banner */}
              <AnimatePresence>
                {showResult && !showCelebration && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="text-center"
                  >
                    <div className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-xl border ${
                      lastPayout > 0
                        ? 'bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/30 shadow-[0_0_30px_rgba(0,255,136,0.15)]'
                        : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'
                    }`}>
                      {lastPayout > 0 && <Trophy className="w-7 h-7" />}
                      <div>
                        <div className="text-2xl">
                          {hits} of {selectedNumbers.length} Hit!
                        </div>
                        <div className={`text-sm mt-0.5 ${lastPayout > 0 ? 'text-[#00FF88]' : 'text-white/30'}`}>
                          {lastPayout > 0 ? `Won $${lastPayout.toLocaleString()} (${lastMultiplier}x)` : 'No payout this round'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <button
                        onClick={clearSelection}
                        className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#c9a227] to-[#e6c84a] text-black font-bold hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" /> Play Again
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Bet Controls */}
            <div className="bg-[#1a1a25] rounded-2xl border border-[#FFD700]/20 p-4 shadow-[0_0_30px_rgba(255,215,0,0.05)]">
              <div className="space-y-3">
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Bet Amount</label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={e => setBetAmount(Math.max(0, Number(e.target.value)))}
                  disabled={isDrawing || gameLoading}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-lg focus:outline-none focus:border-[#FFD700]/50 disabled:opacity-50 transition-colors"
                />
                <div className="flex gap-1.5 flex-wrap">
                  {presetBets.map(amt => (
                    <button
                      key={amt}
                      onClick={() => !isDrawing && !gameLoading && setBetAmount(amt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        betAmount === amt
                          ? 'bg-[#FFD700] text-black'
                          : 'bg-[#0a0a0f] text-white/40 border border-white/10 hover:border-[#FFD700]/30'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>

                <div className="text-center py-1">
                  <span className="text-xs text-white/40">
                    Picks: <span className="text-[#FFD700] font-bold">{selectedNumbers.length}</span>
                    {selectedNumbers.length > 0 && currentPickCount in PAYOUT_TABLE && (
                      <span className="text-white/20"> &bull; Max payout: <span className="text-[#00FF88] font-bold">
                        {Math.max(...Object.values(PAYOUT_TABLE[currentPickCount]))}x
                      </span></span>
                    )}
                  </span>
                </div>

                <button
                  onClick={playKeno}
                  disabled={selectedNumbers.length < 1 || betAmount <= 0 || betAmount > effectiveBalance || isDrawing || showResult || gameLoading}
                  className="w-full py-4 text-lg font-bold rounded-xl transition-all cursor-pointer select-none bg-gradient-to-r from-[#c9a227] to-[#e6c84a] text-black hover:shadow-[0_0_30px_rgba(255,215,0,0.3)] active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  {isDrawing ? 'DRAWING...' : gameLoading ? 'PROCESSING...' : 'PLAY KENO'}
                </button>

                {selectedNumbers.length === 0 && (
                  <p className="text-[10px] text-white/30 text-center">
                    Select 1-10 numbers to play
                  </p>
                )}
              </div>
            </div>

            {/* Payout Table */}
            <div className="bg-[#1a1a25] rounded-2xl border border-white/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Payouts</h3>
                <button
                  onClick={() => setShowPayoutTable(!showPayoutTable)}
                  className="text-[10px] text-[#8B5CF6] hover:text-[#a78bfa] transition-colors cursor-pointer"
                >
                  {showPayoutTable ? 'Show Current' : 'Show All'}
                </button>
              </div>

              {showPayoutTable ? (
                // Full payout table
                <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
                  {Object.entries(PAYOUT_TABLE).map(([picks, payouts]) => (
                    <div key={picks} className={`rounded-lg p-2 ${Number(picks) === currentPickCount ? 'bg-[#FFD700]/10 border border-[#FFD700]/30' : 'bg-[#0a0a0f]'}`}>
                      <div className="text-[10px] font-bold text-white/50 mb-1">{picks} Pick{Number(picks) > 1 ? 's' : ''}</div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(payouts).map(([h, mult]) => (
                          <span key={h} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40">
                            <span className="text-white/60">{h} hit{Number(h) > 1 ? 's' : ''}</span> = <span className="text-[#00FF88] font-bold">{mult}x</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Current picks payout
                <div className="space-y-1.5">
                  {currentPickCount > 0 && currentPickCount in PAYOUT_TABLE ? (
                    Object.entries(activePayout).map(([h, mult]) => (
                      <div
                        key={h}
                        className={`flex items-center justify-between py-2 px-3 rounded-lg text-xs ${
                          showResult && hits === Number(h)
                            ? 'bg-[#00FF88]/10 border border-[#00FF88]/30'
                            : 'bg-[#0a0a0f]'
                        }`}
                      >
                        <span className="text-white/40 font-mono">{h}/{currentPickCount} hits</span>
                        <span className="font-bold text-[#00FF88]">{mult}x</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-[10px] text-white/20">Select numbers to see payouts</p>
                    </div>
                  )}
                </div>
              )}

              <p className="text-[9px] text-white/20 mt-2 text-center">
                Fewer hits than minimum = no payout
              </p>
            </div>

            {/* How It Works */}
            <div className="bg-[#1a1a25] rounded-2xl border border-white/5 p-4">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">How It Works</h3>
              <ul className="text-[10px] text-white/30 space-y-1.5">
                <li>&bull; Pick 1-10 numbers from 1-40</li>
                <li>&bull; 10 numbers are randomly drawn</li>
                <li>&bull; Match your picks to win</li>
                <li>&bull; More picks = more chances but higher threshold</li>
                <li>&bull; Fewer picks = easier to hit but lower max payout</li>
                <li>&bull; Max payout: 10,000x on 10/10 match!</li>
              </ul>
            </div>

            {/* History */}
            <div className="bg-[#1a1a25] rounded-2xl border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-3.5 h-3.5 text-white/40" />
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Game History</h3>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                {gameHistory.length === 0 ? (
                  <p className="text-[10px] text-white/20 text-center py-4">No games yet</p>
                ) : (
                  gameHistory.map((g, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-2.5 rounded-lg bg-[#0a0a0f] border border-white/5"
                    >
                      <div className="flex gap-1 mb-1.5 flex-wrap">
                        {g.picks.map(n => (
                          <span
                            key={n}
                            className={`w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold ${
                              g.drawnNumbers.includes(n)
                                ? 'bg-[#00FF88] text-black'
                                : 'bg-white/5 text-white/30'
                            }`}
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-white/30">{g.hits}/{g.picks.length} hits{g.multiplier > 0 ? ` (${g.multiplier}x)` : ''}</span>
                        <span className={`font-bold ${g.payout > 0 ? 'text-[#00FF88]' : 'text-[#EF4444]'}`}>
                          {g.payout > 0 ? `+$${g.payout.toLocaleString()}` : `-$${g.betAmount}`}
                        </span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
