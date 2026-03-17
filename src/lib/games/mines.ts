import crypto from 'crypto'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MinesResult {
  /** Mine positions (only revealed when the game ends) */
  mines: number[] | undefined
  /** Whether the picked tile was a mine */
  hitMine: boolean
  /** The tile the player picked */
  pick: number
  /** Number of safe tiles revealed so far (including this pick if safe) */
  safeRevealed: number
  /** Total safe tiles on the board */
  safeTiles: number
  /** Current cumulative multiplier (0 if busted) */
  multiplier: number
  payout: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRID_SIZE = 25  // 5x5
const HOUSE_EDGE = 0.97

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Deterministically place mines on the 5x5 grid using the combined seed.
 */
function placeMines(seed: string, mineCount: number): number[] {
  const mines: number[] = []
  for (let i = 0; i < mineCount; i++) {
    const hash = crypto.createHash('sha256').update(`${seed}:mine:${i}`).digest('hex')
    let pos = parseInt(hash.substring(0, 8), 16) % GRID_SIZE
    while (mines.includes(pos)) {
      pos = (pos + 1) % GRID_SIZE
    }
    mines.push(pos)
  }
  return mines
}

/**
 * Calculate the cumulative multiplier after revealing `revealed` safe tiles
 * on a board with `mineCount` mines.
 *
 * Formula: product of (remaining_tiles / remaining_safe_tiles) for each reveal,
 * multiplied by the house edge factor.
 *
 * This is equivalent to:
 *   multiplier = HOUSE_EDGE * C(GRID_SIZE, revealed) / C(GRID_SIZE - mineCount, revealed)
 * where C(n,k) = n! / (k! * (n-k)!)
 *
 * We compute iteratively for numerical stability.
 */
function cumulativeMultiplier(mineCount: number, revealed: number): number {
  let mult = 1
  for (let i = 0; i < revealed; i++) {
    mult *= (GRID_SIZE - i) / (GRID_SIZE - mineCount - i)
  }
  return parseFloat((mult * HOUSE_EDGE).toFixed(4))
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Reveal a single tile on the Mines board.
 *
 * @param rngSeed - Combined provably-fair seed
 * @param bet - Wager amount
 * @param mineCount - Number of mines (1-24)
 * @param pick - Tile index to reveal (0-24)
 * @param previouslyRevealed - Number of tiles already safely revealed
 */
export function revealTile(
  rngSeed: string,
  bet: number,
  mineCount: number,
  pick: number,
  previouslyRevealed: number
): MinesResult {
  const mines = placeMines(rngSeed, mineCount)
  const hitMine = mines.includes(pick)
  const safeTiles = GRID_SIZE - mineCount

  const safeRevealed = previouslyRevealed + (hitMine ? 0 : 1)
  const multiplier = hitMine ? 0 : cumulativeMultiplier(mineCount, safeRevealed)
  const payout = hitMine ? 0 : Math.floor(bet * multiplier * 100) / 100

  return {
    mines: hitMine ? mines : undefined, // only reveal mine positions on bust
    hitMine,
    pick,
    safeRevealed,
    safeTiles,
    multiplier,
    payout,
  }
}

/**
 * Cash out — returns the current multiplier and payout without revealing a tile.
 */
export function cashOut(
  bet: number,
  mineCount: number,
  safeRevealed: number
): { multiplier: number; payout: number } {
  const multiplier = cumulativeMultiplier(mineCount, safeRevealed)
  const payout = Math.floor(bet * multiplier * 100) / 100
  return { multiplier, payout }
}
