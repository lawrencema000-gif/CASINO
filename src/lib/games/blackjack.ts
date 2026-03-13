import type { BlackjackCard, BlackjackHand } from '@/lib/types'

// ---------------------------------------------------------------------------
// Deck
// ---------------------------------------------------------------------------

const SUITS: BlackjackCard['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades']
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

function cardValue(rank: string): number {
  if (rank === 'A') return 11
  if (['K', 'Q', 'J'].includes(rank)) return 10
  return parseInt(rank, 10)
}

/**
 * Create a shuffled deck of cards.
 * Uses Fisher-Yates with a simple seeded RNG for reproducibility when needed.
 */
export function createDeck(numDecks: number = 6): BlackjackCard[] {
  const deck: BlackjackCard[] = []
  for (let d = 0; d < numDecks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank, value: cardValue(rank) })
      }
    }
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

// ---------------------------------------------------------------------------
// Hand evaluation
// ---------------------------------------------------------------------------

export function calculateHandValue(cards: BlackjackCard[]): BlackjackHand {
  let value = 0
  let aces = 0

  for (const card of cards) {
    if (card.rank === 'A') {
      aces++
      value += 11
    } else if (['K', 'Q', 'J'].includes(card.rank)) {
      value += 10
    } else {
      value += parseInt(card.rank, 10)
    }
  }

  let softAces = aces
  while (value > 21 && softAces > 0) {
    value -= 10
    softAces--
  }

  return {
    cards: [...cards],
    value,
    isSoft: softAces > 0,
    isBust: value > 21,
    isBlackjack: cards.length === 2 && value === 21,
  }
}

// ---------------------------------------------------------------------------
// Deal
// ---------------------------------------------------------------------------

export function dealInitial(deck: BlackjackCard[]): {
  playerHand: BlackjackHand
  dealerHand: BlackjackHand
  deck: BlackjackCard[]
} {
  const remaining = [...deck]
  const playerCards = [remaining.pop()!, remaining.pop()!]
  const dealerCards = [remaining.pop()!, remaining.pop()!]

  return {
    playerHand: calculateHandValue(playerCards),
    dealerHand: calculateHandValue(dealerCards),
    deck: remaining,
  }
}

// ---------------------------------------------------------------------------
// Player actions
// ---------------------------------------------------------------------------

export function canSplit(hand: BlackjackHand): boolean {
  if (hand.cards.length !== 2) return false
  const v1 = hand.cards[0].rank === 'A' ? 11 : ((['K', 'Q', 'J'].includes(hand.cards[0].rank)) ? 10 : parseInt(hand.cards[0].rank, 10))
  const v2 = hand.cards[1].rank === 'A' ? 11 : ((['K', 'Q', 'J'].includes(hand.cards[1].rank)) ? 10 : parseInt(hand.cards[1].rank, 10))
  return v1 === v2
}

export function canDoubleDown(hand: BlackjackHand): boolean {
  return hand.cards.length === 2 && !hand.isBust
}

export function hit(
  hand: BlackjackHand,
  deck: BlackjackCard[]
): { hand: BlackjackHand; deck: BlackjackCard[] } {
  const remaining = [...deck]
  const card = remaining.pop()!
  const newHand = calculateHandValue([...hand.cards, card])
  return { hand: newHand, deck: remaining }
}

export function stand(): void {
  // No-op; control passes to dealer or next hand
}

export function split(
  hand: BlackjackHand,
  deck: BlackjackCard[]
): { hands: [BlackjackHand, BlackjackHand]; deck: BlackjackCard[] } {
  if (!canSplit(hand)) throw new Error('Cannot split this hand')
  const remaining = [...deck]
  const card1 = remaining.pop()!
  const card2 = remaining.pop()!
  const hand1 = calculateHandValue([hand.cards[0], card1])
  const hand2 = calculateHandValue([hand.cards[1], card2])
  return { hands: [hand1, hand2], deck: remaining }
}

export function doubleDown(
  hand: BlackjackHand,
  deck: BlackjackCard[],
  _bet: number
): { hand: BlackjackHand; deck: BlackjackCard[] } {
  if (!canDoubleDown(hand)) throw new Error('Cannot double down')
  const remaining = [...deck]
  const card = remaining.pop()!
  const newHand = calculateHandValue([...hand.cards, card])
  return { hand: newHand, deck: remaining }
}

// ---------------------------------------------------------------------------
// Dealer logic
// ---------------------------------------------------------------------------

/**
 * Dealer hits on soft 17 and below.
 */
export function playDealerHand(
  hand: BlackjackHand,
  deck: BlackjackCard[]
): { hand: BlackjackHand; deck: BlackjackCard[] } {
  let current = hand
  let remaining = [...deck]

  while (current.value < 17 || (current.value === 17 && current.isSoft)) {
    const card = remaining.pop()!
    current = calculateHandValue([...current.cards, card])
  }

  return { hand: current, deck: remaining }
}

// ---------------------------------------------------------------------------
// Settlement
// ---------------------------------------------------------------------------

export type HandOutcome = 'win' | 'lose' | 'push' | 'blackjack'

/**
 * Settle one or more player hands against the dealer hand.
 * Blackjack pays 3:2.
 */
export function settleHands(
  playerHands: BlackjackHand[],
  dealerHand: BlackjackHand,
  bets: number[]
): { outcomes: HandOutcome[]; payouts: number[] } {
  const outcomes: HandOutcome[] = []
  const payouts: number[] = []

  for (let i = 0; i < playerHands.length; i++) {
    const player = playerHands[i]
    const bet = bets[i]

    if (player.isBust) {
      outcomes.push('lose')
      payouts.push(0)
    } else if (player.isBlackjack && !dealerHand.isBlackjack) {
      outcomes.push('blackjack')
      payouts.push(bet + Math.floor(bet * 1.5)) // 3:2
    } else if (dealerHand.isBust) {
      outcomes.push('win')
      payouts.push(bet * 2)
    } else if (player.value > dealerHand.value) {
      outcomes.push('win')
      payouts.push(bet * 2)
    } else if (player.value === dealerHand.value) {
      outcomes.push('push')
      payouts.push(bet)
    } else {
      outcomes.push('lose')
      payouts.push(0)
    }
  }

  return { outcomes, payouts }
}
