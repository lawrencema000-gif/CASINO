// ============================================================================
// Texas Hold'em Engine - Ported from holdem_poker.js + holdem_game.js
// ============================================================================

import { Card, HandRank, Hand, PlayerState, GameType } from './types';
import {
  createDeck,
  drawCards,
  drawCardsDeterministic,
  sortByValue,
  cloneCards,
  mergeCards,
  cardToString,
  visualize,
  shuffleDeckDeterministic,
  getCardSuit,
  getCardValue,
} from './poker';
import { generateServerSeed, hashSeed } from './casino-math';

// ---------------------------------------------------------------------------
// Hand Rank Constants
// ---------------------------------------------------------------------------

const HAND_NAMES: Record<number, string> = {
  0: 'invalid',
  [HandRank.HIGH_CARD]: 'High Card',
  [HandRank.ONE_PAIR]: 'One Pair',
  [HandRank.TWO_PAIR]: 'Two Pair',
  [HandRank.THREE_OF_A_KIND]: 'Three of a Kind',
  [HandRank.STRAIGHT]: 'Straight',
  [HandRank.FLUSH]: 'Flush',
  [HandRank.FULL_HOUSE]: 'Full House',
  [HandRank.FOUR_OF_A_KIND]: 'Four of a Kind',
  [HandRank.STRAIGHT_FLUSH]: 'Straight Flush',
  [HandRank.ROYAL_FLUSH]: 'Royal Flush',
};

// ---------------------------------------------------------------------------
// Hand Sorting (internal, ported from holdem_poker.js)
// ---------------------------------------------------------------------------

/**
 * Sort 5 cards into canonical order for pattern recognition.
 * Groups same-value cards together, with pairs/trips/quads first.
 * Mutates and returns the array.
 */
function sortForRanking(cards: Card[]): Card[] {
  if (cards.length !== 5) return cards;

  // Sort descending by value first
  cards.sort((a, b) => {
    const aVal = a & 0x0f;
    const bVal = b & 0x0f;
    if (aVal !== bVal) return bVal - aVal;
    return (b >> 4) - (a >> 4);
  });

  const n0 = cards[0] & 0x0f;
  const n1 = cards[1] & 0x0f;
  const n2 = cards[2] & 0x0f;
  const n3 = cards[3] & 0x0f;
  const n4 = cards[4] & 0x0f;

  const d0 = n0 - n1;
  const d1 = n1 - n2;
  const d2 = n2 - n3;
  const d3 = n3 - n4;

  if (d1 === 0 && d2 === 0) {
    if (d0 === 0) {
      // XXXXM - four of a kind, kicker at end
    } else if (d3 === 0) {
      // MXXXX -> XXXXM
      cards.push(cards.shift()!);
    } else {
      // MXXXN -> XXXMN
      const c0 = cards.shift()!;
      cards.splice(3, 0, c0);
    }
  } else if (d0 === 0 && d1 === 0) {
    // XXXMN or XXXMM
  } else if (d2 === 0 && d3 === 0) {
    // MNXXX -> XXXMN
    cards.push(cards.shift()!);
    cards.push(cards.shift()!);
  } else if (d0 === 0 && d2 === 0) {
    // XXYYM
  } else if (d0 === 0 && d3 === 0) {
    // XXMYY -> XXYYM
    const c2 = cards[2];
    cards.splice(2, 1);
    cards.push(c2);
  } else if (d1 === 0 && d3 === 0) {
    // MXXYY -> XXYYM
    cards.push(cards.shift()!);
  } else if (d0 === 0) {
    // XXABC
  } else if (d1 === 0) {
    // AXXBC -> XXABC
    const c0 = cards.shift()!;
    cards.splice(2, 0, c0);
  } else if (d2 === 0) {
    // ABXXC -> XXABC
    const c2 = cards[2];
    const c3 = cards[3];
    cards.splice(2, 2);
    cards.unshift(c3);
    cards.unshift(c2);
  } else if (d3 === 0) {
    // ABCXX -> XXABC
    cards.push(cards.shift()!);
    cards.push(cards.shift()!);
    cards.push(cards.shift()!);
  }
  // else: ABCDE - no groups

  return cards;
}

// ---------------------------------------------------------------------------
// Hand Evaluation
// ---------------------------------------------------------------------------

