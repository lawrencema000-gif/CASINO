// ============================================================================
// Blackjack Engine - Ported from Blackjack.sol
// ============================================================================

import { Card, GameType, BetResult } from './types';
import { createDeck, drawCardsDeterministic, cardToString, visualize } from './poker';
import {
  generateServerSeed,
  hashSeed,
  hashServerSeed,
  calculatePayout,
  validateBet,
} from './casino-math';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export enum BlackjackState {
  BETTING = 0,
  PLAYING = 1,
  SETTLED = 2,
}

export enum BlackjackResult {
  PENDING = 'pending',
  PLAYER_BLACKJACK = 'blackjack',
  PLAYER_WIN = 'win',
  DEALER_WIN = 'lose',
  PUSH = 'push',
  PLAYER_BUST = 'bust',
}

export interface BlackjackHand {
  cards: Card[];
  score: number;
  isSoft: boolean;    // has an ace counting as 11
  isBust: boolean;
  isBlackjack: boolean;
}

export interface BlackjackGameData {
  gameId: string;
  betAmount: number;
  playerHand: BlackjackHand;
  dealerHand: BlackjackHand;
  state: BlackjackState;
  result: BlackjackResult;
  payout: number;
  serverSeedHash: string;
  deck: Card[];
  drawIndex: number;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}

// ---------------------------------------------------------------------------
// Score Calculation
// ---------------------------------------------------------------------------

/**
 * Calculate blackjack hand score, handling aces properly.
 * Card values: A=11(or 1), 2-10=face value, J/Q/K=10
 */
export function calculateScore(cards: Card[]): BlackjackHand {
  let score = 0;
  let aces = 0;
  const cardValues: number[] = [];

  for (const card of cards) {
    const value = card & 0x0f;
    let cardScore: number;

    if (value === 14) {
      // Ace
      aces++;
      cardScore = 11;
    } else if (value >= 11) {
      // J, Q, K
      cardScore = 10;
    } else {
      cardScore = value;
    }

    score += cardScore;
    cardValues.push(cardScore);
  }

  // Reduce aces from 11 to 1 if bust
  let softAces = aces;
  while (score > 21 && softAces > 0) {
    score -= 10;
    softAces--;
  }

  return {
    cards: [...cards],
    score,
    isSoft: softAces > 0,
    isBust: score > 21,
    isBlackjack: cards.length === 2 && score === 21,
  };
}

// ---------------------------------------------------------------------------
// Blackjack Game Class
// ---------------------------------------------------------------------------

export class BlackjackGame {
  private data: BlackjackGameData;

  constructor(gameId: string) {
    this.data = {
      gameId,
      betAmount: 0,
      playerHand: { cards: [], score: 0, isSoft: false, isBust: false, isBlackjack: false },
      dealerHand: { cards: [], score: 0, isSoft: false, isBust: false, isBlackjack: false },
      state: BlackjackState.BETTING,
      result: BlackjackResult.PENDING,
      payout: 0,
      serverSeedHash: '',
      deck: [],
      drawIndex: 0,
      serverSeed: '',
      clientSeed: '',
      nonce: 0,
    };
  }

  /** Deal initial cards: 2 to player, 1 face-up to dealer */
  deal(
    betAmount: number,
    clientSeed: string,
    minBet: number = 1,
    maxBet: number = 10000
  ): BlackjackGameData {
    validateBet(betAmount, minBet, maxBet);

    const serverSeed = generateServerSeed();
    const nonce = 1;
    const seedHash = hashSeed(serverSeed, clientSeed, nonce);

    // Create and prepare deck
    const deck = createDeck({ noJoker: true });

    this.data.betAmount = betAmount;
    this.data.serverSeed = serverSeed;
    this.data.serverSeedHash = hashServerSeed(serverSeed);
    this.data.clientSeed = clientSeed;
    this.data.nonce = nonce;
    this.data.deck = deck;
    this.data.drawIndex = 0;
    this.data.state = BlackjackState.PLAYING;

    // Deal player cards
    const playerCards = drawCardsDeterministic(deck, 2, hashSeed(seedHash, 'player', 0));
    this.data.playerHand = calculateScore(playerCards);

    // Deal dealer card (1 face-up)
    const dealerCards = drawCardsDeterministic(deck, 1, hashSeed(seedHash, 'dealer', 0));
    this.data.dealerHand = calculateScore(dealerCards);
    this.data.drawIndex = 3;

    // Check for natural blackjack
    if (this.data.playerHand.isBlackjack) {
      // Deal dealer's second card to check for push
      const dealerSecond = drawCardsDeterministic(
        deck,
        1,
        hashSeed(seedHash, 'dealer', 1)
      );
      this.data.dealerHand = calculateScore([...dealerCards, ...dealerSecond]);
      this.data.drawIndex = 4;

      if (this.data.dealerHand.isBlackjack) {
        // Push - both have blackjack
        this.data.result = BlackjackResult.PUSH;
        this.data.payout = betAmount;
      } else {
        // Player blackjack wins 3:2
        this.data.result = BlackjackResult.PLAYER_BLACKJACK;
        this.data.payout = betAmount + Math.floor((betAmount * 3) / 2);
      }
      this.data.state = BlackjackState.SETTLED;
    }

    return this._getPublicState();
  }

