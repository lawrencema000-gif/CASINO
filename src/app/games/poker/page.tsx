'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw, Trophy, XCircle, ArrowUp, Check } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { useGame } from '@/hooks/useGame'
import { useAuth } from '@/hooks/useAuth'
import { useBalance } from '@/hooks/useBalance'

type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'

interface PlayingCard {
  rank: Rank
  suit: Suit
  faceUp: boolean
}

type Stage = 'IDLE' | 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN'

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14,
}

const suitSymbol: Record<Suit, string> = {
  spades: '\u2660', hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663',
}

const suitColor: Record<Suit, string> = {
  spades: 'text-white', hearts: 'text-red-500', diamonds: 'text-red-500', clubs: 'text-white',
}

function createDeck(): PlayingCard[] {
  const deck: PlayingCard[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, faceUp: false })
    }
  }
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function evaluateHand(cards: PlayingCard[]): { rank: number; name: string } {
  if (cards.length < 5) return { rank: 0, name: 'High Card' }

  const sorted = [...cards].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank])
  const values = sorted.map((c) => RANK_VALUES[c.rank])
  const suits = sorted.map((c) => c.suit)

  const isFlush = suits.filter((s) => s === suits[0]).length >= 5
  const uniqueValues = [...new Set(values)].sort((a, b) => b - a)
  const isStraight = uniqueValues.length >= 5 && uniqueValues[0] - uniqueValues[4] === 4

  const counts: Record<number, number> = {}
  values.forEach((v) => { counts[v] = (counts[v] || 0) + 1 })
  const countValues = Object.values(counts).sort((a, b) => b - a)

  if (isFlush && isStraight && uniqueValues[0] === 14) return { rank: 9, name: 'Royal Flush' }
  if (isFlush && isStraight) return { rank: 8, name: 'Straight Flush' }
  if (countValues[0] === 4) {
    const quadRank = Object.entries(counts).find(([, c]) => c === 4)?.[0]
    return { rank: 7, name: `Four of a Kind (${rankName(Number(quadRank))})` }
  }
  if (countValues[0] === 3 && countValues[1] >= 2) {
    const tripRank = Object.entries(counts).find(([, c]) => c === 3)?.[0]
    return { rank: 6, name: `Full House (${rankName(Number(tripRank))}s Full)` }
  }
  if (isFlush) return { rank: 5, name: 'Flush' }
  if (isStraight) return { rank: 4, name: 'Straight' }
  if (countValues[0] === 3) {
    const tripRank = Object.entries(counts).find(([, c]) => c === 3)?.[0]
    return { rank: 3, name: `Three of a Kind (${rankName(Number(tripRank))})` }
  }
  if (countValues[0] === 2 && countValues[1] === 2) {
    return { rank: 2, name: 'Two Pair' }
  }
  if (countValues[0] === 2) {
    const pairRank = Object.entries(counts).find(([, c]) => c === 2)?.[0]
    return { rank: 1, name: `Pair of ${rankName(Number(pairRank))}s` }
  }
  return { rank: 0, name: `High Card (${rankName(values[0])})` }
}

function rankName(v: number): string {
  if (v === 14) return 'Ace'
  if (v === 13) return 'King'
  if (v === 12) return 'Queen'
  if (v === 11) return 'Jack'
  return String(v)
}