/**
 * Compute the rank value for a 5-card hand.
 * Returns a single number where higher = better hand.
 * Upper bits encode the hand pattern, lower bits encode tiebreaker values.
 */
export function rankHand(cards: Card[]): number {
  if (cards.length !== 5) return 0;

  const sorted = cloneCards(cards);
  sortForRanking(sorted);

  const c0 = sorted[0] >> 4;
  const c1 = sorted[1] >> 4;
  const c2 = sorted[2] >> 4;
  const c3 = sorted[3] >> 4;
  const c4 = sorted[4] >> 4;

  const n0 = sorted[0] & 0x0f;
  const n1 = sorted[1] & 0x0f;
  const n2 = sorted[2] & 0x0f;
  const n3 = sorted[3] & 0x0f;
  const n4 = sorted[4] & 0x0f;

  const d0 = n0 - n1;
  const d1 = n1 - n2;
  const d2 = n2 - n3;
  const d3 = n3 - n4;

  const isFlush = c0 === c1 && c1 === c2 && c2 === c3 && c3 === c4;

  let isStraight: boolean;
  if (n0 === 14 && d0 === 9) {
    // A-5-4-3-2 straight (wheel)
    isStraight = d1 === 1 && d2 === 1 && d3 === 1;
  } else {
    isStraight = d0 === 1 && d1 === 1 && d2 === 1 && d3 === 1;
  }

  let rank = (n0 << 16) | (n1 << 12) | (n2 << 8) | (n3 << 4) | n4;

  // For A-5 straight, Ace counts as 1 for ranking purposes
  if (n0 === 14 && d0 === 9 && d1 === 1 && d2 === 1 && d3 === 1) {
    rank = (1 << 16) | (n1 << 12) | (n2 << 8) | (n3 << 4) | n4;
  }

  let pattern = 0;

  if (isFlush && isStraight) {
    pattern = n4 === 10 ? HandRank.ROYAL_FLUSH : HandRank.STRAIGHT_FLUSH;
  } else if (d0 === 0 && d1 === 0 && d2 === 0) {
    pattern = HandRank.FOUR_OF_A_KIND;
  } else if (d0 === 0 && d1 === 0 && d3 === 0) {
    pattern = HandRank.FULL_HOUSE;
  } else if (isFlush) {
    pattern = HandRank.FLUSH;
  } else if (isStraight) {
    pattern = HandRank.STRAIGHT;
  } else if (d0 === 0 && d1 === 0) {
    pattern = HandRank.THREE_OF_A_KIND;
  } else if (d0 === 0 && d2 === 0) {
    pattern = HandRank.TWO_PAIR;
  } else if (d0 === 0) {
    pattern = HandRank.ONE_PAIR;
  } else {
    pattern = HandRank.HIGH_CARD;
  }

  return (pattern << 20) | rank;
}

/**
 * Evaluate a 5-card hand and return structured result.
 */
export function evaluateHand(cards: Card[]): Hand {
  const value = rankHand(cards);
  const rank = (value >> 20) as HandRank;
  return {
    cards: cloneCards(cards),
    rank,
    value,
    name: HAND_NAMES[rank] ?? 'Unknown',
  };
}

/**
 * Get the hand rank name from a rank number.
 */
export function getHandName(rank: HandRank): string {
  return HAND_NAMES[rank] ?? 'Unknown';
}

/**
 * Find the best 5-card hand from 7 cards (2 hole + 5 community).
 * Ported from holdem_poker.js maxFive().
 */
