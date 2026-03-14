import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  createRoom,
  addPlayer,
  startHand,
  processAction,
} from '@/lib/games/holdem/engine'
import type { PokerRoom, PlayerAction } from '@/lib/games/holdem/types'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import crypto from 'crypto'

// In-memory room store (for MVP — production would use Supabase Realtime + DB)
const rooms = new Map<string, PokerRoom>()

// Seed some default rooms
function ensureDefaultRooms() {
  if (rooms.size === 0) {
    rooms.set(
      'low-stakes',
      createRoom('low-stakes', 'Low Stakes', 25, 50, 6)
    )
    rooms.set(
      'mid-stakes',
      createRoom('mid-stakes', 'Mid Stakes', 50, 100, 6)
    )
    rooms.set(
      'high-stakes',
      createRoom('high-stakes', 'High Roller', 250, 500, 6)
    )
    rooms.set(
      'vip-table',
      createRoom('vip-table', 'VIP Table', 500, 1000, 4)
    )
  }
}

export async function GET(request: NextRequest) {
  ensureDefaultRooms()

  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get('roomId')

  if (roomId) {
    const room = rooms.get(roomId)
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Sanitize: hide other players' hole cards unless showdown
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const sanitized = {
      ...room,
      deck: undefined, // never expose deck
      players: room.players.map((p) => ({
        ...p,
        holeCards:
          room.phase === 'showdown' || room.phase === 'finished' || p.id === user?.id
            ? p.holeCards
            : p.holeCards.map(() => ({ suit: 'hidden' as const, rank: '?', value: 0 })),
      })),
    }

    return NextResponse.json({ room: sanitized })
  }

  // List all rooms
  const roomList = Array.from(rooms.values()).map((r) => ({
    id: r.id,
    name: r.name,
    blinds: r.blinds,
    maxPlayers: r.maxPlayers,
    playerCount: r.players.length,
    phase: r.phase,
  }))

  return NextResponse.json({ rooms: roomList })
}

export async function POST(request: NextRequest) {
  try {
    ensureDefaultRooms()

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit
    const limit = checkRateLimit(`poker:${user.id}`, RATE_LIMITS.bets)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { action, roomId, amount } = body as {
      action: string
      roomId: string
      amount?: number
    }

    const room = rooms.get(roomId)
    if (!room && action !== 'create') {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Get player profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('username, balance')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    switch (action) {
      case 'join': {
        if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
        const buyIn = amount ?? room.blinds.big * 100 // default 100 big blinds
        if (profile.balance < buyIn) {
          return NextResponse.json(
            { error: 'Insufficient balance' },
            { status: 400 }
          )
        }

        try {
          const updated = addPlayer(room, user.id, profile.username, buyIn)
          rooms.set(roomId, updated)

          // Deduct buy-in from balance atomically
          await supabaseAdmin.rpc('process_bet', {
            p_player_id: user.id,
            p_game_type: 'poker',
            p_bet_amount: buyIn,
            p_server_seed_hash: crypto
              .createHash('sha256')
              .update(`poker:${roomId}:${Date.now()}`)
              .digest('hex'),
            p_client_seed: 'poker-buyin',
            p_nonce: 0,
          })

          return NextResponse.json({ success: true, room: sanitizeRoom(updated, user.id) })
        } catch (err) {
          return NextResponse.json(
            { error: (err as Error).message },
            { status: 400 }
          )
        }
      }

      case 'leave': {
        if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
        const player = room.players.find((p) => p.id === user.id)
        if (!player) {
          return NextResponse.json(
            { error: 'Not in this room' },
            { status: 400 }
          )
        }

        // Return remaining chips to balance
        if (player.chips > 0) {
          await supabaseAdmin.rpc('settle_game', {
            p_game_id: null,
            p_player_id: user.id,
            p_result: { action: 'poker_leave', chips_returned: player.chips },
            p_payout: player.chips,
            p_multiplier: 1,
          })
        }

        const updated = {
          ...room,
          players: room.players.filter((p) => p.id !== user.id),
        }
        rooms.set(roomId, updated)

        return NextResponse.json({ success: true })
      }

      case 'start': {
        if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
        try {
          const seed = crypto.randomBytes(32).toString('hex')
          const updated = startHand(room, seed)
          rooms.set(roomId, updated)
          return NextResponse.json({ success: true, room: sanitizeRoom(updated, user.id) })
        } catch (err) {
          return NextResponse.json(
            { error: (err as Error).message },
            { status: 400 }
          )
        }
      }

      case 'fold':
      case 'check':
      case 'call':
      case 'raise':
      case 'all_in': {
        if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
        try {
          const updated = processAction(
            room,
            user.id,
            action as PlayerAction,
            amount
          )
          rooms.set(roomId, updated)

          // If hand finished, settle winnings
          if (
            updated.phase === 'showdown' ||
            updated.phase === 'finished'
          ) {
            if (updated.winners) {
              for (const winner of updated.winners) {
                if (winner.amount > 0) {
                  await supabaseAdmin.rpc('settle_game', {
                    p_game_id: null,
                    p_player_id: winner.playerId,
                    p_result: {
                      action: 'poker_win',
                      hand: winner.hand,
                      amount: winner.amount,
                    },
                    p_payout: winner.amount,
                    p_multiplier: 1,
                  })
                }
              }
            }
          }

          return NextResponse.json({ success: true, room: sanitizeRoom(updated, user.id) })
        } catch (err) {
          return NextResponse.json(
            { error: (err as Error).message },
            { status: 400 }
          )
        }
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Poker API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function sanitizeRoom(room: PokerRoom, userId: string) {
  return {
    ...room,
    deck: undefined,
    players: room.players.map((p) => ({
      ...p,
      holeCards:
        room.phase === 'showdown' || room.phase === 'finished' || p.id === userId
          ? p.holeCards
          : p.holeCards.map(() => ({ suit: 'hidden' as const, rank: '?', value: 0 })),
    })),
  }
}
