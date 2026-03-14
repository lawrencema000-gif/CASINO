'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import BetControls from '@/components/ui/BetControls'
import { HAND_RANKINGS, createFullDeck, deal, evaluateHand, redraw } from '@/lib/games/poker'
import { useAuth } from '@/hooks/useAuth'
import { useBalance } from '@/hooks/useBalance'
import { useGame } from '@/hooks/useGame'
import type { BlackjackCard } from '@/lib/types'

/* --- card image helpers --- */
function getCardImage(card: { suit: string; rank: string }): string {
  const suitMap: Record<string, number> = { 'clubs': 1, 'diamonds': 2, 'hearts': 3, 'spades': 4 }
  const rankMap: Record<string, number> = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 }
  const s = suitMap[card.suit] || 1
  const r = rankMap[card.rank] || 2
  return `/images/cards/${s}_${r}.png`
}
const CARD_BACK = '/images/cards/0_0.png'

type Phase = 'betting' | 'dealt' | 'drawn' | 'result'

function CardVisual({
  card,
  held,
  faceUp,
  onClick,
  delay = 0,
}: {
  card: BlackjackCard | null
  held?: boolean
  faceUp?: boolean
  onClick?: () => void
  delay?: number
}) {
  if (!card) {
    return (
      <div className="w-16 h-24 sm:w-20 sm:h-28 md:w-24 md:h-36 rounded-xl border-2 border-dashed border-white/10 bg-[#1a1a25]" />
    )
  }

  return (
    <motion.div
      onClick={onClick}
      className={`relative cursor-pointer select-none transition-transform ${held ? '-translate-y-3' : ''}`}
      style={{ perspective: '800px' }}
    >
      <motion.div
        initial={{ rotateY: 180, scale: 0.8, opacity: 0 }}
        animate={{ rotateY: faceUp ? 0 : 180, scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay }}
        style={{ transformStyle: 'preserve-3d' }}
        className={`relative w-16 h-24 sm:w-20 sm:h-28 md:w-24 md:h-36 transition-shadow duration-300 ${
          held ? 'shadow-[0_0_15px_rgba(255,215,0,0.4)]' : ''
        }`}
      >
        {/* Front face - card image */}
        <div
          className={`absolute inset-0 rounded-lg overflow-hidden border-2 ${
            held ? 'border-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.5)]' : 'border-gray-700'
          }`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <img
            src={getCardImage(card)}
            alt={`${card.rank} of ${card.suit}`}
            className="w-full h-full object-cover"
            style={{ imageRendering: 'auto' }}
            draggable={false}
          />
        </div>

        {/* Back face - card back image */}
        <div
          className="absolute inset-0 rounded-lg overflow-hidden border-2 border-gray-700"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <img
            src={CARD_BACK}
            alt="Card back"
            className="w-full h-full object-cover"
            style={{ imageRendering: 'auto' }}
            draggable={false}
          />
        </div>
      </motion.div>

      {/* HELD badge */}
      {held && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#FFD700] text-black text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg z-10"
        >
          HELD
        </motion.div>
      )}
    </motion.div>
  )
}

