'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Users,
  Coins,
  Crown,
  RefreshCw,
  LogIn,
  Play,
  Hand,
  Check,
  Phone,
  TrendingUp,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useBalance } from '@/hooks/useBalance'
import Link from 'next/link'
import type { PokerRoom, PokerPlayer, Card, HandRank } from '@/lib/games/holdem/types'
import { HAND_RANK_NAMES } from '@/lib/games/holdem/types'

/* ─── Card helpers ─── */
const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
  hidden: '?',
}

const SUIT_COLORS: Record<string, string> = {
  hearts: '#EF4444',
  diamonds: '#3B82F6',
  clubs: '#22C55E',
  spades: '#A855F7',
  hidden: '#6B7280',
}

function getCardImage(card: Card | { suit: string; rank: string; value: number }): string {
  if (card.suit === 'hidden') return '/images/cards/0_0.png'
  const suitMap: Record<string, number> = { clubs: 1, diamonds: 2, hearts: 3, spades: 4 }
  const rankMap: Record<string, number> = {
    A: 14, K: 13, Q: 12, J: 11, '10': 10, '9': 9, '8': 8,
    '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2,
  }
  return `/images/cards/${suitMap[card.suit]}_${rankMap[card.rank]}.png`
}

/* ─── CardComponent ─── */
function PokerCard({
  card,
  size = 'md',
  faceDown = false,
  highlight = false,
}: {
  card: Card | { suit: string; rank: string; value: number }
  size?: 'sm' | 'md' | 'lg'
  faceDown?: boolean
  highlight?: boolean
}) {
  const sizes = {
    sm: 'w-10 h-14',
    md: 'w-14 h-20',
    lg: 'w-20 h-28',
  }

  const isHidden = card.suit === 'hidden' || faceDown

  return (
    <motion.div
      className={`${sizes[size]} rounded-lg overflow-hidden relative ${
        highlight ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/30' : ''
      }`}
      initial={{ rotateY: 180, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.4, type: 'spring' }}
      style={{
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      }}
    >
      <img
        src={isHidden ? '/images/cards/0_0.png' : getCardImage(card)}
        alt={isHidden ? 'Hidden card' : `${card.rank} of ${card.suit}`}
        className="w-full h-full object-cover"
      />
    </motion.div>
  )
}

