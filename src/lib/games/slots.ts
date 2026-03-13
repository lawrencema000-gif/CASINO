// ============================================================================
// Slots Engine - Ported from html5-slot-machine + Slots.sol
// ============================================================================

import { SlotSymbol, SlotResult, SlotWinLine, ReelResult } from './types';
import {
  hashSeed,
  generateServerSeed,
  hashServerSeed,
  seedToInt,
  calculatePayout,
} from './casino-math';
import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// Symbol Weights (probability distribution per reel)
// ---------------------------------------------------------------------------

export const SYMBOL_WEIGHTS: Record<SlotSymbol, number> = {
  [SlotSymbol.CHERRY]: 20,
  [SlotSymbol.LEMON]: 18,
  [SlotSymbol.ORANGE]: 16,
  [SlotSymbol.PLUM]: 14,
  [SlotSymbol.BELL]: 10,
  [SlotSymbol.BAR]: 7,
  [SlotSymbol.SEVEN]: 4,
  [SlotSymbol.WILD]: 2,
  [SlotSymbol.SCATTER]: 5,
};

const TOTAL_WEIGHT = Object.values(SYMBOL_WEIGHTS).reduce((a, b) => a + b, 0);

export const SYMBOL_NAMES: Record<SlotSymbol, string> = {
  [SlotSymbol.CHERRY]: 'Cherry',
  [SlotSymbol.LEMON]: 'Lemon',
  [SlotSymbol.ORANGE]: 'Orange',
  [SlotSymbol.PLUM]: 'Plum',
  [SlotSymbol.BELL]: 'Bell',
  [SlotSymbol.BAR]: 'Bar',
  [SlotSymbol.SEVEN]: 'Seven',
  [SlotSymbol.WILD]: 'Wild',
  [SlotSymbol.SCATTER]: 'Scatter',
};

// ---------------------------------------------------------------------------
// Paytable - Multipliers for symbol combinations
// Multiplier is applied per bet line
// ---------------------------------------------------------------------------

export interface PaytableEntry {
  symbol: SlotSymbol;
  count: number;
  multiplier: number;
}

/**
 * Paytable: symbol, minimum count, payout multiplier.
 * Higher-value symbols have higher multipliers.
 */
export const PAYTABLE: PaytableEntry[] = [
  // 5 of a kind
  { symbol: SlotSymbol.SEVEN, count: 5, multiplier: 1000 },
  { symbol: SlotSymbol.BAR, count: 5, multiplier: 500 },
  { symbol: SlotSymbol.BELL, count: 5, multiplier: 250 },
  { symbol: SlotSymbol.PLUM, count: 5, multiplier: 100 },
  { symbol: SlotSymbol.ORANGE, count: 5, multiplier: 75 },
  { symbol: SlotSymbol.LEMON, count: 5, multiplier: 50 },
  { symbol: SlotSymbol.CHERRY, count: 5, multiplier: 40 },
  // 4 of a kind
  { symbol: SlotSymbol.SEVEN, count: 4, multiplier: 250 },
  { symbol: SlotSymbol.BAR, count: 4, multiplier: 100 },
  { symbol: SlotSymbol.BELL, count: 4, multiplier: 50 },
  { symbol: SlotSymbol.PLUM, count: 4, multiplier: 25 },
  { symbol: SlotSymbol.ORANGE, count: 4, multiplier: 20 },
  { symbol: SlotSymbol.LEMON, count: 4, multiplier: 15 },
  { symbol: SlotSymbol.CHERRY, count: 4, multiplier: 10 },
  // 3 of a kind
  { symbol: SlotSymbol.SEVEN, count: 3, multiplier: 50 },
  { symbol: SlotSymbol.BAR, count: 3, multiplier: 25 },
  { symbol: SlotSymbol.BELL, count: 3, multiplier: 15 },
  { symbol: SlotSymbol.PLUM, count: 3, multiplier: 8 },
  { symbol: SlotSymbol.ORANGE, count: 3, multiplier: 6 },
  { symbol: SlotSymbol.LEMON, count: 3, multiplier: 4 },
  { symbol: SlotSymbol.CHERRY, count: 3, multiplier: 3 },
];

