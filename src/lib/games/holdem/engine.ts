import type {
  Card,
  PokerRoom,
  PokerPlayer,
  GamePhase,
  PlayerAction,
  HandRank,
} from './types'
import { evaluateBestHand, compareHands } from './hand-evaluator'

const SUITS: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades']
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (let i = 0; i < RANKS.length; i++) {
      deck.push({ suit, rank: RANKS[i], value: i + 2 })
    }
  }
  return deck
}

function shuffleDeck(deck: Card[], seed?: string): Card[] {
  const d = [...deck]
  // Fisher-Yates shuffle
  for (let i = d.length - 1; i > 0; i--) {
    let j: number
    if (seed) {
      // Deterministic shuffle from seed
      const crypto = require('crypto')
      const hash = crypto
        .createHash('sha256')
        .update(`${seed}:${i}`)
        .digest('hex')
      j = parseInt(hash.substring(0, 8), 16) % (i + 1)
    } else {
      j = Math.floor(Math.random() * (i + 1))
    }
    ;[d[i], d[j]] = [d[j], d[i]]
  }
  return d
}

/**
 * Create a new poker room.
 */
export function createRoom(
  id: string,
  name: string,
  smallBlind: number = 50,
  bigBlind: number = 100,
  maxPlayers: number = 6
): PokerRoom {
  return {
    id,
    name,
    blinds: { small: smallBlind, big: bigBlind },
    maxPlayers,
    players: [],
    communityCards: [],
    pot: 0,
    sidePots: [],
    phase: 'waiting',
    currentTurn: -1,
    dealerSeat: 0,
    minRaise: bigBlind,
    lastRaise: bigBlind,
    deck: [],
  }
}

/**
 * Add a player to a seat.
 */
export function addPlayer(
  room: PokerRoom,
  playerId: string,
  username: string,
  buyIn: number
): PokerRoom {
  if (room.players.length >= room.maxPlayers) {
    throw new Error('Room is full')
  }
  if (room.players.find((p) => p.id === playerId)) {
    throw new Error('Player already in room')
  }

  // Find first open seat
  const takenSeats = new Set(room.players.map((p) => p.seatIndex))
  let seat = 0
  while (takenSeats.has(seat)) seat++

  const player: PokerPlayer = {
    id: playerId,
    username,
    seatIndex: seat,
    chips: buyIn,
    bet: 0,
    holeCards: [],
    folded: false,
    allIn: false,
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
    isTurn: false,
  }

  return {
    ...room,
    players: [...room.players, player],
  }
}

/**
 * Start a new hand. Requires at least 2 players.
 */
export function startHand(room: PokerRoom, seed?: string): PokerRoom {
  const activePlayers = room.players.filter((p) => p.chips > 0)
  if (activePlayers.length < 2) {
    throw new Error('Need at least 2 players with chips')
  }

  const deck = shuffleDeck(createDeck(), seed)

  // Reset player state
  const players = room.players.map((p) => ({
    ...p,
    bet: 0,
    holeCards: [] as Card[],
    folded: p.chips <= 0, // auto-fold broke players
    allIn: false,
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
    isTurn: false,
    lastAction: undefined,
    bestHand: undefined,
  }))

  // Rotate dealer
  const activeIndices = players
    .filter((p) => !p.folded)
    .map((p) => p.seatIndex)
    .sort((a, b) => a - b)

  const currentDealerIdx = activeIndices.indexOf(room.dealerSeat)
  const nextDealerIdx = (currentDealerIdx + 1) % activeIndices.length
  const dealerSeat = activeIndices[nextDealerIdx]

  // Assign roles
  const sbIdx = (nextDealerIdx + 1) % activeIndices.length
  const bbIdx = (nextDealerIdx + 2) % activeIndices.length
  const sbSeat = activeIndices[sbIdx]
  const bbSeat = activeIndices[bbIdx]

  for (const p of players) {
    p.isDealer = p.seatIndex === dealerSeat
    p.isSmallBlind = p.seatIndex === sbSeat
    p.isBigBlind = p.seatIndex === bbSeat
  }

  // Post blinds
  const sbPlayer = players.find((p) => p.seatIndex === sbSeat)!
  const bbPlayer = players.find((p) => p.seatIndex === bbSeat)!

  const sbAmount = Math.min(room.blinds.small, sbPlayer.chips)
  const bbAmount = Math.min(room.blinds.big, bbPlayer.chips)

  sbPlayer.chips -= sbAmount
  sbPlayer.bet = sbAmount
  if (sbPlayer.chips === 0) sbPlayer.allIn = true

  bbPlayer.chips -= bbAmount
  bbPlayer.bet = bbAmount
  if (bbPlayer.chips === 0) bbPlayer.allIn = true

  const pot = sbAmount + bbAmount

  // Deal 2 cards to each active player
  let deckIdx = 0
  for (const p of players) {
    if (!p.folded) {
      p.holeCards = [deck[deckIdx], deck[deckIdx + 1]]
      deckIdx += 2
    }
  }

  // First to act preflop: player after big blind
  const firstActIdx = (bbIdx + 1) % activeIndices.length
  const firstActSeat = activeIndices[firstActIdx]
  const firstPlayer = players.find((p) => p.seatIndex === firstActSeat)
  if (firstPlayer) firstPlayer.isTurn = true

  return {
    ...room,
    players,
    deck: deck.slice(deckIdx),
    communityCards: [],
    pot,
    sidePots: [],
    phase: 'preflop',
    currentTurn: firstActSeat,
    dealerSeat,
    minRaise: room.blinds.big,
    lastRaise: room.blinds.big,
    winners: undefined,
  }
}