/* ─── Room Card ─── */
function RoomCard({
  room,
  onJoin,
}: {
  room: {
    id: string
    name: string
    blinds: { small: number; big: number }
    maxPlayers: number
    playerCount: number
    phase: string
  }
  onJoin: (id: string) => void
}) {
  const isActive = room.phase !== 'waiting'

  return (
    <motion.div
      className="rounded-xl p-5 cursor-pointer hover:scale-[1.02] transition-transform"
      style={{
        background: 'linear-gradient(145deg, #1a1a25, #0f0f18)',
        border: `1px solid ${isActive ? 'rgba(96,165,250,0.3)' : 'rgba(255,255,255,0.05)'}`,
      }}
      onClick={() => onJoin(room.id)}
      whileHover={{ y: -2 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-white">{room.name}</h3>
        {isActive && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
            LIVE
          </span>
        )}
      </div>
      <div className="space-y-2 text-sm text-gray-400">
        <div className="flex justify-between">
          <span>Blinds</span>
          <span className="text-[#FFD700] font-semibold">
            ${room.blinds.small} / ${room.blinds.big}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Players</span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {room.playerCount} / {room.maxPlayers}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Buy-in</span>
          <span className="text-[#00FF88]">
            ${(room.blinds.big * 100).toLocaleString()}
          </span>
        </div>
      </div>
      <button
        className="w-full mt-4 py-2 rounded-lg font-semibold text-sm transition-all"
        style={{
          background: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
          color: 'white',
        }}
      >
        Join Table
      </button>
    </motion.div>
  )
}

/* ─── Table View ─── */
function TableView({
  room,
  userId,
  onAction,
  onLeave,
  onStart,
}: {
  room: Omit<PokerRoom, 'deck'>
  userId: string
  onAction: (action: string, amount?: number) => void
  onLeave: () => void
  onStart: () => void
}) {
  const [raiseAmount, setRaiseAmount] = useState(room.blinds.big * 2)
  const currentPlayer = room.players.find((p) => p.id === userId)
  const isMyTurn = currentPlayer?.isTurn ?? false
  const maxBet = Math.max(...room.players.map((p) => p.bet), 0)
  const toCall = currentPlayer ? maxBet - currentPlayer.bet : 0

  // Arrange players around the table (current player at bottom)
  const myIndex = room.players.findIndex((p) => p.id === userId)
  const orderedPlayers = myIndex >= 0
    ? [...room.players.slice(myIndex), ...room.players.slice(0, myIndex)]
    : room.players

  // Table seat positions (for up to 6 players)
  const seatPositions = [
    'bottom-4 left-1/2 -translate-x-1/2', // 0: bottom center (me)
    'bottom-1/4 left-4',                    // 1: bottom left
    'top-1/4 left-4',                       // 2: top left
    'top-4 left-1/2 -translate-x-1/2',     // 3: top center
    'top-1/4 right-4',                      // 4: top right
    'bottom-1/4 right-4',                   // 5: bottom right
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onLeave}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Leave Table</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{room.name}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">
            {room.phase.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Table */}
      <div
        className="relative mx-auto rounded-[50%] overflow-hidden"
        style={{
          width: '100%',
          maxWidth: '700px',
          height: '380px',
          background: 'radial-gradient(ellipse, #0d4a2a 0%, #0a3520 60%, #071f14 100%)',
          border: '8px solid #2a1a0a',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5), 0 0 30px rgba(0,0,0,0.8)',
        }}
      >
        {/* Felt pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
          }}
        />

        {/* Pot display */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10">
          <div className="flex items-center gap-1 text-[#FFD700] font-bold text-lg">
            <Coins className="w-5 h-5" />
            {room.pot.toLocaleString()}
          </div>
        </div>

        {/* Community cards */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[80%] flex gap-1 z-10">
          {room.communityCards.map((card, i) => (
            <PokerCard key={i} card={card} size="sm" />
          ))}
          {/* Empty slots */}
          {Array.from({ length: 5 - room.communityCards.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="w-10 h-14 rounded-lg border border-white/10 bg-black/20"
            />
          ))}
        </div>

        {/* Player seats */}
        {orderedPlayers.map((player, idx) => (
          <div
            key={player.id}
            className={`absolute ${seatPositions[idx] ?? seatPositions[0]} z-20`}
          >
            <div
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                player.isTurn ? 'ring-2 ring-yellow-400 bg-yellow-400/10' : ''
              } ${player.folded ? 'opacity-40' : ''}`}
              style={{
                background: player.isTurn
                  ? 'rgba(250,204,21,0.1)'
                  : 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
              }}
            >
              {/* Hole cards */}
              <div className="flex gap-0.5 -mt-8">
                {player.holeCards.map((card, i) => (
                  <PokerCard
                    key={i}
                    card={card}
                    size="sm"
                    faceDown={(card as unknown as { suit: string }).suit === 'hidden'}
                  />
                ))}
              </div>

              {/* Player info */}
              <div className="text-center min-w-[80px]">
                <div className="flex items-center justify-center gap-1">
                  {player.isDealer && (
                    <span className="w-4 h-4 rounded-full bg-yellow-500 text-black text-[8px] font-black flex items-center justify-center">
                      D
                    </span>
                  )}
                  <span className="text-xs font-semibold text-white truncate max-w-[60px]">
                    {player.username}
                  </span>
                </div>
                <div className="text-[10px] text-[#00FF88] font-bold">
                  ${player.chips.toLocaleString()}
                </div>
                {player.bet > 0 && (
                  <div className="text-[10px] text-[#FFD700]">
                    Bet: ${player.bet.toLocaleString()}
                  </div>
                )}
                {player.lastAction && (
                  <span className="text-[9px] uppercase text-gray-400">
                    {player.lastAction}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Winners display */}
      <AnimatePresence>
        {room.winners && room.winners.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center py-3 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,165,0,0.05))',
              border: '1px solid rgba(255,215,0,0.2)',
            }}
          >
            {room.winners.map((w, i) => {
              const winner = room.players.find((p) => p.id === w.playerId)
              return (
                <div key={i} className="flex items-center justify-center gap-2">
                  <Crown className="w-5 h-5 text-[#FFD700]" />
                  <span className="text-[#FFD700] font-bold">
                    {winner?.username ?? 'Unknown'} wins ${w.amount.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({HAND_RANK_NAMES[w.hand]})
                  </span>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      {room.phase === 'waiting' && room.players.length >= 2 && (
        <div className="flex justify-center">
          <button
            onClick={onStart}
            className="px-6 py-3 rounded-xl font-bold text-white text-sm"
            style={{
              background: 'linear-gradient(135deg, #22C55E, #16A34A)',
            }}
          >
            <Play className="w-4 h-4 inline mr-2" />
            Start Hand
          </button>
        </div>
      )}

      {isMyTurn && (room.phase === 'preflop' || room.phase === 'flop' || room.phase === 'turn' || room.phase === 'river') && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => onAction('fold')}
            className="px-4 py-2.5 rounded-lg font-semibold text-sm bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
          >
            <X className="w-3.5 h-3.5 inline mr-1" />
            Fold
          </button>

          {toCall === 0 ? (
            <button
              onClick={() => onAction('check')}
              className="px-4 py-2.5 rounded-lg font-semibold text-sm bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-all"
            >
              <Check className="w-3.5 h-3.5 inline mr-1" />
              Check
            </button>
          ) : (
            <button
              onClick={() => onAction('call')}
              className="px-4 py-2.5 rounded-lg font-semibold text-sm bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-all"
            >
              <Phone className="w-3.5 h-3.5 inline mr-1" />
              Call ${toCall.toLocaleString()}
            </button>
          )}

          <div className="flex items-center gap-1">
            <input
              type="number"
              value={raiseAmount}
              onChange={(e) => setRaiseAmount(Math.max(room.blinds.big, parseInt(e.target.value) || 0))}
              className="w-24 px-2 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm text-center"
              min={room.blinds.big}
            />
            <button
              onClick={() => onAction('raise', raiseAmount)}
              className="px-4 py-2.5 rounded-lg font-semibold text-sm bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30 hover:bg-[#FFD700]/30 transition-all"
            >
              <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
              Raise
            </button>
          </div>

          <button
            onClick={() => onAction('all_in')}
            className="px-4 py-2.5 rounded-lg font-semibold text-sm bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 transition-all"
          >
            ALL IN
          </button>
        </div>
      )}

      {(room.phase === 'showdown' || room.phase === 'finished') && (
        <div className="flex justify-center">
          <button
            onClick={onStart}
            className="px-6 py-3 rounded-xl font-bold text-white text-sm"
            style={{
              background: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
            }}
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Next Hand
          </button>
        </div>
      )}

      {/* My hand evaluation */}
      {currentPlayer?.bestHand && (
        <div className="text-center text-sm text-[#FFD700] font-semibold">
          Your hand: {HAND_RANK_NAMES[currentPlayer.bestHand.rank]}
        </div>
      )}
    </div>
  )
}

/* ─── MAIN PAGE ─── */
export default function HoldemPage() {
  const { user } = useAuth()
  const { balance, refreshBalance } = useBalance(user?.id)
  const [rooms, setRooms] = useState<
    {
      id: string
      name: string
      blinds: { small: number; big: number }
      maxPlayers: number
      playerCount: number
      phase: string
    }[]
  >([])
  const [currentRoom, setCurrentRoom] = useState<(Omit<PokerRoom, 'deck'>) | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/poker')
      const data = await res.json()
      setRooms(data.rooms ?? [])
    } catch {
      setError('Failed to load rooms')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchRoom = useCallback(async (roomId: string) => {
    try {
      const res = await fetch(`/api/poker?roomId=${roomId}`)
      const data = await res.json()
      if (data.room) setCurrentRoom(data.room)
    } catch {
      setError('Failed to load room')
    }
  }, [])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  // Poll room state while in a room
  useEffect(() => {
    if (!currentRoom) return
    const interval = setInterval(() => fetchRoom(currentRoom.id), 2000)
    return () => clearInterval(interval)
  }, [currentRoom?.id, fetchRoom])

  const handleJoin = async (roomId: string) => {
    if (!user) {
      setError('Please log in to play')
      return
    }
    try {
      const res = await fetch('/api/poker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', roomId }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        return
      }
      setCurrentRoom(data.room)
      refreshBalance()
    } catch {
      setError('Failed to join room')
    }
  }

  const handleAction = async (action: string, amount?: number) => {
    if (!currentRoom) return
    try {
      const res = await fetch('/api/poker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          roomId: currentRoom.id,
          amount,
        }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        return
      }
      setCurrentRoom(data.room)
      refreshBalance()
    } catch {
      setError('Failed to perform action')
    }
  }

  const handleLeave = async () => {
    if (!currentRoom) return
    try {
      await fetch('/api/poker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave', roomId: currentRoom.id }),
      })
      setCurrentRoom(null)
      refreshBalance()
      fetchRooms()
    } catch {
      setError('Failed to leave room')
    }
  }

  const handleStart = async () => {
    if (!currentRoom) return
    handleAction('start')
  }

  return (
    <div
      className="min-h-screen px-4 py-6"
      style={{ background: '#0a0a0f' }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex justify-between items-center"
            >
              {error}
              <button onClick={() => setError(null)}>
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {currentRoom ? (
          <TableView
            room={currentRoom}
            userId={user?.id ?? ''}
            onAction={handleAction}
            onLeave={handleLeave}
            onStart={handleStart}
          />
        ) : (
          <>
            {/* Lobby header */}
            <div className="flex items-center justify-between">
              <div>
                <Link
                  href="/"
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">Lobby</span>
                </Link>
                <h1
                  className="text-3xl font-black"
                  style={{
                    background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Texas Hold&apos;em
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Choose a table and test your poker skills
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Balance</p>
                <p className="text-lg font-bold text-[#00FF88]">
                  ${balance.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Room grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-48 rounded-xl animate-pulse"
                    style={{ background: 'rgba(26,26,37,0.5)' }}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rooms.map((room) => (
                  <RoomCard key={room.id} room={room} onJoin={handleJoin} />
                ))}
              </div>
            )}

            {/* How to play */}
            <div
              className="rounded-xl p-5"
              style={{
                background: 'rgba(26,26,37,0.5)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <h3 className="font-bold text-white mb-3">How to Play</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
                <div>
                  <p className="text-[#FFD700] font-semibold mb-1">1. Join a Table</p>
                  <p>Choose a table matching your bankroll. Buy-in is 100x the big blind.</p>
                </div>
                <div>
                  <p className="text-[#FFD700] font-semibold mb-1">2. Play Your Hand</p>
                  <p>Get 2 hole cards. Bet, call, raise, or fold through 4 rounds.</p>
                </div>
                <div>
                  <p className="text-[#FFD700] font-semibold mb-1">3. Win the Pot</p>
                  <p>Make the best 5-card hand from your 2 cards + 5 community cards.</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
