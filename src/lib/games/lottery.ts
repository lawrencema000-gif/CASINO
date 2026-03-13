// ============================================================================
// Lottery Engine - Ported from Lottery.sol
// Pick 6 numbers from 1-49, match against drawn numbers
// ============================================================================

import { LotteryTicket, LotteryDraw, LotteryResult } from './types';
import {
  hashSeed,
  hashServerSeed,
  generateServerSeed,
} from './casino-math';
import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const LOTTERY_MAX_NUMBER = 49;
export const LOTTERY_PICK_COUNT = 6;

export const PRIZE_TIERS: Record<number, { name: string; poolShare: number }> = {
  6: { name: 'Jackpot', poolShare: 1.0 },      // 100% of pool
  5: { name: '2nd Prize', poolShare: 0.1 },     // 10% of pool
  4: { name: '3rd Prize', poolShare: 0.01 },    // 1% of pool
  3: { name: '4th Prize', poolShare: 0.001 },   // 0.1% of pool
};

// ---------------------------------------------------------------------------
// Number Generation
// ---------------------------------------------------------------------------

/**
 * Generate lottery winning numbers deterministically.
 * Returns `count` unique sorted numbers in range [1, max].
 *
 * @param serverSeed - Server's secret seed
 * @param clientSeed - Client/draw public seed
 * @param nonce - Draw nonce
 * @param count - How many numbers to draw (default 6)
 * @param max - Maximum number value (default 49)
 * @returns Sorted array of unique numbers
 */
export function generateNumbers(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  count: number = LOTTERY_PICK_COUNT,
  max: number = LOTTERY_MAX_NUMBER
): number[] {
  const numbers: number[] = [];
  const used = new Set<number>();
  let attempt = 0;

  while (numbers.length < count) {
    const hash = createHash('sha256')
      .update(`${serverSeed}:${clientSeed}:${nonce}:lottery:${attempt}`)
      .digest('hex');
    const value = (parseInt(hash.substring(0, 8), 16) % max) + 1;

    if (!used.has(value)) {
      used.add(value);
      numbers.push(value);
    }
    attempt++;

    // Safety: prevent infinite loop (extremely unlikely with 49 choices)
    if (attempt > count * 100) {
      throw new Error('Failed to generate unique numbers');
    }
  }

  return numbers.sort((a, b) => a - b);
}

/**
 * Validate player-selected numbers.
 */
export function validateNumbers(
  numbers: number[],
  count: number = LOTTERY_PICK_COUNT,
  max: number = LOTTERY_MAX_NUMBER
): void {
  if (numbers.length !== count) {
    throw new Error(`Must pick exactly ${count} numbers`);
  }

  const seen = new Set<number>();
  for (const num of numbers) {
    if (!Number.isInteger(num) || num < 1 || num > max) {
      throw new Error(`Number ${num} out of range (1-${max})`);
    }
    if (seen.has(num)) {
      throw new Error(`Duplicate number: ${num}`);
    }
    seen.add(num);
  }
}

// ---------------------------------------------------------------------------
// Match Checking
// ---------------------------------------------------------------------------

/**
 * Check how many of the player's numbers match the winning numbers.
 *
 * @param playerNumbers - Player's selected numbers
 * @param winningNumbers - Drawn winning numbers
 * @returns Number of matches and which numbers matched
 */
export function checkMatches(
  playerNumbers: number[],
  winningNumbers: number[]
): { matches: number; matchedNumbers: number[] } {
  const winningSet = new Set(winningNumbers);
  const matchedNumbers: number[] = [];

  for (const num of playerNumbers) {
    if (winningSet.has(num)) {
      matchedNumbers.push(num);
    }
  }

  return {
    matches: matchedNumbers.length,
    matchedNumbers: matchedNumbers.sort((a, b) => a - b),
  };
}

// ---------------------------------------------------------------------------
// Prize Calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the prize for a given number of matches.
 *
 * @param matches - Number of matching numbers
 * @param prizePool - Total prize pool
 * @returns Prize amount (0 if no prize tier matched)
 */
export function calculatePrize(matches: number, prizePool: number): number {
  const tier = PRIZE_TIERS[matches];
  if (!tier) return 0;
  return Math.floor(prizePool * tier.poolShare);
}

