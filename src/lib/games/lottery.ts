import crypto from 'crypto'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LotteryResult {
  picks: number[]
  drawnNumbers: number[]
  matches: number
  won: boolean
  multiplier: number
  payout: number
}

// ---------------------------------------------------------------------------
// Payout table (matches → multiplier)
// House edge ~5%
// ---------------------------------------------------------------------------

export const LOTTERY_PAYOUTS: Record<number, number> = {
  0: 0,
  1: 1,     // break even
  2: 10,
  3: 500,
}

// ---------------------------------------------------------------------------
// Draw numbers
// ---------------------------------------------------------------------------

function drawNumbers(seed: string, count: number, max: number): number[] {
  const drawn: number[] = []
  for (let i = 0; i < count; i++) {
    const hash = crypto.createHash('sha256').update(`${seed}:draw:${i}`).digest('hex')
    let num = (parseInt(hash.substring(0, 8), 16) % max) + 1
    while (drawn.includes(num)) {
      num = (num % max) + 1
    }
    drawn.push(num)
  }
  return drawn
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Play a simple instant lottery round.
 *
 * Player picks 3 numbers from 1-30.
 * System draws 3 numbers.
 *  - 0 matches: lose
 *  - 1 match:   1x (break even)
 *  - 2 matches: 10x
 *  - 3 matches: 500x
 *
 * @param rngSeed - Combined provably-fair seed
 * @param bet - Wager amount
 * @param picks - Player's 3 chosen numbers (1-30)
 */
export function playLottery(
  rngSeed: string,
  bet: number,
  picks: number[]
): LotteryResult {
  const drawnNumbers = drawNumbers(rngSeed, 3, 30)
  const matches = picks.filter(p => drawnNumbers.includes(p)).length
  const multiplier = LOTTERY_PAYOUTS[matches] ?? 0
  const won = multiplier > 0
  const payout = won ? Math.floor(bet * multiplier * 100) / 100 : 0

  return { picks, drawnNumbers, matches, won, multiplier, payout }
}
