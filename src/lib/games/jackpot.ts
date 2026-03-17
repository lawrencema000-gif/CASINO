import crypto from 'crypto'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JackpotTicket {
  userId: string
  ticketCount: number
  betAmount: number
}

export interface JackpotDrawResult {
  /** Total pot size before the draw */
  potSize: number
  /** All tickets that participated */
  tickets: JackpotTicket[]
  /** Total number of tickets issued */
  totalTickets: number
  /** Winner's user ID */
  winnerId: string
  /** Amount the winner receives (pot minus house fee) */
  winAmount: number
  /** House fee taken (5%) */
  houseFee: number
  /** The winning ticket index */
  winningTicketIndex: number
}

export interface JackpotContribution {
  userId: string
  betAmount: number
  ticketsEarned: number
  newPotSize: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HOUSE_FEE_PERCENT = 5
const TICKET_PRICE = 1 // 1 currency unit = 1 ticket

// ---------------------------------------------------------------------------
// State management (in-memory for a single round; in production this would
// be backed by a database table like `jackpot_rounds`)
// ---------------------------------------------------------------------------

export interface JackpotRound {
  id: string
  tickets: JackpotTicket[]
  potSize: number
  startedAt: number
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Add a player's bet to the jackpot pot. Each unit of bet buys one ticket.
 */
export function contribute(
  round: JackpotRound,
  userId: string,
  betAmount: number
): JackpotContribution {
  const ticketsEarned = Math.floor(betAmount / TICKET_PRICE)

  // Check if user already has tickets in this round
  const existing = round.tickets.find(t => t.userId === userId)
  if (existing) {
    existing.ticketCount += ticketsEarned
    existing.betAmount += betAmount
  } else {
    round.tickets.push({ userId, ticketCount: ticketsEarned, betAmount })
  }

  round.potSize += betAmount

  return {
    userId,
    betAmount,
    ticketsEarned,
    newPotSize: round.potSize,
  }
}

/**
 * Draw a winner from the jackpot pool using a provably-fair seed.
 *
 * One ticket is drawn at random. The winner receives the entire pot
 * minus a 5% house fee.
 *
 * @param round - The current jackpot round state
 * @param rngSeed - Combined provably-fair seed
 */
export function draw(
  round: JackpotRound,
  rngSeed: string
): JackpotDrawResult {
  const totalTickets = round.tickets.reduce((sum, t) => sum + t.ticketCount, 0)

  // Generate winning ticket index
  const hash = crypto.createHash('sha256').update(rngSeed).digest('hex')
  const winningTicketIndex = parseInt(hash.substring(0, 8), 16) % totalTickets

  // Find which user holds the winning ticket
  let cumulative = 0
  let winnerId = round.tickets[0]?.userId ?? ''
  for (const ticket of round.tickets) {
    cumulative += ticket.ticketCount
    if (winningTicketIndex < cumulative) {
      winnerId = ticket.userId
      break
    }
  }

  const houseFee = Math.floor(round.potSize * HOUSE_FEE_PERCENT / 100)
  const winAmount = round.potSize - houseFee

  return {
    potSize: round.potSize,
    tickets: round.tickets,
    totalTickets,
    winnerId,
    winAmount,
    houseFee,
    winningTicketIndex,
  }
}

/**
 * Create a fresh jackpot round.
 */
export function createRound(id?: string): JackpotRound {
  return {
    id: id ?? crypto.randomBytes(16).toString('hex'),
    tickets: [],
    potSize: 0,
    startedAt: Date.now(),
  }
}
