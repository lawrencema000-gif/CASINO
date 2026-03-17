import crypto from 'crypto'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LimboResult {
  targetMultiplier: number
  crashPoint: number
  won: boolean
  multiplier: number
  payout: number
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Play a Limbo round.
 *
 * The player chooses a target multiplier (1.01x – 1000x).
 * The system generates a crash point using: result = 0.99 / random()
 * (capped at 1000x, giving ~1% house edge).
 *
 * If the crash point >= target, the player wins at the target multiplier.
 *
 * @param rngSeed - Combined provably-fair seed
 * @param bet - Wager amount
 * @param targetMultiplier - Player's target (1.01 – 1000)
 */
export function playLimbo(
  rngSeed: string,
  bet: number,
  targetMultiplier: number
): LimboResult {
  const hash = crypto.createHash('sha256').update(rngSeed).digest('hex')
  const roll = parseInt(hash.substring(0, 8), 16) / 0xffffffff

  // Crash point formula: 0.99 / roll, capped at 1000x
  // If roll is 0 (astronomically unlikely), treat as 1x
  const crashPoint = roll === 0
    ? 1
    : parseFloat(Math.min(0.99 / roll, 1000).toFixed(4))

  const won = crashPoint >= targetMultiplier
  const multiplier = won ? targetMultiplier : 0
  const payout = won ? Math.floor(bet * multiplier * 100) / 100 : 0

  return { targetMultiplier, crashPoint, won, multiplier, payout }
}
