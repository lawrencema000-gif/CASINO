import crypto from 'crypto'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KenoResult {
  picks: number[]
  drawnNumbers: number[]
  hits: number
  won: boolean
  multiplier: number
  payout: number
}

// ---------------------------------------------------------------------------
// Payout table
//
// Key = number of picks, Value = map of hits → multiplier.
// House edge is built into the multipliers (~3-5%).
// ---------------------------------------------------------------------------

export const KENO_PAYOUTS: Record<number, Record<number, number>> = {
  1:  { 1: 3.5 },
  2:  { 2: 6 },
  3:  { 2: 2, 3: 25 },
  4:  { 2: 1.5, 3: 8, 4: 80 },
  5:  { 3: 2, 4: 12, 5: 75 },
  6:  { 3: 2, 4: 5, 5: 50, 6: 500 },
  7:  { 3: 1.5, 4: 3, 5: 15, 6: 100, 7: 1000 },
  8:  { 4: 2, 5: 8, 6: 50, 7: 250, 8: 2000 },
  9:  { 4: 1.5, 5: 5, 6: 25, 7: 100, 8: 500, 9: 3000 },
  10: { 5: 2, 6: 15, 7: 50, 8: 200, 9: 1000, 10: 5000 },
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
 * Play a Keno round.
 *
 * @param rngSeed - Combined provably-fair seed
 * @param bet - Wager amount
 * @param picks - Player's chosen numbers (1-10 numbers, each 1-40)
 */
export function playKeno(
  rngSeed: string,
  bet: number,
  picks: number[]
): KenoResult {
  const numPicks = picks.length
  const drawnNumbers = drawNumbers(rngSeed, 10, 40)
  const hits = picks.filter(p => drawnNumbers.includes(p)).length

  const tableKey = numPicks in KENO_PAYOUTS ? numPicks : 10
  const multiplier = KENO_PAYOUTS[tableKey]?.[hits] ?? 0
  const won = multiplier > 0
  const payout = won ? Math.floor(bet * multiplier * 100) / 100 : 0

  return { picks, drawnNumbers, hits, won, multiplier, payout }
}
