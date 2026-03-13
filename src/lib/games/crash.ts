import type { CrashState } from '@/lib/types'

// ---------------------------------------------------------------------------
// Crash point generation
// ---------------------------------------------------------------------------

/**
 * Generate a crash point from a provably fair RNG value (0-1).
 * Uses the formula: max(1, floor(100 / (1 - rngValue)) / 100)
 * Capped at 1000x. Includes ~1% house edge (when rngValue < 0.01, crash at 1x).
 */
export function generateCrashPoint(rngValue: number): number {
  // 1% house edge: instant crash
  if (rngValue < 0.01) return 1

  const raw = Math.floor((100 / (1 - rngValue)) * 1) / 100
  return Math.min(Math.max(1, raw), 1000)
}

// ---------------------------------------------------------------------------
// Tick / multiplier progression
// ---------------------------------------------------------------------------

/** Growth rate constant for the exponential curve. */
const GROWTH_RATE = 0.00006

/**
 * Calculate the current multiplier based on elapsed milliseconds.
 * Uses exponential growth: e^(rate * elapsed), truncated to 2 decimals.
 */
export function tick(elapsed: number): number {
  const multiplier = Math.pow(Math.E, GROWTH_RATE * elapsed)
  return Math.floor(multiplier * 100) / 100
}

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

export function createCrashState(crashPoint: number): CrashState {
  return {
    multiplier: 1,
    crashPoint,
    phase: 'betting',
    cashedOut: false,
    cashOutMultiplier: null,
  }
}

export function startRound(state: CrashState): CrashState {
  return { ...state, phase: 'running', multiplier: 1 }
}

export function updateMultiplier(
  state: CrashState,
  elapsed: number
): CrashState {
  if (state.phase !== 'running') return state

  const current = tick(elapsed)

  if (current >= state.crashPoint) {
    return { ...state, multiplier: state.crashPoint, phase: 'crashed' }
  }

  return { ...state, multiplier: current }
}

export function cashOut(state: CrashState): CrashState {
  if (state.phase !== 'running' || state.cashedOut) return state
  return {
    ...state,
    cashedOut: true,
    cashOutMultiplier: state.multiplier,
  }
}

/**
 * Calculate payout for a crash game.
 */
export function calculateCrashPayout(
  bet: number,
  state: CrashState
): number {
  if (!state.cashedOut || state.cashOutMultiplier === null) return 0
  return Math.floor(bet * state.cashOutMultiplier * 100) / 100
}
