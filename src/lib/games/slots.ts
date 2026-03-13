import type { SlotSymbol, SlotResult } from '@/lib/types'

// ---------------------------------------------------------------------------
// Symbols
// ---------------------------------------------------------------------------

export const SYMBOLS: SlotSymbol[] = [
  { id: 'seven', name: 'Seven', emoji: '7\uFE0F\u20E3', multiplier: 50, weight: 2 },
  { id: 'diamond', name: 'Diamond', emoji: '\uD83D\uDC8E', multiplier: 25, weight: 3 },
  { id: 'bell', name: 'Bell', emoji: '\uD83D\uDD14', multiplier: 15, weight: 5 },
  { id: 'cherry', name: 'Cherry', emoji: '\uD83C\uDF52', multiplier: 10, weight: 8 },
  { id: 'lemon', name: 'Lemon', emoji: '\uD83C\uDF4B', multiplier: 5, weight: 12 },
  { id: 'orange', name: 'Orange', emoji: '\uD83C\uDF4A', multiplier: 3, weight: 15 },
  { id: 'grape', name: 'Grape', emoji: '\uD83C\uDF47', multiplier: 2, weight: 20 },
  { id: 'star', name: 'Star', emoji: '\u2B50', multiplier: 0, weight: 5 },
]

const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + s.weight, 0)

// ---------------------------------------------------------------------------
// Paylines (indices into a 3x3 grid: row 0=top, 1=middle, 2=bottom)
// Each payline is [[reel0Row, reel1Row, reel2Row]]
// ---------------------------------------------------------------------------

export function getPaylines(): number[][] {
  return [
    [0, 0, 0], // top row
    [1, 1, 1], // middle row
    [2, 2, 2], // bottom row
    [0, 1, 2], // diagonal top-left to bottom-right
    [2, 1, 0], // diagonal bottom-left to top-right
  ]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickSymbol(rng: number): SlotSymbol {
  let roll = Math.floor(rng * TOTAL_WEIGHT)
  for (const sym of SYMBOLS) {
    roll -= sym.weight
    if (roll < 0) return sym
  }
  return SYMBOLS[SYMBOLS.length - 1]
}

/**
 * Simple seeded PRNG (splitmix-style) to derive multiple values from one float.
 */
function deriveRng(base: number, index: number): number {
  // Use a simple hash-like mixing based on the base value and index
  let x = Math.floor(base * 0x100000000) + index * 2654435761
  x = ((x >>> 16) ^ x) * 0x45d9f3b
  x = ((x >>> 16) ^ x) * 0x45d9f3b
  x = (x >>> 16) ^ x
  return (x >>> 0) / 0x100000000
}

// ---------------------------------------------------------------------------
// Core spin function
// ---------------------------------------------------------------------------

/**
 * Spin the slot machine.
 *
 * @param bet - The wager amount
 * @param rngValue - A float 0-1 from the provably fair system
 * @returns SlotResult with reels, payline wins, totalPayout, and jackpot flag
 */
export function spin(bet: number, rngValue: number): SlotResult {
  // Generate a 3x3 grid (3 reels, 3 rows each)
  const reels: string[][] = []
  let rngIndex = 0

  for (let reel = 0; reel < 3; reel++) {
    const column: string[] = []
    for (let row = 0; row < 3; row++) {
      const r = deriveRng(rngValue, rngIndex++)
      const symbol = pickSymbol(r)
      column.push(symbol.id)
    }
    reels.push(column)
  }

  // Check paylines
  const paylines = getPaylines()
  const paylineResults: { line: number; symbols: string[]; payout: number }[] = []
  let totalPayout = 0
  let isJackpot = false

  for (let lineIdx = 0; lineIdx < paylines.length; lineIdx++) {
    const line = paylines[lineIdx]
    const lineSymbols = line.map((row, reel) => reels[reel][row])

    // Check for 3-of-a-kind (star/wild matches anything)
    const nonWild = lineSymbols.filter((s) => s !== 'star')
    const baseSymbol = nonWild.length > 0 ? nonWild[0] : 'seven' // all wilds = best symbol

    const allMatch = lineSymbols.every(
      (s) => s === baseSymbol || s === 'star'
    )

    if (allMatch) {
      const sym = SYMBOLS.find((s) => s.id === baseSymbol)
      if (sym && sym.multiplier > 0) {
        const payout = bet * sym.multiplier
        totalPayout += payout
        paylineResults.push({ line: lineIdx, symbols: lineSymbols, payout })

        if (baseSymbol === 'seven') {
          isJackpot = true
        }
      }
    }
  }

  return {
    reels,
    paylines: paylineResults,
    totalPayout,
    isJackpot,
  }
}