export function bestFiveFromSeven(
  holeCards: Card[],
  communityCards: Card[]
): Hand {
  if (holeCards.length !== 2 || communityCards.length !== 5) {
    throw new Error('Need exactly 2 hole cards and 5 community cards');
  }

  let maxRank = 0;
  let maxCards: Card[] | null = null;

  // Evaluate just the 5 community cards
  const boardCards = cloneCards(communityCards);
  let tmpRank = rankHand(boardCards);
  if (tmpRank > maxRank) {
    maxRank = tmpRank;
    maxCards = boardCards;
  }

  // 1st hole card + 4 community cards (5 combinations)
  for (let j = 0; j < 5; j++) {
    const tmp = cloneCards(communityCards);
    tmp.splice(j, 1);
    tmp.push(holeCards[0]);
    tmpRank = rankHand(tmp);
    if (tmpRank > maxRank) {
      maxRank = tmpRank;
      maxCards = tmp;
    }
  }

  // 2nd hole card + 4 community cards (5 combinations)
  for (let j = 0; j < 5; j++) {
    const tmp = cloneCards(communityCards);
    tmp.splice(j, 1);
    tmp.push(holeCards[1]);
    tmpRank = rankHand(tmp);
    if (tmpRank > maxRank) {
      maxRank = tmpRank;
      maxCards = tmp;
    }
  }

  // Both hole cards + 3 community cards (10 combinations - C(5,3))
  const iii = [0, 0, 0, 0, 0, 0, 1, 1, 1, 2];
  const jjj = [1, 1, 1, 2, 2, 3, 2, 2, 3, 3];
  const kkk = [2, 3, 4, 3, 4, 4, 3, 4, 4, 4];

  for (let idx = 0; idx < 10; idx++) {
    const tmp: Card[] = [
      communityCards[iii[idx]],
      communityCards[jjj[idx]],
      communityCards[kkk[idx]],
      holeCards[0],
      holeCards[1],
    ];
    tmpRank = rankHand(tmp);
    if (tmpRank > maxRank) {
      maxRank = tmpRank;
      maxCards = tmp;
    }
  }

  const rank = (maxRank >> 20) as HandRank;
  return {
    cards: maxCards!,
    rank,
    value: maxRank,
    name: HAND_NAMES[rank] ?? 'Unknown',
  };
}

/**
 * Compare two evaluated hands.
 * Returns: 1 if a wins, -1 if b wins, 0 if tie.
 */
export function compareHands(a: Hand, b: Hand): -1 | 0 | 1 {
  if (a.value > b.value) return 1;
  if (a.value < b.value) return -1;
  return 0;
}

// ---------------------------------------------------------------------------
// Hold'em Game State Machine
// ---------------------------------------------------------------------------

export enum HoldemPhase {
  WAITING = 0,
  SMALL_BLIND = 1,
  BIG_BLIND = 2,
  PREFLOP = 3,
  FLOP = 4,
  TURN = 5,
  RIVER = 6,
  SHOWDOWN = 7,
  GAME_OVER = 8,
}

export enum BettingAction {
  FOLD = 'fold',
  CHECK = 'check',
  CALL = 'call',
  RAISE = 'raise',
  ALL_IN = 'all_in',
}

export interface HoldemPlayer {
  id: string;
  seat: number;
  balance: number;
  holeCards: Card[];
  chips: number;       // chips committed to current pot
  prize: number;
  isActive: boolean;   // still in the hand (hasn't folded)
  isAllIn: boolean;
  bestHand: Hand | null;
}

export interface HoldemPot {
  amount: number;
  eligible: string[];  // player IDs eligible for this pot
}

export interface HoldemGameConfig {
  bigBlind: number;
  smallBlind: number;
  maxPlayers: number;
  turnTimeout: number;
}

export class HoldemGameState {
  readonly gameId: string;
  phase: HoldemPhase;
  players: Map<string, HoldemPlayer>;
  seatOrder: string[];    // player IDs in seat order
  activeOrder: string[];  // IDs of players still in hand, in action order
  deck: Card[];
  communityCards: Card[];
  pots: HoldemPot[];
  currentBet: number;
  lastRaise: number;
  dealerSeatIndex: number;
  currentPlayerIndex: number;
  actionsThisRound: number;
  config: HoldemGameConfig;
  serverSeed: string;
  clientSeed: string;
  nonce: number;

  constructor(
    gameId: string,
    config: Partial<HoldemGameConfig> = {}
  ) {
    this.gameId = gameId;
    this.phase = HoldemPhase.WAITING;
    this.players = new Map();
    this.seatOrder = [];
    this.activeOrder = [];
    this.deck = [];
    this.communityCards = [];
    this.pots = [{ amount: 0, eligible: [] }];
    this.currentBet = 0;
    this.lastRaise = 0;
    this.dealerSeatIndex = 0;
    this.currentPlayerIndex = 0;
    this.actionsThisRound = 0;
    this.config = {
      bigBlind: config.bigBlind ?? 100,
      smallBlind: config.smallBlind ?? 50,
      maxPlayers: config.maxPlayers ?? 10,
      turnTimeout: config.turnTimeout ?? 30,
    };
    this.serverSeed = generateServerSeed();
    this.clientSeed = '';
    this.nonce = 0;
  }