  /** Player hits - draw one card */
  hit(): BlackjackGameData {
    if (this.data.state !== BlackjackState.PLAYING) {
      throw new Error('Game is not in playing state');
    }

    const seedHash = hashSeed(
      this.data.serverSeed,
      this.data.clientSeed,
      this.data.nonce
    );
    const newCard = drawCardsDeterministic(
      this.data.deck,
      1,
      hashSeed(seedHash, 'hit', this.data.drawIndex)
    );
    this.data.drawIndex++;

    const allCards = [...this.data.playerHand.cards, ...newCard];
    this.data.playerHand = calculateScore(allCards);

    // Check bust
    if (this.data.playerHand.isBust) {
      this.data.result = BlackjackResult.PLAYER_BUST;
      this.data.payout = 0;
      this.data.state = BlackjackState.SETTLED;
    }

    return this._getPublicState();
  }

  /** Player stands - dealer plays out */
  stand(): BlackjackGameData {
    if (this.data.state !== BlackjackState.PLAYING) {
      throw new Error('Game is not in playing state');
    }

    const seedHash = hashSeed(
      this.data.serverSeed,
      this.data.clientSeed,
      this.data.nonce
    );

    // Deal dealer's remaining cards until 17+
    let dealerCards = [...this.data.dealerHand.cards];

    // If dealer only has 1 card, deal the second
    if (dealerCards.length === 1) {
      const secondCard = drawCardsDeterministic(
        this.data.deck,
        1,
        hashSeed(seedHash, 'dealer-stand', this.data.drawIndex)
      );
      dealerCards.push(...secondCard);
      this.data.drawIndex++;
    }

    let dealerHand = calculateScore(dealerCards);

    // Dealer hits on soft 17 and below
    while (dealerHand.score < 17) {
      const newCard = drawCardsDeterministic(
        this.data.deck,
        1,
        hashSeed(seedHash, 'dealer-hit', this.data.drawIndex)
      );
      dealerCards.push(...newCard);
      this.data.drawIndex++;
      dealerHand = calculateScore(dealerCards);
    }

    this.data.dealerHand = dealerHand;
    this.data.state = BlackjackState.SETTLED;

    // Determine result
    const playerScore = this.data.playerHand.score;
    const dealerScore = this.data.dealerHand.score;

    if (dealerHand.isBust || playerScore > dealerScore) {
      this.data.result = BlackjackResult.PLAYER_WIN;
      this.data.payout = this.data.betAmount * 2; // 1:1 + original bet
    } else if (playerScore === dealerScore) {
      this.data.result = BlackjackResult.PUSH;
      this.data.payout = this.data.betAmount; // return bet
    } else {
      this.data.result = BlackjackResult.DEALER_WIN;
      this.data.payout = 0;
    }

    return this._getPublicState();
  }

  /** Double down - double bet, take exactly one more card, then stand */
  doubleDown(): BlackjackGameData {
    if (this.data.state !== BlackjackState.PLAYING) {
      throw new Error('Game is not in playing state');
    }
    if (this.data.playerHand.cards.length !== 2) {
      throw new Error('Can only double down on initial hand');
    }

    this.data.betAmount *= 2;

    // Draw exactly one card
    const seedHash = hashSeed(
      this.data.serverSeed,
      this.data.clientSeed,
      this.data.nonce
    );
    const newCard = drawCardsDeterministic(
      this.data.deck,
      1,
      hashSeed(seedHash, 'double', this.data.drawIndex)
    );
    this.data.drawIndex++;

    const allCards = [...this.data.playerHand.cards, ...newCard];
    this.data.playerHand = calculateScore(allCards);

    if (this.data.playerHand.isBust) {
      this.data.result = BlackjackResult.PLAYER_BUST;
      this.data.payout = 0;
      this.data.state = BlackjackState.SETTLED;
      return this._getPublicState();
    }

    // Auto-stand after double
    return this.stand();
  }

  /** Get the current game result */
  getResult(): BlackjackResult {
    return this.data.result;
  }

  /** Get full game data (for server use) */
  getFullState(): BlackjackGameData {
    return { ...this.data };
  }

  /** Get state safe for client (hides server seed until game ends) */
  private _getPublicState(): BlackjackGameData {
    return {
      ...this.data,
      serverSeed:
        this.data.state === BlackjackState.SETTLED
          ? this.data.serverSeed
          : '', // hidden until game ends
      deck: [], // never expose the deck
    };
  }

  /** Static helper to get card display strings */
  static cardToString = cardToString;
  static visualize = visualize;
}
