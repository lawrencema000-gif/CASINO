// ============================================================================
// Poker Card Engine - Ported from poker.js
// Card encoding: (suit << 4) | value
// ============================================================================

import { createHash } from 'crypto';
import { Card, CardSuit, CardValue, DecodedCard } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SUITS: Record<number, CardSuit> = {
  1: CardSuit.DIAMOND,
  2: CardSuit.CLUB,
  3: CardSuit.HEART,
  4: CardSuit.SPADE,
};

export const VALUES: Record<number, CardValue> = {
  2: CardValue.TWO,
  3: CardValue.THREE,
  4: CardValue.FOUR,
  5: CardValue.FIVE,
  6: CardValue.SIX,
  7: CardValue.SEVEN,
  8: CardValue.EIGHT,
  9: CardValue.NINE,
  10: CardValue.TEN,
  11: CardValue.JACK,
  12: CardValue.QUEEN,
  13: CardValue.KING,
  14: CardValue.ACE,
};

export const SUIT_SYMBOLS: Record<number, string> = {
  [CardSuit.SPADE]: '\u2660',
  [CardSuit.HEART]: '\u2665',
  [CardSuit.CLUB]: '\u2663',
  [CardSuit.DIAMOND]: '\u2666',
};

export const VALUE_SYMBOLS: Record<number, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

const SUIT_LETTER_MAP: Record<string, number> = {
  S: CardSuit.SPADE,
  H: CardSuit.HEART,
  C: CardSuit.CLUB,
  D: CardSuit.DIAMOND,
};

const VALUE_STRING_MAP: Record<string, number> = {
  A: 14, K: 13, Q: 12, J: 11,
  '10': 10, '9': 9, '8': 8, '7': 7,
  '6': 6, '5': 5, '4': 4, '3': 3, '2': 2,
};

export const RED_JOKER: Card = (6 << 4) | 15;
export const BLACK_JOKER: Card = (5 << 4) | 15;

// ---------------------------------------------------------------------------
// Card Encoding / Decoding
// ---------------------------------------------------------------------------

/** Encode a card from suit and value to the numeric format */
export function encodeCard(suit: CardSuit, value: CardValue): Card {
  return (suit << 4) | value;
}

/** Decode a numeric card into suit and value */
export function decodeCard(card: Card): DecodedCard {
  return {
    suit: (card >> 4) as CardSuit,
    value: (card & 0x0f) as CardValue,
    encoded: card,
  };
}

/** Get the suit of an encoded card */
export function getCardSuit(card: Card): CardSuit {
  return (card >> 4) as CardSuit;
}

/** Get the value of an encoded card */
export function getCardValue(card: Card): CardValue {
  return (card & 0x0f) as CardValue;
}

// ---------------------------------------------------------------------------
// Card Display
// ---------------------------------------------------------------------------

/** Convert an encoded card to a display string like "A\u2660" */
export function cardToString(card: Card): string {
  if (card === RED_JOKER) return 'JKR';
  if (card === BLACK_JOKER) return 'JKB';
  if (card === 0) return '??';
  const suit = card >> 4;
  const value = card & 0x0f;
  return (VALUE_SYMBOLS[value] ?? '?') + (SUIT_SYMBOLS[suit] ?? '?');
}

/** Parse a string like "SА" or "H10" into an encoded card */
export function parseCard(str: string): Card {
  if (str === 'JKR') return RED_JOKER;
  if (str === 'JKB') return BLACK_JOKER;
  if (!str || str.length < 2) return 0;

  const suitChar = str.charAt(0).toUpperCase();
  const valueStr = str.substring(1);

  const suit = SUIT_LETTER_MAP[suitChar];
  const value = VALUE_STRING_MAP[valueStr];

  if (suit && value) {
    return (suit << 4) | value;
  }
  return 0;
}

/** Convert an array of encoded cards to display strings */
export function visualize(cards: Card[]): string[] {
  return cards.map(cardToString);
}

// ---------------------------------------------------------------------------
// Deck Operations
// ---------------------------------------------------------------------------