  /** Add a player to the game */
  addPlayer(id: string, seat: number, balance: number): void {
    if (this.players.size >= this.config.maxPlayers) {
      throw new Error('Table is full');
    }
    if (this.players.has(id)) {
      throw new Error('Player already at table');
    }
    this.players.set(id, {
      id,
      seat,
      balance,
      holeCards: [],
      chips: 0,
      prize: 0,
      isActive: true,
      isAllIn: false,
      bestHand: null,
    });
    this.seatOrder.push(id);
    this.seatOrder.sort((a, b) => {
      const pa = this.players.get(a)!;
      const pb = this.players.get(b)!;
      return pa.seat - pb.seat;
    });
  }

  /** Start a new hand */
  deal(clientSeed: string): void {
    if (this.players.size < 2) {
      throw new Error('Need at least 2 players');
    }

    this.clientSeed = clientSeed;
    this.nonce++;
    this.phase = HoldemPhase.PREFLOP;
    this.communityCards = [];
    this.pots = [{ amount: 0, eligible: [] }];
    this.currentBet = 0;
    this.lastRaise = this.config.bigBlind;
    this.actionsThisRound = 0;

    // Reset players
    for (const player of this.players.values()) {
      player.holeCards = [];
      player.chips = 0;
      player.prize = 0;
      player.isActive = true;
      player.isAllIn = false;
      player.bestHand = null;
    }

    // Create and shuffle deck deterministically
    const seedHash = hashSeed(this.serverSeed, this.clientSeed, this.nonce);
    this.deck = createDeck({ noJoker: true });
    shuffleDeckDeterministic(this.deck, seedHash);

    // Set up action order starting after dealer
    this.activeOrder = [...this.seatOrder];
    // Rotate so action starts after dealer
    for (let i = 0; i < this.dealerSeatIndex; i++) {
      this.activeOrder.push(this.activeOrder.shift()!);
    }

    // Post blinds
    this._postBlinds();

    // Deal 2 hole cards to each player
    for (const playerId of this.seatOrder) {
      const player = this.players.get(playerId)!;
      player.holeCards = drawCardsDeterministic(
        this.deck,
        2,
        hashSeed(seedHash, playerId, this.nonce)
      );
    }

    // Set current player (after big blind)
    this.currentPlayerIndex = 0;
  }

  private _postBlinds(): void {
    const order = this.activeOrder;

    // Small blind
    const sbId = order.length > 2 ? order[1] : order[0];
    const sbPlayer = this.players.get(sbId)!;
    const sbAmount = Math.min(this.config.smallBlind, sbPlayer.balance);
    sbPlayer.balance -= sbAmount;
    sbPlayer.chips += sbAmount;
    this.pots[0].amount += sbAmount;

    // Big blind
    const bbId = order.length > 2 ? order[2] : order[1];
    const bbPlayer = this.players.get(bbId)!;
    const bbAmount = Math.min(this.config.bigBlind, bbPlayer.balance);
    bbPlayer.balance -= bbAmount;
    bbPlayer.chips += bbAmount;
    this.pots[0].amount += bbAmount;

    this.currentBet = bbAmount;

    // Update eligible for pot
    this.pots[0].eligible = [...this.seatOrder];
  }

  /** Deal the flop (3 community cards) */
  dealFlop(): void {
    if (this.phase !== HoldemPhase.PREFLOP) {
      throw new Error('Can only deal flop after preflop');
    }
    this.phase = HoldemPhase.FLOP;
    const seedHash = hashSeed(this.serverSeed, this.clientSeed, this.nonce);
    const flop = drawCardsDeterministic(
      this.deck,
      3,
      hashSeed(seedHash, 'flop', 0)
    );
    this.communityCards.push(...flop);
    this._resetBettingRound();
  }

  /** Deal the turn (1 community card) */
  dealTurn(): void {
    if (this.phase !== HoldemPhase.FLOP) {
      throw new Error('Can only deal turn after flop');
    }
    this.phase = HoldemPhase.TURN;
    const seedHash = hashSeed(this.serverSeed, this.clientSeed, this.nonce);
    const turn = drawCardsDeterministic(
      this.deck,
      1,
      hashSeed(seedHash, 'turn', 0)
    );
    this.communityCards.push(...turn);
    this._resetBettingRound();
  }

