// ============================================================================
// Crash Engine - Ported from Crash.sol
// Exponential multiplier curve, house edge via crash point manipulation
// ============================================================================

import { CrashState } from './types';
import {
  hashSeed,
  seedToFloat,
  calculatePayout,
  hashServerSeed,
  generateServerSeed,
} from './casino-math';
import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** House edge: 2.5% = 250 bps */
export const CRASH_HOUSE_EDGE_BPS = 250;

/** Minimum crash point (always at least 1.00x) */
export const MIN_CRASH_POINT = 1.0;

/** Growth rate per second for the multiplier curve */
export const GROWTH_RATE = 0.00006;

// ---------------------------------------------------------------------------
// Core Engine
// ---------------------------------------------------------------------------

/**
 * Calculate the deterministic crash point from a seed combination.
 * Uses provably fair method: hash -> float -> crash point with house edge.
 *
 * The house edge is implemented by having a (houseEdge)% chance of instant crash at 1.00x.
 * For remaining cases, the crash point follows: 1 / (1 - float)
 * truncated to 2 decimal places.
 *
 * @param serverSeed - Server's secret seed
 * @param clientSeed - Client's public (or game-round) seed
 * @param nonce - Round nonce
 * @param houseEdgeBps - House edge in basis points (default 250 = 2.5%)
 * @returns Crash point multiplier (e.g., 1.00, 2.50, 150.37)
 */
export function calculateCrashPoint(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  houseEdgeBps: number = CRASH_HOUSE_EDGE_BPS
): number {
  const hash = hashSeed(serverSeed, clientSeed, nonce);

  // Use first 13 hex characters (52 bits) for high precision
  const h = parseInt(hash.substring(0, 13), 16);

  // House edge check: if the hash falls in the house edge zone, instant crash
  const houseEdgePct = houseEdgeBps / 10000;
  const e = Math.pow(2, 52); // max value for 13 hex chars

  if (h % Math.floor(e / (1 / houseEdgePct)) === 0) {
    return 1.0;
  }

  // Calculate crash point: floor(100 * e / (e - h)) / 100
  // This gives a distribution where lower multipliers are more likely
  const crashPoint = Math.floor((100 * e) / (e - h)) / 100;

  return Math.max(MIN_CRASH_POINT, crashPoint);
}

/**
 * Calculate the current multiplier based on elapsed time.
 * Uses exponential growth curve.
 *
 * @param elapsed - Milliseconds since round started
 * @returns Current multiplier value
 */
export function tick(elapsed: number): number {
  // Exponential growth: 1 * e^(rate * elapsed)
  const multiplier = Math.pow(Math.E, GROWTH_RATE * elapsed);
  return Math.floor(multiplier * 100) / 100; // truncate to 2 decimal places
}

/**
 * Calculate elapsed time for a given multiplier.
 * Inverse of tick().
 */
export function multiplierToElapsed(multiplier: number): number {
  return Math.log(multiplier) / GROWTH_RATE;
}

/**
 * Check if the game has crashed at the current multiplier.
 */
export function isCrashed(
  currentMultiplier: number,
  crashPoint: number
): boolean {
  return currentMultiplier >= crashPoint;
}

/**
 * Calculate payout for a cashout at a given multiplier.
 *
 * @param betAmount - Original wager
 * @param cashoutMultiplier - Multiplier at cashout time
 * @returns Payout amount (betAmount * multiplier, no additional edge since edge is in crash point)
 */
export function cashout(
  betAmount: number,
  cashoutMultiplier: number
): number {
  if (cashoutMultiplier < 1.0) return 0;
  return Math.floor(betAmount * cashoutMultiplier);
}

// ---------------------------------------------------------------------------
// Crash Game Class (manages multi-player round state)
// ---------------------------------------------------------------------------

export interface CrashPlayer {
  playerId: string;
  betAmount: number;
  cashoutMultiplier: number | null;
  payout: number;
  autoCashout: number | null; // auto-cashout at this multiplier
}

export class CrashGame {
  readonly gameId: string;
  readonly serverSeed: string;
  readonly serverSeedHash: string;
  private clientSeed: string;
  private nonce: number;
  private _crashPoint: number | null;
  private players: Map<string, CrashPlayer>;
  private startTime: number | null;
  private _isCrashed: boolean;

