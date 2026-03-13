export type CoinSide = 'heads' | 'tails'

/** Payout multiplier: 1.98x (1% house edge) */
export const COINFLIP_MULTIPLIER = 1.98

/**
 * Flip a coin using a provably fair RNG value (0-1).
 */
export function flip(rngValue: number): CoinSide {
  return rngValue < 0.5 ? 'heads' : 'tails'
}

/**
 * Play a full coinflip round.
 *
 * @param rngValue - Float 0-1 from the provably fair system
 * @param bet - Wager amount
 * @param choice - Player's choice
 * @returns Result with payout
 */
export function playCoinFlip(
  rngValue: number,
  bet: number,
  choice: CoinSide
): { result: CoinSide; won: boolean; payout: number } {
  const result = flip(rngValue)
  const won = result === choice
  const payout = won ? Math.floor(bet * COINFLIP_MULTIPLIER * 100) / 100 : 0
  return { result, won, payout }
}
