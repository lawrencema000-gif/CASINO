'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ChevronUp, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import BetControls from '@/components/ui/BetControls'
import { useAuth } from '@/hooks/useAuth'
import { useBalance } from '@/hooks/useBalance'
import { useGame } from '@/hooks/useGame'

const HILO_MULTIPLIER = 1.96

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const
type Suit = (typeof SUITS)[number]
type Rank = (typeof RANKS)[number]

interface Card {
  rank: Rank
  suit: Suit
  value: number
}

function randomCard(): Card {
  const suit = SUITS[Math.floor(Math.random() * 4)]
  const rankIdx = Math.floor(Math.random() * 13)
  return { rank: RANKS[rankIdx], suit, value: rankIdx + 1 }
}

function suitSymbol(suit: Suit): string {
  switch (suit) {
    case 'hearts': return '\u2665'
    case 'diamonds': return '\u2666'
    case 'clubs': return '\u2663'
    case 'spades': return '\u2660'
  }
}

function suitColor(suit: Suit): string {
  return suit === 'hearts' || suit === 'diamonds' ? '#EF4444' : '#E2E8F0'
}

function CardDisplay({
  card,
  faceDown = false,
  flipping = false,
  className = '',
}: {
  card: Card | null
  faceDown?: boolean
  flipping?: boolean
  className?: string
}) {
  if (!card && !faceDown) {
    return (
      <div className={`w-36 h-52 md:w-44 md:h-64 rounded-2xl border-2 border-dashed border-white/10 bg-[#1a1a25] flex items-center justify-center ${className}`}>
        <span className="text-white/20 text-4xl">?</span>
      </div>
    )
  }

  if (faceDown || !card) {
    return (
      <motion.div
        animate={flipping ? { rotateY: [0, 360] } : {}}
        transition={flipping ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : {}}
        style={{ transformStyle: 'preserve-3d' }}
        className={`w-36 h-52 md:w-44 md:h-64 rounded-2xl border-2 border-[#FFD700]/30 bg-gradient-to-br from-[#1a1a35] via-[#252540] to-[#1a1a35] flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.1)] ${className}`}
      >
        <div className="w-24 h-36 md:w-30 md:h-44 rounded-xl border border-[#FFD700]/20 bg-[#FFD700]/5 flex items-center justify-center">
          <span className="text-[#FFD700]/40 text-3xl font-black">F</span>
        </div>
      </motion.div>
    )
  }

  const color = suitColor(card.suit)
  const symbol = suitSymbol(card.suit)

  return (
    <motion.div
      initial={{ rotateY: 180, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className={`w-36 h-52 md:w-44 md:h-64 rounded-2xl border-2 border-white/10 bg-gradient-to-br from-[#fafafa] to-[#e8e8e8] flex flex-col items-center justify-between p-3 md:p-4 shadow-[0_0_30px_rgba(255,255,255,0.05)] ${className}`}
    >
      {/* Top left */}
      <div className="self-start flex flex-col items-center leading-none">
        <span className="text-xl md:text-2xl font-black" style={{ color }}>{card.rank}</span>
        <span className="text-lg md:text-xl" style={{ color }}>{symbol}</span>
      </div>

      {/* Center suit */}
      <span className="text-5xl md:text-6xl" style={{ color }}>{symbol}</span>

      {/* Bottom right */}
      <div className="self-end flex flex-col items-center leading-none rotate-180">
        <span className="text-xl md:text-2xl font-black" style={{ color }}>{card.rank}</span>
        <span className="text-lg md:text-xl" style={{ color }}>{symbol}</span>
      </div>
    </motion.div>
  )
}

export default function HiLoPage() {
  const { user, loading: authLoading } = useAuth()
  const { balance: serverBalance, setBalanceFromApi } = useBalance(user?.id)
  const { placeBet: placeBetApi, loading: gameLoading, error: gameError } = useGame((newBalance) => {
    setBalanceFromApi(newBalance)
  })

  const [demoBalance, setDemoBalance] = useState(10000)
  const balance = user ? serverBalance : demoBalance
  const isDemo = !user && !authLoading

  const [betAmount, setBetAmount] = useState(100)
  const [currentCard, setCurrentCard] = useState<Card>(() => randomCard())
  const [nextCard, setNextCard] = useState<Card | null>(null)
  const [playing, setPlaying] = useState(false)
  const [revealing, setRevealing] = useState(false)
  const [lastResult, setLastResult] = useState<'win' | 'loss' | 'push' | null>(null)
  const [streak, setStreak] = useState(0)
  const [streakType, setStreakType] = useState<'win' | 'loss'>('win')

  const handleGuess = useCallback(async (guess: 'higher' | 'lower') => {
    if (playing || betAmount > balance || betAmount <= 0) return

    setPlaying(true)
    setRevealing(true)
    setLastResult(null)
    setNextCard(null)

    if (isDemo) {
      setDemoBalance(prev => prev - betAmount)

      const next = randomCard()
      const won = guess === 'higher' ? next.value > currentCard.value : next.value < currentCard.value
      const tied = next.value === currentCard.value

      setTimeout(() => {
        setNextCard(next)
        setRevealing(false)

        if (tied) {
          setLastResult('push')
          setDemoBalance(prev => prev + betAmount)
        } else if (won) {
          setLastResult('win')
          const payout = Math.floor(betAmount * HILO_MULTIPLIER * 100) / 100
          setDemoBalance(prev => prev + payout)
          setStreak(prev => streakType === 'win' ? prev + 1 : 1)
          setStreakType('win')
        } else {
          setLastResult('loss')
          setStreak(prev => streakType === 'loss' ? prev + 1 : 1)
          setStreakType('loss')
        }

        // After showing result, move next card to current after a delay
        setTimeout(() => {
          setCurrentCard(next)
          setNextCard(null)
          setPlaying(false)
        }, 1500)
      }, 1200)
    } else {
      const apiPromise = placeBetApi({
        gameType: 'hilo' as never,
        betAmount,
        action: 'bet',
        gameData: { guess },
      })

      const [apiResult] = await Promise.all([
        apiPromise,
        new Promise(resolve => setTimeout(resolve, 1200)),
      ])

      if (apiResult) {
        const resultData = apiResult.result as {
          currentCard: Card
          nextCard: Card
          guess: string
          won: boolean
          tied: boolean
        }

        setNextCard(resultData.nextCard)
        setRevealing(false)

        if (resultData.tied) {
          setLastResult('push')
        } else if (resultData.won) {
          setLastResult('win')
          setStreak(prev => streakType === 'win' ? prev + 1 : 1)
          setStreakType('win')
        } else {
          setLastResult('loss')
          setStreak(prev => streakType === 'loss' ? prev + 1 : 1)
          setStreakType('loss')
        }

        setTimeout(() => {
          setCurrentCard(resultData.nextCard)
          setNextCard(null)
          setPlaying(false)
        }, 1500)
      } else {
        setRevealing(false)
        setPlaying(false)
      }
    }
  }, [playing, betAmount, balance, currentCard, streakType, isDemo, placeBetApi])

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
          <h1 className="text-xl font-bold text-[#FFD700]">Hi-Lo</h1>
          <p className="text-[10px] text-white/30">Payout: {HILO_MULTIPLIER}x | House Edge: 2%</p>
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

        {/* Cards Display */}
        <div className="relative rounded-2xl bg-[#1a1a25] border border-white/5 py-10 px-6 flex flex-col items-center overflow-hidden">
          {/* Win/Loss/Push glow */}
          {!playing && lastResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.1 }}
              className={`absolute inset-0 ${
                lastResult === 'win' ? 'bg-[#00FF88]' : lastResult === 'loss' ? 'bg-[#EF4444]' : 'bg-[#FFD700]'
              }`}
            />
          )}

          {/* Cards side by side */}
          <div className="flex items-center gap-6 md:gap-10 relative z-10">
            {/* Current card */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">Current</span>
              <CardDisplay card={currentCard} />
            </div>

            {/* VS divider */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-white/20 text-sm font-bold">VS</span>
            </div>

            {/* Next card */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">Next</span>
              {nextCard ? (
                <CardDisplay card={nextCard} />
              ) : (
                <CardDisplay card={null} faceDown={revealing} flipping={revealing} />
              )}
            </div>
          </div>

          {/* Result Text */}
          <AnimatePresence>
            {!playing && lastResult && (
              <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={`mt-8 text-center relative z-10 ${
                  lastResult === 'win' ? 'text-[#00FF88]' : lastResult === 'loss' ? 'text-[#EF4444]' : 'text-[#FFD700]'
                }`}
              >
                <div className="text-2xl font-black">
                  {lastResult === 'win' && `YOU WIN! ${HILO_MULTIPLIER}x`}
                  {lastResult === 'loss' && 'WRONG GUESS!'}
                  {lastResult === 'push' && 'PUSH - TIE!'}
                </div>
                {lastResult === 'win' && (
                  <div className="text-lg mt-1 text-[#FFD700]">
                    +${(Math.floor(betAmount * HILO_MULTIPLIER * 100) / 100).toFixed(2)}
                  </div>
                )}
                {lastResult === 'push' && (
                  <div className="text-sm mt-1 text-white/50">Bet returned</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Higher / Lower Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleGuess('higher')}
            disabled={playing || gameLoading || betAmount > balance || betAmount <= 0}
            className="py-5 rounded-xl font-black text-lg transition-all cursor-pointer border-2 bg-[#00FF88]/10 border-[#00FF88]/40 text-[#00FF88] hover:border-[#00FF88] hover:shadow-[0_0_20px_rgba(0,255,136,0.2)] disabled:opacity-30 disabled:cursor-not-allowed flex flex-col items-center gap-1"
          >
            <ChevronUp className="w-8 h-8" />
            HIGHER
          </button>
          <button
            onClick={() => handleGuess('lower')}
            disabled={playing || gameLoading || betAmount > balance || betAmount <= 0}
            className="py-5 rounded-xl font-black text-lg transition-all cursor-pointer border-2 bg-[#EF4444]/10 border-[#EF4444]/40 text-[#EF4444] hover:border-[#EF4444] hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] disabled:opacity-30 disabled:cursor-not-allowed flex flex-col items-center gap-1"
          >
            <ChevronDown className="w-8 h-8" />
            LOWER
          </button>
        </div>

        {/* Bet Controls */}
        <BetControls
          balance={balance}
          betAmount={betAmount}
          onBetChange={setBetAmount}
          onPlay={() => {}}
          disabled={playing || gameLoading}
          multiplier={HILO_MULTIPLIER}
          playLabel={playing ? 'REVEALING...' : 'CHOOSE HIGHER OR LOWER'}
        />
      </div>
    </div>
  )
}
