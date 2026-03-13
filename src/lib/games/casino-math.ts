// ============================================================================
// Casino Math Library - Ported from CasinoMath.sol
// ============================================================================

import { createHash, randomBytes } from 'crypto';

/**
 * Calculate payout after house edge deduction.
 * All multipliers and house edge are in basis points (1 bps = 0.01%).
 *
 * @param betAmount - The wager amount
 * @param multiplierBps - Payout multiplier in basis points (10000 = 1x)
 * @param houseEdgeBps - House edge in basis points (250 = 2.5%)
 * @returns Net payout after house edge
 */
export function calculatePayout(
  betAmount: number,
  multiplierBps: number,
  houseEdgeBps: number
): number {
  const payout = (betAmount * multiplierBps) / 10000;
  const houseEdge = (payout * houseEdgeBps) / 10000;
  return Math.floor(payout - houseEdge);
}

/**
 * Validate that a bet amount falls within allowed range.
 * Throws if validation fails.
 */
export function validateBet(
  betAmount: number,
  minBet: number,
  maxBet: number
): void {
  if (betAmount <= 0) {
    throw new Error('Invalid bet amount: must be positive');
  }
  if (betAmount < minBet) {
    throw new Error(`Bet too low: minimum is ${minBet}`);
  }
  if (betAmount > maxBet) {
    throw new Error(`Bet too high: maximum is ${maxBet}`);
  }
}

/**
 * Generate a cryptographically secure server seed (64 hex characters).
 */
export function generateServerSeed(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Hash a server seed for commitment (publish hash before game, reveal seed after).
 */
export function hashServerSeed(serverSeed: string): string {
  return createHash('sha256').update(serverSeed).digest('hex');
}

/**
 * Combine server seed, client seed, and nonce into a deterministic hash.
 * This is the core of the provably fair system.
 */
export function hashSeed(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): string {
  return createHash('sha256')
    .update(`${serverSeed}:${clientSeed}:${nonce}`)
    .digest('hex');
}

/**
 * Derive a deterministic float [0, 1) from a combined seed hash.
 * Uses first 8 hex chars (32 bits) for uniform distribution.
 */
export function seedToFloat(hash: string): number {
  const int = parseInt(hash.substring(0, 8), 16);
  return int / 0x100000000; // divide by 2^32
}

/**
 * Derive a deterministic integer [0, max] from a combined seed hash.
 * Uses an offset into the hash for multiple values from a single hash.
 */
export function seedToInt(hash: string, max: number, offset: number = 0): number {
  const start = (offset * 8) % (hash.length - 8);
  const int = parseInt(hash.substring(start, start + 8), 16);
  return int % (max + 1);
}

/**
 * Verify provable fairness: recompute hash and verify the result matches.
 */
export function verifyFairness(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  expectedHash: string
): boolean {
  const computed = hashSeed(serverSeed, clientSeed, nonce);
  return computed === expectedHash;
}

/**
 * Verify that a server seed hash matches its pre-committed hash.
 */
export function verifyServerSeed(
  serverSeed: string,
  committedHash: string
): boolean {
  return hashServerSeed(serverSeed) === committedHash;
}

/**
 * Convert basis points to a decimal multiplier.
 * 10000 bps = 1.0x, 25000 bps = 2.5x
 */
export function bpsToMultiplier(bps: number): number {
  return bps / 10000;
}

/**
 * Convert a decimal multiplier to basis points.
 * 1.0x = 10000 bps, 2.5x = 25000 bps
 */
export function multiplierToBps(multiplier: number): number {
  return Math.round(multiplier * 10000);
}

/**
 * Generate a deterministic random number from seeds for game outcomes.
 * Returns integer in range [0, max].
 */
export function generateGameRandom(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  max: number,
  round: number = 0
): number {
  const hash = createHash('sha256')
    .update(`${serverSeed}:${clientSeed}:${nonce}:${round}`)
    .digest('hex');
  return seedToInt(hash, max);
}

/**
 * Generate multiple deterministic random numbers from a single seed combination.
 * Returns array of integers, each in range [0, max].
 */
export function generateGameRandomSequence(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  max: number,
  count: number
): number[] {
  const results: number[] = [];
  for (let i = 0; i < count; i++) {
    results.push(generateGameRandom(serverSeed, clientSeed, nonce, max, i));
  }
  return results;
}