/**
 * Process a player action (fold, check, call, raise, all_in).
 */
export function processAction(
  room: PokerRoom,
  playerId: string,
  action: PlayerAction,
  raiseAmount?: number
): PokerRoom {
  const playerIdx = room.players.findIndex((p) => p.id === playerId)
  if (playerIdx === -1) throw new Error('Player not in room')

  const player = room.players[playerIdx]
  if (!player.isTurn) throw new Error('Not your turn')
  if (player.folded) throw new Error('Already folded')

  const players = room.players.map((p) => ({ ...p }))
  const current = players[playerIdx]

  const maxBet = Math.max(...players.map((p) => p.bet))
  const toCall = maxBet - current.bet
  let newPot = room.pot

  switch (action) {
    case 'fold':
      current.folded = true
      current.lastAction = 'fold'
      break

    case 'check':
      if (toCall > 0) throw new Error('Cannot check, must call or raise')
      current.lastAction = 'check'
      break

    case 'call': {
      const callAmount = Math.min(toCall, current.chips)
      current.chips -= callAmount
      current.bet += callAmount
      newPot += callAmount
      if (current.chips === 0) current.allIn = true
      current.lastAction = 'call'
      break
    }

    case 'raise': {
      const raise = raiseAmount ?? room.minRaise
      const totalBet = maxBet + raise
      const needed = totalBet - current.bet
      const actual = Math.min(needed, current.chips)
      current.chips -= actual
      current.bet += actual
      newPot += actual
      if (current.chips === 0) current.allIn = true
      current.lastAction = 'raise'
      break
    }

    case 'all_in': {
      const allInAmount = current.chips
      newPot += allInAmount
      current.bet += allInAmount
      current.chips = 0
      current.allIn = true
      current.lastAction = 'all_in'
      break
    }
  }

  current.isTurn = false

  // Check if hand is over (only one player left)
  const activePlayers = players.filter((p) => !p.folded)
  if (activePlayers.length === 1) {
    // Award pot to winner
    const winner = activePlayers[0]
    winner.chips += newPot
    return {
      ...room,
      players,
      pot: 0,
      phase: 'finished',
      currentTurn: -1,
      winners: [
        {
          playerId: winner.id,
          amount: newPot,
          hand: 'high_card',
        },
      ],
    }
  }

  // Find next player to act
  const activeSeats = players
    .filter((p) => !p.folded && !p.allIn)
    .map((p) => p.seatIndex)
    .sort((a, b) => a - b)

  let nextSeat = -1
  if (activeSeats.length > 0) {
    const currentSeatIdx = activeSeats.indexOf(current.seatIndex)
    for (let i = 1; i <= activeSeats.length; i++) {
      const candidateIdx = (currentSeatIdx + i) % activeSeats.length
      const candidateSeat = activeSeats[candidateIdx]
      const candidate = players.find((p) => p.seatIndex === candidateSeat)!

      // Check if this player still needs to act
      const newMaxBet = Math.max(...players.map((p) => p.bet))
      if (
        candidate.bet < newMaxBet ||
        candidate.lastAction === undefined
      ) {
        nextSeat = candidateSeat
        break
      }
    }
  }

  // If no next player or all have acted equally, advance phase
  if (nextSeat === -1 || (activeSeats.length <= 1 && activePlayers.every(p => p.allIn || p.folded || p.bet === Math.max(...players.map(pp => pp.bet))))) {
    return advancePhase({ ...room, players, pot: newPot, currentTurn: -1 })
  }

  // Set next player's turn
  const nextPlayer = players.find((p) => p.seatIndex === nextSeat)
  if (nextPlayer) nextPlayer.isTurn = true

  return {
    ...room,
    players,
    pot: newPot,
    currentTurn: nextSeat,
  }
}

