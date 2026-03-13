// ============================================================================
// Plinko Engine - Ported from Plinko.sol
// Ball drops through pegs, landing position determines multiplier
// ============================================================================

import { PlinkoConfig, PlinkoResult, PlinkoRiskLevel } from './types';
import {
  hashSeed,
  hashServerSeed,
} from './casino-math';
import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// Multiplier Tables (per risk level and row count)
// Indexed from edge (0) to center. Tables are symmetric.
// ---------------------------------------------------------------------------

/**
 * Multiplier tables for different configurations.
 * Each array goes from leftmost bucket to center.
 * The full set of buckets mirrors around center.
 * For N rows, there are N+1 buckets.
 */

export const PLINKO_MULTIPLIERS: Record<
  number,
  Record<PlinkoRiskLevel, number[]>
> = {
  8: {
    [PlinkoRiskLevel.LOW]: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    [PlinkoRiskLevel.MEDIUM]: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    [PlinkoRiskLevel.HIGH]: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
  },
  12: {
    [PlinkoRiskLevel.LOW]: [10, 3, 1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3, 10],
    [PlinkoRiskLevel.MEDIUM]: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    [PlinkoRiskLevel.HIGH]: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
  },
  16: {
    [PlinkoRiskLevel.LOW]: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
    [PlinkoRiskLevel.MEDIUM]: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
    [PlinkoRiskLevel.HIGH]: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
  },
};

// ---------------------------------------------------------------------------
// Core Engine
// ---------------------------------------------------------------------------

/**
 * Drop a ball through the Plinko board deterministically.
 * At each row, the ball goes left (-1) or right (+1).
 *
 * @param serverSeed - Server's secret seed
 * @param clientSeed - Client's public seed
 * @param nonce - Incrementing nonce
 * @param rows - Number of rows (8, 12, or 16)
 * @returns Path array and final position
 */
export function dropBall(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  rows: 8 | 12 | 16 = 16
): { path: Array<-1 | 1>; finalPosition: number } {
  const path: Array<-1 | 1> = [];
  let position = 0;

  for (let i = 0; i < rows; i++) {
    const hash = createHash('sha256')
      .update(`${serverSeed}:${clientSeed}:${nonce}:plinko:${i}`)
      .digest('hex');
    const value = parseInt(hash.substring(0, 8), 16);
    const direction: -1 | 1 = value % 2 === 0 ? -1 : 1;

    path.push(direction);
    position += direction;
  }

  return { path, finalPosition: position };
}

/**
 * Convert a final position to a bucket index (0 to rows).
 * Position ranges from -rows to +rows in steps of 2.
 * Bucket index ranges from 0 to rows.
 */
export function positionToBucketIndex(
  position: number,
  rows: number
): number {
  // position goes from -rows to +rows in steps of 2
  // bucket index = (position + rows) / 2
  return (position + rows) / 2;
}

/**
 * Get the multiplier for a given bucket index, row count, and risk level.
 */
export function calculateMultiplier(
  bucketIndex: number,
  rows: 8 | 12 | 16,
  riskLevel: PlinkoRiskLevel = PlinkoRiskLevel.MEDIUM
): number {
  const table = PLINKO_MULTIPLIERS[rows]?.[riskLevel];
  if (!table) {
    throw new Error(`No multiplier table for ${rows} rows, ${riskLevel} risk`);
  }

  const clampedIndex = Math.max(0, Math.min(bucketIndex, table.length - 1));
  return table[clampedIndex];
}

// ---------------------------------------------------------------------------
// Full Game Round
// ---------------------------------------------------------------------------

/**
 * Play a complete Plinko round with provably fair seeds.
 *
 * @param serverSeed - Server's secret seed
 * @param clientSeed - Client's public seed
 * @param nonce - Incrementing nonce
 * @param betAmount - Wager amount
 * @param rows - Number of rows (8, 12, or 16)
 * @param riskLevel - Risk level (low, medium, high)
 * @returns Complete Plinko result
 */
export function playPlinkoRound(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  betAmount: number,
  rows: 8 | 12 | 16 = 16,
  riskLevel: PlinkoRiskLevel = PlinkoRiskLevel.MEDIUM
): PlinkoResult & { serverSeedHash: string; seedHash: string } {
  const { path, finalPosition } = dropBall(serverSeed, clientSeed, nonce, rows);
  const bucketIndex = positionToBucketIndex(finalPosition, rows);
  const multiplier = calculateMultiplier(bucketIndex, rows, riskLevel);
  const payout = Math.floor(betAmount * multiplier);

  return {
    path,
    finalPosition,
    bucketIndex,
    multiplier,
    payout,
    serverSeedHash: hashServerSeed(serverSeed),
    seedHash: hashSeed(serverSeed, clientSeed, nonce),
  };
}

/**
 * Validate Plinko configuration.
 */
export function validatePlinkoConfig(config: PlinkoConfig): void {
  if (![8, 12, 16].includes(config.rows)) {
    throw new Error('Rows must be 8, 12, or 16');
  }
  if (
    ![PlinkoRiskLevel.LOW, PlinkoRiskLevel.MEDIUM, PlinkoRiskLevel.HIGH].includes(
      config.riskLevel
    )
  ) {
    throw new Error('Invalid risk level');
  }
}

/**
 * Get all bucket multipliers for a given configuration.
 * Useful for displaying the board to the player.
 */
export function getBucketMultipliers(
  rows: 8 | 12 | 16,
  riskLevel: PlinkoRiskLevel
): number[] {
  const table = PLINKO_MULTIPLIERS[rows]?.[riskLevel];
  if (!table) {
    throw new Error(`No multiplier table for ${rows} rows, ${riskLevel} risk`);
  }
  return [...table];
}