/**
 * Get the prize tier name for a given number of matches.
 */
export function getPrizeTierName(matches: number): string {
  return PRIZE_TIERS[matches]?.name ?? 'No Prize';
}

// ---------------------------------------------------------------------------
// Full Game Round
// ---------------------------------------------------------------------------

/**
 * Evaluate a ticket against drawn numbers.
 */
export function evaluateTicket(
  ticket: { numbers: number[] },
  winningNumbers: number[],
  prizePool: number
): LotteryResult {
  const { matches, matchedNumbers } = checkMatches(
    ticket.numbers,
    winningNumbers
  );
  const prize = calculatePrize(matches, prizePool);

  return {
    ticketId: '',
    matches,
    matchedNumbers,
    prize,
    tier: getPrizeTierName(matches),
  };
}

/**
 * Draw winning numbers for a lottery round.
 */
export function drawLottery(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): {
  winningNumbers: number[];
  serverSeedHash: string;
  seedHash: string;
} {
  const winningNumbers = generateNumbers(serverSeed, clientSeed, nonce);

  return {
    winningNumbers,
    serverSeedHash: hashServerSeed(serverSeed),
    seedHash: hashSeed(serverSeed, clientSeed, nonce),
  };
}

// ---------------------------------------------------------------------------
// Lottery Manager (manages a full draw lifecycle)
// ---------------------------------------------------------------------------

export class LotteryManager {
  readonly drawId: string;
  readonly serverSeed: string;
  readonly serverSeedHash: string;
  private tickets: Map<string, { playerId: string; numbers: number[]; betAmount: number }>;
  private winningNumbers: number[] | null;
  private prizePool: number;
  private isDrawn: boolean;

  constructor(drawId: string) {
    this.drawId = drawId;
    this.serverSeed = generateServerSeed();
    this.serverSeedHash = hashServerSeed(this.serverSeed);
    this.tickets = new Map();
    this.winningNumbers = null;
    this.prizePool = 0;
    this.isDrawn = false;
  }

  /** Buy a ticket */
  buyTicket(
    ticketId: string,
    playerId: string,
    numbers: number[],
    betAmount: number
  ): void {
    if (this.isDrawn) {
      throw new Error('Draw already completed');
    }

    validateNumbers(numbers);

    this.tickets.set(ticketId, { playerId, numbers, betAmount });
    this.prizePool += betAmount;
  }

  /** Perform the draw */
  draw(clientSeed: string, nonce: number): number[] {
    if (this.isDrawn) {
      throw new Error('Already drawn');
    }
    if (this.tickets.size === 0) {
      throw new Error('No tickets sold');
    }

    this.winningNumbers = generateNumbers(this.serverSeed, clientSeed, nonce);
    this.isDrawn = true;
    return [...this.winningNumbers];
  }

  /** Check a ticket for prizes */
  checkTicket(ticketId: string): LotteryResult {
    if (!this.isDrawn || !this.winningNumbers) {
      throw new Error('Draw not completed');
    }

    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const result = evaluateTicket(ticket, this.winningNumbers, this.prizePool);
    result.ticketId = ticketId;
    return result;
  }

  /** Get all results */
  getAllResults(): LotteryResult[] {
    if (!this.isDrawn || !this.winningNumbers) {
      throw new Error('Draw not completed');
    }

    const results: LotteryResult[] = [];
    for (const [ticketId, ticket] of this.tickets) {
      const result = evaluateTicket(ticket, this.winningNumbers, this.prizePool);
      result.ticketId = ticketId;
      results.push(result);
    }
    return results;
  }

  /** Get draw info (safe for clients before draw) */
  getDrawInfo(): { drawId: string; serverSeedHash: string; prizePool: number; ticketCount: number; isDrawn: boolean } {
    return {
      drawId: this.drawId,
      serverSeedHash: this.serverSeedHash,
      prizePool: this.prizePool,
      ticketCount: this.tickets.size,
      isDrawn: this.isDrawn,
    };
  }

  /** Get fairness proof (only after draw) */
  getFairnessProof() {
    if (!this.isDrawn) {
      throw new Error('Draw not completed');
    }
    return {
      serverSeed: this.serverSeed,
      serverSeedHash: this.serverSeedHash,
      winningNumbers: this.winningNumbers,
    };
  }
}
