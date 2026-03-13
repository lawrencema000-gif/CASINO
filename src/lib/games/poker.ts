import type { BlackjackCard } from '@/lib/types'

// We reuse BlackjackCard for simplicity (suit + rank + value).
// In video poker context, value is the face value for hand evaluation.

type Card = BlackjackCard

// ---------------------------------------------------------------------------
// Hand rankings with pay table (Jacks or Better)
// ---------------------------------------------------------------------------

export interface HandRanking {
  name: string
  payout: number // multiplier on bet
  rank: number   // higher = better
}

export const HAND_RANKINGS: HandRanking[] = [
  { name: 'Royal Flush', payout: 800, rank: 9 },
  { name: 'Straight Flush', payout: 50, rank: 8 },
  { name: 'Four of a Kind', payout: 25, rank: 7 },
  { name: 'Full House', payout: 9, rank: 6 },
  { name: 'Flush', payout: 6, rank: 5 },
  { name: 'Straight', payout: 4, rank: 4 },
  { name: 'Three of a Kind', payout: 3, rank: 3 },
  { name: 'Two Pair', payout: 2, rank: 2 },
  { name: 'Jacks or Better', payout: 1, rank: 1 },
  { name: 'Nothing', payout: 0, rank: 0 },
]

// ---------------------------------------------------------------------------
// Deck helpers
// ---------------------------------------------------------------------------

const SUITS: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades']
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

function rankValue(rank: string): number {
  const idx = RANKS.indexOf(rank)
  return idx + 2 // '2' = 2, ..., 'A' = 14
}

function createFullDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, value: rankValue(rank) })
    }
  }
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

// ---------------------------------------------------------------------------
// Deal and redraw
// ---------------------------------------------------------------------------

/**
 * Deal 5 cards from the deck.
 */
export function deal(deck: Card[]): { hand: Card[]; deck: Card[] } {
  const remaining = [...deck]
  const hand = remaining.splice(0, 5)
  return { hand, deck: remaining }
}

/**
 * Redraw cards not held.
 * holdMask is an array of 5 booleans; true = keep, false = replace.
 */
export function redraw(
  hand: Card[],
  holdMask: boolean[],
  deck: Card[]
): { hand: Card[]; deck: Card[] } {
  const remaining = [...deck]
  const newHand = hand.map((card, i) => {
    if (holdMask[i]) return card
    return remaining.shift()!
  })
  return { hand: newHand, deck: remaining }
}

// ---------------------------------------------------------------------------
// Hand evaluation
// ---------------------------------------------------------------------------

export function evaluateHand(cards: Card[]): HandRanking {
  if (cards.length !== 5) {
    return HAND_RANKINGS[HAND_RANKINGS.length - 1] // Nothing
  }

  const values = cards.map((c) => rankValue(c.rank)).sort((a, b) => a - b)
  const suits = cards.map((c) => c.suit)

  const isFlush = suits.every((s) => s === suits[0])

  // Check straight (including A-low: A,2,3,4,5)
  let isStraight = false
  const uniqueValues = [...new Set(values)]
  if (uniqueValues.length === 5) {
    if (values[4] - values[0] === 4) {
      isStraight = true
    }
    // Ace-low straight: A(14), 2, 3, 4, 5
    if (
      values[0] === 2 &&
      values[1] === 3 &&
      values[2] === 4 &&
      values[3] === 5 &&
      values[4] === 14
    ) {
      isStraight = true
    }
  }

  // Count occurrences of each value
  const counts: Record<number, number> = {}
  for (const v of values) {
    counts[v] = (counts[v] || 0) + 1
  }
  const countValues = Object.values(counts).sort((a, b) => b - a)

  // Royal Flush
  if (
    isFlush &&
    isStraight &&
    values[0] === 10 &&
    values[4] === 14
  ) {
    return HAND_RANKINGS[0]
  }

  // Straight Flush
  if (isFlush && isStraight) {
    return HAND_RANKINGS[1]
  }

  // Four of a Kind
  if (countValues[0] === 4) {
    return HAND_RANKINGS[2]
  }

  // Full House
  if (countValues[0] === 3 && countValues[1] === 2) {
    return HAND_RANKINGS[3]
  }

  // Flush
  if (isFlush) {
    return HAND_RANKINGS[4]
  }

  // Straight
  if (isStraight) {
    return HAND_RANKINGS[5]
  }

  // Three of a Kind
  if (countValues[0] === 3) {
    return HAND_RANKINGS[6]
  }

  // Two Pair
  if (countValues[0] === 2 && countValues[1] === 2) {
    return HAND_RANKINGS[7]
  }

  // Jacks or Better (pair of J, Q, K, or A)
  if (countValues[0] === 2) {
    const pairValue = Number(
      Object.entries(counts).find(([, c]) => c === 2)?.[0]
    )
    if (pairValue >= 11) {
      return HAND_RANKINGS[8]
    }
  }

  // Nothing
  return HAND_RANKINGS[9]
}

/**
 * Create a fresh shuffled deck for video poker.
 */
export { createFullDeck }
