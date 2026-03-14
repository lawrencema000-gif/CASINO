import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Fetch the player's bonus streak info from the login_bonuses table
    const { data, error } = await supabaseAdmin
      .from('login_bonuses')
      .select('*')
      .eq('player_id', user.id)
      .single()

    if (error || !data) {
      // No bonus record yet - new player
      return NextResponse.json({
        streak: 0,
        can_collect: true,
        total_collected: 0,
        last_collected: null,
      })
    }

    // Check if the player can collect today
    const lastCollected = data.last_collected
      ? new Date(data.last_collected)
      : null
    const now = new Date()
    const canCollect =
      !lastCollected ||
      now.toDateString() !== lastCollected.toDateString()

    return NextResponse.json({
      streak: data.streak ?? 0,
      can_collect: canCollect,
      total_collected: data.total_collected ?? 0,
      last_collected: data.last_collected,
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Rate limit bonus claims
    const limit = checkRateLimit(`bonus:${user.id}`, RATE_LIMITS.bonus)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()

    if (body.action !== 'collect') {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    // Call the collect_bonus RPC function
    const { data, error } = await supabaseAdmin.rpc('collect_bonus', {
      p_player_id: user.id,
    })

    if (error) {
      // Handle specific error messages from the RPC
      if (
        error.message.includes('already collected') ||
        error.message.includes('no bonus available')
      ) {
        return NextResponse.json(
          { error: 'No bonus available. Come back tomorrow!' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: error.message || 'Failed to collect bonus' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      amount: data?.amount ?? 0,
      new_streak: data?.new_streak ?? 0,
      new_balance: data?.new_balance ?? 0,
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