export interface DeckOptions {
  noJoker?: boolean;
  noSuits?: CardSuit[];
  noValues?: CardValue[];
  noCards?: Card[];
}

/**
 * Create a full 52-card deck (or customized).
 * By default excludes jokers (standard poker deck).
 */
export function createDeck(options?: DeckOptions): Card[] {
  const noJoker = options?.noJoker ?? true;
  const noSuits = options?.noSuits ?? [];
  const noValues = options?.noValues ?? [];
  const noCards = options?.noCards ?? [];

  const cards: Card[] = [];

  for (let suit = 1; suit <= 4; suit++) {
    if (noSuits.includes(suit as CardSuit)) continue;

    for (let value = 2; value <= 14; value++) {
      if (noValues.includes(value as CardValue)) continue;

      const card = (suit << 4) | value;
      if (noCards.includes(card)) continue;

      cards.push(card);
    }
  }

  if (!noJoker) {
    cards.push(RED_JOKER);
    cards.push(BLACK_JOKER);
  }

  return cards;
}

/**
 * Draw n random cards from the deck using cryptographic randomness.
 * Mutates the deck array (removes drawn cards).
 */
export function drawCards(deck: Card[], count: number): Card[] {
  if (deck.length < count) {
    throw new Error(`Not enough cards: need ${count}, have ${deck.length}`);
  }

  const drawn: Card[] = [];
  let len = deck.length;

  for (let n = 0; n < count; n++) {
    // Use crypto for randomness
    const randomBuf = require('crypto').randomBytes(4);
    const randomInt = randomBuf.readUInt32BE(0);
    const i = randomInt % len;

    drawn.push(deck[i]);
    deck.splice(i, 1);
    len--;
  }

  return drawn;
}

/**
 * Draw n cards deterministically using a seed hash.
 * Mutates the deck array.
 */
export function drawCardsDeterministic(
  deck: Card[],
  count: number,
  seedHash: string
): Card[] {
  if (deck.length < count) {
    throw new Error(`Not enough cards: need ${count}, have ${deck.length}`);
  }

  const drawn: Card[] = [];
  let len = deck.length;

  for (let n = 0; n < count; n++) {
    const subHash = createHash('sha256')
      .update(`${seedHash}:draw:${n}`)
      .digest('hex');
    const randomInt = parseInt(subHash.substring(0, 8), 16);
    const i = randomInt % len;

    drawn.push(deck[i]);
    deck.splice(i, 1);
    len--;
  }

  return drawn;
}

/**
 * Shuffle the deck in place using Fisher-Yates with crypto randomness.
 * Returns the same array reference.
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const crypto = require('crypto');
  for (let i = deck.length - 1; i > 0; i--) {
    const buf = crypto.randomBytes(4);
    const j = buf.readUInt32BE(0) % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Deterministically shuffle using a seed hash.
 */
export function shuffleDeckDeterministic(deck: Card[], seedHash: string): Card[] {
  for (let i = deck.length - 1; i > 0; i--) {
    const subHash = createHash('sha256')
      .update(`${seedHash}:shuffle:${i}`)
      .digest('hex');
    const j = parseInt(subHash.substring(0, 8), 16) % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

/** Sort cards by value descending, then by suit descending */
export function sortByValue(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const aValue = a & 0x0f;
    const bValue = b & 0x0f;
    if (aValue !== bValue) return bValue - aValue;
    return (b >> 4) - (a >> 4);
  });
}

/** Sort cards by suit descending, then by value descending */
export function sortBySuit(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const aSuit = a >> 4;
    const bSuit = b >> 4;
    if (aSuit !== bSuit) return bSuit - aSuit;
    return (b & 0x0f) - (a & 0x0f);
  });
}

/** Clone an array of cards */
export function cloneCards(cards: Card[]): Card[] {
  return cards.slice();
}

/** Merge two card arrays */
export function mergeCards(a: Card[], b: Card[]): Card[] {
  return a.concat(b);
}
