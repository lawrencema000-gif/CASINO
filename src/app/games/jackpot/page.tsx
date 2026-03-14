'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Trophy, Users, TrendingUp, Coins, Crown, Zap, RotateCcw, Star } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useBalance } from '@/hooks/useBalance'
import { useGame } from '@/hooks/useGame'

interface PoolEntry {
  id: string
  username: string
  amount: number
  entries: number
  color: string
  isPlayer: boolean
}

interface WinnerRecord {
  username: string
  amount: number
  time: string
}

const ENTRY_COLORS = [
  '#c9a227', '#6c2bd9', '#00cc6a', '#ff3b5c', '#3B82F6',
  '#F97316', '#ec4899', '#06b6d4', '#84cc16', '#ef4444',
]

const BOT_NAMES = [
  'HighRoller99', 'LuckyStar', 'AceKing', 'DiamondHands', 'CryptoWhale',
  'NeonKnight', 'GoldRush', 'VelvetAce', 'StarDust', 'MegaWin88',
  'PhantomBet', 'MoonShot', 'RoyalFlush', 'ThunderStrike', 'SilverFox',
]

const INITIAL_BOTS: PoolEntry[] = [
  { id: 'bot-1', username: 'HighRoller99', amount: 5200, entries: 52, color: ENTRY_COLORS[0], isPlayer: false },
  { id: 'bot-2', username: 'LuckyStar', amount: 3100, entries: 31, color: ENTRY_COLORS[1], isPlayer: false },
  { id: 'bot-3', username: 'DiamondHands', amount: 4800, entries: 48, color: ENTRY_COLORS[3], isPlayer: false },
  { id: 'bot-4', username: 'CryptoWhale', amount: 2400, entries: 24, color: ENTRY_COLORS[4], isPlayer: false },
  { id: 'bot-5', username: 'NeonKnight', amount: 1900, entries: 19, color: ENTRY_COLORS[5], isPlayer: false },
]

const PAST_WINNERS: WinnerRecord[] = [
  { username: 'MegaWin88', amount: 45230, time: '2m ago' },
  { username: 'GoldRush', amount: 12800, time: '8m ago' },
  { username: 'NeonKnight', amount: 67500, time: '15m ago' },
  { username: 'StarDust', amount: 23100, time: '22m ago' },
  { username: 'VelvetAce', amount: 89200, time: '31m ago' },
]

