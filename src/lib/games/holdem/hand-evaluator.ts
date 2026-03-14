import type { Card, HandRank } from './types'

interface HandResult {
  rank: HandRank
  score: number // numeric score for comparing hands of same rank
  cards: Card[] // the best 5 cards
}

/**
 * Evaluate a 5-card poker hand.
 * Returns rank and a numeric score for comparison.
 */
function evaluate5(cards: Card[]): HandResult {
  if (cards.length !== 5) throw new Error('Must pass exactly 5 cards')

  const sorted = [...cards].sort((a, b) => b.value - a.value)
  const values = sorted.map((c) => c.value)

  // Check flush
  const isFlush = sorted.every((c) => c.suit === sorted[0].suit)

  // Check straight
  let isStraight = false
  let straightHigh = values[0]

  if (
    values[0] - values[1] === 1 &&
    values[1] - values[2] === 1 &&
    values[2] - values[3] === 1 &&
    values[3] - values[4] === 1
  ) {
    isStraight = true
  }

  // Ace-low straight (A-2-3-4-5)
  if (
    values[0] === 14 &&
    values[1] === 5 &&
    values[2] === 4 &&
    values[3] === 3 &&
    values[4] === 2
  ) {
    isStraight = true
    straightHigh = 5 // Ace is low
  }

  // Count occurrences
  const counts: Record<number, number> = {}
  for (const v of values) counts[v] = (counts[v] || 0) + 1

  const groups = Object.entries(counts)
    .map(([val, count]) => ({ val: parseInt(val), count }))
    .sort((a, b) => b.count - a.count || b.val - a.val)

  // Build score: rank << 20 | kickers
  const packKickers = (vals: number[]) => {
    let s = 0
    for (let i = 0; i < vals.length && i < 5; i++) {
      s |= vals[i] << ((4 - i) * 4)
    }
    return s
  }

  let rank: HandRank
  let score: number

  if (isFlush && isStraight) {
    if (straightHigh === 14 && values[4] === 10) {
      rank = 'royal_flush'
      score = (10 << 20) | packKickers([14, 13, 12, 11, 10])
    } else {
      rank = 'straight_flush'
      score = (9 << 20) | packKickers([straightHigh])
    }
  } else if (groups[0].count === 4) {
    rank = 'four_of_a_kind'
    const quad = groups[0].val
    const kicker = groups[1].val
    score = (8 << 20) | packKickers([quad, kicker])
  } else if (groups[0].count === 3 && groups[1].count === 2) {
    rank = 'full_house'
    score = (7 << 20) | packKickers([groups[0].val, groups[1].val])
  } else if (isFlush) {
    rank = 'flush'
    score = (6 << 20) | packKickers(values)
  } else if (isStraight) {
    rank = 'straight'
    score = (5 << 20) | packKickers([straightHigh])
  } else if (groups[0].count === 3) {
    rank = 'three_of_a_kind'
    const trips = groups[0].val
    const kickers = values.filter((v) => v !== trips)
    score = (4 << 20) | packKickers([trips, ...kickers])
  } else if (groups[0].count === 2 && groups[1].count === 2) {
    rank = 'two_pair'
    const high = Math.max(groups[0].val, groups[1].val)
    const low = Math.min(groups[0].val, groups[1].val)
    const kicker = values.find((v) => v !== high && v !== low)!
    score = (3 << 20) | packKickers([high, low, kicker])
  } else if (groups[0].count === 2) {
    rank = 'one_pair'
    const pair = groups[0].val
    const kickers = values.filter((v) => v !== pair)
    score = (2 << 20) | packKickers([pair, ...kickers])
  } else {
    rank = 'high_card'
    score = (1 << 20) | packKickers(values)
  }

  return { rank, score, cards: sorted }
}

/**
 * From 7 cards (2 hole + 5 community), find the best 5-card hand.
 * Evaluates all C(7,5) = 21 combinations.
 */
export function evaluateBestHand(
  holeCards: Card[],
  communityCards: Card[]
): HandResult {
  const all = [...holeCards, ...communityCards]
  if (all.length < 5) throw new Error('Need at least 5 cards')

  let bestResult: HandResult | null = null

  // Generate all C(n,5) combinations
  const n = all.length
  for (let i = 0; i < n - 4; i++) {
    for (let j = i + 1; j < n - 3; j++) {
      for (let k = j + 1; k < n - 2; k++) {
        for (let l = k + 1; l < n - 1; l++) {
          for (let m = l + 1; m < n; m++) {
            const hand = [all[i], all[j], all[k], all[l], all[m]]
            const result = evaluate5(hand)
            if (!bestResult || result.score > bestResult.score) {
              bestResult = result
            }
          }
        }
      }
    }
  }

  return bestResult!
}

/**
 * Compare two hand results. Returns:
 *  positive if a wins, negative if b wins, 0 for tie
 */
export function compareHands(a: HandResult, b: HandResult): number {
  return a.score - b.score
}