export default function PokerPage() {
  const { user, loading: authLoading } = useAuth()
  const { balance, setBalanceFromApi } = useBalance(user?.id)
  const { placeBet, gameAction, loading: gameLoading, error: gameError } = useGame((newBalance) => {
    setBalanceFromApi(newBalance)
  })

  // Demo mode fallback
  const isDemo = !user && !authLoading
  const [demoBalance, setDemoBalance] = useState(10000)
  const effectiveBalance = isDemo ? demoBalance : balance

  const [betAmount, setBetAmount] = useState(100)
  const [phase, setPhase] = useState<Phase>('betting')
  const [hand, setHand] = useState<BlackjackCard[]>([])
  const [deck, setDeck] = useState<BlackjackCard[]>([])
  const [holdMask, setHoldMask] = useState<boolean[]>([false, false, false, false, false])
  const [handRank, setHandRank] = useState(HAND_RANKINGS[HAND_RANKINGS.length - 1])
  const [payout, setPayout] = useState(0)

  const handleDeal = useCallback(async () => {
    if (betAmount > effectiveBalance || betAmount <= 0) return

    if (isDemo) {
      // Demo mode: fully client-side
      setDemoBalance(prev => prev - betAmount)
      setPayout(0)

      const newDeck = createFullDeck()
      const result = deal(newDeck)

      setHand(result.hand)
      setDeck(result.deck)
      setHoldMask([false, false, false, false, false])
      setHandRank(evaluateHand(result.hand))
      setPhase('dealt')
      return
    }

    // Server mode: place bet via API
    setPayout(0)
    const result = await placeBet({ gameType: 'poker', betAmount, action: 'bet', gameData: {} })
    if (!result) return

    // Use client-side deal for card display (server deducted the bet)
    const newDeck = createFullDeck()
    const dealResult = deal(newDeck)

    setHand(dealResult.hand)
    setDeck(dealResult.deck)
    setHoldMask([false, false, false, false, false])
    setHandRank(evaluateHand(dealResult.hand))
    setPhase('dealt')
  }, [betAmount, effectiveBalance, isDemo, placeBet])

  const toggleHold = useCallback((index: number) => {
    if (phase !== 'dealt') return
    setHoldMask(prev => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }, [phase])

  const handleDraw = useCallback(async () => {
    if (phase !== 'dealt') return

    const result = redraw(hand, holdMask, deck)
    setHand(result.hand)
    setDeck(result.deck)

    const evaluation = evaluateHand(result.hand)
    setHandRank(evaluation)

    const winPayout = evaluation.payout * betAmount
    setPayout(winPayout)

    if (isDemo) {
      if (winPayout > 0) {
        setDemoBalance(prev => prev + winPayout)
      }
    } else {
      // Settle via server: send the final hand evaluation
      const settleResult = await gameAction('settle', {
        held: holdMask,
        handName: evaluation.name,
        multiplier: evaluation.payout,
      })
      // If settle fails, the payout display still shows what was evaluated client-side
      // but the balance will be updated from the server response
      if (settleResult) {
        setPayout(settleResult.payout)
      }
    }

    setPhase('result')
  }, [phase, hand, holdMask, deck, betAmount, isDemo, gameAction])

  const handleNewGame = useCallback(() => {
    setPhase('betting')
    setHand([])
    setDeck([])
    setHoldMask([false, false, false, false, false])
    setHandRank(HAND_RANKINGS[HAND_RANKINGS.length - 1])
    setPayout(0)
  }, [])

  const activeHandRank = useMemo(() => {
    if (phase === 'dealt' || phase === 'result') return handRank
    return null
  }, [phase, handRank])

  const isBetting = phase === 'betting'
  const isResult = phase === 'result'
  const isWin = isResult && payout > 0

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="bg-yellow-500/90 text-black text-center text-xs font-bold py-1.5 px-4">
          DEMO MODE — Sign up to play for real
        </div>
      )}

      {/* Top Bar */}
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-2 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Lobby</span>
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-bold text-[#FFD700]">Video Poker</h1>
          <p className="text-[10px] text-white/30">Jacks or Better | House Edge: ~0.5%</p>
        </div>
        <div className="w-16" />
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-8 space-y-6">
        {/* Pay Table */}
        <div className="bg-[#1a1a25] rounded-xl border border-white/5 overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-0">
            {HAND_RANKINGS.filter(h => h.payout > 0).map(h => (
              <div
                key={h.name}
                className={`px-3 py-2 text-center border-b border-r border-white/5 transition-all ${
                  activeHandRank?.name === h.name
                    ? 'bg-[#FFD700]/20 text-[#FFD700]'
                    : 'text-white/40'
                }`}
              >
                <div className="text-[10px] sm:text-xs font-medium truncate">{h.name}</div>
                <div className="text-sm sm:text-base font-bold">{h.payout}x</div>
              </div>
            ))}
          </div>
        </div>

        {/* Cards Area */}
        <div className={`relative rounded-2xl bg-[#1a1a25] border overflow-hidden py-10 sm:py-14 ${
          isWin ? 'border-[#00FF88]/30' : isResult ? 'border-[#EF4444]/20' : 'border-white/5'
        }`}>
          {/* Win/Loss glow */}
          {isResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: isWin ? 0.08 : 0.05 }}
              className={`absolute inset-0 ${isWin ? 'bg-[#00FF88]' : 'bg-[#EF4444]'}`}
            />
          )}

          <div className="flex justify-center gap-2 sm:gap-3 md:gap-4 relative z-10">
            {hand.length > 0 ? hand.map((card, i) => (
              <CardVisual
                key={`${card.rank}-${card.suit}-${i}`}
                card={card}
                faceUp={true}
                held={holdMask[i]}
                onClick={() => toggleHold(i)}
                delay={i * 0.1}
              />
            )) : (
              Array.from({ length: 5 }).map((_, i) => (
                <CardVisual key={i} card={null} />
              ))
            )}
          </div>

          {phase === 'dealt' && (
            <p className="text-center text-white/30 text-sm mt-4 relative z-10">
              Click cards to hold, then draw
            </p>
          )}

          {/* Hand Rank Display */}
          <AnimatePresence>
            {activeHandRank && activeHandRank.payout > 0 && (
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center mt-6 relative z-10"
              >
                <span className={`inline-block px-4 py-2 rounded-full font-black text-lg ${
                  isWin ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-[#8B5CF6]/20 text-[#8B5CF6]'
                }`}>
                  {activeHandRank.name}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Win Celebration */}
          <AnimatePresence>
            {isWin && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center mt-4 relative z-10"
              >
                <div className="text-3xl font-black text-[#00FF88]">
                  WIN +${payout.toFixed(2)}
                </div>
              </motion.div>
            )}

            {isResult && !isWin && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center mt-4 relative z-10"
              >
                <div className="text-xl font-bold text-[#EF4444]/60">No winning hand</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Game Error Display */}
        {gameError && (
          <div className="text-center text-sm text-red-400 bg-red-400/10 rounded-lg py-2 px-4">
            {gameError}
          </div>
        )}

        {/* Action Buttons for dealt/result phases */}
        {phase === 'dealt' && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleDraw}
            disabled={gameLoading}
            className="w-full py-4 text-xl font-black rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#a78bfa] text-white shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] transition-shadow cursor-pointer disabled:opacity-50"
          >
            {gameLoading ? 'DRAWING...' : 'DRAW'}
          </motion.button>
        )}

        {isResult && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleNewGame}
            className="w-full py-4 text-lg font-bold rounded-xl bg-[#1a1a25] border border-white/10 text-white hover:border-[#FFD700]/30 transition-all cursor-pointer"
          >
            New Hand
          </motion.button>
        )}

        {/* Bet Controls - betting phase only */}
        {isBetting && (
          <BetControls
            balance={effectiveBalance}
            betAmount={betAmount}
            onBetChange={setBetAmount}
            onPlay={handleDeal}
            disabled={gameLoading}
            playLabel="DEAL"
          />
        )}
      </div>
    </div>
  )
}
