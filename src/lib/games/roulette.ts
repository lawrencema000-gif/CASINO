// ============================================================================
// Roulette Engine - Ported from Roulette.sol
// European Roulette (single zero, numbers 0-36)
// ============================================================================

import { RouletteBetType, RouletteBet, RouletteResult } from './types';
import {
  hashSeed,
  seedToInt,
  hashServerSeed,
  calculatePayout,
  validateBet,
} from './casino-math';

// ---------------------------------------------------------------------------
// Number Classifications
// ---------------------------------------------------------------------------

export const RED_NUMBERS: ReadonlySet<number> = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export const BLACK_NUMBERS: ReadonlySet<number> = new Set([
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
]);

export const RED_NUMBERS_ARRAY: readonly number[] = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];

export const BLACK_NUMBERS_ARRAY: readonly number[] = [
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
];

// ---------------------------------------------------------------------------
// Payout Multipliers (including original bet return)
// E.g. STRAIGHT pays 35:1 = 36x total return = 360000 bps
// ---------------------------------------------------------------------------

export const PAYOUT_MULTIPLIERS_BPS: Record<RouletteBetType, number> = {
  [RouletteBetType.STRAIGHT]: 360000,  // 35:1 -> 36x
  [RouletteBetType.SPLIT]: 180000,     // 17:1 -> 18x
  [RouletteBetType.STREET]: 120000,    // 11:1 -> 12x
  [RouletteBetType.CORNER]: 90000,     // 8:1  -> 9x
  [RouletteBetType.LINE]: 60000,       // 5:1  -> 6x
  [RouletteBetType.DOZEN]: 30000,      // 2:1  -> 3x
  [RouletteBetType.COLUMN]: 30000,     // 2:1  -> 3x
  [RouletteBetType.RED]: 20000,        // 1:1  -> 2x
  [RouletteBetType.BLACK]: 20000,      // 1:1  -> 2x
  [RouletteBetType.ODD]: 20000,        // 1:1  -> 2x
  [RouletteBetType.EVEN]: 20000,       // 1:1  -> 2x
  [RouletteBetType.HIGH]: 20000,       // 1:1  -> 2x
  [RouletteBetType.LOW]: 20000,        // 1:1  -> 2x
};

export const BET_TYPE_NAMES: Record<RouletteBetType, string> = {
  [RouletteBetType.STRAIGHT]: 'Straight Up',
  [RouletteBetType.SPLIT]: 'Split',
  [RouletteBetType.STREET]: 'Street',
  [RouletteBetType.CORNER]: 'Corner',
  [RouletteBetType.LINE]: 'Line',
  [RouletteBetType.DOZEN]: 'Dozen',
  [RouletteBetType.COLUMN]: 'Column',
  [RouletteBetType.RED]: 'Red',
  [RouletteBetType.BLACK]: 'Black',
  [RouletteBetType.ODD]: 'Odd',
  [RouletteBetType.EVEN]: 'Even',
  [RouletteBetType.HIGH]: 'High (19-36)',
  [RouletteBetType.LOW]: 'Low (1-18)',
};

// ---------------------------------------------------------------------------
// Spin
// ---------------------------------------------------------------------------

/**
 * Spin the roulette wheel deterministically.
 * Returns a number 0-36 (European roulette, single zero).
 */
export function spin(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): number {
  const hash = hashSeed(serverSeed, clientSeed, nonce);
  return seedToInt(hash, 36);
}

// ---------------------------------------------------------------------------
// Win Evaluation
// ---------------------------------------------------------------------------

/**
 * Check if a number is red.
 */
export function isRed(n: number): boolean {
  return RED_NUMBERS.has(n);
}

/**
 * Check if a number is black.
 */
export function isBlack(n: number): boolean {
  return BLACK_NUMBERS.has(n);
}

/**
 * Evaluate a single bet against the winning number.
 * Returns { won, payout } where payout includes the returned bet if won.
 */
