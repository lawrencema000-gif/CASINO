// ============================================================================
// Coin Flip Engine - Ported from CoinFlip.sol
// Simple 50/50 game with 1.95x payout (2.5% house edge)
// ============================================================================

import {
  hashSeed,
  seedToInt,
  calculatePayout,
  hashServerSeed,
} from './casino-math';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CoinSide = 'heads' | 'tails';

export interface CoinFlipResult {
  choice: CoinSide;
  result: CoinSide;
  won: boolean;
  payout: number;
  multiplier: number;
  serverSeedHash: string;
  seedHash: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Payout multiplier in basis points: 1.95x = 19500 bps */
export const COINFLIP_PAYOUT_BPS = 19500;

/** House edge in basis points: 2.5% = 250 bps (implicit in the 1.95x multiplier) */
export const COINFLIP_HOUSE_EDGE_BPS = 250;

// ---------------------------------------------------------------------------
// Core Engine
// ---------------------------------------------------------------------------

/**
 * Flip a coin deterministically using provably fair seeds.
 * Returns 'heads' (0) or 'tails' (1).
 */
export function flip(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): CoinSide {
  const hash = hashSeed(serverSeed, clientSeed, nonce);
  const value = seedToInt(hash, 1); // 0 or 1
  return value === 0 ? 'heads' : 'tails';
}

/**
 * Evaluate a coin flip result.
 */
export function evaluate(choice: CoinSide, result: CoinSide): boolean {
  return choice === result;
}

// ---------------------------------------------------------------------------
// Full Game Round
// ---------------------------------------------------------------------------

/**
 * Play a complete coin flip round with provably fair seeds.
 *
 * @param serverSeed - Server's secret seed
 * @param clientSeed - Client's public seed
 * @param nonce - Incrementing nonce
 * @param betAmount - Wager amount
 * @param choice - Player's choice ('heads' or 'tails')
 * @returns Complete coin flip result
 */
export function playCoinFlipRound(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  betAmount: number,
  choice: CoinSide
): CoinFlipResult {
  if (choice !== 'heads' && choice !== 'tails') {
    throw new Error('Invalid choice: must be "heads" or "tails"');
  }

  const result = flip(serverSeed, clientSeed, nonce);
  const won = evaluate(choice, result);

  let payout = 0;
  if (won) {
    // 1.95x payout (house edge baked into multiplier, so 0 additional edge)
    payout = calculatePayout(betAmount, COINFLIP_PAYOUT_BPS, 0);
  }

  return {
    choice,
    result,
    won,
    payout,
    multiplier: won ? COINFLIP_PAYOUT_BPS / 10000 : 0,
    serverSeedHash: hashServerSeed(serverSeed),
    seedHash: hashSeed(serverSeed, clientSeed, nonce),
  };
}
