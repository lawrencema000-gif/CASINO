import type { RouletteBet } from '@/lib/types'

// ---------------------------------------------------------------------------
// European Roulette Numbers (0-36)
// ---------------------------------------------------------------------------

export interface RouletteNumber {
  number: number
  color: 'red' | 'black' | 'green'
}

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
])

export const ROULETTE_NUMBERS: RouletteNumber[] = Array.from(
  { length: 37 },
  (_, i) => ({
    number: i,
    color: i === 0 ? 'green' : RED_NUMBERS.has(i) ? 'red' : 'black',
  })
)

// ---------------------------------------------------------------------------
// Spin
// ---------------------------------------------------------------------------

/**
 * Spin the roulette wheel using a provably fair RNG value (0-1).
 */
export function spin(rngValue: number): RouletteNumber {
  const idx = Math.floor(rngValue * 37)
  return ROULETTE_NUMBERS[idx]
}

// ---------------------------------------------------------------------------
// Bet payout calculation
// ---------------------------------------------------------------------------

const BET_PAYOUTS: Record<string, number> = {
  straight: 35,
  split: 17,
  street: 11,
  corner: 8,
  line: 5,
  dozen: 2,
  column: 2,
  red: 1,
  black: 1,
  odd: 1,
  even: 1,
  high: 1,
  low: 1,
}

function isWinningBet(
  bet: RouletteBet,
  result: RouletteNumber
): boolean {
  const n = result.number
  const v = bet.value

  switch (bet.type) {
    case 'straight':
      return n === Number(v)
    case 'split': {
      const nums = String(v).split(',').map(Number)
      return nums.includes(n)
    }
    case 'street': {
      const start = (Number(v) - 1) * 3 + 1
      return n >= start && n <= start + 2
    }
    case 'corner': {
      const nums = String(v).split(',').map(Number)
      return nums.includes(n)
    }
    case 'line': {
      const start = (Number(v) - 1) * 3 + 1
      return n >= start && n <= start + 5
    }
    case 'dozen': {
      if (n === 0) return false
      const dozen = Math.ceil(n / 12)
      return dozen === Number(v)
    }
    case 'column': {
      if (n === 0) return false
      const col = ((n - 1) % 3) + 1
      return col === Number(v)
    }
    case 'red':
      return result.color === 'red'
    case 'black':
      return result.color === 'black'
    case 'odd':
      return n !== 0 && n % 2 === 1
    case 'even':
      return n !== 0 && n % 2 === 0
    case 'high':
      return n >= 19 && n <= 36
    case 'low':
      return n >= 1 && n <= 18
    default:
      return false
  }
}

/**
 * Calculate the payout for a single bet given the roulette result.
 */
export function calculateBetPayout(
  bet: RouletteBet,
  result: RouletteNumber
): number {
  if (!isWinningBet(bet, result)) return 0
  const multiplier = BET_PAYOUTS[bet.type] ?? 0
  // Payout includes original bet back + winnings
  return bet.amount + bet.amount * multiplier
}