function CardComponent({ card, delay = 0, small = false }: { card: PlayingCard | null; delay?: number; small?: boolean }) {
  if (!card) {
    return (
      <div className={cn(
        'rounded-xl border-2 border-dashed border-[var(--casino-border)] bg-[var(--casino-surface)]/50',
        small ? 'w-14 h-20' : 'w-20 h-28 sm:w-24 sm:h-32'
      )} />
    )
  }

  return (
    <motion.div
      initial={{ rotateY: 180, scale: 0.8 }}
      animate={{ rotateY: card.faceUp ? 0 : 180, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      className="perspective-500"
    >
      <div
        className={cn(
          'relative rounded-xl overflow-hidden transition-shadow duration-300',
          small ? 'w-14 h-20' : 'w-20 h-28 sm:w-24 sm:h-32',
          card.faceUp ? 'shadow-lg' : ''
        )}
      >
        {card.faceUp ? (
          <div className="w-full h-full bg-white rounded-xl flex flex-col items-center justify-between p-1.5 sm:p-2">
            <div className={cn('self-start text-xs sm:text-sm font-bold', suitColor[card.suit])}>
              {card.rank}
              <div className="text-[10px] sm:text-xs leading-none">{suitSymbol[card.suit]}</div>
            </div>
            <div className={cn('text-2xl sm:text-4xl', suitColor[card.suit])}>
              {suitSymbol[card.suit]}
            </div>
            <div className={cn('self-end rotate-180 text-xs sm:text-sm font-bold', suitColor[card.suit])}>
              {card.rank}
              <div className="text-[10px] sm:text-xs leading-none">{suitSymbol[card.suit]}</div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full rounded-xl bg-gradient-to-br from-[#1a1a6e] via-[#2d1b69] to-[#1a1a6e] border-2 border-[#3d2b89] flex items-center justify-center">
            <div className="w-[80%] h-[85%] rounded-lg border border-[#4a3a99] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PHBhdGggZD0iTTAgMGwxMCAxME0xMCAwTDAgMTAiIHN0cm9rZT0iIzRhM2E5OSIgc3Ryb2tlLXdpZHRoPSIuNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNhKSIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIi8+PC9zdmc+')] opacity-30" />
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function PokerPage() {
  const { user } = useAuth()
  const { balance, refreshBalance } = useBalance(user?.id)
  const { placeBet, gameAction, resetGame, loading: gameLoading, error } = useGame(() => refreshBalance())

  const [stage, setStage] = useState<Stage>('IDLE')
  const [deck, setDeck] = useState<PlayingCard[]>([])
  const [playerCards, setPlayerCards] = useState<PlayingCard[]>([])
  const [dealerCards, setDealerCards] = useState<PlayingCard[]>([])
  const [communityCards, setCommunityCards] = useState<PlayingCard[]>([])
  const [pot, setPot] = useState(0)
  const [ante, setAnte] = useState(100)
  const [winner, setWinner] = useState<'player' | 'dealer' | 'tie' | null>(null)
  const [playerHandName, setPlayerHandName] = useState('')
  const [dealerHandName, setDealerHandName] = useState('')
  const [resultPayout, setResultPayout] = useState(0)

  const presetAntes = [50, 100, 250, 500, 1000]

  const dealNewHand = useCallback(async () => {
    if (ante > balance || ante <= 0) return

    await placeBet({
      gameType: 'poker' as any,
      betAmount: ante,
      gameData: { action: 'deal' },
    })

    const newDeck = createDeck()
    const pCards = [
      { ...newDeck[0], faceUp: true },
      { ...newDeck[1], faceUp: true },
    ]
    const dCards = [
      { ...newDeck[2], faceUp: false },
      { ...newDeck[3], faceUp: false },
    ]
    const community = [
      newDeck[4], newDeck[5], newDeck[6], newDeck[7], newDeck[8],
    ]

    setDeck(newDeck)
    setPlayerCards(pCards)
    setDealerCards(dCards)
    setCommunityCards([])
    setPot(ante * 2)
    setStage('PREFLOP')
    setWinner(null)
    setPlayerHandName('')
    setDealerHandName('')
    setResultPayout(0)
  }, [ante, balance, placeBet])

  const advanceStage = useCallback((action: 'check' | 'raise2x' | 'raise3x' | 'allin') => {
    let addToPot = 0
    if (action === 'raise2x') addToPot = ante
    if (action === 'raise3x') addToPot = ante * 2
    if (action === 'allin') addToPot = Math.min(balance, pot * 2)
    setPot((p) => p + addToPot)

    const nextStage = (): Stage => {
      switch (stage) {
        case 'PREFLOP': return 'FLOP'
        case 'FLOP': return 'TURN'
        case 'TURN': return 'RIVER'
        case 'RIVER': return 'SHOWDOWN'
        default: return 'SHOWDOWN'
      }
    }

    const next = nextStage()
    setStage(next)

    if (next === 'FLOP') {
      setCommunityCards([
        { ...deck[4], faceUp: true },
        { ...deck[5], faceUp: true },
        { ...deck[6], faceUp: true },
      ])
    } else if (next === 'TURN') {
      setCommunityCards((prev) => [
        ...prev,
        { ...deck[7], faceUp: true },
      ])
    } else if (next === 'RIVER') {
      setCommunityCards((prev) => [
        ...prev,
        { ...deck[8], faceUp: true },
      ])
    } else if (next === 'SHOWDOWN') {
      handleShowdown()
    }
  }, [stage, deck, ante, balance, pot])

  const handleShowdown = useCallback(() => {
    const revealedDealer = dealerCards.map((c) => ({ ...c, faceUp: true }))
    setDealerCards(revealedDealer)

    const finalCommunity = [
      { ...deck[4], faceUp: true },
      { ...deck[5], faceUp: true },
      { ...deck[6], faceUp: true },
      { ...deck[7], faceUp: true },
      { ...deck[8], faceUp: true },
    ]
    setCommunityCards(finalCommunity)

    const allPlayerCards = [...playerCards, ...finalCommunity]
    const allDealerCards = [...revealedDealer, ...finalCommunity]

    const pHand = evaluateHand(allPlayerCards)
    const dHand = evaluateHand(allDealerCards)

    setPlayerHandName(pHand.name)
    setDealerHandName(dHand.name)

    if (pHand.rank > dHand.rank) {
      setWinner('player')
      setResultPayout(pot)
    } else if (dHand.rank > pHand.rank) {
      setWinner('dealer')
      setResultPayout(0)
    } else {
      setWinner('tie')
      setResultPayout(Math.floor(pot / 2))
    }
  }, [dealerCards, playerCards, deck, pot])

  const fold = useCallback(() => {
    setWinner('dealer')
    setResultPayout(0)
    setStage('SHOWDOWN')
    setDealerCards((prev) => prev.map((c) => ({ ...c, faceUp: true })))
  }, [])

  const newGame = useCallback(() => {
    setStage('IDLE')
    setPlayerCards([])
    setDealerCards([])
    setCommunityCards([])
    setPot(0)
    setWinner(null)
    setPlayerHandName('')
    setDealerHandName('')
    setResultPayout(0)
    resetGame()
  }, [resetGame])

  const communitySlots = useMemo(() => {
    const slots: (PlayingCard | null)[] = [...communityCards]
    while (slots.length < 5) slots.push(null)
    return slots
  }, [communityCards])

  return (
    <div className="space-y-6">
      {/* Table */}
      <Card className="relative overflow-hidden" hover={false}>
        <div
          className="relative min-h-[500px] sm:min-h-[550px] rounded-2xl overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse at center, #1a5c2e 0%, #0d3d1a 50%, #0a2e14 100%)',
            boxShadow: 'inset 0 0 100px rgba(0,0,0,0.3)',
          }}
        >
          {/* Table border */}
          <div className="absolute inset-2 rounded-[2rem] border-4 border-[#2a7a3e]/40 pointer-events-none" />

          {/* Pot Display */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
            animate={{ y: pot > 0 ? 0 : 10, opacity: pot > 0 ? 1 : 0 }}
          >
            <div className="bg-black/60 backdrop-blur-sm rounded-full px-6 py-2 border border-[var(--casino-accent)]/30">
              <span className="text-[var(--casino-accent)] font-bold text-lg">
                POT: ${pot.toLocaleString()}
              </span>
            </div>
          </motion.div>

          {/* Dealer Cards (top) */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-3">
            <div className="text-center mb-2">
              <span className="text-xs text-white/60 uppercase tracking-wider">Dealer</span>
            </div>
          </div>
          <div className="absolute top-12 left-1/2 -translate-x-1/2 flex gap-3">
            {dealerCards.map((card, i) => (
              <CardComponent key={i} card={card} delay={i * 0.15} />
            ))}
            {dealerCards.length === 0 && (
              <>
                <CardComponent card={null} />
                <CardComponent card={null} />
              </>
            )}
          </div>
          {stage === 'SHOWDOWN' && dealerHandName && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-44 sm:top-48 left-1/2 -translate-x-1/2"
            >
              <span className="bg-black/70 text-white text-xs px-3 py-1 rounded-full">
                {dealerHandName}
              </span>
            </motion.div>
          )}

          {/* Community Cards (center) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-6">
            <div className="flex gap-2 sm:gap-3">
              {communitySlots.map((card, i) => (
                <CardComponent key={i} card={card} delay={i * 0.2} />
              ))}
            </div>
          </div>

          {/* Player Cards (bottom) */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-3">
            {playerCards.map((card, i) => (
              <CardComponent key={i} card={card} delay={i * 0.15 + 0.3} />
            ))}
            {playerCards.length === 0 && (
              <>
                <CardComponent card={null} />
                <CardComponent card={null} />
              </>
            )}
          </div>
          {playerHandName && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-12 left-1/2 -translate-x-1/2"
            >
              <span className="bg-[var(--casino-accent)]/90 text-black text-xs font-bold px-3 py-1 rounded-full">
                {playerHandName}
              </span>
            </motion.div>
          )}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <span className="text-xs text-white/60 uppercase tracking-wider">You</span>
          </div>

          {/* Winner Overlay */}
          <AnimatePresence>
            {winner && stage === 'SHOWDOWN' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center z-30 bg-black/50 backdrop-blur-sm"
              >
                <div className="text-center">
                  {winner === 'player' ? (
                    <>
                      <Trophy className="w-16 h-16 text-[var(--casino-accent)] mx-auto mb-3" />
                      <h2 className="text-3xl font-bold text-[var(--casino-accent)] mb-2">YOU WIN!</h2>
                      <p className="text-xl text-[var(--casino-green)] font-bold">+${resultPayout.toLocaleString()}</p>
                    </>
                  ) : winner === 'dealer' ? (
                    <>
                      <XCircle className="w-16 h-16 text-[var(--casino-red)] mx-auto mb-3" />
                      <h2 className="text-3xl font-bold text-[var(--casino-red)] mb-2">DEALER WINS</h2>
                      <p className="text-lg text-[var(--casino-text-muted)]">Better luck next time</p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-3xl font-bold text-white mb-2">PUSH</h2>
                      <p className="text-lg text-[var(--casino-text-muted)]">It&apos;s a tie! Pot split.</p>
                    </>
                  )}
                  <Button variant="primary" className="mt-6" onClick={newGame} icon={<RotateCcw className="w-4 h-4" />}>
                    New Hand
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ante / Deal */}
        <Card hover={false} glow="gold">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--casino-text-muted)]">
              {stage === 'IDLE' ? 'Ante' : 'Current Ante'}
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={ante}
                onChange={(e) => setAnte(Math.max(0, Number(e.target.value)))}
                disabled={stage !== 'IDLE'}
                className="flex-1 bg-[var(--casino-surface)] border border-[var(--casino-border)] rounded-xl px-4 py-2.5 text-white font-mono text-lg focus:outline-none focus:border-[var(--casino-accent)] disabled:opacity-50 transition-colors"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {presetAntes.map((a) => (
                <button
                  key={a}
                  onClick={() => stage === 'IDLE' && setAnte(a)}
                  disabled={stage !== 'IDLE'}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-50',
                    ante === a
                      ? 'bg-[var(--casino-accent)] text-black'
                      : 'bg-[var(--casino-surface)] text-[var(--casino-text-muted)] border border-[var(--casino-border)]'
                  )}
                >
                  ${a}
                </button>
              ))}
            </div>
            {stage === 'IDLE' && (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={dealNewHand}
                loading={gameLoading}
                disabled={ante <= 0 || ante > balance}
              >
                DEAL
              </Button>
            )}
            {error && <p className="text-xs text-[var(--casino-red)]">{error}</p>}
          </div>
        </Card>

        {/* Actions */}
        <Card hover={false} glow="purple">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--casino-text-muted)]">
              Actions {stage !== 'IDLE' && stage !== 'SHOWDOWN' && `- ${stage}`}
            </h3>
            {stage !== 'IDLE' && stage !== 'SHOWDOWN' ? (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="danger" onClick={fold} icon={<XCircle className="w-4 h-4" />}>
                  FOLD
                </Button>
                <Button variant="ghost" onClick={() => advanceStage('check')} icon={<Check className="w-4 h-4" />}>
                  CHECK
                </Button>
                <Button variant="secondary" onClick={() => advanceStage('raise2x')} icon={<ArrowUp className="w-4 h-4" />}>
                  RAISE 2x
                </Button>
                <Button variant="secondary" onClick={() => advanceStage('raise3x')} icon={<ArrowUp className="w-4 h-4" />}>
                  RAISE 3x
                </Button>
                <Button
                  variant="success"
                  className="col-span-2"
                  onClick={() => advanceStage('allin')}
                >
                  ALL IN
                </Button>
              </div>
            ) : stage === 'SHOWDOWN' ? (
              <div className="text-center py-4">
                <p className="text-[var(--casino-text-muted)] text-sm mb-3">Hand complete</p>
                <Button variant="primary" onClick={newGame} icon={<RotateCcw className="w-4 h-4" />}>
                  New Hand
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-[var(--casino-text-muted)] text-sm">Place your ante and deal to start</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Stage Indicator */}
      <Card hover={false}>
        <div className="flex items-center justify-center gap-2">
          {(['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'] as Stage[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  stage === s
                    ? 'bg-[var(--casino-accent)] text-black scale-110'
                    : (['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'].indexOf(stage) > i)
                    ? 'bg-[var(--casino-green)]/30 text-[var(--casino-green)]'
                    : 'bg-[var(--casino-surface)] text-[var(--casino-text-muted)]'
                )}
              >
                {i + 1}
              </div>
              {i < 4 && (
                <div
                  className={cn(
                    'w-6 sm:w-10 h-0.5',
                    (['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'].indexOf(stage) > i)
                      ? 'bg-[var(--casino-green)]/40'
                      : 'bg-[var(--casino-border)]'
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 mt-2">
          {(['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'] as Stage[]).map((s) => (
            <span key={s} className="text-[9px] sm:text-[10px] text-[var(--casino-text-muted)] w-14 sm:w-20 text-center">
              {s}
            </span>
          ))}
        </div>
      </Card>
    </div>
  )
}
