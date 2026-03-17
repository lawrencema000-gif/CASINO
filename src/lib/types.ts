export type GameType =
  | 'slots'
  | 'blackjack'
  | 'roulette'
  | 'dice'
  | 'coinflip'
  | 'crash'
  | 'plinko'
  | 'poker'
  | 'lottery'
  | 'jackpot'
  | 'mines'
  | 'keno'
  | 'limbo'
  | 'hilo'

export type VipTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'bet'
  | 'win'
  | 'bonus'
  | 'refund'

export interface Profile {
  id: string
  username: string
  avatar_url: string | null
  balance: number
  total_wagered: number
  total_won: number
  games_played: number
  level: number
  exp: number
  vip_tier: VipTier
  created_at: string
  updated_at: string
}

export interface GameRecord {
  id: string
  player_id: string
  game_type: GameType
  bet_amount: number
  server_seed_hash: string | null
  client_seed: string | null
  nonce: number | null
  result: Record<string, unknown> | null
  payout: number
  multiplier: number | null
  settled: boolean
  created_at: string
}

export interface Transaction {
  id: string
  player_id: string
  type: TransactionType
  amount: number
  balance_after: number
  game_id: string | null
  description: string | null
  created_at: string
}

export interface Jackpot {
  id: string
  game_type: string
  pool_amount: number
  rake_bps: number
  last_winner_id: string | null
  last_payout: number
  updated_at: string
}

// Game-specific types

export interface SlotSymbol {
  id: string
  name: string
  emoji: string
  multiplier: number
  weight: number
}

export interface SlotResult {
  reels: string[][]
  paylines: { line: number; symbols: string[]; payout: number }[]
  totalPayout: number
  isJackpot: boolean
}

export interface BlackjackCard {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'
  rank: string
  value: number
}

export interface BlackjackHand {
  cards: BlackjackCard[]
  value: number
  isSoft: boolean
  isBust: boolean
  isBlackjack: boolean
}

export interface BlackjackState {
  playerHands: BlackjackHand[]
  dealerHand: BlackjackHand
  activeHandIndex: number
  phase: 'betting' | 'playing' | 'dealer' | 'settled'
  outcomes: ('win' | 'lose' | 'push' | 'blackjack')[]
}

export interface RouletteResult {
  number: number
  color: 'red' | 'black' | 'green'
  bets: RouletteBet[]
  totalPayout: number
}

export interface RouletteBet {
  type: string
  value: string | number
  amount: number
  payout: number
}

export interface DiceResult {
  target: number
  roll: number
  isOver: boolean
  won: boolean
  multiplier: number
  payout: number
}

export interface CrashState {
  multiplier: number
  crashPoint: number
  phase: 'betting' | 'running' | 'crashed'
  cashedOut: boolean
  cashOutMultiplier: number | null
}

export interface PlinkoResult {
  path: number[]
  multiplier: number
  payout: number
  bucket: number
}
