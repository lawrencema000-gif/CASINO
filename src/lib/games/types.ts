// ============================================================================
// Casino Game Engine - Shared Types
// ============================================================================

// ---------------------------------------------------------------------------
// Card Types
// ---------------------------------------------------------------------------

export enum CardSuit {
  DIAMOND = 1,
  CLUB = 2,
  HEART = 3,
  SPADE = 4,
}

export enum CardValue {
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
  SIX = 6,
  SEVEN = 7,
  EIGHT = 8,
  NINE = 9,
  TEN = 10,
  JACK = 11,
  QUEEN = 12,
  KING = 13,
  ACE = 14,
}

/** Card encoded as (suit << 4) | value */
export type Card = number;

export interface DecodedCard {
  suit: CardSuit;
  value: CardValue;
  encoded: Card;
}

export enum HandRank {
  HIGH_CARD = 1,
  ONE_PAIR = 2,
  TWO_PAIR = 3,
  THREE_OF_A_KIND = 4,
  STRAIGHT = 5,
  FLUSH = 6,
  FULL_HOUSE = 7,
  FOUR_OF_A_KIND = 8,
  STRAIGHT_FLUSH = 9,
  ROYAL_FLUSH = 10,
}

export interface Hand {
  cards: Card[];
  rank: HandRank;
  value: number;
  name: string;
}

// ---------------------------------------------------------------------------
// Game Types
// ---------------------------------------------------------------------------

export enum GameType {
  SLOTS = 'slots',
  BLACKJACK = 'blackjack',
  ROULETTE = 'roulette',
  DICE = 'dice',
  COINFLIP = 'coinflip',
  CRASH = 'crash',
  PLINKO = 'plinko',
  POKER = 'poker',
  LOTTERY = 'lottery',
  JACKPOT = 'jackpot',
}

export interface GameState {
  gameId: string;
  gameType: GameType;
  playerId: string;
  betAmount: number;
  timestamp: number;
  settled: boolean;
  result: unknown;
  payout: number;
}

export interface GameResult {
  gameId: string;
  gameType: GameType;
  won: boolean;
  payout: number;
  multiplier: number;
  result: unknown;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}

export interface BetResult {
  won: boolean;
  payout: number;
  multiplier: number;
  details: unknown;
}

export interface PlayerState {
  playerId: string;
  balance: number;
  bet: number;
  cards: Card[];
  score: number;
  isActive: boolean;
  isAllIn: boolean;
  hasFolded: boolean;
}

// ---------------------------------------------------------------------------
// Slots Types
// ---------------------------------------------------------------------------

export enum SlotSymbol {
  CHERRY = 0,
  LEMON = 1,
  ORANGE = 2,
  PLUM = 3,
  BELL = 4,
  BAR = 5,
  SEVEN = 6,
  WILD = 7,
  SCATTER = 8,
}

export interface ReelResult {
  symbols: SlotSymbol[];
}

export interface SlotWinLine {
  lineIndex: number;
  symbols: SlotSymbol[];
  positions: number[];
  multiplier: number;
  payout: number;
}

export interface SlotResult {
  grid: SlotSymbol[][];
  winLines: SlotWinLine[];
  totalPayout: number;
  freeSpinsAwarded: number;
  scatterCount: number;
}

// ---------------------------------------------------------------------------
// Roulette Types
// ---------------------------------------------------------------------------

export enum RouletteBetType {
  STRAIGHT = 0,   // Single number (35:1)
  SPLIT = 1,      // Two numbers (17:1)
  STREET = 2,     // Three numbers (11:1)
  CORNER = 3,     // Four numbers (8:1)
  LINE = 4,       // Six numbers (5:1)
  DOZEN = 5,      // 12 numbers (2:1)
  COLUMN = 6,     // 12 numbers (2:1)
  RED = 7,        // 18 numbers (1:1)
  BLACK = 8,      // 18 numbers (1:1)
  ODD = 9,        // 18 numbers (1:1)
  EVEN = 10,      // 18 numbers (1:1)
  HIGH = 11,      // 18 numbers (1:1)
  LOW = 12,       // 18 numbers (1:1)
}

export interface RouletteBet {
  type: RouletteBetType;
  value: number | number[];
  amount: number;
}

export interface RouletteResult {
  winningNumber: number;
  bets: Array<RouletteBet & { won: boolean; payout: number }>;
  totalPayout: number;
}

// ---------------------------------------------------------------------------
// Dice Types
// ---------------------------------------------------------------------------

export interface DiceConfig {
  minTarget: number;
  maxTarget: number;
  houseEdgeBps: number;
}

export interface DiceResult {
  roll: number;
  target: number;
  rollUnder: boolean;
  won: boolean;
  multiplier: number;
  payout: number;
}

// ---------------------------------------------------------------------------
// Crash Types
// ---------------------------------------------------------------------------

export interface CrashState {
  gameId: string;
  crashPoint: number;
  currentMultiplier: number;
  elapsed: number;
  isCrashed: boolean;
  players: Array<{
    playerId: string;
    betAmount: number;
    cashoutMultiplier: number | null;
    payout: number;
  }>;
}

// ---------------------------------------------------------------------------
// Plinko Types
// ---------------------------------------------------------------------------

export interface PlinkoConfig {
  rows: 8 | 12 | 16;
  riskLevel: PlinkoRiskLevel;
}

export enum PlinkoRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export interface PlinkoResult {
  path: Array<-1 | 1>;
  finalPosition: number;
  bucketIndex: number;
  multiplier: number;
  payout: number;
}

// ---------------------------------------------------------------------------
// Lottery Types
// ---------------------------------------------------------------------------

export interface LotteryTicket {
  ticketId: string;
  playerId: string;
  numbers: number[];
  drawId: string;
  betAmount: number;
  timestamp: number;
}

export interface LotteryDraw {
  drawId: string;
  winningNumbers: number[];
  prizePool: number;
  ticketCount: number;
  drawn: boolean;
  timestamp: number;
}

export interface LotteryResult {
  ticketId: string;
  matches: number;
  matchedNumbers: number[];
  prize: number;
  tier: string;
}

// ---------------------------------------------------------------------------
// Payout / Config Types
// ---------------------------------------------------------------------------

export interface PayoutConfig {
  gameType: GameType;
  houseEdgeBps: number;
  minBet: number;
  maxBet: number;
  payoutMultiplierBps: number;
}

export interface FairnessProof {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  result: string;
}