/**
 * Advance to next phase (flop, turn, river, showdown).
 */
function advancePhase(room: PokerRoom): PokerRoom {
  const players = room.players.map((p) => ({
    ...p,
    bet: 0, // reset bets for new round
    isTurn: false,
    lastAction: undefined,
  }))

  const deck = [...room.deck]
  let communityCards = [...room.communityCards]
  let phase: GamePhase

  switch (room.phase) {
    case 'preflop':
      // Deal flop (burn 1, deal 3)
      deck.shift() // burn
      communityCards = [deck.shift()!, deck.shift()!, deck.shift()!]
      phase = 'flop'
      break
    case 'flop':
      // Deal turn (burn 1, deal 1)
      deck.shift()
      communityCards.push(deck.shift()!)
      phase = 'turn'
      break
    case 'turn':
      // Deal river (burn 1, deal 1)
      deck.shift()
      communityCards.push(deck.shift()!)
      phase = 'river'
      break
    case 'river':
      // Go to showdown
      return resolveShowdown({ ...room, players, deck, communityCards })
    default:
      return room
  }

  // Check if all remaining players are all-in — skip to showdown
  const canAct = players.filter((p) => !p.folded && !p.allIn)
  if (canAct.length <= 1) {
    // Need to deal remaining community cards and showdown
    let finalCards = [...communityCards]
    let finalDeck = [...deck]

    while (finalCards.length < 5) {
      finalDeck.shift() // burn
      finalCards.push(finalDeck.shift()!)
    }

    return resolveShowdown({
      ...room,
      players,
      deck: finalDeck,
      communityCards: finalCards,
    })
  }

  // First to act post-flop: first active player after dealer
  const activeSeats = players
    .filter((p) => !p.folded && !p.allIn)
    .map((p) => p.seatIndex)
    .sort((a, b) => a - b)

  if (activeSeats.length > 0) {
    // Find first player after dealer
    let firstSeat = activeSeats[0]
    for (const seat of activeSeats) {
      if (seat > room.dealerSeat) {
        firstSeat = seat
        break
      }
    }
    const firstPlayer = players.find((p) => p.seatIndex === firstSeat)
    if (firstPlayer) firstPlayer.isTurn = true

    return {
      ...room,
      players,
      deck,
      communityCards,
      phase,
      currentTurn: firstSeat,
    }
  }

  return { ...room, players, deck, communityCards, phase, currentTurn: -1 }
}

/**
 * Evaluate all hands and distribute pot.
 */
function resolveShowdown(room: PokerRoom): PokerRoom {
  const players = room.players.map((p) => ({ ...p, isTurn: false }))
  const activePlayers = players.filter((p) => !p.folded)

  // Evaluate each player's best hand
  for (const player of activePlayers) {
    if (player.holeCards.length === 2 && room.communityCards.length === 5) {
      const result = evaluateBestHand(player.holeCards, room.communityCards)
      player.bestHand = result
    }
  }

  // Sort by hand strength
  const ranked = [...activePlayers].sort((a, b) => {
    if (!a.bestHand || !b.bestHand) return 0
    return compareHands(b.bestHand, a.bestHand)
  })

  // Simple pot distribution (no side pots for now)
  const winners: { playerId: string; amount: number; hand: HandRank }[] = []

  if (ranked.length > 0) {
    const bestScore = ranked[0].bestHand?.score ?? 0

    // Find all players tied for best hand
    const tiedWinners = ranked.filter(
      (p) => p.bestHand?.score === bestScore
    )

    const share = Math.floor(room.pot / tiedWinners.length)
    const remainder = room.pot - share * tiedWinners.length

    for (let i = 0; i < tiedWinners.length; i++) {
      const winAmount = share + (i === 0 ? remainder : 0)
      tiedWinners[i].chips += winAmount
      winners.push({
        playerId: tiedWinners[i].id,
        amount: winAmount,
        hand: tiedWinners[i].bestHand?.rank ?? 'high_card',
      })
    }
  }

  return {
    ...room,
    players,
    pot: 0,
    phase: 'showdown',
    currentTurn: -1,
    winners,
  }
}