  /** Deal the river (1 community card) */
  dealRiver(): void {
    if (this.phase !== HoldemPhase.TURN) {
      throw new Error('Can only deal river after turn');
    }
    this.phase = HoldemPhase.RIVER;
    const seedHash = hashSeed(this.serverSeed, this.clientSeed, this.nonce);
    const river = drawCardsDeterministic(
      this.deck,
      1,
      hashSeed(seedHash, 'river', 0)
    );
    this.communityCards.push(...river);
    this._resetBettingRound();
  }

  private _resetBettingRound(): void {
    this.currentBet = 0;
    this.lastRaise = this.config.bigBlind;
    this.actionsThisRound = 0;
    this.currentPlayerIndex = 0;

    // Reset per-round chips tracking for bet sizing
    for (const player of this.players.values()) {
      player.chips = 0;
    }
  }

  /** Get the current player whose turn it is */
  getCurrentPlayer(): HoldemPlayer | null {
    const activePlayers = this._getActivePlayers();
    if (activePlayers.length === 0) return null;
    return activePlayers[this.currentPlayerIndex % activePlayers.length] ?? null;
  }

  private _getActivePlayers(): HoldemPlayer[] {
    return this.activeOrder
      .map((id) => this.players.get(id)!)
      .filter((p) => p.isActive && !p.isAllIn);
  }

  /** Process a player action */
  action(playerId: string, action: BettingAction, raiseAmount?: number): void {
    const player = this.players.get(playerId);
    if (!player) throw new Error('Player not found');
    if (!player.isActive) throw new Error('Player has folded');

    switch (action) {
      case BettingAction.FOLD:
        this._fold(player);
        break;
      case BettingAction.CHECK:
        this._check(player);
        break;
      case BettingAction.CALL:
        this._call(player);
        break;
      case BettingAction.RAISE:
        this._raise(player, raiseAmount ?? this.lastRaise);
        break;
      case BettingAction.ALL_IN:
        this._allIn(player);
        break;
    }

    this.actionsThisRound++;

    // Check if hand is over (only 1 active player)
    const remaining = [...this.players.values()].filter((p) => p.isActive);
    if (remaining.length === 1) {
      this._simpleWin(remaining[0]);
      return;
    }

    // Advance to next player
    this._advancePlayer();
  }

  private _fold(player: HoldemPlayer): void {
    player.isActive = false;
    // Remove from pot eligibility
    for (const pot of this.pots) {
      pot.eligible = pot.eligible.filter((id) => id !== player.id);
    }
  }

  private _check(player: HoldemPlayer): void {
    const callAmount = this.currentBet - player.chips;
    if (callAmount > 0) {
      throw new Error('Cannot check, must call or raise');
    }
  }

  private _call(player: HoldemPlayer): void {
    const callAmount = this.currentBet - player.chips;
    if (callAmount <= 0) {
      throw new Error('Nothing to call, use check');
    }
    const amount = Math.min(callAmount, player.balance);
    player.balance -= amount;
    player.chips += amount;
    this.pots[0].amount += amount;

    if (player.balance === 0) {
      player.isAllIn = true;
    }
  }

  private _raise(player: HoldemPlayer, raiseAmount: number): void {
    if (raiseAmount < this.lastRaise) {
      throw new Error(`Raise must be at least ${this.lastRaise}`);
    }
    const callAmount = this.currentBet - player.chips;
    const totalNeeded = callAmount + raiseAmount;
    if (totalNeeded > player.balance) {
      throw new Error('Not enough balance for raise');
    }

    player.balance -= totalNeeded;
    player.chips += totalNeeded;
    this.pots[0].amount += totalNeeded;
    this.currentBet = player.chips;
    this.lastRaise = raiseAmount;
  }

  private _allIn(player: HoldemPlayer): void {
    const amount = player.balance;
    player.balance = 0;
    player.chips += amount;
    player.isAllIn = true;
    this.pots[0].amount += amount;

    if (player.chips > this.currentBet) {
      this.currentBet = player.chips;
    }
  }

  private _advancePlayer(): void {
    const active = this._getActivePlayers();
    if (active.length === 0) {
      // All remaining players are all-in, deal remaining community cards
      this._dealRemainingAndShowdown();
      return;
    }

    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % active.length;

    // Check if betting round is complete
    if (this._isBettingRoundComplete()) {
      this._nextPhase();
    }
  }

