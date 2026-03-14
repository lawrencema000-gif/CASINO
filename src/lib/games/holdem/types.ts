export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'
  rank: string // '2'-'10', 'J', 'Q', 'K', 'A'
  value: number // 2-14
}

export type HandRank =
  | 'royal_flush'
  | 'straight_flush'
  | 'four_of_a_kind'
  | 'full_house'
  | 'flush'
  | 'straight'
  | 'three_of_a_kind'
  | 'two_pair'
  | 'one_pair'
  | 'high_card'

export const HAND_RANK_VALUES: Record<HandRank, number> = {
  royal_flush: 10,
  straight_flush: 9,
  four_of_a_kind: 8,
  full_house: 7,
  flush: 6,
  straight: 5,
  three_of_a_kind: 4,
  two_pair: 3,
  one_pair: 2,
  high_card: 1,
}

export const HAND_RANK_NAMES: Record<HandRank, string> = {
  royal_flush: 'Royal Flush',
  straight_flush: 'Straight Flush',
  four_of_a_kind: 'Four of a Kind',
  full_house: 'Full House',
  flush: 'Flush',
  straight: 'Straight',
  three_of_a_kind: 'Three of a Kind',
  two_pair: 'Two Pair',
  one_pair: 'One Pair',
  high_card: 'High Card',
}

export type GamePhase =
  | 'waiting'
  | 'preflop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown'
  | 'finished'

export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all_in'

export interface PokerPlayer {
  id: string
  username: string
  seatIndex: number
  chips: number
  bet: number
  holeCards: Card[]
  folded: boolean
  allIn: boolean
  isDealer: boolean
  isSmallBlind: boolean
  isBigBlind: boolean
  isTurn: boolean
  lastAction?: PlayerAction
  bestHand?: { rank: HandRank; cards: Card[]; score: number }
}

export interface PokerRoom {
  id: string
  name: string
  blinds: { small: number; big: number }
  maxPlayers: number
  players: PokerPlayer[]
  communityCards: Card[]
  pot: number
  sidePots: { amount: number; eligible: string[] }[]
  phase: GamePhase
  currentTurn: number // seat index
  dealerSeat: number
  minRaise: number
  lastRaise: number
  deck: Card[]
  winners?: { playerId: string; amount: number; hand: HandRank }[]
}