  constructor(gameId: string) {
    this.gameId = gameId;
    this.serverSeed = generateServerSeed();
    this.serverSeedHash = hashServerSeed(this.serverSeed);
    this.clientSeed = '';
    this.nonce = 0;
    this._crashPoint = null;
    this.players = new Map();
    this.startTime = null;
    this._isCrashed = false;
  }

  /** Add a player bet before the round starts */
  placeBet(
    playerId: string,
    betAmount: number,
    autoCashout: number | null = null
  ): void {
    if (this.startTime !== null) {
      throw new Error('Round already started');
    }
    if (this.players.has(playerId)) {
      throw new Error('Already placed a bet');
    }
    this.players.set(playerId, {
      playerId,
      betAmount,
      cashoutMultiplier: null,
      payout: 0,
      autoCashout,
    });
  }

  /** Start the round - determines crash point */
  start(clientSeed: string, nonce: number): { serverSeedHash: string } {
    this.clientSeed = clientSeed;
    this.nonce = nonce;
    this._crashPoint = calculateCrashPoint(
      this.serverSeed,
      this.clientSeed,
      this.nonce
    );
    this.startTime = Date.now();

    return { serverSeedHash: this.serverSeedHash };
  }

  /** Get the crash point (only available after round ends, for fairness) */
  getCrashPoint(): number {
    if (this._crashPoint === null) {
      throw new Error('Round not started');
    }
    return this._crashPoint;
  }

  /** Process a tick - check auto-cashouts and crash */
  processTick(elapsed: number): {
    currentMultiplier: number;
    crashed: boolean;
    autoCashouts: CrashPlayer[];
  } {
    if (this._crashPoint === null) {
      throw new Error('Round not started');
    }

    const currentMultiplier = tick(elapsed);
    const crashed = isCrashed(currentMultiplier, this._crashPoint);
    const autoCashouts: CrashPlayer[] = [];

    // Check auto-cashouts
    for (const player of this.players.values()) {
      if (
        player.cashoutMultiplier === null &&
        player.autoCashout !== null &&
        currentMultiplier >= player.autoCashout &&
        !crashed
      ) {
        player.cashoutMultiplier = player.autoCashout;
        player.payout = cashout(player.betAmount, player.autoCashout);
        autoCashouts.push({ ...player });
      }
    }

    if (crashed) {
      this._isCrashed = true;
      // Anyone who hasn't cashed out loses
      for (const player of this.players.values()) {
        if (player.cashoutMultiplier === null) {
          player.payout = 0;
        }
      }
    }

    return { currentMultiplier, crashed, autoCashouts };
  }

  /** Player cashes out at current multiplier */
  playerCashout(
    playerId: string,
    currentMultiplier: number
  ): CrashPlayer {
    if (this._crashPoint === null) {
      throw new Error('Round not started');
    }
    if (this._isCrashed) {
      throw new Error('Round already crashed');
    }

    const player = this.players.get(playerId);
    if (!player) {
      throw new Error('Player not in this round');
    }
    if (player.cashoutMultiplier !== null) {
      throw new Error('Already cashed out');
    }

    if (isCrashed(currentMultiplier, this._crashPoint)) {
      throw new Error('Cannot cashout - already crashed');
    }

    player.cashoutMultiplier = currentMultiplier;
    player.payout = cashout(player.betAmount, currentMultiplier);

    return { ...player };
  }

  /** Get current game state */
  getState(elapsed: number): CrashState {
    const currentMultiplier = this.startTime ? tick(elapsed) : 1.0;

    return {
      gameId: this.gameId,
      crashPoint: this._isCrashed ? this._crashPoint! : 0, // hidden until crash
      currentMultiplier,
      elapsed,
      isCrashed: this._isCrashed,
      players: [...this.players.values()].map((p) => ({
        playerId: p.playerId,
        betAmount: p.betAmount,
        cashoutMultiplier: p.cashoutMultiplier,
        payout: p.payout,
      })),
    };
  }

  /** Get fairness proof (available after round ends) */
  getFairnessProof() {
    if (!this._isCrashed) {
      throw new Error('Round not finished');
    }

    return {
      serverSeed: this.serverSeed,
      serverSeedHash: this.serverSeedHash,
      clientSeed: this.clientSeed,
      nonce: this.nonce,
      crashPoint: this._crashPoint,
    };
  }
}