export function evaluateBet(
  betType: RouletteBetType,
  betValue: number | number[],
  winningNumber: number,
  betAmount: number,
  houseEdgeBps: number = 0
): { won: boolean; payout: number } {
  let won = false;

  switch (betType) {
    case RouletteBetType.STRAIGHT:
      won = winningNumber === (betValue as number);
      break;

    case RouletteBetType.SPLIT: {
      const nums = betValue as number[];
      won = nums.includes(winningNumber);
      break;
    }

    case RouletteBetType.STREET: {
      const streetStart = (betValue as number) * 3 + 1;
      won = winningNumber >= streetStart && winningNumber <= streetStart + 2;
      break;
    }

    case RouletteBetType.CORNER: {
      const nums = betValue as number[];
      won = nums.includes(winningNumber);
      break;
    }

    case RouletteBetType.LINE: {
      const lineStart = (betValue as number) * 3 + 1;
      won = winningNumber >= lineStart && winningNumber <= lineStart + 5;
      break;
    }

    case RouletteBetType.DOZEN: {
      if (winningNumber === 0) {
        won = false;
      } else {
        const dozen = Math.floor((winningNumber - 1) / 12);
        won = dozen === (betValue as number);
      }
      break;
    }

    case RouletteBetType.COLUMN: {
      if (winningNumber === 0) {
        won = false;
      } else {
        const column = (winningNumber - 1) % 3;
        won = column === (betValue as number);
      }
      break;
    }

    case RouletteBetType.RED:
      won = isRed(winningNumber);
      break;

    case RouletteBetType.BLACK:
      won = isBlack(winningNumber);
      break;

    case RouletteBetType.ODD:
      won = winningNumber !== 0 && winningNumber % 2 === 1;
      break;

    case RouletteBetType.EVEN:
      won = winningNumber !== 0 && winningNumber % 2 === 0;
      break;

    case RouletteBetType.HIGH:
      won = winningNumber >= 19 && winningNumber <= 36;
      break;

    case RouletteBetType.LOW:
      won = winningNumber >= 1 && winningNumber <= 18;
      break;
  }

  let payout = 0;
  if (won) {
    const multiplierBps = PAYOUT_MULTIPLIERS_BPS[betType];
    payout = calculatePayout(betAmount, multiplierBps, houseEdgeBps);
  }

  return { won, payout };
}

// ---------------------------------------------------------------------------
// Multiple Bets
// ---------------------------------------------------------------------------

/**
 * Place and evaluate multiple bets on a single spin.
 */
export function placeMultipleBets(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  bets: RouletteBet[],
  houseEdgeBps: number = 0
): RouletteResult {
  const winningNumber = spin(serverSeed, clientSeed, nonce);

  let totalPayout = 0;
  const evaluatedBets = bets.map((bet) => {
    const { won, payout } = evaluateBet(
      bet.type,
      bet.value,
      winningNumber,
      bet.amount,
      houseEdgeBps
    );
    totalPayout += payout;
    return { ...bet, won, payout };
  });

  return {
    winningNumber,
    bets: evaluatedBets,
    totalPayout,
  };
}

/**
 * Validate that a bet type and value combination is valid.
 */
export function validateRouletteBet(
  betType: RouletteBetType,
  betValue: number | number[]
): boolean {
  switch (betType) {
    case RouletteBetType.STRAIGHT: {
      const v = betValue as number;
      return Number.isInteger(v) && v >= 0 && v <= 36;
    }
    case RouletteBetType.SPLIT: {
      const nums = betValue as number[];
      return (
        Array.isArray(nums) &&
        nums.length === 2 &&
        nums.every((n) => Number.isInteger(n) && n >= 0 && n <= 36)
      );
    }
    case RouletteBetType.STREET: {
      const v = betValue as number;
      return Number.isInteger(v) && v >= 0 && v <= 11;
    }
    case RouletteBetType.CORNER: {
      const nums = betValue as number[];
      return (
        Array.isArray(nums) &&
        nums.length === 4 &&
        nums.every((n) => Number.isInteger(n) && n >= 1 && n <= 36)
      );
    }
    case RouletteBetType.LINE: {
      const v = betValue as number;
      return Number.isInteger(v) && v >= 0 && v <= 10;
    }
    case RouletteBetType.DOZEN: {
      const v = betValue as number;
      return Number.isInteger(v) && v >= 0 && v <= 2;
    }
    case RouletteBetType.COLUMN: {
      const v = betValue as number;
      return Number.isInteger(v) && v >= 0 && v <= 2;
    }
    case RouletteBetType.RED:
    case RouletteBetType.BLACK:
    case RouletteBetType.ODD:
    case RouletteBetType.EVEN:
    case RouletteBetType.HIGH:
    case RouletteBetType.LOW:
      return true; // no value needed
    default:
      return false;
  }
}
