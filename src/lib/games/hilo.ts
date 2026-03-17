import crypto from 'crypto'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HiLoCard {
  suit: string
  rank: string
  value: number // 1 (Ace) through 13 (King)
}

export interface HiLoResult {
  currentCard: HiLoCard
  nextCard: HiLoCard
  guess: 'higher' | 'lower'
  won: boolean
  tied: boolean
  multiplier: number
  payout: number
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades']
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

function buildDeck(): HiLoCard[] {
  const deck: HiLoCard[] = []
  for (const suit of SUITS) {
    for (let i = 0; i < RANKS.length; i++) {
      deck.push({ suit, rank: RANKS[i], value: i + 1 })
    }
  }
  return deck
}

function shuffleDeck(deck: HiLoCard[], seed: string): HiLoCard[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const hash = crypto.createHash('sha256').update(`${seed}:shuffle:${i}`).digest('hex')
    const j = parseInt(hash.substring(0, 8), 16) % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Calculate the payout multiplier based on the current card value.
 *
 * The closer the card is to an edge (1 or 13), the lower the payout for
 * the obvious guess and the higher for the unlikely guess.
 *
 * Uses probability: chance of higher = (13 - value) / 12, lower = (value - 1) / 12
 * Multiplier = 0.97 / probability (house edge ~3%)
 *
 * Ties push (return bet).
 */
function calculateMultiplier(currentValue: number, guess: 'higher' | 'lower'): number {
  const HOUSE_EDGE = 0.97
  // Out of the remaining 51 cards in a full deck, count how many are strictly higher/lower.
  // Simplified model: treat cards 1-13 uniformly. 12 possible different values.
  const higherCount = 13 - currentValue // values strictly above
  const lowerCount = currentValue - 1   // values strictly below

  const relevantCount = guess === 'higher' ? higherCount : lowerCount
  if (relevantCount <= 0) return 0 // impossible guess

  const probability = relevantCount / 12
  return parseFloat((HOUSE_EDGE / probability).toFixed(4))
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Play a single Hi-Lo round.
 *
 * @param rngSeed - Combined provably-fair seed string
 * @param bet - Wager amount
 * @param guess - 'higher' or 'lower'
 */
export function playHiLo(
  rngSeed: string,
  bet: number,
  guess: 'higher' | 'lower'
): HiLoResult {
  const deck = shuffleDeck(buildDeck(), rngSeed)
  const currentCard = deck[0]
  const nextCard = deck[1]

  const tied = nextCard.value === currentCard.value
  const won = tied
    ? false
    : guess === 'higher'
      ? nextCard.value > currentCard.value
      : nextCard.value < currentCard.value

  const multiplier = tied ? 1 : won ? calculateMultiplier(currentCard.value, guess) : 0
  const payout = tied ? bet : won ? Math.floor(bet * multiplier * 100) / 100 : 0

  return { currentCard, nextCard, guess, won, tied, multiplier, payout }
}
