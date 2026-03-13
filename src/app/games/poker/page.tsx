'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import BetControls from '@/components/ui/BetControls'
import { HAND_RANKINGS, createFullDeck, deal, evaluateHand, redraw } from '@/lib/games/poker'
import type { BlackjackCard } from '@/lib/types'

type Phase = 'betting' | 'dealt' | 'drawn' | 'result'

const SUIT_SYMBOL: Record<string, string> = {
  hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660',
}
const SUIT_COLOR: Record<string, string> = {
  hearts: 'text-red-500', diamonds: 'text-red-500', clubs: 'text-white', spades: 'text-white',
}

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
      initial={{ rotateY: 180, scale: 0.8, opacity: 0 }}
      animate={{ rotateY: faceUp ? 0 : 180, scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, delay }}
      style={{ perspective: '600px' }}
      onClick={onClick}
      className={`relative cursor-pointer select-none transition-transform ${held ? '-translate-y-3' : ''}`}
    >
      <div
        className={`w-16 h-24 sm:w-20 sm:h-28 md:w-24 md:h-36 rounded-xl overflow-hidden relative transition-shadow duration-300 ${
          held ? 'shadow-[0_0_15px_rgba(255,215,0,0.4)] ring-2 ring-[#FFD700]' : 'shadow-lg'
        }`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 bg-white rounded-xl flex flex-col items-center justify-between p-1.5 sm:p-2"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className={`self-start text-xs sm:text-sm font-bold leading-tight ${SUIT_COLOR[card.suit]}`}>
            {card.rank}
            <div className="text-[10px] sm:text-xs">{SUIT_SYMBOL[card.suit]}</div>
          </div>
          <div className={`text-2xl sm:text-4xl ${SUIT_COLOR[card.suit]}`}>
            {SUIT_SYMBOL[card.suit]}
          </div>
          <div className={`self-end rotate-180 text-xs sm:text-sm font-bold leading-tight ${SUIT_COLOR[card.suit]}`}>
            {card.rank}
            <div className="text-[10px] sm:text-xs">{SUIT_SYMBOL[card.suit]}</div>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#1a1a6e] via-[#2d1b69] to-[#1a1a6e] border-2 border-[#3d2b89] flex items-center justify-center"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="w-[80%] h-[85%] rounded-lg border border-[#4a3a99] bg-[#2a1a5e]" />
        </div>
      </div>

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
  const [balance, setBalance] = useState(10000)
  const [betAmount, setBetAmount] = useState(100)
  const [phase, setPhase] = useState<Phase>('betting')
  const [hand, setHand] = useState<BlackjackCard[]>([])
  const [deck, setDeck] = useState<BlackjackCard[]>([])
  const [holdMask, setHoldMask] = useState<boolean[]>([false, false, false, false, false])
  const [handRank, setHandRank] = useState(HAND_RANKINGS[HAND_RANKINGS.length - 1])
  const [payout, setPayout] = useState(0)

  const handleDeal = useCallback(() => {
    if (betAmount > balance || betAmount <= 0) return

    setBalance(prev => prev - betAmount)
    setPayout(0)

    const newDeck = createFullDeck()
    const result = deal(newDeck)

    setHand(result.hand)
    setDeck(result.deck)
    setHoldMask([false, false, false, false, false])
    setHandRank(evaluateHand(result.hand))
    setPhase('dealt')
  }, [betAmount, balance])

  const toggleHold = useCallback((index: number) => {
    if (phase !== 'dealt') return
    setHoldMask(prev => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }, [phase])

  const handleDraw = useCallback(() => {
    if (phase !== 'dealt') return

    const result = redraw(hand, holdMask, deck)
    setHand(result.hand)
    setDeck(result.deck)

    const evaluation = evaluateHand(result.hand)
    setHandRank(evaluation)

    const winPayout = evaluation.payout * betAmount
    setPayout(winPayout)

    if (winPayout > 0) {
      setBalance(prev => prev + winPayout)
    }

    setPhase('result')
  }, [phase, hand, holdMask, deck, betAmount])

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

        {/* Action Buttons for dealt/result phases */}
        {phase === 'dealt' && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleDraw}
            className="w-full py-4 text-xl font-black rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#a78bfa] text-white shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] transition-shadow cursor-pointer"
          >
            DRAW
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
            balance={balance}
            betAmount={betAmount}
            onBetChange={setBetAmount}
            onPlay={handleDeal}
            disabled={false}
            playLabel="DEAL"
          />
        )}
      </div>
    </div>
  )
}