// ---------------------------------------------------------------------------
// Paylines - 20 standard payline definitions for a 5x3 grid
// Each payline is an array of row indices [col0Row, col1Row, col2Row, col3Row, col4Row]
// ---------------------------------------------------------------------------

export const PAYLINES: number[][] = [
  // Straight lines
  [1, 1, 1, 1, 1], // 0: middle row
  [0, 0, 0, 0, 0], // 1: top row
  [2, 2, 2, 2, 2], // 2: bottom row
  // V shapes
  [0, 1, 2, 1, 0], // 3: V
  [2, 1, 0, 1, 2], // 4: inverted V
  // Zigzags
  [0, 0, 1, 2, 2], // 5: descending slope
  [2, 2, 1, 0, 0], // 6: ascending slope
  [1, 0, 0, 0, 1], // 7: top dip
  [1, 2, 2, 2, 1], // 8: bottom dip
  [0, 1, 0, 1, 0], // 9: top zigzag
  [2, 1, 2, 1, 2], // 10: bottom zigzag
  // W and M shapes
  [1, 0, 1, 0, 1], // 11: W top
  [1, 2, 1, 2, 1], // 12: W bottom
  [0, 0, 1, 0, 0], // 13: top with center dip
  [2, 2, 1, 2, 2], // 14: bottom with center rise
  // Steps
  [0, 1, 2, 2, 2], // 15: descending steps
  [2, 1, 0, 0, 0], // 16: ascending steps
  [0, 0, 0, 1, 2], // 17: late descent
  [2, 2, 2, 1, 0], // 18: late ascent
  [1, 0, 2, 0, 1], // 19: cross pattern
];

// ---------------------------------------------------------------------------
// Core Engine
// ---------------------------------------------------------------------------

/**
 * Pick a weighted random symbol using a deterministic hash value.
 */
function pickSymbol(hashValue: number): SlotSymbol {
  let roll = hashValue % TOTAL_WEIGHT;

  for (let symbol = 0; symbol <= 8; symbol++) {
    roll -= SYMBOL_WEIGHTS[symbol as SlotSymbol];
    if (roll < 0) {
      return symbol as SlotSymbol;
    }
  }
  return SlotSymbol.CHERRY; // fallback
}

/**
 * Spin the reels deterministically using provably fair seeds.
 *
 * @param serverSeed - Server's secret seed
 * @param clientSeed - Client's public seed
 * @param nonce - Incrementing nonce
 * @param reelCount - Number of reels (columns), default 5
 * @param rowCount - Number of rows visible per reel, default 3
 * @returns 2D grid [reel][row] of SlotSymbol
 */
export function spinReels(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  reelCount: number = 5,
  rowCount: number = 3
): SlotSymbol[][] {
  const grid: SlotSymbol[][] = [];

  for (let reel = 0; reel < reelCount; reel++) {
    const reelSymbols: SlotSymbol[] = [];
    for (let row = 0; row < rowCount; row++) {
      const hash = createHash('sha256')
        .update(`${serverSeed}:${clientSeed}:${nonce}:${reel}:${row}`)
        .digest('hex');
      const hashInt = parseInt(hash.substring(0, 8), 16);
      reelSymbols.push(pickSymbol(hashInt));
    }
    grid.push(reelSymbols);
  }

  return grid;
}

/**
 * Check a single payline for wins.
 * WILD substitutes for any non-SCATTER symbol.
 */
function checkPayline(
  grid: SlotSymbol[][],
  payline: number[],
  lineIndex: number
): SlotWinLine | null {
  const symbols: SlotSymbol[] = payline.map((row, col) => grid[col][row]);

  // Find the first non-WILD symbol (the base symbol for this line)
  let baseSymbol: SlotSymbol | null = null;
  for (const sym of symbols) {
    if (sym !== SlotSymbol.WILD && sym !== SlotSymbol.SCATTER) {
      baseSymbol = sym;
      break;
    }
  }

  // All wilds counts as the highest-paying symbol (SEVEN)
  if (baseSymbol === null) {
    baseSymbol = SlotSymbol.SEVEN;
  }

  // Count consecutive matching symbols from left to right (WILD counts as match)
  let matchCount = 0;
  const matchPositions: number[] = [];

  for (let col = 0; col < symbols.length; col++) {
    const sym = symbols[col];
    if (sym === baseSymbol || sym === SlotSymbol.WILD) {
      matchCount++;
      matchPositions.push(col);
    } else {
      break; // consecutive match broken
    }
  }

  if (matchCount < 3) return null;

  // Look up the paytable
  const entry = PAYTABLE.find(
    (e) => e.symbol === baseSymbol && e.count === matchCount
  );
  if (!entry) return null;

  return {
    lineIndex,
    symbols,
    positions: matchPositions,
    multiplier: entry.multiplier,
    payout: 0, // filled in by caller
  };
}

