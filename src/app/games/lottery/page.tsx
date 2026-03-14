'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Sparkles, Zap, Trophy, History, RotateCcw, Ticket, X } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useBalance } from '@/hooks/useBalance'
import { useGame } from '@/hooks/useGame'

interface LotteryResult {
  selectedNumbers: number[]
  drawnNumbers: number[]
  matchCount: number
  payout: number
  ticketCost: number
}

const PAYOUT_TIERS = [
  { matches: 6, label: 'JACKPOT', color: '#FFD700', icon: '\u{1F451}' },
  { matches: 5, label: 'Pool / 10', color: '#00FF88', icon: '\u{1F389}' },
  { matches: 4, label: 'Pool / 100', color: '#8B5CF6', icon: '\u2728' },
  { matches: 3, label: 'No Prize', color: '#EF4444', icon: '\u2014' },
  { matches: 2, label: 'No Prize', color: '#EF4444', icon: '\u2014' },
  { matches: 1, label: 'No Prize', color: '#EF4444', icon: '\u2014' },
  { matches: 0, label: 'No Prize', color: '#EF4444', icon: '\u2014' },
]

const BALL_COLORS = ['#FFD700', '#8B5CF6', '#00FF88', '#EF4444', '#3B82F6', '#F97316']

export default function LotteryPage() {
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
  const [matchCount, setMatchCount] = useState(0)
  const [lastPayout, setLastPayout] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [ticketHistory, setTicketHistory] = useState<LotteryResult[]>([])
  const [betAmount, setBetAmount] = useState(100)
  const [pool, setPool] = useState(52473.88)
  const [ticketsBought, setTicketsBought] = useState(0)
  const [nextDrawCountdown, setNextDrawCountdown] = useState(347)
  const [showCelebration, setShowCelebration] = useState(false)
  const poolTickerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  // Pool ticker - simulates other players buying tickets
  useEffect(() => {
    poolTickerRef.current = setInterval(() => {
      setPool(prev => prev + Math.random() * 15 + 2)
    }, 300)
    return () => { if (poolTickerRef.current) clearInterval(poolTickerRef.current) }
  }, [])

  // Countdown timer
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setNextDrawCountdown(prev => {
        if (prev <= 1) return 600
        return prev - 1
      })
    }, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [])

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const toggleNumber = useCallback((num: number) => {
    if (isDrawing || showResult) return
    setSelectedNumbers(prev => {
      if (prev.includes(num)) return prev.filter(n => n !== num)
      if (prev.length >= 6) return prev
      return [...prev, num].sort((a, b) => a - b)
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

  const clearSelection = useCallback(() => {
    if (isDrawing) return
    setSelectedNumbers([])
    setDrawnNumbers([])
    setRevealedCount(0)
    setShowResult(false)
    setMatchCount(0)
    setLastPayout(0)
    setShowCelebration(false)
  }, [isDrawing])

  const buyAndDraw = useCallback(async () => {
    if (selectedNumbers.length !== 6 || isDrawing || betAmount > effectiveBalance || betAmount <= 0) return

    setPool(prev => prev + betAmount)
    setTicketsBought(prev => prev + 1)
    setIsDrawing(true)
    setShowResult(false)
    setShowCelebration(false)
    setRevealedCount(0)

    if (isDemo) {
      // Demo mode: fully client-side
      setDemoBalance(prev => prev - betAmount)

      // Generate 6 unique winning numbers
      const drawn: number[] = []
      while (drawn.length < 6) {
        const n = Math.floor(Math.random() * 49) + 1
        if (!drawn.includes(n)) drawn.push(n)
      }
      setDrawnNumbers(drawn)

      // Reveal one by one with dramatic pauses
      for (let i = 0; i < 6; i++) {
        await new Promise(resolve => setTimeout(resolve, 700 + i * 100))
        setRevealedCount(i + 1)
      }

      await new Promise(resolve => setTimeout(resolve, 600))

      const matches = selectedNumbers.filter(n => drawn.includes(n)).length
      let payout = 0
      const currentPool = pool + betAmount

      if (matches === 6) {
        payout = currentPool
      } else if (matches === 5) {
        payout = Math.floor(currentPool / 10)
      } else if (matches === 4) {
        payout = Math.floor(currentPool / 100)
      }

      if (payout > 0) {
        setDemoBalance(prev => prev + payout)
        if (matches >= 5) setShowCelebration(true)
      }

      setMatchCount(matches)
      setLastPayout(payout)
      setIsDrawing(false)
      setShowResult(true)

      setTicketHistory(prev => [
        { selectedNumbers: [...selectedNumbers], drawnNumbers: drawn, matchCount: matches, payout, ticketCost: betAmount },
        ...prev,
      ].slice(0, 30))
    } else {
      // Server mode: place bet via API with picks
      const result = await placeBet({
        gameType: 'lottery',
        betAmount,
        action: 'bet',
        gameData: { picks: selectedNumbers },
      })

      if (!result) {
        setIsDrawing(false)
        return
      }

      // Use server-returned drawn numbers
      const serverResult = result.result as { picks: number[]; drawnNumbers: number[]; matches: number; won: boolean }
      const drawn = serverResult.drawnNumbers
      setDrawnNumbers(drawn)

      // Reveal one by one with dramatic pauses
      for (let i = 0; i < 6; i++) {
        await new Promise(resolve => setTimeout(resolve, 700 + i * 100))
        setRevealedCount(i + 1)
      }

      await new Promise(resolve => setTimeout(resolve, 600))

      const matches = serverResult.matches
      const payout = result.payout

      if (payout > 0 && matches >= 5) {
        setShowCelebration(true)
      }

      setMatchCount(matches)
      setLastPayout(payout)
      setIsDrawing(false)
      setShowResult(true)

      setTicketHistory(prev => [
        { selectedNumbers: [...selectedNumbers], drawnNumbers: drawn, matchCount: matches, payout, ticketCost: betAmount },
        ...prev,
      ].slice(0, 30))
    }
  }, [selectedNumbers, isDrawing, betAmount, effectiveBalance, pool, isDemo, placeBet])

  const presetBets = [50, 100, 250, 500, 1000]

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
            {/* Particles */}
            {Array.from({ length: 60 }, (_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: 0, y: 0, scale: 0, opacity: 1,
                }}
                animate={{
                  x: (Math.random() - 0.5) * window.innerWidth,
                  y: (Math.random() - 0.5) * window.innerHeight,
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
                {matchCount === 6 ? 'JACKPOT!' : 'BIG WIN!'}
              </h2>
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
      <div className="max-w-5xl mx-auto px-4 pt-4 pb-2 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Lobby</span>
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-bold text-[#FFD700]">Fortuna Lottery</h1>
          <p className="text-[10px] text-white/30">Pick 6 Numbers &bull; Match to Win</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-white/30 uppercase tracking-wider">Balance</div>
          <div className="text-sm font-bold text-[#FFD700]">${effectiveBalance.toLocaleString()}</div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-8 space-y-5">
        {/* Game Error Display */}
        {gameError && (
          <div className="text-center text-sm text-red-400 bg-red-400/10 rounded-lg py-2 px-4">
            {gameError}
          </div>
        )}

        {/* Pool Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-[#FFD700]/30"
          style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b69 50%, #1a1a2e 100%)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FFD700]/5 to-transparent animate-pulse" />
          {/* Decorative lottery balls */}
          <div className="absolute -top-3 -left-3 w-16 h-16 rounded-full bg-[#FFD700]/10 blur-xl" />
          <div className="absolute -bottom-3 -right-3 w-20 h-20 rounded-full bg-[#8B5CF6]/10 blur-xl" />
          <div className="absolute top-4 right-8 w-8 h-8 rounded-full bg-[#FFD700]/20 border border-[#FFD700]/30 flex items-center justify-center text-[10px] font-bold text-[#FFD700]/60">7</div>
          <div className="absolute top-6 right-20 w-6 h-6 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 flex items-center justify-center text-[8px] font-bold text-[#8B5CF6]/60">21</div>
          <div className="absolute bottom-4 left-8 w-7 h-7 rounded-full bg-[#00FF88]/20 border border-[#00FF88]/30 flex items-center justify-center text-[9px] font-bold text-[#00FF88]/60">42</div>

          <div className="relative text-center py-8 px-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-[#FFD700]" />
              <span className="text-xs font-bold text-[#FFD700] uppercase tracking-[0.3em]">Current Draw Pool</span>
              <Sparkles className="w-5 h-5 text-[#FFD700]" />
            </div>
            <motion.h2
              className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#c9a227] via-[#e6c84a] to-[#c9a227]"
              key={Math.floor(pool)}
            >
              ${pool.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </motion.h2>
            <div className="mt-3 flex items-center justify-center gap-6 text-xs text-white/40">
              <span className="flex items-center gap-1">
                <Ticket className="w-3.5 h-3.5" /> {ticketsBought + 847} Tickets Sold
              </span>
              <span className="flex items-center gap-1.5 bg-black/30 rounded-full px-4 py-1.5 border border-white/10">
                <Zap className="w-3.5 h-3.5 text-[#FFD700]" />
                Next Draw: <span className="text-[#FFD700] font-bold font-mono">{formatCountdown(nextDrawCountdown)}</span>
              </span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
          <div className="space-y-5">
            {/* Selected Numbers Display */}
            <div className="bg-[#1a1a25] rounded-2xl border border-white/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Your Numbers</span>
                <span className="text-xs text-white/30">{selectedNumbers.length}/6</span>
              </div>
              <div className="flex gap-3 justify-center min-h-[56px] items-center">
                {Array.from({ length: 6 }, (_, i) => {
                  const num = selectedNumbers[i]
                  return (
                    <AnimatePresence key={i} mode="wait">
                      {num !== undefined ? (
                        <motion.div
                          key={`num-${num}`}
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 180 }}
                          transition={{ type: 'spring', damping: 12 }}
                          className="w-12 h-12 rounded-full bg-gradient-to-br from-[#c9a227] to-[#e6c84a] flex items-center justify-center text-lg font-black text-black shadow-[0_0_15px_rgba(255,215,0,0.4)] border-2 border-[#FFD700]/60"
                        >
                          {num}
                        </motion.div>
                      ) : (
                        <motion.div
                          key={`empty-${i}`}
                          className="w-12 h-12 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center"
                        >
                          <span className="text-white/15 text-lg">?</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )
                })}
              </div>
            </div>

            {/* Number Grid */}
            <div className="bg-[#1a1a25] rounded-2xl border border-white/5 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">Pick 6 Numbers</h3>
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
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 49 }, (_, i) => i + 1).map(num => {
                  const isSelected = selectedNumbers.includes(num)
                  const isDrawn = drawnNumbers.includes(num) && revealedCount >= drawnNumbers.indexOf(num) + 1
                  const isMatch = isSelected && isDrawn

                  return (
                    <motion.button
                      key={num}
                      onClick={() => toggleNumber(num)}
                      whileHover={!isDrawing && !showResult ? { scale: 1.12 } : {}}
                      whileTap={!isDrawing && !showResult ? { scale: 0.9 } : {}}
                      disabled={isDrawing || showResult}
                      className={`aspect-square rounded-full flex items-center justify-center text-sm font-bold transition-all cursor-pointer border-2 ${
                        isMatch
                          ? 'bg-[#00FF88] text-black border-[#00FF88] shadow-[0_0_20px_rgba(0,255,136,0.6)]'
                          : isSelected
                          ? 'bg-gradient-to-br from-[#c9a227] to-[#e6c84a] text-black border-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.4)]'
                          : isDrawn
                          ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]/40'
                          : 'bg-[#0a0a0f] text-white/40 border-white/10 hover:text-white hover:border-[#FFD700]/40 disabled:hover:text-white/40 disabled:hover:border-white/10'
                      }`}
                    >
                      {num}
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Draw Results */}
            <div className="bg-[#1a1a25] rounded-2xl border border-[#8B5CF6]/20 p-6">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4 text-center">
                Winning Numbers
              </h3>
              <div className="flex gap-3 justify-center mb-4">
                {Array.from({ length: 6 }, (_, i) => {
                  const revealed = i < revealedCount
                  const num = drawnNumbers[i]
                  const isMatch = revealed && selectedNumbers.includes(num)
                  const ballColor = BALL_COLORS[i]

                  return (
                    <div key={i} className="relative">
                      <AnimatePresence mode="wait">
                        {revealed ? (
                          <motion.div
                            key={`revealed-${i}-${num}`}
                            initial={{ y: -80, scale: 0, rotate: -360, opacity: 0 }}
                            animate={{ y: 0, scale: 1, rotate: 0, opacity: 1 }}
                            transition={{
                              type: 'spring',
                              damping: 10,
                              stiffness: 200,
                              bounce: 0.6,
                            }}
                            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-xl sm:text-2xl font-black border-3 relative overflow-hidden ${
                              isMatch
                                ? 'text-black border-[#00FF88] shadow-[0_0_25px_rgba(0,255,136,0.7)]'
                                : 'text-white border-white/20'
                            }`}
                            style={{
                              background: isMatch
                                ? 'linear-gradient(135deg, #00FF88, #00cc6a)'
                                : `linear-gradient(135deg, ${ballColor}dd, ${ballColor}88)`,
                              boxShadow: isMatch
                                ? '0 0 25px rgba(0,255,136,0.7), inset 0 -3px 6px rgba(0,0,0,0.2)'
                                : `0 0 15px ${ballColor}44, inset 0 -3px 6px rgba(0,0,0,0.3)`,
                            }}
                          >
                            {/* Ball shine effect */}
                            <div className="absolute top-1 left-2 w-4 h-3 bg-white/30 rounded-full blur-sm" />
                            <span className="relative z-10">{num}</span>
                          </motion.div>
                        ) : (
                          <motion.div
                            key={`hidden-${i}`}
                            animate={isDrawing ? {
                              scale: [1, 1.15, 1],
                              borderColor: ['rgba(255,255,255,0.1)', 'rgba(255,215,0,0.3)', 'rgba(255,255,255,0.1)'],
                            } : {}}
                            transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.12 }}
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#0a0a0f] border-2 border-white/10 flex items-center justify-center"
                          >
                            <span className="text-white/15 text-2xl font-bold">?</span>
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
                      matchCount >= 4
                        ? 'bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/30 shadow-[0_0_30px_rgba(0,255,136,0.15)]'
                        : matchCount >= 1
                        ? 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30'
                        : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'
                    }`}>
                      {matchCount >= 4 && <Trophy className="w-7 h-7" />}
                      <div>
                        <div className="text-2xl">{matchCount} of 6 Matched!</div>
                        <div className={`text-sm mt-0.5 ${lastPayout > 0 ? 'text-[#00FF88]' : 'text-white/30'}`}>
                          {lastPayout > 0 ? `Won $${lastPayout.toLocaleString()}` : 'No prize this time'}
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
            {/* Ticket Purchase */}
            <div className="bg-[#1a1a25] rounded-2xl border border-[#FFD700]/20 p-4 shadow-[0_0_30px_rgba(255,215,0,0.05)]">
              <div className="space-y-3">
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Ticket Price</label>
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

                <button
                  onClick={buyAndDraw}
                  disabled={selectedNumbers.length !== 6 || betAmount <= 0 || betAmount > effectiveBalance || isDrawing || showResult || gameLoading}
                  className="w-full py-4 text-lg font-bold rounded-xl transition-all cursor-pointer select-none bg-gradient-to-r from-[#c9a227] to-[#e6c84a] text-black hover:shadow-[0_0_30px_rgba(255,215,0,0.3)] active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                >
                  <Ticket className="w-5 h-5" />
                  {isDrawing ? 'DRAWING...' : gameLoading ? 'PROCESSING...' : 'BUY TICKET & DRAW'}
                </button>

                {selectedNumbers.length > 0 && selectedNumbers.length < 6 && (
                  <p className="text-[10px] text-white/30 text-center">
                    Pick {6 - selectedNumbers.length} more number{6 - selectedNumbers.length > 1 ? 's' : ''}
                  </p>
                )}

                <div className="text-center pt-1">
                  <span className="text-[10px] text-white/30">
                    Tickets this draw: <span className="text-[#FFD700] font-bold">{ticketsBought}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Prize Tiers */}
            <div className="bg-[#1a1a25] rounded-2xl border border-white/5 p-4">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Prize Tiers</h3>
              <div className="space-y-1.5">
                {PAYOUT_TIERS.slice(0, 4).map(tier => (
                  <div
                    key={tier.matches}
                    className={`flex items-center justify-between py-2 px-3 rounded-lg text-xs ${
                      showResult && matchCount === tier.matches
                        ? 'bg-[#FFD700]/10 border border-[#FFD700]/30'
                        : 'bg-[#0a0a0f]'
                    }`}
                  >
                    <span className="text-white/40 font-mono">{tier.matches}/6</span>
                    <span className="font-bold" style={{ color: tier.color }}>{tier.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-white/20 mt-2 text-center">3 or fewer matches = no prize</p>
            </div>

            {/* Rules */}
            <div className="bg-[#1a1a25] rounded-2xl border border-white/5 p-4">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">How It Works</h3>
              <ul className="text-[10px] text-white/30 space-y-1.5">
                <li>&bull; Pick 6 numbers from 1-49</li>
                <li>&bull; Buy a ticket to enter the draw</li>
                <li>&bull; Match 4+ numbers to win prizes</li>
                <li>&bull; 6 matches = ENTIRE POOL (Jackpot)</li>
                <li>&bull; 5 matches = Pool divided by 10</li>
                <li>&bull; 4 matches = Pool divided by 100</li>
                <li>&bull; Pool grows with every ticket sold</li>
              </ul>
            </div>

            {/* History */}
            <div className="bg-[#1a1a25] rounded-2xl border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-3.5 h-3.5 text-white/40" />
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Your Tickets</h3>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                {ticketHistory.length === 0 ? (
                  <p className="text-[10px] text-white/20 text-center py-4">No tickets yet</p>
                ) : (
                  ticketHistory.map((t, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-2.5 rounded-lg bg-[#0a0a0f] border border-white/5"
                    >
                      <div className="flex gap-1 mb-1.5">
                        {t.selectedNumbers.map(n => (
                          <span
                            key={n}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${
                              t.drawnNumbers.includes(n)
                                ? 'bg-[#00FF88] text-black'
                                : 'bg-white/5 text-white/30'
                            }`}
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-white/30">{t.matchCount} match{t.matchCount !== 1 ? 'es' : ''}</span>
                        <span className={`font-bold ${t.payout > 0 ? 'text-[#00FF88]' : 'text-[#EF4444]'}`}>
                          {t.payout > 0 ? `+$${t.payout.toLocaleString()}` : `-$${t.ticketCost}`}
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
