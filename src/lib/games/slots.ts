import type { SlotSymbol, SlotResult } from '@/lib/types'

// ---------------------------------------------------------------------------
// Symbols — weights tuned for 5-reel play
// ---------------------------------------------------------------------------

export const SYMBOLS: SlotSymbol[] = [
  { id: 'seven', name: 'Seven', emoji: '7\uFE0F\u20E3', multiplier: 25, weight: 2 },
  { id: 'diamond', name: 'Diamond', emoji: '\uD83D\uDC8E', multiplier: 15, weight: 3 },
  { id: 'bell', name: 'Bell', emoji: '\uD83D\uDD14', multiplier: 10, weight: 5 },
  { id: 'cherry', name: 'Cherry', emoji: '\uD83C\uDF52', multiplier: 5, weight: 8 },
  { id: 'lemon', name: 'Lemon', emoji: '\uD83C\uDF4B', multiplier: 3, weight: 12 },
  { id: 'orange', name: 'Orange', emoji: '\uD83C\uDF4A', multiplier: 2, weight: 15 },
  { id: 'grape', name: 'Grape', emoji: '\uD83C\uDF47', multiplier: 2, weight: 20 },
  { id: 'star', name: 'Star', emoji: '\u2B50', multiplier: 0, weight: 5 }, // wild
]

const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + s.weight, 0)

// ---------------------------------------------------------------------------
// 20 Paylines for a 5×3 grid
// Each payline is [row_reel0, row_reel1, row_reel2, row_reel3, row_reel4]
// Rows: 0 = top, 1 = middle, 2 = bottom
// ---------------------------------------------------------------------------

export function getPaylines(): number[][] {
  return [
    // Straight lines
    [1, 1, 1, 1, 1], //  0: middle row
    [0, 0, 0, 0, 0], //  1: top row
    [2, 2, 2, 2, 2], //  2: bottom row

    // V-shapes
    [0, 1, 2, 1, 0], //  3: V down
    [2, 1, 0, 1, 2], //  4: V up (inverted V)

    // W-shapes
    [0, 2, 0, 2, 0], //  5: zigzag top-bot-top-bot-top
    [2, 0, 2, 0, 2], //  6: zigzag bot-top-bot-top-bot

    // Diagonals
    [0, 0, 1, 2, 2], //  7: top-left to bottom-right
    [2, 2, 1, 0, 0], //  8: bottom-left to top-right

    // Steps
    [0, 1, 1, 1, 0], //  9: slight dip
    [2, 1, 1, 1, 2], // 10: slight rise
    [1, 0, 0, 0, 1], // 11: top plateau
    [1, 2, 2, 2, 1], // 12: bottom plateau

    // Waves
    [0, 1, 0, 1, 0], // 13: gentle wave top
    [2, 1, 2, 1, 2], // 14: gentle wave bottom
    [1, 0, 1, 0, 1], // 15: gentle wave middle-top
    [1, 2, 1, 2, 1], // 16: gentle wave middle-bottom

    // Asymmetric
    [0, 0, 1, 2, 2], // 17: descending slope (duplicate of 7 — replaced)
    [1, 0, 1, 2, 1], // 18: peak then valley
    [1, 2, 1, 0, 1], // 19: valley then peak
  ]
}

// Replace duplicate line 17
getPaylines()[17] = [0, 1, 2, 2, 1] // descending then up

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

function deriveRng(base: number, index: number): number {
  let x = Math.floor(base * 0x100000000) + index * 2654435761
  x = ((x >>> 16) ^ x) * 0x45d9f3b
  x = ((x >>> 16) ^ x) * 0x45d9f3b
  x = (x >>> 16) ^ x
  return (x >>> 0) / 0x100000000
}

// ---------------------------------------------------------------------------
// Core spin function — 5×3 grid, 20 paylines
// ---------------------------------------------------------------------------

export function spin(bet: number, rngValue: number): SlotResult {
  const reels: string[][] = []
  let rngIndex = 0

  for (let reel = 0; reel < 5; reel++) {
    const column: string[] = []
    for (let row = 0; row < 3; row++) {
      const r = deriveRng(rngValue, rngIndex++)
      const symbol = pickSymbol(r)
      column.push(symbol.id)
    }
    reels.push(column)
  }

  // Evaluate all 20 paylines
  const paylines = getPaylines()
  const paylineResults: { line: number; symbols: string[]; payout: number }[] = []
  let totalPayout = 0
  let isJackpot = false

  for (let lineIdx = 0; lineIdx < paylines.length; lineIdx++) {
    const line = paylines[lineIdx]
    const lineSymbols = line.map((row, reel) => reels[reel][row])

    // Count consecutive matches from left (star/wild matches anything)
    const first = lineSymbols.find((s) => s !== 'star') || 'seven'
    let consecutive = 0

    for (let i = 0; i < 5; i++) {
      if (lineSymbols[i] === first || lineSymbols[i] === 'star') {
        consecutive++
      } else {
        break
      }
    }

    if (consecutive >= 3) {
      const sym = SYMBOLS.find((s) => s.id === first)
      if (sym && sym.multiplier > 0) {
        // Scale multiplier by consecutive count: 3-of-a-kind = 1x, 4 = 2x, 5 = 5x
        const scale = consecutive === 5 ? 5 : consecutive === 4 ? 2 : 1
        const payout = bet * sym.multiplier * scale
        totalPayout += payout
        paylineResults.push({ line: lineIdx, symbols: lineSymbols, payout })

        if (first === 'seven' && consecutive === 5) {
          isJackpot = true
        }
      }
    } else if (consecutive === 2) {
      // 2-of-a-kind on first two reels: return 0.5x bet (from Solana contract)
      const sym = SYMBOLS.find((s) => s.id === first)
      if (sym && sym.multiplier >= 5) {
        // Only high-value symbols pay for 2-of-a-kind
        const payout = Math.floor(bet * 0.5)
        totalPayout += payout
        paylineResults.push({ line: lineIdx, symbols: lineSymbols, payout })
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