  private _isBettingRoundComplete(): boolean {
    const activePlayers = [...this.players.values()].filter(
      (p) => p.isActive && !p.isAllIn
    );
    if (activePlayers.length === 0) return true;

    // All active non-all-in players must have matched the current bet
    return activePlayers.every((p) => p.chips === this.currentBet) &&
      this.actionsThisRound >= activePlayers.length;
  }

  private _nextPhase(): void {
    switch (this.phase) {
      case HoldemPhase.PREFLOP:
        this.dealFlop();
        break;
      case HoldemPhase.FLOP:
        this.dealTurn();
        break;
      case HoldemPhase.TURN:
        this.dealRiver();
        break;
      case HoldemPhase.RIVER:
        this.showdown();
        break;
    }
  }

  private _dealRemainingAndShowdown(): void {
    const seedHash = hashSeed(this.serverSeed, this.clientSeed, this.nonce);
    while (this.communityCards.length < 5) {
      const card = drawCardsDeterministic(
        this.deck,
        1,
        hashSeed(seedHash, 'remaining', this.communityCards.length)
      );
      this.communityCards.push(...card);
    }
    this.showdown();
  }

  /** Evaluate all remaining hands and distribute pot */
  showdown(): void {
    this.phase = HoldemPhase.SHOWDOWN;

    const activePlayers = [...this.players.values()].filter((p) => p.isActive);

    // Evaluate each player's best hand
    for (const player of activePlayers) {
      if (this.communityCards.length === 5) {
        player.bestHand = bestFiveFromSeven(player.holeCards, this.communityCards);
      }
    }

    // Sort by hand value descending
    activePlayers.sort((a, b) => {
      const aVal = a.bestHand?.value ?? 0;
      const bVal = b.bestHand?.value ?? 0;
      return bVal - aVal;
    });

    // Distribute pot
    const totalPot = this.pots.reduce((sum, p) => sum + p.amount, 0);

    if (activePlayers.length === 0) {
      this.phase = HoldemPhase.GAME_OVER;
      return;
    }

    // Find all players tied for the best hand
    const bestValue = activePlayers[0].bestHand?.value ?? 0;
    const winners = activePlayers.filter(
      (p) => (p.bestHand?.value ?? 0) === bestValue
    );

    const share = Math.floor(totalPot / winners.length);
    const remainder = totalPot % winners.length;

    for (let i = 0; i < winners.length; i++) {
      winners[i].prize = share + (i === 0 ? remainder : 0);
      winners[i].balance += winners[i].prize;
    }

    // Move dealer button
    this.dealerSeatIndex = (this.dealerSeatIndex + 1) % this.seatOrder.length;
    this.phase = HoldemPhase.GAME_OVER;
  }

  private _simpleWin(winner: HoldemPlayer): void {
    const totalPot = this.pots.reduce((sum, p) => sum + p.amount, 0);
    winner.prize = totalPot;
    winner.balance += totalPot;
    this.dealerSeatIndex = (this.dealerSeatIndex + 1) % this.seatOrder.length;
    this.phase = HoldemPhase.GAME_OVER;
  }

  /** Get game state summary (safe to send to clients, hides other players' cards) */
  getPublicState(forPlayerId?: string) {
    const players: Record<string, unknown> = {};
    for (const [id, p] of this.players) {
      players[id] = {
        id: p.id,
        seat: p.seat,
        balance: p.balance,
        chips: p.chips,
        isActive: p.isActive,
        isAllIn: p.isAllIn,
        prize: p.prize,
        holeCards:
          this.phase === HoldemPhase.SHOWDOWN || id === forPlayerId
            ? visualize(p.holeCards)
            : p.holeCards.map(() => '??'),
        bestHand:
          this.phase === HoldemPhase.SHOWDOWN ? p.bestHand?.name : undefined,
      };
    }

    return {
      gameId: this.gameId,
      phase: this.phase,
      communityCards: visualize(this.communityCards),
      pot: this.pots.reduce((sum, p) => sum + p.amount, 0),
      currentBet: this.currentBet,
      currentPlayer: this.getCurrentPlayer()?.id ?? null,
      players,
    };
  }
}
