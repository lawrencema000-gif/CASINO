// ============================================================================
// Dice Engine - Ported from Dice.sol
// Roll 1-100, bet over/under a target number
// ============================================================================

import { DiceConfig, DiceResult } from './types';
import {
  hashSeed,
  seedToInt,
  calculatePayout,
  hashServerSeed,
} from './casino-math';

// ---------------------------------------------------------------------------
// Default Configuration
// ---------------------------------------------------------------------------

export const DEFAULT_DICE_CONFIG: DiceConfig = {
  minTarget: 2,
  maxTarget: 98,
  houseEdgeBps: 100, // 1% house edge
};

// ---------------------------------------------------------------------------
// Core Engine
// ---------------------------------------------------------------------------

/**
 * Roll the dice deterministically.
 * Returns a number 1-100.
 */
export function roll(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): number {
  const hash = hashSeed(serverSeed, clientSeed, nonce);
  return seedToInt(hash, 99) + 1; // 1-100
}

/**
 * Calculate the payout multiplier for a given target and direction.
 * Based on probability: multiplier = (100 / winChance) - houseEdge
 *
 * @param target - The target number (1-100)
 * @param rollUnder - true = win if roll < target, false = win if roll > target
 * @param houseEdgeBps - House edge in basis points (default 100 = 1%)
 * @returns Multiplier in basis points (10000 = 1x)
 */
export function calculateMultiplier(
  target: number,
  rollUnder: boolean,
  houseEdgeBps: number = DEFAULT_DICE_CONFIG.houseEdgeBps
): number {
  const winChance = getWinChance(target, rollUnder);
  if (winChance <= 0 || winChance >= 100) return 0;

  // Raw multiplier: 100 / probability
  const rawMultiplierBps = Math.floor((100 * 10000) / winChance);

  // Apply house edge
  const edgeDeduction = Math.floor((rawMultiplierBps * houseEdgeBps) / 10000);
  return rawMultiplierBps - edgeDeduction;
}

/**
 * Get the win probability percentage for a given target and direction.
 *
 * @param target - The target number (1-100)
 * @param rollUnder - true = win if roll < target, false = win if roll > target
 * @returns Win probability as a percentage (0-100)
 */
export function getWinChance(target: number, rollUnder: boolean): number {
  if (rollUnder) {
    // Win if roll < target. Possible winning rolls: 1 to (target-1)
    return Math.max(0, target - 1);
  } else {
    // Win if roll > target. Possible winning rolls: (target+1) to 100
    return Math.max(0, 100 - target);
  }
}

/**
 * Evaluate a roll against target and direction.
 */
export function evaluateRoll(
  rollValue: number,
  target: number,
  rollUnder: boolean
): boolean {
  return rollUnder ? rollValue < target : rollValue > target;
}

/**
 * Validate dice target is within allowed range.
 */
export function validateTarget(
  target: number,
  config: DiceConfig = DEFAULT_DICE_CONFIG
): void {
  if (!Number.isInteger(target)) {
    throw new Error('Target must be an integer');
  }
  if (target < config.minTarget) {
    throw new Error(`Target too low: minimum is ${config.minTarget}`);
  }
  if (target > config.maxTarget) {
    throw new Error(`Target too high: maximum is ${config.maxTarget}`);
  }
}

// ---------------------------------------------------------------------------
// Full Game Round
// ---------------------------------------------------------------------------

/**
 * Play a complete dice round with provably fair seeds.
 *
 * @param serverSeed - Server's secret seed
 * @param clientSeed - Client's public seed
 * @param nonce - Incrementing nonce
 * @param betAmount - Wager amount
 * @param target - Target number (1-100)
 * @param rollUnder - true = bet roll under target, false = bet roll over
 * @param houseEdgeBps - House edge in basis points (default 100 = 1%)
 * @returns Complete dice result
 */
export function playDiceRound(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  betAmount: number,
  target: number,
  rollUnder: boolean,
  houseEdgeBps: number = DEFAULT_DICE_CONFIG.houseEdgeBps
): DiceResult & { serverSeedHash: string; seedHash: string } {
  validateTarget(target);

  const rollValue = roll(serverSeed, clientSeed, nonce);
  const won = evaluateRoll(rollValue, target, rollUnder);
  const multiplierBps = calculateMultiplier(target, rollUnder, houseEdgeBps);
  const multiplier = multiplierBps / 10000;

  let payout = 0;
  if (won) {
    payout = calculatePayout(betAmount, multiplierBps, 0); // edge already in multiplier
  }

  return {
    roll: rollValue,
    target,
    rollUnder,
    won,
    multiplier,
    payout,
    serverSeedHash: hashServerSeed(serverSeed),
    seedHash: hashSeed(serverSeed, clientSeed, nonce),
  };
}
