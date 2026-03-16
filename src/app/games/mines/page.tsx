'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Diamond, Bomb } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useBalance } from '@/hooks/useBalance'
import { useGame } from '@/hooks/useGame'

// Calculate multiplier for mines game given mineCount and number of safe reveals so far
function calcMultiplier(mineCount: number, safePicks: number): number {
  // Each pick: probability of safe = (remaining safe) / (remaining total)
  // Multiplier = 0.99 / cumulative probability (1% house edge)
  let cumProb = 1
  const total = 25
  for (let i = 0; i < safePicks; i++) {
    cumProb *= (total - mineCount - i) / (total - i)
  }
  if (cumProb <= 0) return 0
  return Math.floor((0.99 / cumProb) * 100) / 100
}

type TileState = 'hidden' | 'safe' | 'mine'
type GamePhase = 'setup' | 'playing' | 'won' | 'lost'

export default function MinesPage() {
  const { user, loading: authLoading } = useAuth()
  const { balance: serverBalance, setBalanceFromApi } = useBalance(user?.id)
  const { placeBet: placeBetApi, gameAction, loading: gameLoading, error: gameError, gameId, resetGame } = useGame((newBalance) => {
    setBalanceFromApi(newBalance)
  })

  const [demoBalance, setDemoBalance] = useState(10000)
  const balance = user ? serverBalance : demoBalance
  const isDemo = !user && !authLoading

  const [betAmount, setBetAmount] = useState(100)
  const [mineCount, setMineCount] = useState(5)
  const [tiles, setTiles] = useState<TileState[]>(Array(25).fill('hidden'))
  const [revealed, setRevealed] = useState<number[]>([])
  const [phase, setPhase] = useState<GamePhase>('setup')
  const [minePositions, setMinePositions] = useState<number[]>([]) // demo mode mine positions
  const [currentMultiplier, setCurrentMultiplier] = useState(1)
  const [payout, setPayout] = useState(0)

  const nextMultiplier = useMemo(
    () => calcMultiplier(mineCount, revealed.length + 1),
    [mineCount, revealed.length]
  )

  // Generate random mine positions for demo mode
  const generateMines = useCallback((count: number): number[] => {
    const positions: number[] = []
    while (positions.length < count) {
      const pos = Math.floor(Math.random() * 25)
      if (!positions.includes(pos)) positions.push(pos)
    }
    return positions
  }, [])

  // Start a new game
  const handleStartGame = useCallback(async () => {
    if (betAmount > balance || betAmount <= 0) return

    // Reset tiles
    setTiles(Array(25).fill('hidden'))
    setRevealed([])
    setCurrentMultiplier(1)
    setPayout(0)

    if (isDemo) {
      setDemoBalance(prev => prev - betAmount)
      const mines = generateMines(mineCount)
      setMinePositions(mines)
      setPhase('playing')
    } else {
      const result = await placeBetApi({
        gameType: 'mines',
        betAmount,
        action: 'bet',
        gameData: { mineCount },
      })

      if (result) {
        setPhase('playing')
      }
    }
  }, [betAmount, balance, isDemo, mineCount, generateMines, placeBetApi])

  // Handle tile click
  const handleTileClick = useCallback(async (index: number) => {
    if (phase !== 'playing' || tiles[index] !== 'hidden' || gameLoading) return

    if (isDemo) {
      const newTiles = [...tiles]
      const newRevealed = [...revealed, index]

      if (minePositions.includes(index)) {
        // Hit a mine
        newTiles[index] = 'mine'
        // Reveal all mines
        minePositions.forEach(pos => {
          newTiles[pos] = 'mine'
        })
        setTiles(newTiles)
        setPhase('lost')
        setCurrentMultiplier(0)
      } else {
        // Safe tile
        newTiles[index] = 'safe'
        setTiles(newTiles)
        setRevealed(newRevealed)
        const mult = calcMultiplier(mineCount, newRevealed.length)
        setCurrentMultiplier(mult)

        // Check if all safe tiles revealed
        if (newRevealed.length === 25 - mineCount) {
          const winAmount = Math.floor(betAmount * mult * 100) / 100
          setDemoBalance(prev => prev + winAmount)
          setPayout(winAmount)
          setPhase('won')
        }
      }
    } else {
      // Real mode: call API
      const result = await gameAction('pick', {
        pick: index,
        revealed,
        mineCount,
      })

      if (result) {
        const data = result.result as { hit: boolean; minePositions?: number[]; multiplier: number }
        const newTiles = [...tiles]

        if (data.hit) {
          // Hit a mine
          newTiles[index] = 'mine'
          if (data.minePositions) {
            data.minePositions.forEach((pos: number) => {
              newTiles[pos] = 'mine'
            })
          }
          setTiles(newTiles)
          setPhase('lost')
          setCurrentMultiplier(0)
          resetGame()
        } else {
          // Safe
          newTiles[index] = 'safe'
          setTiles(newTiles)
          const newRevealed = [...revealed, index]
          setRevealed(newRevealed)
          setCurrentMultiplier(result.multiplier || data.multiplier)

          // Check if all safe tiles revealed
          if (newRevealed.length === 25 - mineCount) {
            setPayout(result.payout)
            setPhase('won')
            resetGame()
          }
        }
      }
    }
  }, [phase, tiles, revealed, minePositions, mineCount, isDemo, betAmount, gameLoading, gameAction, resetGame])

  // Cash out
  const handleCashout = useCallback(async () => {
    if (phase !== 'playing' || revealed.length === 0) return

    if (isDemo) {
      const winAmount = Math.floor(betAmount * currentMultiplier * 100) / 100
      setDemoBalance(prev => prev + winAmount)
      setPayout(winAmount)
      // Reveal all mines
      const newTiles = [...tiles]
      minePositions.forEach(pos => {
        if (newTiles[pos] === 'hidden') newTiles[pos] = 'mine'
      })
      setTiles(newTiles)
      setPhase('won')
    } else {
      const result = await gameAction('cashout', {})
      if (result) {
        setPayout(result.payout)
        // Reveal mines from result
        const data = result.result as { minePositions?: number[] }
        if (data?.minePositions) {
          const newTiles = [...tiles]
          data.minePositions.forEach((pos: number) => {
            if (newTiles[pos] === 'hidden') newTiles[pos] = 'mine'
          })
          setTiles(newTiles)
        }
        setPhase('won')
        resetGame()
      }
    }
  }, [phase, revealed, isDemo, betAmount, currentMultiplier, tiles, minePositions, gameAction, resetGame])

  // New game / reset
  const handleNewGame = useCallback(() => {
    setTiles(Array(25).fill('hidden'))
    setRevealed([])
    setMinePositions([])
    setCurrentMultiplier(1)
    setPayout(0)
    setPhase('setup')
  }, [])

  return (
    <div className="min-h-screen bg-[var(--casino-bg,#0a0a0f)] text-white">
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
          <h1 className="text-xl font-bold text-[var(--casino-accent,#FFD700)]">Mines</h1>
          <p className="text-[10px] text-white/30">House Edge: 1%</p>
        </div>
        <div className="w-16" />
      </div>

      <div className="max-w-lg mx-auto px-4 pb-8 space-y-5">
        {/* Multiplier & Payout Display */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[var(--casino-card,#1a1a25)] border border-[var(--casino-border,#ffffff0d)] p-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Current Multiplier</div>
            <div className={`text-2xl font-black tabular-nums ${
              phase === 'lost' ? 'text-[var(--casino-red,#EF4444)]' :
              currentMultiplier > 1 ? 'text-[var(--casino-green,#00FF88)]' :
              'text-white/60'
            }`}>
              {phase === 'lost' ? '0.00x' : `${currentMultiplier.toFixed(2)}x`}
            </div>
          </div>
          <div className="rounded-xl bg-[var(--casino-card,#1a1a25)] border border-[var(--casino-border,#ffffff0d)] p-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
              {phase === 'playing' ? 'Next Pick' : 'Payout'}
            </div>
            <div className={`text-2xl font-black tabular-nums ${
              phase === 'won' ? 'text-[var(--casino-green,#00FF88)]' :
              phase === 'playing' ? 'text-[var(--casino-accent,#FFD700)]' :
              'text-white/60'
            }`}>
              {phase === 'won'
                ? `$${payout.toFixed(2)}`
                : phase === 'playing'
                  ? `${nextMultiplier.toFixed(2)}x`
                  : '$0.00'}
            </div>
          </div>
        </div>

        {/* 5x5 Grid */}
        <div className="rounded-2xl bg-[var(--casino-card,#1a1a25)] border border-[var(--casino-border,#ffffff0d)] p-3 sm:p-4">
          <div className="grid grid-cols-5 gap-2">
            {tiles.map((tile, index) => (
              <motion.button
                key={index}
                onClick={() => handleTileClick(index)}
                disabled={phase !== 'playing' || tile !== 'hidden' || gameLoading}
                whileHover={phase === 'playing' && tile === 'hidden' ? { scale: 1.05 } : {}}
                whileTap={phase === 'playing' && tile === 'hidden' ? { scale: 0.95 } : {}}
                className={`
                  aspect-square rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border-2 select-none
                  ${tile === 'hidden'
                    ? phase === 'playing'
                      ? 'bg-[#1e1e30] border-[#2a2a40] hover:border-[var(--casino-accent,#FFD700)]/50 hover:bg-[#252540] hover:shadow-[0_0_15px_rgba(255,215,0,0.1)]'
                      : 'bg-[#1e1e30] border-[#2a2a40] opacity-60 cursor-default'
                    : tile === 'safe'
                      ? 'bg-[var(--casino-green,#00FF88)]/15 border-[var(--casino-green,#00FF88)]/40'
                      : 'bg-[var(--casino-red,#EF4444)]/15 border-[var(--casino-red,#EF4444)]/40'
                  }
                  disabled:cursor-default
                `}
              >
                <AnimatePresence mode="wait">
                  {tile === 'safe' && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    >
                      <Diamond className="w-6 h-6 sm:w-8 sm:h-8 text-[var(--casino-green,#00FF88)] drop-shadow-[0_0_8px_rgba(0,255,136,0.5)]" />
                    </motion.div>
                  )}
                  {tile === 'mine' && (
                    <motion.div
                      initial={{ scale: 0, rotate: 180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    >
                      <Bomb className="w-6 h-6 sm:w-8 sm:h-8 text-[var(--casino-red,#EF4444)] drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    </motion.div>
                  )}
                  {tile === 'hidden' && (
                    <motion.div
                      className="w-3 h-3 rounded-full bg-white/10"
                      initial={false}
                    />
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Result overlay */}
        <AnimatePresence>
          {(phase === 'won' || phase === 'lost') && (
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`text-center py-4 rounded-xl border ${
                phase === 'won'
                  ? 'bg-[var(--casino-green,#00FF88)]/10 border-[var(--casino-green,#00FF88)]/20'
                  : 'bg-[var(--casino-red,#EF4444)]/10 border-[var(--casino-red,#EF4444)]/20'
              }`}
            >
              <div className={`text-2xl font-black ${
                phase === 'won' ? 'text-[var(--casino-green,#00FF88)]' : 'text-[var(--casino-red,#EF4444)]'
              }`}>
                {phase === 'won' ? `CASHED OUT ${currentMultiplier.toFixed(2)}x` : 'BOOM! You hit a mine!'}
              </div>
              {phase === 'won' && (
                <div className="text-lg mt-1 text-[var(--casino-accent,#FFD700)]">
                  +${payout.toFixed(2)}
                </div>
              )}
              {phase === 'lost' && (
                <div className="text-sm mt-1 text-white/40">
                  Lost ${betAmount.toFixed(2)}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cash Out Button (during play) */}
        {phase === 'playing' && revealed.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleCashout}
            disabled={gameLoading}
            className="w-full py-4 text-lg font-bold rounded-xl transition-all duration-200 cursor-pointer select-none bg-gradient-to-r from-[#00cc6a] to-[#00FF88] text-black hover:shadow-[0_0_30px_rgba(0,255,136,0.3)] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            CASH OUT ${(Math.floor(betAmount * currentMultiplier * 100) / 100).toFixed(2)}
          </motion.button>
        )}

        {/* New Game button after result */}
        {(phase === 'won' || phase === 'lost') && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={handleNewGame}
            className="w-full py-3 text-sm font-bold rounded-xl transition-all cursor-pointer border-2 border-[var(--casino-accent,#FFD700)]/30 text-[var(--casino-accent,#FFD700)] hover:bg-[var(--casino-accent,#FFD700)]/10"
          >
            NEW GAME
          </motion.button>
        )}

        {/* Setup Controls (only in setup phase) */}
        {phase === 'setup' && (
          <div className="space-y-4">
            {/* Mine Count Selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Number of Mines
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={1}
                  max={24}
                  value={mineCount}
                  onChange={(e) => setMineCount(parseInt(e.target.value))}
                  className="flex-1 accent-[var(--casino-accent,#FFD700)] h-2 rounded-full bg-[#1e1e30] cursor-pointer"
                />
                <div className="w-14 text-center py-1.5 rounded-lg bg-[var(--casino-card,#1a1a25)] border border-[var(--casino-border,#ffffff0d)] text-[var(--casino-accent,#FFD700)] font-bold text-sm">
                  {mineCount}
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-white/20 px-1">
                <span>Low Risk</span>
                <span>High Risk</span>
              </div>
              {/* Quick mine presets */}
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 3, 5, 10, 24].map(count => (
                  <button
                    key={count}
                    onClick={() => setMineCount(count)}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      mineCount === count
                        ? 'bg-[var(--casino-accent,#FFD700)]/15 border-[var(--casino-accent,#FFD700)]/40 text-[var(--casino-accent,#FFD700)]'
                        : 'bg-[var(--casino-card,#1a1a25)] border-[var(--casino-border,#ffffff0d)] text-white/40 hover:text-white/60 hover:border-white/20'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Bet Amount */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Bet Amount
              </label>
              <div className="flex items-center rounded-xl border border-[var(--casino-border,#ffffff0d)] bg-[var(--casino-card,#1a1a25)]">
                <button
                  onClick={() => setBetAmount(prev => Math.max(100, prev - 100))}
                  className="px-3 py-3 text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer rounded-l-xl"
                >
                  -
                </button>
                <div className="flex-1 flex items-center justify-center px-2">
                  <span className="text-[var(--casino-accent,#FFD700)] font-bold mr-1">$</span>
                  <input
                    type="text"
                    value={betAmount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value.replace(/[^0-9.]/g, ''))
                      if (!isNaN(val)) setBetAmount(Math.max(100, Math.min(balance, val)))
                    }}
                    className="w-full bg-transparent text-center text-lg font-bold text-white outline-none tabular-nums"
                  />
                </div>
                <button
                  onClick={() => setBetAmount(prev => Math.min(balance, prev + 100))}
                  className="px-3 py-3 text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer rounded-r-xl"
                >
                  +
                </button>
              </div>
              {/* Quick bet buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Min', action: () => setBetAmount(100) },
                  { label: '1/2', action: () => setBetAmount(Math.max(100, Math.floor(betAmount / 2))) },
                  { label: '2x', action: () => setBetAmount(Math.min(balance, betAmount * 2)) },
                  { label: 'Max', action: () => setBetAmount(balance) },
                ].map(btn => (
                  <button
                    key={btn.label}
                    onClick={btn.action}
                    className="py-2 text-xs font-semibold rounded-lg bg-[var(--casino-card,#1a1a25)] border border-[var(--casino-border,#ffffff0d)] text-white/40 hover:text-white hover:border-[var(--casino-accent,#FFD700)]/30 transition-all cursor-pointer"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* First pick multiplier preview */}
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[var(--casino-accent,#FFD700)]/5 border border-[var(--casino-accent,#FFD700)]/15">
              <span className="text-xs text-white/40">1st Pick Multiplier</span>
              <span className="text-sm font-bold text-[var(--casino-accent,#FFD700)] tabular-nums">
                {calcMultiplier(mineCount, 1).toFixed(2)}x
              </span>
            </div>

            {/* Start Game Button */}
            <button
              onClick={handleStartGame}
              disabled={gameLoading || betAmount > balance || betAmount <= 0}
              className="w-full py-4 text-lg font-bold rounded-xl transition-all duration-200 cursor-pointer select-none bg-gradient-to-r from-[#00cc6a] to-[#00FF88] text-black hover:shadow-[0_0_30px_rgba(0,255,136,0.3)] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {gameLoading ? 'STARTING...' : 'START GAME'}
            </button>

            {/* Balance */}
            <div className="text-center">
              <span className="text-xs text-white/40">
                Balance: <span className="text-[var(--casino-accent,#FFD700)] font-medium">${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </span>
            </div>
          </div>
        )}

        {/* Tiles revealed count during play */}
        {phase === 'playing' && (
          <div className="flex items-center justify-between text-xs text-white/40 px-1">
            <span>Safe: <span className="text-[var(--casino-green,#00FF88)] font-bold">{revealed.length}</span> / {25 - mineCount}</span>
            <span>Mines: <span className="text-[var(--casino-red,#EF4444)] font-bold">{mineCount}</span></span>
            <span>Balance: <span className="text-[var(--casino-accent,#FFD700)] font-medium">${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></span>
          </div>
        )}
      </div>
    </div>
  )
}
