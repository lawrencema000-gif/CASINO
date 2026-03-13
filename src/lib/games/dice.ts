import type { DiceResult } from '@/lib/types'

/**
 * Roll a dice using a provably fair RNG value (0-1).
 * Returns a value between 0.00 and 100.00 with 2 decimal precision.
 */
export function roll(rngValue: number): number {
  return Math.floor(rngValue * 10001) / 100
}

/**
 * Calculate the payout multiplier for a given target and direction.
 * Incorporates a 1% house edge.
 *
 * @param target - The target number (0-100)
 * @param isOver - true = win if roll > target, false = win if roll < target
 * @returns The payout multiplier
 */
export function calculateMultiplier(target: number, isOver: boolean): number {
  const winProbability = isOver ? (100 - target) / 100 : target / 100
  if (winProbability <= 0 || winProbability >= 1) return 0
  // Apply 1% house edge: raw multiplier * 0.99
  return Math.floor((0.99 / winProbability) * 100) / 100
}

/**
 * Check if a roll wins against the target.
 *
 * @param rollValue - The dice roll result (0-100)
 * @param target - The target number
 * @param isOver - true = win if roll > target
 * @returns Whether the roll is a win
 */
export function checkWin(
  rollValue: number,
  target: number,
  isOver: boolean
): boolean {
  return isOver ? rollValue > target : rollValue < target
}

/**
 * Play a full dice round.
 */
export function playDice(
  rngValue: number,
  bet: number,
  target: number,
  isOver: boolean
): DiceResult {
  const rollValue = roll(rngValue)
  const won = checkWin(rollValue, target, isOver)
  const multiplier = calculateMultiplier(target, isOver)
  const payout = won ? Math.floor(bet * multiplier * 100) / 100 : 0

  return {
    target,
    roll: rollValue,
    isOver,
    won,
    multiplier,
    payout,
  }
}