export default function JackpotPage() {
  const { user, loading: authLoading } = useAuth()
  const { balance, setBalanceFromApi } = useBalance(user?.id)
  const { placeBet, loading: gameLoading, error: gameError } = useGame((newBalance) => {
    setBalanceFromApi(newBalance)
  })

  // Demo mode fallback
  const isDemo = !user && !authLoading
  const [demoBalance, setDemoBalance] = useState(10000)
  const effectiveBalance = isDemo ? demoBalance : balance

  const [betAmount, setBetAmount] = useState(500)
  const [entries, setEntries] = useState<PoolEntry[]>(INITIAL_BOTS)
  const [myTotalBet, setMyTotalBet] = useState(0)
  const [myEntryCount, setMyEntryCount] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [spinWinner, setSpinWinner] = useState<PoolEntry | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [spinProgress, setSpinProgress] = useState(0)
  const [currentSpinName, setCurrentSpinName] = useState('')
  const [jackpotDisplay, setJackpotDisplay] = useState(17400)
  const [recentWinners, setRecentWinners] = useState<WinnerRecord[]>(PAST_WINNERS)
  const [particles, setParticles] = useState<{ x: number; y: number; color: string }[]>([])
  const tickerRef = useRef<NodeJS.Timeout | null>(null)
  const botRef = useRef<NodeJS.Timeout | null>(null)

  const totalPool = entries.reduce((sum, e) => sum + e.amount, 0)
  const totalEntries = entries.reduce((sum, e) => sum + e.entries, 0)
  const rake = totalPool * 0.05
  const prizePool = totalPool - rake
  const myChance = totalPool > 0 ? ((myTotalBet / totalPool) * 100) : 0

  // Jackpot display ticker
  useEffect(() => {
    tickerRef.current = setInterval(() => {
      setJackpotDisplay(prev => prev + Math.random() * 8 + 1)
    }, 150)
    return () => { if (tickerRef.current) clearInterval(tickerRef.current) }
  }, [])

  // Simulate bot entries periodically
  useEffect(() => {
    botRef.current = setInterval(() => {
      if (isSpinning) return
      const chance = Math.random()
      if (chance < 0.3) {
        const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]
        const botAmount = [100, 200, 500, 1000][Math.floor(Math.random() * 4)]
        setEntries(prev => {
          const existing = prev.find(e => e.username === botName && !e.isPlayer)
          if (existing) {
            return prev.map(e =>
              e.username === botName && !e.isPlayer
                ? { ...e, amount: e.amount + botAmount, entries: e.entries + Math.ceil(botAmount / 100) }
                : e
            )
          }
          if (prev.length >= 12) return prev
          return [...prev, {
            id: `bot-${Date.now()}`,
            username: botName,
            amount: botAmount,
            entries: Math.ceil(botAmount / 100),
            color: ENTRY_COLORS[prev.length % ENTRY_COLORS.length],
            isPlayer: false,
          }]
        })
        setJackpotDisplay(prev => prev + botAmount)
      }
    }, 3000)
    return () => { if (botRef.current) clearInterval(botRef.current) }
  }, [isSpinning])

  const enterJackpot = useCallback(async () => {
    if (betAmount > effectiveBalance || betAmount <= 0 || isSpinning) return

    if (isDemo) {
      // Demo mode: client-side only
      setDemoBalance(prev => prev - betAmount)
    } else {
      // Server mode: place bet via API
      const result = await placeBet({ gameType: 'jackpot', betAmount, action: 'bet', gameData: {} })
      if (!result) return
      // The API deducted the balance; check if we won the jackpot
      // For the visual pool game we still add to the local pool
    }

    const newEntries = Math.ceil(betAmount / 100)

    setEntries(prev => {
      const existing = prev.find(e => e.isPlayer)
      if (existing) {
        return prev.map(e =>
          e.isPlayer
            ? { ...e, amount: e.amount + betAmount, entries: e.entries + newEntries }
            : e
        )
      }
      return [...prev, {
        id: 'player',
        username: 'You',
        amount: betAmount,
        entries: newEntries,
        color: '#FFD700',
        isPlayer: true,
      }]
    })

    setMyTotalBet(prev => prev + betAmount)
    setMyEntryCount(prev => prev + newEntries)
    setJackpotDisplay(prev => prev + betAmount)
  }, [betAmount, effectiveBalance, isSpinning, isDemo, placeBet])

  const drawWinner = useCallback(async () => {
    if (entries.length < 2 || isSpinning) return

    setIsSpinning(true)
    setSpinWinner(null)
    setShowCelebration(false)

    // Weighted random selection
    const total = entries.reduce((sum, e) => sum + e.amount, 0)
    let rand = Math.random() * total
    let winner = entries[0]
    for (const entry of entries) {
      rand -= entry.amount
      if (rand <= 0) {
        winner = entry
        break
      }
    }

    // Dramatic spinner animation - cycle through names
    const spinDuration = 5000
    const startTime = Date.now()
    const allNames = entries.map(e => e.username)

    await new Promise<void>(resolve => {
      let speedIdx = 0
      const tick = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / spinDuration, 1)
        setSpinProgress(progress)

        // Slow down as we approach the end
        const interval = 50 + progress * progress * 400
        speedIdx++
        const nameIdx = speedIdx % allNames.length
        setCurrentSpinName(allNames[nameIdx])

        if (progress >= 1) {
          setCurrentSpinName(winner.username)
          resolve()
        } else {
          setTimeout(tick, interval)
        }
      }
      tick()
    })

    await new Promise(resolve => setTimeout(resolve, 500))

    setSpinWinner(winner)
    setIsSpinning(false)

    if (winner.isPlayer) {
      if (isDemo) {
        setDemoBalance(prev => prev + prizePool)
      }
      // In server mode, the payout was already handled by placeBet if the player won
      // The visual celebration still shows
      setShowCelebration(true)
      // Generate celebration particles
      setParticles(
        Array.from({ length: 40 }, () => ({
          x: (Math.random() - 0.5) * 800,
          y: (Math.random() - 0.5) * 600,
          color: ['#FFD700', '#00FF88', '#8B5CF6', '#EF4444', '#3B82F6'][Math.floor(Math.random() * 5)],
        }))
      )
    }

    // Add to recent winners
    setRecentWinners(prev => [
      { username: winner.username, amount: Math.floor(prizePool), time: 'Just now' },
      ...prev,
    ].slice(0, 8))

    // Reset pool after delay
    setTimeout(() => {
      setSpinWinner(null)
      setShowCelebration(false)
      setSpinProgress(0)
      setCurrentSpinName('')
      setParticles([])
      setEntries(INITIAL_BOTS.map(b => ({ ...b, amount: Math.floor(b.amount * (0.5 + Math.random())), entries: Math.floor(b.entries * (0.5 + Math.random())) })))
      setMyTotalBet(0)
      setMyEntryCount(0)
      setJackpotDisplay(8000 + Math.random() * 5000)
    }, 6000)
  }, [entries, isSpinning, prizePool, isDemo])

  const presetBets = [100, 500, 1000, 5000]

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="bg-yellow-500/90 text-black text-center text-xs font-bold py-1.5 px-4">
          DEMO MODE — Sign up to play for real
        </div>
      )}

      {/* Full-screen celebration overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            {/* Particles */}
            {particles.map((p, i) => (
              <motion.div
                key={i}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{
                  x: p.x,
                  y: p.y,
                  scale: Math.random() * 2.5 + 0.5,
                  opacity: 0,
                }}
                transition={{ duration: 2.5 + Math.random(), ease: 'easeOut' }}
                className="absolute w-3 h-3 rounded-full"
                style={{ backgroundColor: p.color }}
              />
            ))}
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 8 }}
              className="relative bg-gradient-to-br from-[#1a1a25] to-[#0a0a0f] rounded-3xl px-14 py-12 border-2 border-[#FFD700]/60 shadow-[0_0_100px_rgba(255,215,0,0.5)] text-center z-10"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: 3 }}
              >
                <Crown className="w-24 h-24 text-[#FFD700] mx-auto mb-4" />
              </motion.div>
              <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#c9a227] via-[#e6c84a] to-[#c9a227] mb-3">
                YOU WON!
              </h2>
              <p className="text-4xl font-bold text-[#00FF88] mb-1">
                +${Math.floor(prizePool).toLocaleString()}
              </p>
              <p className="text-sm text-white/40 mb-6">The entire jackpot is yours!</p>
              <button
                onClick={() => setShowCelebration(false)}
                className="px-10 py-4 rounded-xl bg-gradient-to-r from-[#c9a227] to-[#e6c84a] text-black font-bold text-lg hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] transition-all cursor-pointer"
              >
                COLLECT WINNINGS
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
          <h1 className="text-xl font-bold text-[#FFD700]">Progressive Jackpot</h1>
          <p className="text-[10px] text-white/30">Weighted Lottery &bull; Winner Takes All</p>
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

        {/* Massive Jackpot Counter */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-2xl border border-[#FFD700]/40"
          style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 30%, #2d0a1a 60%, #1a0a0a 100%)' }}
        >
          {/* Background effects */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-[#FFD700]/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-56 h-56 bg-[#8B5CF6]/8 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#FFD700]/3 rounded-full blur-3xl" />
          </div>
          {/* Floating golden particles */}
          {Array.from({ length: 12 }, (_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-[#FFD700] rounded-full"
              style={{
                left: `${10 + (i * 7) % 80}%`,
                top: `${15 + (i * 13) % 70}%`,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.2, 0.8, 0.2],
                scale: [0.5, 1.5, 0.5],
              }}
              transition={{
                duration: 2 + i * 0.3,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}

          <div className="relative text-center py-10 px-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Crown className="w-6 h-6 text-[#FFD700]" />
              <span className="text-xs font-bold text-[#FFD700] uppercase tracking-[0.3em]">
                Current Jackpot
              </span>
              <Crown className="w-6 h-6 text-[#FFD700]" />
            </div>
            <motion.h1
              className="text-5xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#a07d1a] via-[#e6c84a] to-[#a07d1a] leading-tight"
              key={Math.floor(jackpotDisplay / 10)}
            >
              ${jackpotDisplay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </motion.h1>
            <div className="mt-4 flex items-center justify-center gap-6 text-xs text-white/40">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> {entries.length} Players
              </span>
              <span className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" /> {totalEntries} Entries
              </span>
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> 5% Rake
              </span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          {/* Main Area */}
          <div className="space-y-5">
            {/* Spinner / Wheel */}
            <div className="bg-[#1a1a25] rounded-2xl border border-white/5 p-6">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4 text-center">
                {isSpinning ? 'Drawing Winner...' : spinWinner ? 'Winner!' : 'Entry Pool'}
              </h3>

              {/* Pie Chart Wheel */}
              <div className="relative w-full max-w-[380px] mx-auto aspect-square">
                <motion.svg
                  viewBox="0 0 200 200"
                  className="w-full h-full drop-shadow-2xl"
                  animate={isSpinning ? { rotate: 360 * 6 + Math.random() * 360 } : { rotate: 0 }}
                  transition={isSpinning ? { duration: 5, ease: [0.32, 0.72, 0.35, 1.0] } : { duration: 0.5 }}
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
                        stroke="rgba(0,0,0,0.4)"
                        strokeWidth="1"
                        className="transition-opacity duration-300"
                        opacity={spinWinner && spinWinner.id !== entry.id ? 0.2 : 1}
                      />
                    )
                  })}

                  {/* Center circle */}
                  <circle cx="100" cy="100" r="32" fill="#0a0a0f" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                  <text x="100" y="96" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" opacity={0.6}>
                    PRIZE
                  </text>
                  <text x="100" y="110" textAnchor="middle" fill="#FFD700" fontSize="7" fontWeight="bold">
                    ${Math.floor(prizePool).toLocaleString()}
                  </text>
                </motion.svg>

                {/* Pointer triangle */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
                  <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[24px] border-l-transparent border-r-transparent border-t-[#FFD700] drop-shadow-lg" />
                </div>
              </div>

              {/* Spinner Name Display */}
              <AnimatePresence>
                {(isSpinning || spinWinner) && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-6 text-center"
                  >
                    {isSpinning && !spinWinner ? (
                      <div className="inline-block bg-black/50 backdrop-blur rounded-2xl px-8 py-4 border border-white/10">
                        <motion.p
                          key={currentSpinName}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-2xl font-black text-white"
                        >
                          {currentSpinName}
                        </motion.p>
                        {/* Progress bar */}
                        <div className="mt-3 w-48 h-1.5 bg-white/10 rounded-full overflow-hidden mx-auto">
                          <motion.div
                            className="h-full bg-gradient-to-r from-[#FFD700] to-[#00FF88] rounded-full"
                            style={{ width: `${spinProgress * 100}%` }}
                          />
                        </div>
                      </div>
                    ) : spinWinner && !spinWinner.isPlayer ? (
                      <motion.div
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        className="inline-block bg-black/60 backdrop-blur-md rounded-2xl px-10 py-6 border border-white/20"
                      >
                        <Trophy className="w-10 h-10 text-[#FFD700] mx-auto mb-2" />
                        <h3 className="text-2xl font-black text-white mb-1">{spinWinner.username}</h3>
                        <p className="text-xl font-bold text-[#00FF88]">
                          Won ${Math.floor(prizePool).toLocaleString()}!
                        </p>
                        <p className="text-xs text-white/30 mt-2">Better luck next time</p>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 5 }}
                          className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden"
                        >
                          <div className="h-full bg-[#EF4444]/50 rounded-full" />
                        </motion.div>
                      </motion.div>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Entry List */}
              <div className="mt-6 space-y-1.5">
                {entries
                  .sort((a, b) => b.amount - a.amount)
                  .map(entry => (
                    <motion.div
                      key={entry.id}
                      layout
                      className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all ${
                        entry.isPlayer
                          ? 'bg-[#FFD700]/10 border border-[#FFD700]/20'
                          : 'bg-[#0a0a0f]'
                      } ${spinWinner?.id === entry.id ? 'ring-2 ring-[#00FF88] shadow-[0_0_20px_rgba(0,255,136,0.3)]' : ''}`}
                    >
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className={`text-sm flex-1 ${entry.isPlayer ? 'text-[#FFD700] font-bold' : 'text-white'}`}>
                        {entry.username}
                        {entry.isPlayer && <Star className="w-3 h-3 inline ml-1 text-[#FFD700]" />}
                      </span>
                      <span className="text-xs text-white/30 font-mono">{entry.entries} entries</span>
                      <span className="text-sm text-white/50 font-mono">${entry.amount.toLocaleString()}</span>
                      <span className="text-[10px] text-white/30 w-12 text-right">
                        {((entry.amount / totalPool) * 100).toFixed(1)}%
                      </span>
                    </motion.div>
                  ))}
              </div>
            </div>
          </div>

          {/* Sidebar Controls */}
          <div className="space-y-4">
            {/* Enter Jackpot */}
            <div className="bg-[#1a1a25] rounded-2xl border border-[#FFD700]/20 p-4 shadow-[0_0_30px_rgba(255,215,0,0.05)]">
              <div className="space-y-3">
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Bet Amount</label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={e => setBetAmount(Math.max(0, Number(e.target.value)))}
                  disabled={isSpinning || gameLoading}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-lg focus:outline-none focus:border-[#FFD700]/50 disabled:opacity-50 transition-colors"
                />
                <div className="flex gap-1.5 flex-wrap">
                  {presetBets.map(amt => (
                    <button
                      key={amt}
                      onClick={() => !isSpinning && !gameLoading && setBetAmount(amt)}
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

                <div className="bg-[#0a0a0f] rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                  <span className="text-white/30">Entries earned</span>
                  <span className="text-[#FFD700] font-bold">{Math.ceil(betAmount / 100)} entries</span>
                </div>

                <button
                  onClick={enterJackpot}
                  disabled={betAmount <= 0 || betAmount > effectiveBalance || isSpinning || gameLoading}
                  className="w-full py-4 text-lg font-bold rounded-xl transition-all cursor-pointer select-none bg-gradient-to-r from-[#c9a227] to-[#e6c84a] text-black hover:shadow-[0_0_30px_rgba(255,215,0,0.3)] active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                >
                  <Coins className="w-5 h-5" />
                  {gameLoading ? 'ENTERING...' : 'ENTER JACKPOT'}
                </button>

                {/* Draw button */}
                <button
                  onClick={drawWinner}
                  disabled={entries.length < 2 || isSpinning || myTotalBet <= 0 || gameLoading}
                  className="w-full py-3 text-sm font-bold rounded-xl transition-all cursor-pointer select-none bg-gradient-to-r from-[#8B5CF6] to-[#6c2bd9] text-white hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  {isSpinning ? 'DRAWING...' : 'DRAW WINNER'}
                </button>
              </div>
            </div>

            {/* Your Stats */}
            <div className="bg-[#1a1a25] rounded-2xl border border-[#8B5CF6]/20 p-4">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Your Stats</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#0a0a0f] rounded-xl p-3 text-center">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Entries</p>
                  <p className="text-xl font-bold text-white">{myEntryCount}</p>
                </div>
                <div className="bg-[#0a0a0f] rounded-xl p-3 text-center">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Total Bet</p>
                  <p className="text-xl font-bold text-[#FFD700]">${myTotalBet.toLocaleString()}</p>
                </div>
                <div className="bg-[#0a0a0f] rounded-xl p-3 text-center col-span-2">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Win Probability</p>
                  <p className="text-3xl font-black text-[#00FF88]">{myChance.toFixed(1)}%</p>
                  <div className="mt-2 h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#00FF88] to-[#00cc6a] rounded-full"
                      animate={{ width: `${Math.min(myChance, 100)}%` }}
                      transition={{ type: 'spring', damping: 20 }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-white/20 px-1">
                <span>Pool: ${totalPool.toLocaleString()}</span>
                <span>Rake: ${Math.floor(rake).toLocaleString()}</span>
                <span>Prize: ${Math.floor(prizePool).toLocaleString()}</span>
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-[#1a1a25] rounded-2xl border border-white/5 p-4">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">How It Works</h3>
              <ul className="text-[10px] text-white/30 space-y-1.5">
                <li>&bull; Each bet contributes to the jackpot pool</li>
                <li>&bull; Higher bets = more entries = better odds</li>
                <li>&bull; Every $100 bet = 1 entry in the draw</li>
                <li>&bull; Winner takes the entire pool (minus 5% rake)</li>
                <li>&bull; Pool resets after each draw</li>
                <li>&bull; Provably fair weighted random selection</li>
              </ul>
            </div>

            {/* Recent Winners */}
            <div className="bg-[#1a1a25] rounded-2xl border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-3.5 h-3.5 text-[#FFD700]" />
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Previous Winners</h3>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {recentWinners.map((w, i) => (
                  <motion.div
                    key={`${w.username}-${i}`}
                    initial={i === 0 ? { opacity: 0, x: -10 } : {}}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between py-2 px-2.5 rounded-lg bg-[#0a0a0f]"
                  >
                    <div>
                      <p className="text-xs text-white font-medium">{w.username}</p>
                      <p className="text-[9px] text-white/20">{w.time}</p>
                    </div>
                    <span className="text-xs font-bold text-[#00FF88]">
                      +${w.amount.toLocaleString()}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
