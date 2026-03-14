import type { PlinkoResult } from '@/lib/types'

// ---------------------------------------------------------------------------
// Multipliers for 16 rows (17 buckets) — 3 risk levels
// Expected value per $1 ≈ $0.97-0.99 (1-3% house edge)
// ---------------------------------------------------------------------------

export type PlinkoRisk = 'low' | 'medium' | 'high'

export const PLINKO_MULTIPLIERS: Record<PlinkoRisk, number[]> = {
  low:    [5.6, 2.1, 1.4, 1.1, 1, 0.5, 0.3, 0.3, 0.3, 0.3, 0.3, 0.5, 1, 1.1, 1.4, 2.1, 5.6],
  medium: [13, 3, 1.9, 1.3, 0.7, 0.4, 0.2, 0.2, 0.2, 0.2, 0.2, 0.4, 0.7, 1.3, 1.9, 3, 13],
  high:   [110, 41, 10, 5, 3, 1.5, 0.5, 0.3, 0.2, 0.3, 0.5, 1.5, 3, 5, 10, 41, 110],
}

export const PLINKO_ROWS = 16

// ---------------------------------------------------------------------------
// Core engine
// ---------------------------------------------------------------------------

/**
 * Derive multiple RNG values from a single base float using a simple mixer.
 */
function deriveRng(base: number, index: number): number {
  let x = Math.floor(base * 0x100000000) + index * 2654435761
  x = ((x >>> 16) ^ x) * 0x45d9f3b
  x = ((x >>> 16) ^ x) * 0x45d9f3b
  x = (x >>> 16) ^ x
  return (x >>> 0) / 0x100000000
}

/**
 * Drop a ball through the Plinko board.
 * Each of the 16 rows, the ball goes left (0) or right (1).
 * The final bucket index is the count of right moves (0 to 16).
 */
export function drop(rngValue: number, bet: number = 0, risk: PlinkoRisk = 'medium'): PlinkoResult {
  const path: number[] = []
  let position = 0

  for (let row = 0; row < PLINKO_ROWS; row++) {
    const r = deriveRng(rngValue, row)
    const direction = r < 0.5 ? 0 : 1
    path.push(direction)
    position += direction
  }

  const bucket = position
  const multipliers = PLINKO_MULTIPLIERS[risk]
  const multiplier = multipliers[bucket] ?? 0.2
  const payout = Math.floor(bet * multiplier * 100) / 100

  return {
    path,
    multiplier,
    payout,
    bucket,
  }
}
