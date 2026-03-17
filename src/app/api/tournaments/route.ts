import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET — list tournaments with leaderboards
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') // upcoming, active, completed
  const tournamentId = searchParams.get('id')

  // Single tournament with leaderboard
  if (tournamentId) {
    const { data: tournament } = await supabaseAdmin
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    const { data: entries } = await supabaseAdmin
      .from('tournament_entries')
      .select('*, profiles:player_id(username, vip_tier, avatar_url)')
      .eq('tournament_id', tournamentId)
      .order('score', { ascending: false })
      .limit(100)

    // Check if current user is entered
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    let userEntry = null
    if (user) {
      const { data } = await supabaseAdmin
        .from('tournament_entries')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('player_id', user.id)
        .single()
      userEntry = data
    }

    return NextResponse.json({
      tournament,
      entries: entries || [],
      player_count: entries?.length || 0,
      user_entry: userEntry,
    })
  }

  // List tournaments
  let query = supabaseAdmin
    .from('tournaments')
    .select('*, tournament_entries(count)')
    .order('starts_at', { ascending: true })

  if (status) {
    query = query.eq('status', status)
  }

  const { data: tournaments, error } = await query.limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    tournaments: (tournaments || []).map(t => ({
      ...t,
      player_count: t.tournament_entries?.[0]?.count || 0,
      tournament_entries: undefined,
    })),
  })
}

// POST — join tournament
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tournamentId } = await request.json()

  if (!tournamentId) {
    return NextResponse.json({ error: 'tournamentId required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.rpc('join_tournament', {
    p_tournament_id: tournamentId,
    p_player_id: user.id,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (data?.error) {
    return NextResponse.json({ error: data.error }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