/**
 * Check all paylines for wins on a grid.
 *
 * @param grid - 2D array [reel][row] of SlotSymbol
 * @param activeLines - Number of active paylines (1 to PAYLINES.length)
 * @returns Array of winning lines
 */
export function checkWinLines(
  grid: SlotSymbol[][],
  activeLines: number = PAYLINES.length
): SlotWinLine[] {
  const wins: SlotWinLine[] = [];
  const linesToCheck = Math.min(activeLines, PAYLINES.length);

  for (let i = 0; i < linesToCheck; i++) {
    const win = checkPayline(grid, PAYLINES[i], i);
    if (win) {
      wins.push(win);
    }
  }

  return wins;
}

/**
 * Count scatter symbols anywhere on the grid.
 */
export function countScatters(grid: SlotSymbol[][]): number {
  let count = 0;
  for (const reel of grid) {
    for (const sym of reel) {
      if (sym === SlotSymbol.SCATTER) count++;
    }
  }
  return count;
}

/**
 * Determine free spins awarded based on scatter count.
 */
export function getFreeSpins(scatterCount: number): number {
  if (scatterCount >= 5) return 25;
  if (scatterCount >= 4) return 15;
  if (scatterCount >= 3) return 10;
  return 0;
}

/**
 * Calculate total slot payout for a spin.
 *
 * @param grid - The symbol grid from spinReels()
 * @param betPerLine - Bet amount per active payline
 * @param activeLines - Number of active paylines
 * @param houseEdgeBps - House edge in basis points (default 300 = 3%)
 * @returns Full slot result with wins and payout
 */
export function calculateSlotPayout(
  grid: SlotSymbol[][],
  betPerLine: number,
  activeLines: number = PAYLINES.length,
  houseEdgeBps: number = 300
): SlotResult {
  const winLines = checkWinLines(grid, activeLines);

  // Apply bet per line to each win
  let totalPayout = 0;
  for (const win of winLines) {
    win.payout = Math.floor(betPerLine * win.multiplier);
    totalPayout += win.payout;
  }

  // Apply house edge to total payout
  if (totalPayout > 0 && houseEdgeBps > 0) {
    const edge = Math.floor((totalPayout * houseEdgeBps) / 10000);
    totalPayout -= edge;
  }

  const scatterCount = countScatters(grid);
  const freeSpinsAwarded = getFreeSpins(scatterCount);

  // Scatter payout (anywhere on screen)
  if (scatterCount >= 3) {
    const scatterMultiplier = scatterCount >= 5 ? 50 : scatterCount >= 4 ? 20 : 5;
    const scatterPayout = betPerLine * activeLines * scatterMultiplier;
    totalPayout += scatterPayout;
  }

  return {
    grid,
    winLines,
    totalPayout: Math.floor(totalPayout),
    freeSpinsAwarded,
    scatterCount,
  };
}

/**
 * Full slot spin with provably fair seeds.
 */
export function playSlotsRound(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  betPerLine: number,
  activeLines: number = 20,
  houseEdgeBps: number = 300
): SlotResult & { seedHash: string; serverSeedHash: string } {
  const grid = spinReels(serverSeed, clientSeed, nonce);
  const result = calculateSlotPayout(grid, betPerLine, activeLines, houseEdgeBps);

  return {
    ...result,
    seedHash: hashSeed(serverSeed, clientSeed, nonce),
    serverSeedHash: hashServerSeed(serverSeed),
  };
}
